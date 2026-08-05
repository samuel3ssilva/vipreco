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
#   senha, token, host completo, GTIN completo, linha de tabela, dado pessoal. O
#   fingerprint publicado e um hash truncado do host mais os ultimos caracteres do
#   project ref: da para conferir QUAL ambiente foi lido, nao da para alcanca-lo.
#
# ENTRADA (ambiente):
#   SUPABASE_DB_PASSWORD   a Database password do projeto Supabase de STAGING, e
#                          nada alem dela. Vem de Environment Secret. NAO e uma
#                          connection string -- host, porta, usuario e banco sao
#                          derivados de config/environments.json, que ja e
#                          versionado e ja e publico. Ver o cabecalho de
#                          `prepare-credential.sh` para o motivo dessa troca.
#   PREFLIGHT_ENVIRONMENT  nome do GitHub Environment declarado pelo workflow.
#                          Precisa ser exatamente `staging`.
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
# 1. O ambiente declarado e o segredo existem?
#
# Presenca, nunca valor. E sem fallback: se `SUPABASE_DB_PASSWORD` nao estiver la, o
# preflight PARA. Nao tenta `SUPABASE_DB_URL`, nao monta connection string
# alternativa, nao procura credencial de producao. Um fallback aqui reintroduziria,
# de uma vez, os dois caminhos de autenticacao que esta mudanca existe para eliminar.
# -----------------------------------------------------------------------------
if [ "${PREFLIGHT_ENVIRONMENT:-}" != "staging" ]; then
  erro "Este preflight so roda no GitHub Environment 'staging' (recebido: '${PREFLIGHT_ENVIRONMENT:-vazio}'). Abortando sem abrir conexao."
  exit 1
fi

if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  echo "STAGING DATABASE PASSWORD SECRET REQUIRED" >&2
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat >>"$GITHUB_STEP_SUMMARY" <<'RESUMO'
# Preflight remoto de staging — não executado

**`STAGING DATABASE PASSWORD SECRET REQUIRED`**

O segredo `SUPABASE_DB_PASSWORD` não existe no GitHub Environment `staging`, então
nenhuma conexão foi aberta. Nada falhou no banco: o preflight simplesmente não tinha
como olhar.

## A ação mínima

Cadastrar `SUPABASE_DB_PASSWORD` como **Environment Secret** do ambiente `staging`,
contendo **somente a Database password** do projeto Supabase de **staging** — nada de
URI de conexão, nada de host, nada de usuário, nunca a `service_role`, nunca a senha de
produção.

Host, porta, usuário e banco não vêm de segredo: são derivados de
`config/environments.json`, que já é versionado e já é público. Era exatamente essa
montagem manual de URI que produziu cinco defeitos silenciosos de credencial — ver
`scripts/r2/preflight/prepare-credential.sh`.

A senha nunca é impressa, nem no log nem neste resumo: ela vai direto para um
`.pgpass` de modo 0600, que é apagado no fim do job.

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
# 3. Identidade do ambiente, guardas, e a credencial.
#
# Os dois project refs estao em config/environments.json, que ja e versionado e ja e
# publico (o ref aparece na URL da API). Ler o ref de PRODUCAO aqui serve para uma
# coisa so: RECUSAR. E a diferenca entre "o workflow nao aponta para producao" e "o
# workflow se recusa a rodar contra producao" -- e so a segunda e uma garantia.
#
# NAO EXISTE MAIS DECOMPOSICAO DE URL AQUI. Host, porta, usuario e banco sao
# derivados; o unico segredo e a senha, e ela vai direto para um `.pgpass` de modo
# 0600 dentro de $TRABALHO, que o `trap` apaga. A senha nunca entra em argv, nunca
# atravessa um pipe, nunca e codificada e nunca e reconstruida.
#
# Toda a cadeia de guarda mora em `preparar_credencial`, que e uma funcao com nome e
# com teste que a EXECUTA de verdade. Guarda escrita direto no corpo de um script e
# guarda sem teste.
# -----------------------------------------------------------------------------
ref_de() {
  bun --print "JSON.parse(require('fs').readFileSync('$REPO_ROOT/config/environments.json','utf-8')).$1.supabaseProjectId" 2>/dev/null || true
}
REF_STAGING="$(ref_de staging)"
REF_PROIBIDO="$(ref_de production)"

# shellcheck source=scripts/r2/preflight/prepare-credential.sh
source "$PREFLIGHT_DIR/prepare-credential.sh"
if ! preparar_credencial "$REF_STAGING" "$REF_PROIBIDO" "$TRABALHO/.pgpass"; then
  erro "Nao foi possivel preparar a credencial de staging. Nenhuma conexao foi aberta."
  exit 1
fi

# A senha ja esta no `.pgpass`. Tira-la do ambiente encurta a janela em que ela existe
# em dois lugares ao mesmo tempo: dali em diante, todo processo filho -- inclusive o
# `psql` e o `bun` do renderizador -- herda um ambiente que nao a contem.
unset SUPABASE_DB_PASSWORD

PGHOST="$PREFLIGHT_HOST"
PGPORT="$PREFLIGHT_PORTA"
PGUSER="$PREFLIGHT_USUARIO"
PGDATABASE="$PREFLIGHT_BANCO"
PGPASSFILE="$TRABALHO/.pgpass"
export PGHOST PGPORT PGUSER PGDATABASE PGPASSFILE
export PGSSLMODE="${PGSSLMODE:-require}"
export PGCONNECT_TIMEOUT=15
export PGAPPNAME="vipreco-r2-preflight"

# Mascara explicita do host. Ele nao e segredo -- e derivado de arquivo versionado e
# publico --, mas nao ha motivo para ele aparecer inteiro num log de erro de conexao.
# `PGUSER` e `postgres`: mascarar essa palavra tornaria o log ilegivel sem proteger
# nada.
#
# A senha nao aparece nesta lista porque nao existe neste processo depois do
# `.pgpass`: o GitHub ja mascara o valor do secret, e traze-lo de volta para o shell
# so para mascara-lo de novo seria o oposto do que esta mudanca fez.
echo "::add-mask::$PGHOST"

# -----------------------------------------------------------------------------
# 4. Fingerprint sanitizado.
# -----------------------------------------------------------------------------
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
    psql --no-psqlrc --no-password --quiet --no-align --tuples-only --field-separator='|' \
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

# Diagnostico da PRIMEIRA consulta -- a unica que ainda pode falhar por conexao.
#
# NAO EXISTE MAIS UMA SEGUNDA TENTATIVA. Ela existia porque a senha vinha de dentro de
# uma URI e havia duas leituras defensaveis do mesmo texto. Com um segredo atomico ha
# uma leitura so, e uma recusa aqui significa uma coisa so -- o que e exatamente o
# ponto da mudanca: transformar um erro ambiguo num erro que aponta para um lugar.
diagnostico_de_conexao() {
  echo "--- diagnostico de conexao (nenhum valor e impresso) ---" >&2
  cat >&2 <<'AJUDA'
A conexao usa um segredo ATOMICO: `SUPABASE_DB_PASSWORD` carrega so a senha, e host,
porta, usuario e banco vem de config/environments.json. Nao ha URI para montar errado,
nao ha percent-encoding, nao ha base64.

Entao `password authentication failed` aqui tem uma leitura so: o valor cadastrado em
`SUPABASE_DB_PASSWORD` nao e a Database password do projeto Supabase de staging. As
confusoes possiveis, em ordem de frequencia:
  1. e a senha da CONTA do Supabase (a do painel), e nao a do BANCO;
  2. e a senha de outro projeto -- producao, ou um projeto antigo;
  3. e uma connection string inteira colada no lugar da senha;
  4. a senha foi redefinida no painel depois de o segredo ter sido gravado.
Nenhuma delas se resolve daqui: o segredo so pode ser reescrito pelo Founder.
AJUDA
}

echo "==> 00-structure.sql (catalogo)"
if ! consultar "00-structure.sql" "$TRABALHO/structure.txt"; then
  erro "Nao foi possivel ler o catalogo de staging; veja a mensagem do psql acima."
  diagnostico_de_conexao
  exit 1
fi
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
