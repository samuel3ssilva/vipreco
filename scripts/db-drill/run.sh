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
# A imagem oficial do Postgres faz initdb e sobe um servidor TEMPORARIO (so pra rodar
# scripts de inicializacao), derruba esse servidor temporario, e so entao sobe o
# servidor FINAL. "database system is ready to accept connections" aparece duas vezes
# no log -- uma por servidor. pg_isready sozinho pode responder OK contra o servidor
# temporario, que fecha a conexao logo em seguida (FATAL: terminating connection due
# to administrator command) -- foi exatamente o que aconteceu na primeira tentativa de
# endurecimento deste script (ver commit desta mudanca). Esperar a segunda ocorrencia
# do log e o sinal correto e documentado para esse gotcha conhecido da imagem oficial.
MAX_ATTEMPTS=60
ready=""
for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  ready_count=$(docker logs "$CONTAINER_NAME" 2>&1 | grep -c "database system is ready to accept connections" || true)
  if [ "${ready_count:-0}" -ge 2 ] && docker exec "$CONTAINER_NAME" pg_isready -U postgres >/dev/null 2>&1; then
    ready=1
    echo "==> Banco pronto (tentativa $attempt/$MAX_ATTEMPTS, servidor final)."
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

# R2.3C - reconstrucao do DADO, e nao so do schema.
#
# Ate aqui o drill provava que o schema se reconstroi do zero. Nao provava nada
# sobre o dado: o seed.sql nunca era aplicado. Metade de uma prova de reconstrucao
# passa por prova inteira ate o dia em que alguem precisa reconstruir de verdade --
# e G6 (recuperacao verificada) depende exatamente disto.
#
# O seed e aplicado DUAS vezes de proposito. Ele e idempotente por `ON CONFLICT DO
# NOTHING`, e ja duplicou linhas de preco quando nao tinha id explicito. Aplicar duas
# vezes e verificar contagem exata e o que transforma "e idempotente" de alegacao em
# fato -- e importa porque recuperacao de emergencia raramente acontece de primeira.
echo "==> Reconstrucao de dado: aplicando supabase/seed.sql (1 de 2)..."
psql_apply "seed ficticio (supabase/seed.sql)" "$REPO_ROOT/supabase/seed.sql"
echo "==> Reaplicando o mesmo seed para provar idempotencia (2 de 2)..."
psql_apply "seed ficticio, segunda aplicacao" "$REPO_ROOT/supabase/seed.sql"
psql_apply "assertions de reconstrucao do seed (96-seed-rebuild.sql)" "$SCRIPT_DIR/96-seed-rebuild.sql"

# O script de auditoria de prontidao de R2 e read-only, entao rodar ele aqui nao muda
# nada -- e prova que ele EXECUTA contra o schema real: sintaxe valida, e toda coluna,
# funcao e indice que ele referencia existem de fato. Um runbook que manda rodar uma
# consulta quebrada e pior do que um runbook sem consulta nenhuma.
psql_apply "auditoria read-only de prontidao (scripts/r2/target-readiness.sql)" "$REPO_ROOT/scripts/r2/target-readiness.sql"

# R2.3 - o preflight remoto (scripts/r2/preflight/) le staging por psql, e sem isto aqui
# a unica forma de descobrir que uma consulta dele nao compila seria ao vivo, contra o
# banco de staging, com o Founder olhando. Rodar os mesmos .sql contra o Postgres do
# drill -- embrulhados pelo mesmo prologo READ ONLY que o runner usa -- prova o que a
# leitura estatica nao alcanca: sintaxe valida, todo objeto de catalogo referenciado
# existente, e a transacao read-only aceitando cada consulta.
echo "==> Preflight remoto de R2: executando os .sql contra o banco vivo do drill..."
PREFLIGHT_DIR="$REPO_ROOT/scripts/r2/preflight"
for preflight_sql in 00-structure.sql 10-migration-history.sql 20-content.sql 30-quantity-input.sql; do
  echo "  -> $preflight_sql"
  if ! cat "$PREFLIGHT_DIR/_prologue.sql" "$PREFLIGHT_DIR/$preflight_sql" "$PREFLIGHT_DIR/_epilogue.sql" |
    docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
      --quiet --no-align --tuples-only --field-separator='|' >/dev/null; then
    echo "::error::O preflight remoto nao executa contra o schema real: $preflight_sql" >&2
    exit 1
  fi
done

# Por ultimo, porque e o unico estagio que muda o schema: executa o rollback DOCUMENTADO
# das migrations de R2 -- extraido do proprio arquivo, e nao copiado -- e reaplica. Bloco
# de rollback que nunca rodou e alegacao, nao fato.
echo "==> Drill de rollback e reaplicacao de R2..."
bash "$SCRIPT_DIR/95-rollback-reapply.sh" "$CONTAINER_NAME" "$MIGRATIONS_DIR"

echo "==> Drill concluido com sucesso: ${#migration_files[@]} migrations reproduzidas e verificadas contra banco vivo, seed ficticio reconstruido e conferido (contagens exatas, is_demo, GTIN e idempotencia), e a auditoria de prontidao de R2 executada."
