#!/usr/bin/env bash
# =============================================================================
# R2.6 - RUNNER DA APLICACAO CONTROLADA EM STAGING
#
# Este e o unico script deste repositorio que ESCREVE num banco remoto. Ele roda so por
# `workflow_dispatch`, so no Environment `staging`, uma operacao por disparo, e recusa a
# execucao se qualquer pre-condicao da operacao pedida nao estiver satisfeita.
#
# NAO EXISTE OPERACAO QUE APLIQUE TUDO. A ausencia e o desenho: uma operacao assim
# transformaria nove checkpoints em um, e o valor inteiro deste workflow esta nos
# checkpoints.
#
# ESTE SCRIPT E FINO DE PROPOSITO. Ele mede, chama a CLI oficial e confere. Toda DECISAO
# -- qual operacao pode rodar agora, qual frase ela exige, que estado ela espera -- mora em
# `operations.ts`, que tem teste. Decisao em shell e decisao sem teste.
#
# O QUE NUNCA SAI DAQUI
#   senha, connection string, host completo, GTIN completo, linha de tabela, dado pessoal.
#   O fingerprint publicado e um hash truncado do host mais os ultimos caracteres do
#   project ref: da para conferir QUAL ambiente foi tocado, nao da para alcanca-lo.
#
# PRODUCAO E RECUSADA POR CONSTRUCAO, em quatro pontos independentes:
#   1. o Environment `staging` e o unico que carrega `SUPABASE_DB_PASSWORD`;
#   2. `APPLY_ENVIRONMENT` precisa ser exatamente `staging`;
#   3. `preparar_credencial` aborta se o usuario ou o host mencionarem o ref de producao;
#   4. `supabase/config.toml` precisa declarar o project_id de staging.
#
# ENTRADA (ambiente):
#   APPLY_OPERATION            uma das nove operacoes de `operations.ts`
#   APPLY_EXPECTED_MAIN_SHA    o SHA que o operador ACHA que esta na main
#   APPLY_CONFIRMATION_PHRASE  a frase exata da operacao (vazia para plan/validate)
#   APPLY_ENVIRONMENT          precisa ser `staging`
#   SUPABASE_DB_PASSWORD       a Database password de staging, e nada alem dela
# =============================================================================
set -euo pipefail

# `set -x` jamais. Com ele, cada expansao vai para o log -- inclusive as que carregam a
# connection string montada. A depuracao deste script se faz por `echo` deliberado.
set +x

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APPLY_DIR="$REPO_ROOT/scripts/r2/apply"
PREFLIGHT_DIR="$REPO_ROOT/scripts/r2/preflight"
TRABALHO="$(mktemp -d "${RUNNER_TEMP:-/tmp}/r2-apply.XXXXXX")"
FATOS="$TRABALHO/fatos.txt"

limpar() { rm -rf "$TRABALHO"; }
trap limpar EXIT

erro() { echo "::error::$1" >&2; }
aviso() { echo "::warning::$1" >&2; }
fato() { printf '%s|%s\n' "$1" "$2" >>"$FATOS"; }
titulo() { echo ""; echo "==> $1"; }

# Tudo que o operador precisa ler vai para o log E para o Job Summary. O Job Summary so e
# legivel por sessao autenticada na interface web; o log e recuperavel por API, e e dele
# que sai a evidencia versionada.
RESUMO="$TRABALHO/resumo.md"
: >"$RESUMO"
relatar() {
  echo "$1"
  printf '%s\n' "$1" >>"$RESUMO"
}

publicar_resumo() {
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    cat "$RESUMO" >>"$GITHUB_STEP_SUMMARY"
  fi
}

abortar() {
  local veredito="$1" motivo="$2"
  erro "$motivo"
  relatar ""
  relatar "## \`$veredito\`"
  relatar ""
  relatar "$motivo"
  relatar ""
  relatar "**Nenhuma escrita foi emitida.** O estado de staging nao mudou."
  publicar_resumo
  exit 1
}

OPERACAO="${APPLY_OPERATION:-}"
relatar "# Aplicacao controlada em staging — \`${OPERACAO:-sem operacao}\`"
relatar ""

# -----------------------------------------------------------------------------
# 1. GUARDA DE AMBIENTE. Antes de qualquer outra coisa, e antes de olhar o segredo.
# -----------------------------------------------------------------------------
if [ "${APPLY_ENVIRONMENT:-}" != "staging" ]; then
  abortar "ENVIRONMENT REFUSED" \
    "Este runner so roda no GitHub Environment \`staging\` (recebido: '${APPLY_ENVIRONMENT:-vazio}')."
fi

# -----------------------------------------------------------------------------
# 2. A OPERACAO EXISTE, E A FRASE E A DELA.
#
# As duas perguntas sao respondidas por `operations.ts`, que tem teste. Uma frase
# universal seria pior que frase nenhuma: ela treinaria quem opera a colar sempre a mesma
# coisa, e o proposito da frase e obrigar a ler qual operacao esta sendo disparada.
# -----------------------------------------------------------------------------
titulo "Operacao e frase de confirmacao"
if ! bun "$APPLY_DIR/check-input.ts" "$OPERACAO" "${APPLY_CONFIRMATION_PHRASE:-}" >"$TRABALHO/input.txt" 2>"$TRABALHO/input.err"; then
  cat "$TRABALHO/input.err" >&2 || true
  abortar "OPERATION INPUT REFUSED" "$(cat "$TRABALHO/input.err" 2>/dev/null || echo 'entrada invalida')"
fi
ESCREVE="$(grep '^escreve=' "$TRABALHO/input.txt" | cut -d= -f2)"
echo "operacao aceita; escreve=$ESCREVE"

# -----------------------------------------------------------------------------
# 3. O CODIGO QUE ESTA RODANDO E O QUE O OPERADOR ACHA QUE ESTA.
#
# `expected_main_sha` nao e burocracia. Este workflow roda a partir de um ref, e o ref
# pode ter avancado entre a decisao de disparar e o disparo. Um SHA divergente significa
# que o operador leu um plano e disparou outro.
# -----------------------------------------------------------------------------
titulo "Identidade do codigo"
if [ "${GITHUB_REF:-refs/heads/main}" != "refs/heads/main" ]; then
  abortar "REF REFUSED" \
    "Este runner so roda a partir de \`main\` (recebido: '${GITHUB_REF:-vazio}'). Escrita em ambiente real nao sai de branch."
fi
if [ -z "${APPLY_EXPECTED_MAIN_SHA:-}" ]; then
  abortar "EXPECTED SHA REQUIRED" "O input \`expected_main_sha\` e obrigatorio em toda operacao."
fi
SHA_ATUAL="${GITHUB_SHA:-}"
case "$SHA_ATUAL" in
  "$APPLY_EXPECTED_MAIN_SHA"*) ;;
  *)
    abortar "MAIN SHA MISMATCH" \
      "O SHA informado (\`${APPLY_EXPECTED_MAIN_SHA}\`) nao e prefixo do SHA em execucao (\`${SHA_ATUAL:0:12}...\`). A main avancou entre a decisao e o disparo."
    ;;
esac
fato "run.main_sha" "${SHA_ATUAL:0:12}"
echo "main SHA confere: ${SHA_ATUAL:0:12}"

# -----------------------------------------------------------------------------
# 4. O SEGREDO EXISTE. Presenca, nunca valor, e sem fallback nenhum.
# -----------------------------------------------------------------------------
if [ -z "${SUPABASE_DB_PASSWORD:-}" ]; then
  abortar "STAGING DATABASE PASSWORD SECRET REQUIRED" \
    "O segredo \`SUPABASE_DB_PASSWORD\` nao esta no Environment \`staging\`. Nenhuma conexao foi aberta."
fi

# -----------------------------------------------------------------------------
# 5. GUARDA ESTATICA DE READ-ONLY nos .sql de auditoria.
#
# Ela NAO cobre `sql/remediate-demo-gtins.sql`, e nao poderia: aquele arquivo escreve, e e
# o unico. A guarda existe para que os OUTROS continuem incapazes de escrever mesmo que
# alguem os edite sem perceber.
# -----------------------------------------------------------------------------
titulo "Guarda estatica de read-only"
bun "$PREFLIGHT_DIR/read-only-guard.ts"

# -----------------------------------------------------------------------------
# 6. CREDENCIAL E RECUSA DE PRODUCAO.
#
# Reaproveita `preparar_credencial` de R2.3D inteira, e nao uma copia: ela ja carrega a
# cadeia de recusa (refs ausentes, refs iguais, ref de producao no usuario ou no host) e
# ja tem teste que a EXECUTA. Uma segunda copia divergiria, e divergiria na direcao de a
# mais nova esquecer uma guarda.
# -----------------------------------------------------------------------------
titulo "Credencial e identidade do ambiente"
campo_de() {
  bun --print "(JSON.parse(require('fs').readFileSync('$REPO_ROOT/config/environments.json','utf-8'))['$1']?.['$2'] ?? '')" 2>/dev/null || true
}
REF_STAGING="$(campo_de staging supabaseProjectId)"
REF_PROIBIDO="$(campo_de production supabaseProjectId)"
HOST_STAGING="$(campo_de staging supabaseDbHost)"

# QUARTA ancora de ambiente, independente das outras tres. `supabase/config.toml` e o que a
# CLI le para saber de que projeto ela esta falando; se ele apontar para outro lugar, a CLI
# e as guardas passariam a falar de projetos diferentes -- e a divergencia seria silenciosa.
CONFIG_PROJECT_ID="$(sed -n 's/^project_id[[:space:]]*=[[:space:]]*"\(.*\)"/\1/p' "$REPO_ROOT/supabase/config.toml" | head -1)"
if [ "$CONFIG_PROJECT_ID" != "$REF_STAGING" ]; then
  abortar "PROJECT REF MISMATCH" \
    "\`supabase/config.toml\` declara um project_id que nao e o de staging de \`config/environments.json\`. A CLI e as guardas falariam de projetos diferentes."
fi
if [ "$CONFIG_PROJECT_ID" = "$REF_PROIBIDO" ]; then
  abortar "PRODUCTION REF REFUSED" "\`supabase/config.toml\` aponta para o projeto de PRODUCAO."
fi

# shellcheck source=scripts/r2/preflight/prepare-credential.sh
source "$PREFLIGHT_DIR/prepare-credential.sh"
if ! preparar_credencial "$REF_STAGING" "$REF_PROIBIDO" "$HOST_STAGING" "$TRABALHO/.pgpass"; then
  abortar "CREDENTIAL REFUSED" "Nao foi possivel preparar a credencial de staging. Nenhuma conexao foi aberta."
fi

# A senha ja esta no `.pgpass` 0600. Tira-la do ambiente encurta a janela em que ela existe
# em dois lugares: dali em diante, todo processo filho -- `psql`, `supabase`, `bun` --
# herda um ambiente que nao a contem.
unset SUPABASE_DB_PASSWORD

PGHOST="$PREFLIGHT_HOST"
PGPORT="$PREFLIGHT_PORTA"
PGUSER="$PREFLIGHT_USUARIO"
PGDATABASE="$PREFLIGHT_BANCO"
PGPASSFILE="$TRABALHO/.pgpass"
export PGHOST PGPORT PGUSER PGDATABASE PGPASSFILE
export PGSSLMODE="${PGSSLMODE:-require}"
export PGCONNECT_TIMEOUT=15
export PGAPPNAME="vipreco-r2-apply"
echo "::add-mask::$PGHOST"

# A URL que a CLI recebe NAO CARREGA SENHA.
#
# `--db-url` vai para argv, e argv e visivel para qualquer processo da maquina e para
# qualquer `ps` num log de depuracao. A senha fica onde ja estava: no `.pgpass` 0600 que o
# `PGPASSFILE` aponta, e que o driver da CLI (pgx) le exatamente como o libpq leria.
#
# Se um dia a CLI parar de honrar `PGPASSFILE`, a conexao falha por autenticacao e o
# resultado e um bloqueio reportado -- nunca uma senha em argv como plano B.
DB_URL="postgresql://${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}?sslmode=require"

fato "run.environment" "staging"
fato "run.ref_sufixo" "${REF_STAGING: -6}"
fato "run.host_hash" "$(printf '%s' "$PGHOST" | shasum -a 256 | cut -c1-12)"

# -----------------------------------------------------------------------------
# 7. MEDICAO DO ESTADO ATUAL.
#
# Usa os MESMOS `.sql` do preflight, e nao consultas proprias. Duas medicoes do mesmo fato
# divergem; e quando divergirem, a que decide se pode escrever nao pode ser a que ninguem
# olhou.
# -----------------------------------------------------------------------------
titulo "Medicao do estado de staging"
ERRO_PSQL="$TRABALHO/psql.err"
psql_leitura() {
  local arquivo="$1" destino="$2" estado=0
  cat "$PREFLIGHT_DIR/_prologue.sql" "$arquivo" "$PREFLIGHT_DIR/_epilogue.sql" |
    psql --no-psqlrc --no-password --quiet --no-align --tuples-only --field-separator='|' \
      --variable=ON_ERROR_STOP=1 --file=- >"$destino" 2>"$ERRO_PSQL" || estado=$?
  cat "$ERRO_PSQL" >&2 || true
  return "$estado"
}

consultar() {
  local arquivo="$1" destino="$2" padrao="${3:-|}" estado=0
  psql_leitura "$PREFLIGHT_DIR/$arquivo" "$destino.bruto" || estado=$?
  if [ "$estado" -ne 0 ]; then
    rm -f "$destino.bruto"
    return "$estado"
  fi
  grep -E "$padrao" "$destino.bruto" >"$destino" || : >"$destino"
  rm -f "$destino.bruto"
}

if ! consultar "00-structure.sql" "$TRABALHO/structure.txt"; then
  abortar "STAGING UNREACHABLE" "Nao foi possivel ler o catalogo de staging. Nenhuma escrita foi emitida."
fi
cat "$TRABALHO/structure.txt" >>"$FATOS"

read_only="$(grep '^guard.read_only|' "$FATOS" | head -1 | cut -d'|' -f2- || true)"
if [ "$read_only" != "on" ]; then
  abortar "READ ONLY GUARD FAILED" "A transacao de medicao nao estava read-only (transaction_read_only='$read_only')."
fi

if grep -q '^history.table_present|true$' "$FATOS"; then
  consultar "10-migration-history.sql" "$TRABALHO/history.txt" && cat "$TRABALHO/history.txt" >>"$FATOS"
fi
consultar "20-content.sql" "$TRABALHO/content.txt" && cat "$TRABALHO/content.txt" >>"$FATOS"
consultar "40-watch-requests.sql" "$TRABALHO/watch.txt" && cat "$TRABALHO/watch.txt" >>"$FATOS"
consultar "50-privileges.sql" "$TRABALHO/priv.txt" && cat "$TRABALHO/priv.txt" >>"$FATOS"

# -----------------------------------------------------------------------------
# 8. A MAQUINA DE ESTADOS DECIDE.
#
# Aqui esta a diferenca entre "a operacao e valida" e "a operacao anterior terminou". Sao
# perguntas distintas, e so a segunda impede um passo pulado de virar um schema que ninguem
# sabe descrever.
# -----------------------------------------------------------------------------
titulo "Pre-condicoes da operacao"
if ! bun "$APPLY_DIR/check-state.ts" "$OPERACAO" "$FATOS" >"$TRABALHO/estado.txt" 2>"$TRABALHO/estado.err"; then
  cat "$TRABALHO/estado.err" >&2 || true
  relatar ""
  relatar "$(cat "$TRABALHO/estado.err" 2>/dev/null || true)"
  abortar "PRECONDITION REFUSED" "As pre-condicoes de \`$OPERACAO\` nao estao satisfeitas."
fi
cat "$TRABALHO/estado.txt"
relatar ""
relatar "$(cat "$TRABALHO/estado.txt")"

HISTORICO_ANTES="$(grep '^historico_antes=' "$TRABALHO/estado.txt" | cut -d= -f2)"
HISTORICO_DEPOIS="$(grep '^historico_depois=' "$TRABALHO/estado.txt" | cut -d= -f2)"
VERSAO_ALVO="$(grep '^versao_alvo=' "$TRABALHO/estado.txt" | cut -d= -f2)"

# -----------------------------------------------------------------------------
# 9. WORKDIR EFEMERO -- o mecanismo que limita `db push` a UMA migration.
#
# `supabase db push` aplica TODAS as pendentes. Sem limitar, `apply-normalization` aplicaria
# as cinco de uma vez, e os checkpoints deixariam de existir.
#
# A CLI oferece `--workdir` oficialmente. O workdir e montado com os arquivos ATE a versao
# alvo, COPIADOS dos versionados e conferidos por hash -- nunca editados, nunca renomeados,
# nunca reescritos. Um arquivo cujo hash nao bate aborta a operacao: copiar errado e
# indistinguivel de aplicar outra coisa.
# -----------------------------------------------------------------------------
montar_workdir() {
  local ate="$1" wd="$TRABALHO/workdir" arquivo versao copiadas=0
  mkdir -p "$wd/supabase/migrations"
  cp "$REPO_ROOT/supabase/config.toml" "$wd/supabase/config.toml"

  for arquivo in "$REPO_ROOT/supabase/migrations"/*.sql; do
    versao="$(basename "$arquivo" | cut -d_ -f1)"
    if [ "$versao" \> "$ate" ]; then continue; fi
    cp "$arquivo" "$wd/supabase/migrations/$(basename "$arquivo")"
    if [ "$(shasum -a 256 <"$arquivo" | cut -d' ' -f1)" != "$(shasum -a 256 <"$wd/supabase/migrations/$(basename "$arquivo")" | cut -d' ' -f1)" ]; then
      erro "A copia de $(basename "$arquivo") nao confere com o original."
      return 1
    fi
    copiadas=$((copiadas + 1))
  done

  echo "workdir efemero: $copiadas migration(s) ate $ate, todas conferidas por hash"
  printf '%s' "$wd"
}

supabase_cli() { supabase "$@"; }

# -----------------------------------------------------------------------------
# 10. EXECUCAO.
# -----------------------------------------------------------------------------
case "$OPERACAO" in
  plan)
    titulo "PLAN — auditoria read-only; nenhuma escrita"

    # Colisoes de normalizacao. O `REINDEX` de 20260803000000 FALHA se duas linhas so forem
    # distintas pelo espacamento -- e falhar e o comportamento certo. Descobrir isso aqui,
    # com calma, e o proposito.
    titulo "Relatorio de colisoes de normalizacao"
    if consultar "30-quantity-input.sql" "$TRABALHO/produtos.json" '^\['; then
      if bun "$REPO_ROOT/scripts/normalization-collisions.ts" "$TRABALHO/produtos.json" >"$TRABALHO/colisoes.txt" 2>&1; then
        fato "colisoes.status" "vazio"
      else
        fato "colisoes.status" "encontradas"
      fi
      # O relatorio traz nome, marca e variante de produto. Nao e dado pessoal, mas tambem
      # nao precisa ir para o Job Summary: o que decide o gate e o status.
      grep -cE '^' "$TRABALHO/colisoes.txt" >/dev/null 2>&1 || true
      rm -f "$TRABALHO/produtos.json"
    else
      fato "colisoes.status" "nao_medido"
    fi

    # CONTROLE POSITIVO do relatorio de colisoes. Sem ele, "0 colisoes" e indistinguivel de
    # "o detector nao funciona" -- e a segunda leitura passaria verde exatamente igual.
    titulo "Controle positivo do detector de colisoes"
    printf '%s\n' '[{"id":"a","name":"cafe  torrado","brand":"x","variant":null,"size_text":"500 g"},{"id":"b","name":"cafe torrado","brand":"x","variant":null,"size_text":"500 g"}]' >"$TRABALHO/sintetico.json"
    if bun "$REPO_ROOT/scripts/normalization-collisions.ts" "$TRABALHO/sintetico.json" >/dev/null 2>&1; then
      abortar "COLLISION DETECTOR BROKEN" \
        "O detector de colisoes aceitou um par sinteticamente colidente. Enquanto ele nao reprovar esse par, um relatorio vazio contra staging nao prova nada."
    fi
    echo "controle positivo: o detector reprovou o par sintetico, como deve"

    titulo "Migrations pendentes segundo a CLI oficial (dry-run)"
    if supabase_cli db push --db-url "$DB_URL" --dry-run --yes >"$TRABALHO/pendentes.txt" 2>&1; then
      sed 's/postgresql:\/\/[^ ]*/<conexao omitida>/g' "$TRABALHO/pendentes.txt"
    else
      sed 's/postgresql:\/\/[^ ]*/<conexao omitida>/g' "$TRABALHO/pendentes.txt" >&2
      aviso "O dry-run da CLI nao completou. O plano segue com a medicao por SQL, que e a fonte do gate."
    fi
    ;;

  adopt-seven-baseline)
    titulo "ADOCAO DO BASELINE — sete versoes, mecanismo oficial"
    # `migration repair --status applied` e o mecanismo oficial de registrar versao ja
    # aplicada. NENHUMA linha e inserida a mao na tabela de historico: escrever ali por
    # SQL produziria um historico que a CLI nao reconhece como seu.
    WORKDIR="$(montar_workdir 99999999999999 | tail -1)"
    # shellcheck disable=SC2046 # as versoes sao argumentos separados, por contrato da CLI
    supabase_cli migration repair --status applied \
      $(bun "$APPLY_DIR/baseline-versions.ts") \
      --workdir "$WORKDIR" --db-url "$DB_URL" --yes
    ;;

  apply-normalization | apply-core-hardening | apply-contribution-hardening | apply-r2a | apply-r2b)
    titulo "APLICACAO DE UMA migration: $VERSAO_ALVO"
    WORKDIR="$(montar_workdir "$VERSAO_ALVO" | tail -1)"
    supabase_cli db push --workdir "$WORKDIR" --db-url "$DB_URL" --yes
    ;;

  remediate-demo-gtins)
    titulo "REMEDIACAO DOS DOIS GTINs DEMO — transacao unica"
    # `ON_ERROR_STOP` e obrigatorio: sem ele o psql seguiria para o `COMMIT` depois de um
    # `RAISE EXCEPTION`, e a transacao abortada terminaria em commit de nada com exit 0.
    psql --no-psqlrc --no-password --quiet \
      --variable=ON_ERROR_STOP=1 \
      --file="$APPLY_DIR/sql/remediate-demo-gtins.sql"
    ;;

  validate)
    titulo "VALIDATE — auditoria read-only do estado final"
    ;;

  *)
    abortar "OPERATION UNKNOWN" "Operacao '$OPERACAO' nao existe."
    ;;
esac

# -----------------------------------------------------------------------------
# 11. G7-POST -- so depois de R2-A, porque so depois dela as colunas existem.
#
# Rodar antes seria a circularidade que R2.4 desfez: o gate exigiria uma prova que so a
# migration podia produzir. A saida NAO e publicada: ela contem GTIN completo.
# -----------------------------------------------------------------------------
if [ "$OPERACAO" = "apply-r2a" ]; then
  titulo "G7-POST (saida nao publicada: contem GTIN completo)"
  if psql --no-psqlrc --no-password --quiet --no-align --tuples-only \
    --variable=ON_ERROR_STOP=1 \
    --file="$REPO_ROOT/scripts/r2/target-readiness-post.sql" >"$TRABALHO/g7.txt" 2>"$TRABALHO/g7.err"; then
    fato "g7post.status" "PASS"
    relatar ""
    relatar "**G7-POST: PASS.** As consultas do schema pos-R2-A rodaram por inteiro; saida retida por conter GTIN completo."
  else
    fato "g7post.status" "FAIL"
    rm -f "$TRABALHO/g7.txt" "$TRABALHO/g7.err"
    abortar "G7 POST FAILED" \
      "R2-A foi aplicada, mas G7-POST reprovou. A sequencia PARA aqui: R2-B nao roda sobre um estado que a prontidao nao confirma."
  fi
  rm -f "$TRABALHO/g7.txt" "$TRABALHO/g7.err"
fi

# -----------------------------------------------------------------------------
# 12. VERIFICACAO POSTERIOR.
#
# Toda operacao de escrita reafirma, por medicao independente, que o estado ficou onde
# deveria. Uma operacao que roda sem erro e uma operacao que nao levantou excecao -- nao a
# mesma coisa que uma operacao que fez o que prometeu.
# -----------------------------------------------------------------------------
titulo "Verificacao posterior"
: >"$TRABALHO/fatos-depois.txt"
FATOS_ORIGINAL="$FATOS"
FATOS="$TRABALHO/fatos-depois.txt"
consultar "00-structure.sql" "$TRABALHO/structure2.txt" && cat "$TRABALHO/structure2.txt" >>"$FATOS"
if grep -q '^history.table_present|true$' "$FATOS"; then
  consultar "10-migration-history.sql" "$TRABALHO/history2.txt" && cat "$TRABALHO/history2.txt" >>"$FATOS"
fi
consultar "20-content.sql" "$TRABALHO/content2.txt" && cat "$TRABALHO/content2.txt" >>"$FATOS"
consultar "50-privileges.sql" "$TRABALHO/priv2.txt" && cat "$TRABALHO/priv2.txt" >>"$FATOS"

if ! bun "$APPLY_DIR/check-after.ts" "$OPERACAO" "$FATOS_ORIGINAL" "$FATOS" >"$TRABALHO/depois.txt" 2>"$TRABALHO/depois.err"; then
  cat "$TRABALHO/depois.err" >&2 || true
  relatar ""
  relatar "$(cat "$TRABALHO/depois.err" 2>/dev/null || true)"
  abortar "POST STATE UNEXPECTED" \
    "A operacao \`$OPERACAO\` rodou, mas o estado posterior nao e o esperado. NAO continue a sequencia sem investigar."
fi
cat "$TRABALHO/depois.txt"
relatar ""
relatar "$(cat "$TRABALHO/depois.txt")"

relatar ""
if [ "$ESCREVE" = "true" ]; then
  relatar "## \`OPERATION COMPLETED\`"
  relatar ""
  relatar "Operacao \`$OPERACAO\` concluida. Historico de migrations: **$HISTORICO_ANTES → $HISTORICO_DEPOIS**."
elif [ "$OPERACAO" = "plan" ]; then
  relatar "## \`CONTROLLED STAGING APPLY PLAN READY\`"
  relatar ""
  relatar "Nenhuma escrita foi emitida. O plano acima descreve o estado medido e a proxima operacao."
else
  relatar "## \`VALIDATION COMPLETED\`"
  relatar ""
  relatar "Nenhuma escrita foi emitida."
fi
relatar ""
relatar "Producao nao foi contatada. Nenhum deploy foi feito. Nenhum backfill foi executado."

publicar_resumo
echo ""
echo "==> Concluido: $OPERACAO"
