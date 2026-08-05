#!/usr/bin/env bash
# =============================================================================
# R2.3B - LEITURA DOS COMPONENTES DA CONNECTION STRING
#
# Sourced por `run.sh`. Le na entrada padrao a saida de `parse-connection-url.ts`
# (`CHAVE=<base64>`, uma por linha) e define PGHOST, PGPORT, PGUSER, PGDATABASE,
# PGPASSFILE e FORMA_DA_URL.
#
# POR QUE ISSO E UM ARQUIVO SEPARADO
#   Para ter teste. A primeira versao vivia inline no `run.sh`, e por isso o parser
#   tinha suite e a leitura nao tinha nenhuma -- o defeito abaixo morou exatamente na
#   costura entre as duas coisas testadas, que e onde ninguem olhou.
#
# O DEFEITO QUE ESTA FUNCAO EXISTE PARA NAO REPETIR
#   `while IFS='=' read -r chave valor` parece a forma obvia de partir `CHAVE=valor`.
#   Ela nao e: `read` DESCARTA delimitadores no fim da linha, e o fim de toda linha
#   base64 e justamente `=`, o padding.
#
#     postgres -> cG9zdGdyZXM=  -> vira cG9zdGdyZXM  -> "postgr"
#     5432     -> NTQzMg==      -> vira NTQzMg       -> invalido
#
#   E o pior: o GNU base64 recusa com `invalid input`, enquanto o do macOS TRUNCA EM
#   SILENCIO. Ou seja, o mesmo codigo falha barulhento no CI e mudo na maquina de
#   quem escreveu -- e o sintoma que chega e `password authentication failed`, que
#   manda investigar o banco.
#
#   `IFS=` (vazio) desliga qualquer corte, e o corte passa a ser explicito, com
#   expansao de parametro que nao descarta nada.
# =============================================================================

carregar_componentes() {
  local linha chave valor decodificado
  while IFS= read -r linha; do
    [ -n "$linha" ] || continue
    chave="${linha%%=*}"
    valor="${linha#*=}"
    case "$chave" in
      PGHOST | PGPORT | PGUSER | PGDATABASE | PGPASSFILE)
        # Falhar aqui e obrigatorio: um componente vazio nao para nada sozinho, ele
        # so muda para onde o psql tenta conectar -- e depois se apresenta como erro
        # de credencial.
        if ! decodificado="$(printf '%s' "$valor" | base64 --decode 2>/dev/null)"; then
          echo "::error::Nao foi possivel decodificar o componente $chave. O valor nao e impresso." >&2
          return 1
        fi
        if [ -z "$decodificado" ]; then
          echo "::error::O componente $chave veio vazio. Abortando: componente vazio nao falha, so muda o destino da conexao." >&2
          return 1
        fi
        printf -v "$chave" '%s' "$decodificado"
        ;;
      FORMA) FORMA_DA_URL="$valor" ;;
    esac
  done
}
