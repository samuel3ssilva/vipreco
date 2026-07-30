#!/usr/bin/env bash
# Onda 4 - drill de reconstrucao de schema a partir das migrations versionadas.
#
# Sobe um Postgres efemero (Docker), simula o ponto cego de plataforma do Supabase
# confirmado ao vivo na Onda 3 (00-platform-baseline.sql), aplica todas as migrations
# de supabase/migrations/ em ordem e confirma as garantias de autorizacao contra o
# banco vivo resultante (90-assertions.sql). Nao toca em nenhum projeto Supabase real
# -- e inteiramente local e descartavel.
#
# Prova reproducibilidade de schema a partir de zero (um componente do RPO/RTO de
# restore, ver docs/operations/RESILIENCE-RUNBOOK.md); nao substitui um restore real
# de backup de dado, que depende do painel do Supabase e fica marcado como passo
# humano nesse runbook.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"
CONTAINER_NAME="vipreco-db-drill-$$"
POSTGRES_IMAGE="postgres:16-alpine"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Subindo Postgres efemero ($POSTGRES_IMAGE) para o drill..."
docker run -d --rm \
  --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  "$POSTGRES_IMAGE" >/dev/null

echo "==> Aguardando o banco aceitar conexoes..."
MAX_ATTEMPTS=60
ready=""
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    ready=1
    echo "==> Banco pronto (tentativa $attempt/$MAX_ATTEMPTS)."
    break
  fi
  if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
    break
  fi
  sleep 1
done
if [ -z "$ready" ]; then
  echo "::error::Postgres nao ficou pronto a tempo apos $MAX_ATTEMPTS tentativas (~${MAX_ATTEMPTS}s)." >&2
  docker logs "$CONTAINER_NAME" 2>&1 | tail -n 50 || true
  exit 1
fi

psql_apply() {
  local label="$1" file="$2"
  echo "==> Aplicando: $label"
  if ! docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d postgres < "$file"; then
    echo "::error::Falhou ao aplicar $label" >&2
    exit 1
  fi
}

psql_apply "baseline de plataforma (00-platform-baseline.sql)" "$SCRIPT_DIR/00-platform-baseline.sql"

shopt -s nullglob
migration_files=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob
if [ "${#migration_files[@]}" -eq 0 ]; then
  echo "::error::Nenhuma migration encontrada em $MIGRATIONS_DIR" >&2
  exit 1
fi

for migration in "${migration_files[@]}"; do
  psql_apply "migration $(basename "$migration")" "$migration"
done

psql_apply "assertions de autorizacao (90-assertions.sql)" "$SCRIPT_DIR/90-assertions.sql"

echo "==> Drill de reconstrucao de schema concluido com sucesso: ${#migration_files[@]} migrations reproduzidas e verificadas contra banco vivo."
