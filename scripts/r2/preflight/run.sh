#!/usr/bin/env bash
# =============================================================================
# R2.3 - RUNNER DO PREFLIGHT REMOTO DE STAGING
#
# Le staging. Nao escreve em lugar nenhum, nao aplica migration, nao faz backfill,
# nao toca em producao. Roda SO por workflow_dispatch, a partir de
# .github/workflows/r2-staging-preflight.yml.
#
# ESTE SCRIPT E FINO DE PROPOSITO. Ele conecta, executa `.sql` versionados e guarda
# fatos num arquivo. Toda DECISAO -- classificar historico, classificar dado, dizer
# quais gates passam -- mora em `render-summary.ts`, que tem teste. Decisao em shell
# e decisao sem teste.
#
# O QUE NUNCA SAI DAQUI
#   connection string, senha, token, host completo, GTIN completo, linha de tabela,
#   dado pessoal. O fingerprint publicado e um hash truncado do host mais os ultimos
#   caracteres do project ref: da para conferir QUAL ambiente foi lido, nao da para
#   alcanca-lo.
#
# ENTRADA (ambiente):
#   SUPABASE_DB_URL   connection string de staging. Vem de Environment Secret.
#   GITHUB_STEP_SUMMARY, GITHUB_OUTPUT, RUNNER_TEMP   opcionais (Actions).
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PREFLIGHT_DIR="$REPO_ROOT/scripts/r2/preflight"
TRABALHO="$(mktemp -d "${RUNNER_TEMP:-/tmp}/r2-preflight.XXXXXX")"
FATOS="$TRABALHO/fatos.txt"

# O diretorio de trabalho carrega o dump de produtos. Vai embora sempre -- inclusive
# quando o script falha no meio, que e justamente quando alguem esqueceria.
limpar() { rm -rf "$TRABALHO"; }
trap limpar EXIT

fato() { printf '%s|%s\n' "$1" "$2" >>"$FATOS"; }
erro() { echo "::error::$1" >&2; }
aviso() { echo "::warning::$1" >&2; }

# -----------------------------------------------------------------------------
# 1. O secret existe? Verificacao pela PRESENCA, nunca pelo valor.
# -----------------------------------------------------------------------------
if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "STAGING DATABASE SECRET REQUIRED" >&2
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat >>"$GITHUB_STEP_SUMMARY" <<'RESUMO'
# Preflight remoto de staging — não executado

**`STAGING DATABASE SECRET REQUIRED`**

O segredo `SUPABASE_DB_URL` não existe no GitHub Environment `staging`, então nenhuma
conexão foi aberta. Nada falhou no banco: o preflight simplesmente não tinha como olhar.

## A ação mínima

Cadastrar `SUPABASE_DB_URL` como **Environment Secret** do ambiente `staging`, com a
connection string do Postgres de **staging** — nunca a de produção.

Ela nunca é impressa, nem no log nem neste resumo, e o workflow recusa a execução se a
URL apontar para o projeto de produção.

## O que continua valendo

Nenhuma migration foi aplicada. Nenhuma escrita foi emitida. O banco de produção não foi
contatado. O gate de R2 permanece exatamente onde estava.
RESUMO
  fi
  exit 1
fi

# -----------------------------------------------------------------------------
# 2. Camada A da guarda de read-only: ANTES de abrir conexao.
#
# Roda aqui, e nao so em `bun run test`, porque um teste que roda no CI protege o
# repositorio -- nao o banco. Se esta verificacao reprovar, nenhuma conexao e aberta.
# -----------------------------------------------------------------------------
echo "==> Guarda estatica de read-only nos .sql do preflight"
bun "$PREFLIGHT_DIR/read-only-guard.ts"

# -----------------------------------------------------------------------------
# 3. Decompor a URL em variaveis libpq.
#
# Assim a senha nunca entra na linha de comando do psql (argv e legivel por outros
# processos do runner), e o host fica disponivel para o fingerprint sanitizado.
# -----------------------------------------------------------------------------
urldecode() {
  local s="${1//+/ }"
  printf '%b' "${s//%/\\x}"
}

sem_protocolo="${SUPABASE_DB_URL#*://}"
if [ "$sem_protocolo" = "$SUPABASE_DB_URL" ]; then
  erro "SUPABASE_DB_URL nao parece uma URL (sem '://'). O valor nao e impresso."
  exit 1
fi

credenciais="${sem_protocolo%%@*}"
apos_arroba="${sem_protocolo#*@}"
if [ "$credenciais" = "$sem_protocolo" ]; then
  erro "SUPABASE_DB_URL nao tem credencial antes do '@'. O valor nao e impresso."
  exit 1
fi

hostporta="${apos_arroba%%/*}"
caminho="${apos_arroba#*/}"
PGHOST="${hostporta%%:*}"
porta="${hostporta##*:}"
[ "$porta" = "$PGHOST" ] && porta=5432

export PGHOST
export PGPORT="$porta"
PGUSER="$(urldecode "${credenciais%%:*}")"
PGPASSWORD="$(urldecode "${credenciais#*:}")"
PGDATABASE="$(urldecode "${caminho%%\?*}")"
export PGUSER PGPASSWORD PGDATABASE
export PGSSLMODE="${PGSSLMODE:-require}"
export PGCONNECT_TIMEOUT=15
export PGAPPNAME="vipreco-r2-preflight"

# Mascara explicita. O GitHub ja mascara o secret INTEIRO; estes sao os pedacos dele,
# que sozinhos nao seriam mascarados. So valores longos: mascarar a palavra "postgres"
# tornaria todo o log ilegivel sem proteger nada.
for segredo in "$PGPASSWORD" "$PGHOST" "$PGUSER"; do
  if [ "${#segredo}" -gt 8 ]; then echo "::add-mask::$segredo"; fi
done

# -----------------------------------------------------------------------------
# 4. Fingerprint sanitizado, e a recusa de producao.
#
# Os dois project refs estao em config/environments.json, que ja e versionado e ja e
# publico. Ler o ref de producao aqui serve para uma coisa so: RECUSAR. E a diferenca
# entre "o workflow nao aponta para producao" e "o workflow se recusa a rodar contra
# producao mesmo se alguem apontar" -- e so a segunda e uma garantia.
# -----------------------------------------------------------------------------
REF_STAGING="$(bun --print "JSON.parse(require('fs').readFileSync('$REPO_ROOT/config/environments.json','utf-8')).staging.supabaseProjectId" 2>/dev/null || true)"
REF_PROIBIDO="$(bun --print "JSON.parse(require('fs').readFileSync('$REPO_ROOT/config/environments.json','utf-8')).production.supabaseProjectId" 2>/dev/null || true)"

# Falha ABERTA se ninguem olhar. Com REF_STAGING vazio, `!= *""*` e sempre falso e a
# confirmacao de staging passaria calada -- exatamente a checagem que parece existir e
# nao existe. Por isso os dois refs sao exigidos antes de qualquer comparacao.
if [ -z "$REF_STAGING" ] || [ -z "$REF_PROIBIDO" ]; then
  erro "Nao foi possivel ler os project refs de config/environments.json. Abortando: sem eles a recusa de producao nao e verificavel, e uma guarda que nao e verificavel nao e guarda."
  exit 1
fi

identidade="$PGHOST $PGUSER"
if [[ "$identidade" == *"$REF_PROIBIDO"* ]]; then
  erro "A connection string aponta para o projeto de PRODUCAO. Abortando sem abrir conexao. Este workflow so pode ler staging."
  exit 1
fi
if [[ "$identidade" != *"$REF_STAGING"* ]]; then
  erro "Nao foi possivel confirmar que a connection string e a de staging (o ref esperado nao aparece no host nem no usuario). Abortando: identificar o ambiente sem ambiguidade e pre-requisito, nao formalidade."
  exit 1
fi

: >"$FATOS"
fato "run.environment" "staging"
fato "run.main_sha" "${GITHUB_SHA:-desconhecido}"
fato "run.ref_sufixo" "${REF_STAGING: -6}"
fato "run.host_hash" "$(printf '%s' "$PGHOST" | shasum -a 256 | cut -c1-12)"

# -----------------------------------------------------------------------------
# 5. Executar as consultas. Prologo + arquivo + epilogo, sempre nessa ordem: a
#    transacao READ ONLY e o que impede escrita mesmo se a camada A tiver falhado.
# -----------------------------------------------------------------------------
psql_transacao() {
  local arquivo="$1" destino="$2"
  cat "$PREFLIGHT_DIR/_prologue.sql" "$arquivo" "$PREFLIGHT_DIR/_epilogue.sql" |
    psql --no-psqlrc --quiet --no-align --tuples-only --field-separator='|' \
      --variable=ON_ERROR_STOP=1 --file=- >"$destino"
}

# Guarda o resultado JA FILTRADO. O psql imprime o status de `BEGIN`, `SET` e
# `ROLLBACK` no meio das tuplas, e sem filtrar isso viraria "fato" -- ou, no caso do
# JSON de produtos, um arquivo que nao parseia.
consultar() {
  local arquivo="$1" destino="$2" padrao="${3:-|}" estado=0
  psql_transacao "$PREFLIGHT_DIR/$arquivo" "$destino.bruto" || estado=$?
  if [ "$estado" -ne 0 ]; then
    rm -f "$destino.bruto"
    return "$estado"
  fi
  grep -E "$padrao" "$destino.bruto" >"$destino" || : >"$destino"
  rm -f "$destino.bruto"
}

echo "==> 00-structure.sql (catalogo)"
consultar "00-structure.sql" "$TRABALHO/structure.txt"
cat "$TRABALHO/structure.txt" >>"$FATOS"

# Camada C: o banco confirma que a transacao estava read-only. Se nao estava, a leitura
# ja aconteceu -- mas nada alem dela pode acontecer, e o operador precisa saber.
read_only="$(grep '^guard.read_only|' "$FATOS" | head -1 | cut -d'|' -f2- || true)"
if [ "$read_only" != "on" ]; then
  erro "A transacao NAO estava read-only (transaction_read_only='$read_only'). Abortando antes de qualquer outra consulta."
  exit 1
fi
echo "==> transacao read-only confirmada pelo proprio banco"

if grep -q '^history.table_present|true$' "$FATOS"; then
  echo "==> 10-migration-history.sql"
  consultar "10-migration-history.sql" "$TRABALHO/history.txt"
  cat "$TRABALHO/history.txt" >>"$FATOS"
else
  aviso "supabase_migrations.schema_migrations nao existe neste ambiente."
fi

echo "==> 20-content.sql (contagens e GTIN)"
if consultar "20-content.sql" "$TRABALHO/content.txt"; then
  cat "$TRABALHO/content.txt" >>"$FATOS"
else
  aviso "As tabelas de conteudo nao puderam ser lidas. O ambiente sera classificado sem elas."
fi

# -----------------------------------------------------------------------------
# 6. Preview de quantidade. O dump de produtos NUNCA e publicado nem vira artefato:
#    so a contagem por estado entra no resumo.
# -----------------------------------------------------------------------------
echo "==> 30-quantity-input.sql + preview"
if consultar "30-quantity-input.sql" "$TRABALHO/produtos.json" '^\['; then
  if bun "$PREFLIGHT_DIR/preview-counts.ts" "$TRABALHO/produtos.json" >"$TRABALHO/preview.txt"; then
    cat "$TRABALHO/preview.txt" >>"$FATOS"
  else
    aviso "O preview de quantidade nao pode ser calculado."
  fi
  rm -f "$TRABALHO/produtos.json"
else
  aviso "Nao foi possivel montar a entrada do preview de quantidade."
fi

# -----------------------------------------------------------------------------
# 7. target-readiness.sql (§5.7).
#
# A SAIDA DELE NAO E PUBLICADA. A consulta 2 devolve GTIN COMPLETO, e o §6.D proibe
# isso -- entao o que se registra e o status, nao o conteudo. A auditoria mascarada
# equivalente ja saiu de 20-content.sql.
#
# Falhar aqui e o resultado ESPERADO antes de R2-A: as consultas 5 a 7 referenciam
# colunas que ainda nao existem. Nao e defeito do script; e a resposta.
# -----------------------------------------------------------------------------
echo "==> target-readiness.sql (saida nao publicada: contem GTIN completo)"
if psql_transacao "$REPO_ROOT/scripts/r2/target-readiness.sql" "$TRABALHO/readiness.txt" \
  2>"$TRABALHO/readiness.err"; then
  fato "readiness.status" "ok"
  fato "readiness.detalhe" "executado por inteiro; saida retida por conter GTIN completo"
else
  fato "readiness.status" "parcial"
  if grep -qiE '42703|does not exist' "$TRABALHO/readiness.err"; then
    fato "readiness.detalhe" "interrompeu numa coluna inexistente — esperado antes de R2-A, ja que as consultas 5 a 7 so respondem depois da migration"
  else
    fato "readiness.detalhe" "interrompeu antes do fim; saida e erro retidos por poderem conter GTIN completo"
  fi
fi
rm -f "$TRABALHO/readiness.txt" "$TRABALHO/readiness.err"

# -----------------------------------------------------------------------------
# 8. Resumo.
# -----------------------------------------------------------------------------
ls "$REPO_ROOT/supabase/migrations" | sed 's/\.sql$//' >"$TRABALHO/migrations-locais.txt"
bun "$PREFLIGHT_DIR/render-summary.ts" "$FATOS" "$TRABALHO/migrations-locais.txt" >"$TRABALHO/resumo.md"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  cat "$TRABALHO/resumo.md" >>"$GITHUB_STEP_SUMMARY"
else
  cat "$TRABALHO/resumo.md"
fi

echo "==> Preflight concluido. Nenhuma escrita foi emitida."
