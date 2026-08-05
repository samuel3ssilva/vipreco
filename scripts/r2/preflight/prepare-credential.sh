#!/usr/bin/env bash
# =============================================================================
# R2.3D - PREPARO DA CREDENCIAL DE STAGING A PARTIR DE UM SEGREDO ATOMICO
#
# Sourced por `run.sh`. Nao e executavel sozinho: expoe funcoes.
#
# POR QUE ESTE ARQUIVO SUBSTITUIU UMA CADEIA INTEIRA
#
#   O desenho anterior guardava a connection string completa num unico segredo
#   (`SUPABASE_DB_URL`) e a decompunha em tempo de execucao. Cinco defeitos sairam
#   dessa decomposicao, e o que os une importa mais que cada um deles:
#
#     `+` virava espaco          `+` e um mais literal em URI; quem troca `+` por
#                                espaco e o formato de formulario.
#     `%` sem hex valido         `printf '%b'` cuspia `\x` literal.
#     `\n`, `\t`, `\\`           `printf '%b'` tratava a senha como FORMATO, e nao
#                                como dado.
#     split no primeiro `@`      o corte correto e no ULTIMO `@`.
#     `read` com `IFS='='`       comia o `=` de padding do base64 (`postgres` virava
#                                `postgr`) -- e falhava barulhento no GNU do CI e
#                                MUDO no macOS de quem escreveu.
#
#   Nenhum dos cinco FALHA. Todos entregam uma senha silenciosamente diferente, e
#   uma senha diferente volta do Postgres com exatamente a mesma mensagem de uma
#   credencial invalida: `password authentication failed`. Um defeito que se
#   disfarca de problema do outro lado e o pior tipo que existe, porque manda
#   investigar o lugar errado -- e mandou, tres vezes seguidas.
#
#   A licao nao e "escrever um parser melhor". E que a connection string carregava
#   cinco campos, quatro dos quais ja eram conhecidos e versionados, e so um era
#   segredo. Montar a mao os quatro conhecidos, so para decompo-los de novo depois,
#   criava superficie de erro do nada.
#
#   Agora o segredo carrega SO a senha. Host, porta, usuario e banco vem de
#   `config/environments.json`. Nao ha URI, nao ha parsing, nao ha percent-encoding,
#   nao ha base64 -- e portanto nao ha como esta classe de defeito voltar.
#
# ENTRADA (ambiente)
#   SUPABASE_DB_PASSWORD   a Database password do projeto Supabase de STAGING, e
#                          nada alem dela. Nunca uma URI, nunca `service_role`.
#
# O QUE NUNCA SAI DAQUI
#   o valor da senha, seu comprimento, seu hash, seu prefixo, seu sufixo. O unico
#   fato de forma emitido e um bit -- "e alfanumerico puro, sim ou nao" -- e ele
#   existe porque a ausencia exata desse bit custou tres execucoes desta missao.
# =============================================================================

# Constantes da conexao. Nao vem de segredo.
#
# POR QUE O POOLER, E NAO A CONEXAO DIRETA
#
#   A primeira versao de R2.3D derivava o host da conexao DIRETA,
#   `db.<ref>.supabase.co`, e isso foi um defeito meu. Esse host e IPv6-only, e
#   runner do GitHub e IPv4-only: o run 31030456630 morreu em
#   `Network is unreachable` contra `2600:1f11:...` antes de qualquer troca de senha.
#
#   O host que funcionava nas missoes anteriores resolvia para IPv4 em
#   `ca-central-1` (medido, docs/evidence/r2/automation.md §8B) -- ou seja, era o
#   POOLER. Derivar a conexao direta trocou um host alcancavel por um inalcancavel,
#   e a mensagem de erro passou a falar de rede em vez de credencial.
#
#   O pooler em modo SESSION escuta na 5432 e exige o tenant no usuario:
#   `postgres.<project-ref>`. O ref continua vindo de config/environments.json, entao
#   a identidade do ambiente continua derivada de arquivo versionado -- e agora ela
#   vive no USUARIO, que e o unico campo que distingue staging de producao quando o
#   host do pooler e compartilhado por regiao.
PREFLIGHT_PORTA="5432"
PREFLIGHT_BANCO="postgres"

# Preenchidos por `preparar_credencial`. Declarados aqui para que `set -u` no runner
# nao tropece antes da chamada.
PREFLIGHT_HOST=""
PREFLIGHT_USUARIO=""

# Usuario do pooler: `postgres.<project-ref>`. NAO e configuravel e NAO vem de
# segredo -- e derivado do mesmo ref que identifica o ambiente, de proposito. Um
# usuario vindo de fora poderia apontar para outro tenant sem ninguem notar.
montar_usuario() {
  local ref="$1"
  if [ -z "$ref" ]; then
    echo "::error::Nao da para montar o usuario sem o project ref de staging." >&2
    return 1
  fi
  printf 'postgres.%s' "$ref"
}

# -----------------------------------------------------------------------------
# Validacao do segredo. Recusa, nao conserta.
#
# Consertar em silencio e exatamente o que transformou cinco defeitos em
# `password authentication failed`. Espaco em branco nas pontas e o mesmo tipo de
# armadilha um nivel acima: invisivel no campo de cadastro do GitHub, invisivel no
# log, e indistinguivel de senha errada na resposta do banco. Entao a resposta certa
# nao e aparar -- e recusar dizendo o motivo, para que o segredo seja reescrito.
# -----------------------------------------------------------------------------
validar_segredo() {
  local senha="${SUPABASE_DB_PASSWORD-}"

  if [ -z "$senha" ]; then
    echo "::error::SUPABASE_DB_PASSWORD nao esta no ambiente, ou esta vazio." >&2
    return 1
  fi

  case "$senha" in
    [[:space:]]* | *[[:space:]])
      echo "::error::O segredo SUPABASE_DB_PASSWORD comeca ou termina com espaco em branco (espaco, tabulacao ou quebra de linha). O valor nao e impresso. Isso nao e aparado aqui de proposito: aparar em silencio produziria uma senha diferente da cadastrada, que e a familia de defeito que esta mudanca existe para eliminar. Reescreva o segredo sem espaco nas pontas." >&2
      return 1
      ;;
  esac

  # Fato de FORMA, e um unico bit. Nao e o valor, nem comprimento, nem prefixo, nem
  # sufixo, nem hash. Existe porque este bit -- e so ele -- e o que teria localizado
  # o bloqueio de R2.3C na primeira execucao em vez da terceira.
  case "$senha" in
    *[!A-Za-z0-9]*)
      echo "::warning::O segredo SUPABASE_DB_PASSWORD contem caractere fora de [A-Za-z0-9]. Nada aqui quebra por causa disso -- o .pgpass aceita qualquer senha. O aviso existe porque o segredo foi descrito como alfanumerico puro, e a divergencia entre o que foi descrito e o que esta cadastrado e informacao util antes de qualquer erro de autenticacao." >&2
      ;;
  esac

  return 0
}

# -----------------------------------------------------------------------------
# O `.pgpass`.
#
# Formato do libpq: `hostname:port:database:username:password`, uma entrada por
# linha. `database` vem ANTES de `username` -- os dois valem `postgres` aqui, entao
# trocar a ordem nao quebraria nada hoje e quebraria calado no dia em que um deles
# mudasse.
#
# O arquivo e IGNORADO pelo libpq se o modo for mais permissivo que 0600, e ignorado
# em silencio: `psql` se comportaria como se nao houvesse senha nenhuma. Por isso o
# `umask 077` na criacao E o `chmod 600` depois -- o umask garante que o arquivo
# nunca existe permissivo nem por um instante, e o chmod garante o modo final mesmo
# se o arquivo ja existisse.
#
# `\` e `:` precisam de escape, e NESTA ordem: escapar `:` antes de `\` faria a barra
# do proprio escape ser escapada em seguida. A senha de staging e alfanumerica e nada
# disso se aplica a ela -- o escape existe para que o arquivo continue correto no dia
# em que a senha deixar de ser, sem que ninguem precise lembrar disso.
#
# `printf '%s'` trata o valor como DADO. `printf '%b'` o trataria como formato, que
# foi um dos cinco defeitos. A diferenca nao e estilistica.
# -----------------------------------------------------------------------------
escrever_pgpass() {
  local host="$1" destino="$2"
  local senha="${SUPABASE_DB_PASSWORD-}" escapada

  escapada="${senha//\\/\\\\}"
  escapada="${escapada//:/\\:}"

  (
    umask 077
    printf '%s:%s:%s:%s:%s\n' \
      "$host" "$PREFLIGHT_PORTA" "$PREFLIGHT_BANCO" "$PREFLIGHT_USUARIO" "$escapada" \
      >"$destino"
  ) || return 1
  chmod 600 "$destino"
}

# -----------------------------------------------------------------------------
# Ponto de entrada unico. Guardas primeiro, arquivo depois.
#
# A ordem importa: nenhuma escrita de credencial acontece antes de o ambiente estar
# provado. E as guardas de ambiente rodam antes da validacao do segredo porque um
# ref ausente ou um ref de producao sao problemas piores que um segredo ausente, e
# quem le o log precisa ver o pior primeiro.
#
# Argumentos: <ref-staging> <ref-producao> <host-do-pooler> <caminho-do-pgpass>
# -----------------------------------------------------------------------------
preparar_credencial() {
  local ref_staging="$1" ref_producao="$2" host="$3" destino="$4"

  # Falha ABERTA se ninguem exigir os dois refs: com `ref_producao` vazio, qualquer
  # comparacao com `*""*` casa sempre, e a recusa de producao passaria calada. E o
  # pior tipo de defeito -- a guarda parece estar la, e nao esta.
  if [ -z "$ref_staging" ] || [ -z "$ref_producao" ]; then
    echo "::error::Os project refs de staging e de producao precisam estar os dois presentes. Sem eles a recusa de producao nao e verificavel, e uma guarda que nao e verificavel nao e guarda." >&2
    return 1
  fi

  if [ "$ref_staging" = "$ref_producao" ]; then
    echo "::error::O project ref de staging e o de producao sao IGUAIS em config/environments.json. Abortando: neste estado nenhuma guarda consegue distinguir os dois ambientes." >&2
    return 1
  fi

  if [ -z "$host" ]; then
    echo "::error::config/environments.json nao traz staging.supabaseDbHost. Copie o host do painel: Supabase > Project Settings > Database > Connection string > Session pooler. E publico, e nao e segredo." >&2
    return 1
  fi

  PREFLIGHT_HOST="$host"
  PREFLIGHT_USUARIO="$(montar_usuario "$ref_staging")" || return 1

  # A IDENTIDADE DO AMBIENTE VIVE NO USUARIO, e nao no host.
  #
  # O host do pooler e compartilhado por REGIAO: dois projetos na mesma regiao usam o
  # mesmo hostname. Conferir o ambiente pelo host seria uma guarda que parece existir
  # e nao existe -- o pior tipo. Quem carrega o tenant e `postgres.<project-ref>`.
  #
  # A recusa continua valendo para os dois campos: se um deles mencionar o ref de
  # producao, aborta. Nenhum dos dois pode; o usuario e derivado do ref de staging, e
  # o host vem de arquivo versionado.
  case "$PREFLIGHT_USUARIO $PREFLIGHT_HOST" in
    *"$ref_producao"*)
      echo "::error::A conexao montada menciona o projeto de PRODUCAO. Abortando sem abrir conexao. Este preflight so pode ler staging." >&2
      return 1
      ;;
  esac
  case "$PREFLIGHT_USUARIO" in
    *"$ref_staging"*) ;;
    *)
      echo "::error::O usuario montado nao contem o project ref de staging. Abortando: identificar o ambiente sem ambiguidade e pre-requisito, nao formalidade." >&2
      return 1
      ;;
  esac

  validar_segredo || return 1
  escrever_pgpass "$PREFLIGHT_HOST" "$destino" || return 1
}
