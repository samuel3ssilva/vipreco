#!/usr/bin/env bash
# =============================================================================
# R2.3E - DIAGNOSTICO DE FALHA DE CONEXAO
#
# Sourced por `run.sh`. Nao e executavel sozinho: expoe uma funcao.
#
# POR QUE ISSO E UM ARQUIVO PROPRIO
#   Porque a versao anterior estava DENTRO do runner, nao lia o erro do psql, e
#   imprimia hipoteses sobre a SENHA em qualquer falha. No run 31030456630 a falha
#   foi `Network is unreachable` -- o TCP nunca abriu, a senha nunca foi testada --
#   e o texto mandava conferir a credencial.
#
#   E a mesma familia de defeito que a R2.3D existe para eliminar, um nivel acima:
#   uma mensagem que se disfarca de resposta e manda investigar o lugar errado. Ter
#   como arquivo separado e o que permite EXECUTAR o diagnostico num teste, com
#   erros reais de psql, em vez de conferir o texto por regex.
#
# ENTRADA (ambiente)
#   ERRO_PSQL   caminho do arquivo com o stderr do psql. Ausente ou vazio cai no
#               ramo inconclusivo, que e o certo: sem o erro nao ha o que concluir.
# =============================================================================

# que a R2.3D existe para eliminar, um nivel acima.
#
# Nao existe segunda tentativa de credencial. A que existia saiu com a URI: com um
# segredo atomico ha uma leitura so da senha.
diagnostico_de_conexao() {
  local erro=""
  [ -f "$ERRO_PSQL" ] && erro="$(cat "$ERRO_PSQL")"
  echo "--- diagnostico de conexao (nenhum valor e impresso) ---" >&2

  if printf '%s' "$erro" | grep -qiE 'network is unreachable|no route to host|could not translate host name|name or service not known|connection refused|connection timed out|timeout expired'; then
    cat >&2 <<'AJUDA'
O TCP NUNCA ABRIU. A senha nao chegou a ser testada -- este erro e anterior a qualquer
autenticacao, entao nao ha nada a concluir sobre `SUPABASE_DB_PASSWORD`.

O host vem de `staging.supabaseDbHost` em config/environments.json, e precisa ser o do
POOLER, nao o da conexao direta:

  - conexao direta (`db.<ref>.supabase.co`) e IPv6-only, e runner do GitHub e
    IPv4-only. Foi assim que este preflight quebrou em 05/08: `Network is unreachable`
    contra um endereco `2600:...`;
  - o pooler em modo Session e IPv4, escuta na 5432, e exige usuario
    `postgres.<project-ref>` -- que o runner deriva sozinho do ref versionado.

Copie o host de: Supabase > Project Settings > Database > Connection string >
Session pooler. E publico, nao e segredo, e vai versionado no repositorio.
AJUDA
    return
  fi

  if printf '%s' "$erro" | grep -qiE 'password authentication failed|authentication failed|no password supplied'; then
    cat >&2 <<'AJUDA'
O SERVIDOR RESPONDEU E RECUSOU. O TCP abriu, o TLS completou, e o Postgres leu a senha
do `.pgpass` -- ou seja, o problema esta no valor, e nao no caminho.

Como o segredo e ATOMICO (`SUPABASE_DB_PASSWORD` carrega so a senha; host, porta,
usuario e banco vem de config/environments.json), nao ha URI para montar errado, nem
percent-encoding, nem base64. Entao restam:
  1. e a senha da CONTA do Supabase (a do painel), e nao a do BANCO;
  2. e a senha de outro projeto -- producao, ou um projeto antigo;
  3. e uma connection string inteira colada no lugar da senha;
  4. a senha foi redefinida no painel depois de o segredo ter sido gravado.
Confira tambem o usuario que o servidor cita de volta: o pooler espera
`postgres.<project-ref>`, e ele NAO e mascarado no log de proposito.
Nenhuma delas se resolve daqui: o segredo so pode ser reescrito pelo Founder.
AJUDA
    return
  fi

  cat >&2 <<'AJUDA'
O erro do psql nao e de rede nem de autenticacao -- veja a mensagem acima. Nada a
concluir sobre `SUPABASE_DB_PASSWORD` nem sobre o host a partir daqui.
AJUDA
}

