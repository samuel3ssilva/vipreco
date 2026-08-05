#!/usr/bin/env bash
# =============================================================================
# R2.4 §5 - COMPARACAO DE EQUIVALENCIA DE SCHEMA
#
# Levanta um Postgres efemero, aplica NELE somente as OITO migrations anteriores a R2,
# tira o fingerprint dos dois lados e compara. Nao escreve em staging, nao aplica
# migration em staging, nao toca em producao.
#
# ESTE SCRIPT E FINO DE PROPOSITO, pelo mesmo motivo de `preflight/run.sh`: ele conecta,
# executa `.sql` versionados e guarda fatos num arquivo. A DECISAO -- classificar
# EXACT EQUIVALENT, MATERIAL DRIFT ou UNKNOWN -- mora em `compare.ts`, que tem teste.
# Decisao em shell e decisao sem teste.
#
# =============================================================================
# POR QUE POSTGRES 17, E NAO 16 COMO O DRILL
# =============================================================================
#
# Staging roda PostgreSQL 17.6 (medido, run 31032153539). Boa parte do fingerprint vem
# de RENDERIZADORES do proprio Postgres -- `pg_get_functiondef`, `pg_get_indexdef`,
# `pg_get_constraintdef` --, e renderizador muda entre versoes maiores. Com majors
# diferentes, uma diferenca de saida nao distingue "o schema divergiu" de "o renderizador
# mudou", e `compare.ts` classifica isso como UNKNOWN de proposito.
#
# Igualar a versao maior transforma a comparacao de inconclusiva em conclusiva. O drill
# continua em 16 porque a pergunta dele e outra -- as migrations reconstroem o schema? --
# e essa resposta nao deve depender de uma versao especifica.
#
# ENTRADA (ambiente):
#   SUPABASE_DB_PASSWORD   a Database password de STAGING, e nada alem dela.
#   PREFLIGHT_ENVIRONMENT  precisa ser exatamente `staging`.
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
EQUIV_DIR="$REPO_ROOT/scripts/r2/equivalence"
PREFLIGHT_DIR="$REPO_ROOT/scripts/r2/preflight"
DRILL_DIR="$REPO_ROOT/scripts/db-drill"
TRABALHO="$(mktemp -d "${RUNNER_TEMP:-/tmp}/r2-equivalencia.XXXXXX")"
CONTAINER="vipreco-equivalencia-$$"
IMAGEM_POSTGRES="postgres:17-alpine"

# As duas migrations de R2. NAO entram no lado efemero: o que se quer comparar e o estado
# ANTERIOR a elas.
declare -a MIGRATIONS_DE_R2=(
  "20260803010000_product_identity_quantity.sql"
  "20260803020000_gtin_integrity.sql"
)

limpar() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  rm -rf "$TRABALHO"
}
trap limpar EXIT

erro() { echo "::error::$1" >&2; }

# -----------------------------------------------------------------------------
# 1. Guardas de ambiente e de leitura, ANTES de qualquer conexao.
# -----------------------------------------------------------------------------
if [ "${PREFLIGHT_ENVIRONMENT:-}" != "staging" ]; then
  erro "Esta comparacao so roda no GitHub Environment 'staging' (recebido: '${PREFLIGHT_ENVIRONMENT:-vazio}')."
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "STAGING DATABASE PASSWORD SECRET REQUIRED" >&2
  erro "O segredo SUPABASE_DB_PASSWORD nao esta no ambiente. Nenhuma conexao foi aberta, e nenhuma credencial alternativa foi tentada."
  exit 1
fi

echo "==> Guarda estatica de read-only (inclui fingerprint.sql)"
bun "$PREFLIGHT_DIR/read-only-guard.ts"

# -----------------------------------------------------------------------------
# 2. O lado ESPERADO: Postgres efemero com as oito migrations anteriores a R2.
# -----------------------------------------------------------------------------
echo "==> Subindo $IMAGEM_POSTGRES efemero"
docker run -d --rm --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=postgres \
  "$IMAGEM_POSTGRES" >/dev/null

# A imagem oficial sobe um servidor TEMPORARIO para rodar scripts de inicializacao, o
# derruba, e so entao sobe o FINAL. `pg_isready` sozinho responde OK contra o temporario,
# que fecha a conexao em seguida. Esperar a SEGUNDA ocorrencia da linha de log e o sinal
# correto -- mesma armadilha ja documentada em scripts/db-drill/run.sh.
pronto=""
for tentativa in $(seq 1 60); do
  vezes=$(docker logs "$CONTAINER" 2>&1 | grep -c "database system is ready to accept connections" || true)
  if [ "${vezes:-0}" -ge 2 ] && docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    pronto=1
    echo "==> Banco efemero pronto (tentativa $tentativa)"
    break
  fi
  sleep 1
done
if [ -z "$pronto" ]; then
  erro "O Postgres efemero nao ficou pronto a tempo."
  docker logs "$CONTAINER" 2>&1 | tail -n 30 || true
  exit 1
fi

aplicar_efemero() {
  local rotulo="$1" arquivo="$2"
  echo "  -> $rotulo"
  if ! docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <"$arquivo" >/dev/null; then
    erro "Falhou ao aplicar $rotulo no banco efemero."
    exit 1
  fi
}

echo "==> Baseline de plataforma"
aplicar_efemero "00-platform-baseline.sql" "$DRILL_DIR/00-platform-baseline.sql"

echo "==> Aplicando SOMENTE as migrations anteriores a R2"
aplicadas=0
shopt -s nullglob
for migration in "$REPO_ROOT/supabase/migrations"/*.sql; do
  nome="$(basename "$migration")"
  pular=""
  for de_r2 in "${MIGRATIONS_DE_R2[@]}"; do
    [ "$nome" = "$de_r2" ] && pular=1
  done
  if [ -n "$pular" ]; then
    echo "  -- pulando $nome (é de R2, e o lado esperado é o estado ANTERIOR a ela)"
    continue
  fi
  aplicar_efemero "$nome" "$migration"
  aplicadas=$((aplicadas + 1))
done
shopt -u nullglob

# A contagem e uma guarda, e nao um relatorio. Se uma migration nova entrar no
# repositorio sem que este script saiba dela, a comparacao viraria "staging esta
# atrasado" -- um MATERIAL DRIFT que na verdade seria uma ferramenta desatualizada.
if [ "$aplicadas" -ne 8 ]; then
  erro "Esperava aplicar 8 migrations anteriores a R2, apliquei $aplicadas. O conjunto de migrations do repositorio mudou e esta ferramenta nao foi atualizada junto. Abortando antes de comparar: um numero diferente aqui produziria um diff que fala de outra coisa."
  exit 1
fi

echo "==> Fingerprint do lado esperado (efemero)"
cat "$PREFLIGHT_DIR/_prologue.sql" "$EQUIV_DIR/fingerprint.sql" "$PREFLIGHT_DIR/_epilogue.sql" |
  docker exec -i "$CONTAINER" psql --no-psqlrc -U postgres -d postgres \
    -v ON_ERROR_STOP=1 --quiet --no-align --tuples-only --field-separator='|' \
    >"$TRABALHO/esperado.bruto"
grep -E '^fp\.' "$TRABALHO/esperado.bruto" >"$TRABALHO/esperado.txt" || : >"$TRABALHO/esperado.txt"
echo "    $(wc -l <"$TRABALHO/esperado.txt") fatos"

# -----------------------------------------------------------------------------
# 3. O lado ENCONTRADO: staging, em transacao READ ONLY.
#
# A credencial vem da mesma cadeia atomica do preflight -- host, porta, usuario e banco
# derivados de config/environments.json, senha num `.pgpass` 0600, e as mesmas guardas de
# recusa de producao. Nao existe segundo caminho de autenticacao neste repositorio.
# -----------------------------------------------------------------------------
campo_de() {
  bun --print "(JSON.parse(require('fs').readFileSync('$REPO_ROOT/config/environments.json','utf-8'))['$1']?.['$2'] ?? '')" 2>/dev/null || true
}
REF_STAGING="$(campo_de staging supabaseProjectId)"
REF_PROIBIDO="$(campo_de production supabaseProjectId)"
HOST_STAGING="$(campo_de staging supabaseDbHost)"

# shellcheck source=scripts/r2/preflight/prepare-credential.sh
source "$PREFLIGHT_DIR/prepare-credential.sh"
if ! preparar_credencial "$REF_STAGING" "$REF_PROIBIDO" "$HOST_STAGING" "$TRABALHO/.pgpass"; then
  erro "Nao foi possivel preparar a credencial de staging. Nenhuma conexao foi aberta."
  exit 1
fi
unset SUPABASE_DB_PASSWORD

export PGHOST="$PREFLIGHT_HOST" PGPORT="$PREFLIGHT_PORTA"
export PGUSER="$PREFLIGHT_USUARIO" PGDATABASE="$PREFLIGHT_BANCO"
export PGPASSFILE="$TRABALHO/.pgpass"
export PGSSLMODE="${PGSSLMODE:-require}" PGCONNECT_TIMEOUT=15
export PGAPPNAME="vipreco-r2-equivalencia"
echo "::add-mask::$PGHOST"

echo "==> Fingerprint do lado encontrado (staging, READ ONLY)"
ERRO_PSQL="$TRABALHO/psql.err"
if ! cat "$PREFLIGHT_DIR/_prologue.sql" "$EQUIV_DIR/fingerprint.sql" "$PREFLIGHT_DIR/_epilogue.sql" |
  psql --no-psqlrc --no-password --quiet --no-align --tuples-only --field-separator='|' \
    --variable=ON_ERROR_STOP=1 --file=- >"$TRABALHO/encontrado.bruto" 2>"$ERRO_PSQL"; then
  cat "$ERRO_PSQL" >&2 || true
  erro "Nao foi possivel ler o fingerprint de staging."
  # shellcheck source=scripts/r2/preflight/diagnose-connection.sh
  source "$PREFLIGHT_DIR/diagnose-connection.sh"
  diagnostico_de_conexao
  exit 1
fi
grep -E '^fp\.' "$TRABALHO/encontrado.bruto" >"$TRABALHO/encontrado.txt" || : >"$TRABALHO/encontrado.txt"
echo "    $(wc -l <"$TRABALHO/encontrado.txt") fatos"

# -----------------------------------------------------------------------------
# 4. Comparar e publicar.
#
# O relatorio vai para o LOG sempre, e para o Job Summary quando ele existir. Nao e
# duplicacao por descuido: o Job Summary so e legivel pela interface web autenticada, e o
# log e recuperavel por API -- num projeto cuja disciplina e evidencia versionada, a
# diferenca decide se o resultado pode ser citado dentro de docs/evidence/ sem alguem
# copiar a mao.
# -----------------------------------------------------------------------------
estado=0
bun "$EQUIV_DIR/compare.ts" "$TRABALHO/esperado.txt" "$TRABALHO/encontrado.txt" \
  >"$TRABALHO/relatorio.md" || estado=$?

cat "$TRABALHO/relatorio.md"

# -----------------------------------------------------------------------------
# 4b. Publicar os dois fingerprints crus num caminho estavel, para virarem artefato.
#
# A primeira execucao real (run 31041870966) mostrou por que isto e necessario: o
# relatorio disse "86 diferencas" e, para 84 delas, a resposta certa dependia de saber
# QUAIS grants existiam de cada lado -- e o relatorio, que resume, nao carrega isso.
# Sem o fingerprint cru, a unica saida seria eu SUPOR o que a plataforma concede e
# escrever a suposicao no baseline. Um instrumento cuja saida so pode ser interpretada
# por adivinhacao nao mede: ele convida a confirmar o que ja se acreditava.
#
# O que vai no artefato e metadado de catalogo -- nome de tabela, coluna, expressao de
# policy, grant. Nao ha linha de dado, nao ha senha (a variavel ja foi `unset` bem antes
# daqui) e nao ha connection string. O host, que E sensivel, e verificado abaixo em vez
# de presumido ausente.
# -----------------------------------------------------------------------------
SAIDA="${EQUIVALENCE_OUT:-}"
if [ -n "$SAIDA" ]; then
  mkdir -p "$SAIDA"
  for f in esperado encontrado; do
    if grep -qF "$PGHOST" "$TRABALHO/$f.txt"; then
      erro "O fingerprint '$f' contem o host de staging. Nao vou publica-lo como artefato."
      exit 1
    fi
    cp "$TRABALHO/$f.txt" "$SAIDA/fingerprint-$f.txt"
  done
  cp "$TRABALHO/relatorio.md" "$SAIDA/relatorio.md"
  echo "==> Fingerprints e relatorio copiados para publicacao"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  cat "$TRABALHO/relatorio.md" >>"$GITHUB_STEP_SUMMARY"
fi

if [ "$estado" -ne 0 ]; then
  erro "A equivalencia NAO foi comprovada. O baseline historico nao pode ser adotado, e nenhuma migration pode ser aplicada."
  exit "$estado"
fi

echo "==> EXACT EQUIVALENT. Nenhuma escrita foi emitida em ambiente nenhum."
