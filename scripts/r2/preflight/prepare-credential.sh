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

# Constantes da conexao direta do Postgres do Supabase. Nao vem de segredo e nao sao
# configuraveis: conexao direta e sempre porta 5432, usuario `postgres`, banco
# `postgres`. O pooler usaria `postgres.<ref>` e outra porta -- e por isso o usuario
# ficar FIXO aqui e uma garantia, e nao uma simplificacao: um usuario vindo de
# segredo poderia apontar para o pooler sem ninguem notar.
PREFLIGHT_PORTA="5432"
PREFLIGHT_USUARIO="postgres"
PREFLIGHT_BANCO="postgres"

# Preenchido por `preparar_credencial`. Declarado aqui para que `set -u` no runner
# nao tropece antes da chamada.
PREFLIGHT_HOST=""

# Host de conexao direta a partir do project ref. O ref e publico (aparece na URL da
# API) e e versionado em config/environments.json.
montar_host() {
  local ref="$1"
  if [ -z "$ref" ]; then
    echo "::error::Nao da para montar o host sem o project ref de staging." >&2
    return 1
  fi
  printf 'db.%s.supabase.co' "$ref"
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
# Argumentos: <ref-staging> <ref-producao> <caminho-do-pgpass>
# -----------------------------------------------------------------------------
preparar_credencial() {
  local ref_staging="$1" ref_producao="$2" destino="$3"

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

  PREFLIGHT_HOST="$(montar_host "$ref_staging")" || return 1

  # O host e CONSTRUIDO a partir do ref de staging, entao ele so poderia conter o ref
  # de producao se os dois refs fossem iguais -- e isso ja foi recusado acima. Esta
  # verificacao e, hoje, uma asserção sobre a construcao, e nao a validacao de um
  # valor externo como era quando o host vinha da URI cadastrada a mao.
  #
  # Ela fica porque e o que falha alto no dia em que alguem reintroduzir um host vindo
  # de fora: a guarda para de ser tautologica no exato momento em que passa a ser
  # necessaria de novo, sem depender de ninguem lembrar de recria-la.
  case "$PREFLIGHT_HOST" in
    *"$ref_producao"*)
      echo "::error::O host montado aponta para o projeto de PRODUCAO. Abortando sem abrir conexao. Este preflight so pode ler staging." >&2
      return 1
      ;;
  esac
  case "$PREFLIGHT_HOST" in
    *"$ref_staging"*) ;;
    *)
      echo "::error::O host montado nao contem o project ref de staging. Abortando: identificar o ambiente sem ambiguidade e pre-requisito, nao formalidade." >&2
      return 1
      ;;
  esac

  validar_segredo || return 1
  escrever_pgpass "$PREFLIGHT_HOST" "$destino" || return 1
}
