#!/usr/bin/env bash
# Drill de ROLLBACK e REAPLICACAO das migrations de R2.
#
# POR QUE ESTE ESTAGIO EXISTE
#
# As duas migrations de R2 documentam o proprio rollback em comentario. Um bloco de
# rollback que nunca foi executado e uma ALEGACAO, nao um fato -- e a hora de descobrir que
# ele tem um nome errado ou uma ordem de dependencia invertida nao e durante a reversao,
# com o Founder olhando.
#
# O SQL NAO E COPIADO. Ele e extraido do proprio arquivo da migration, entre os marcadores
# ROLLBACK-SQL-BEGIN e ROLLBACK-SQL-END. Duplicar o bloco aqui criaria exatamente a
# divergencia que este estagio deveria impedir: o comentario diria uma coisa, o drill
# provaria outra, e as duas pareceriam corretas.
#
# O QUE ELE PROVA, contra Postgres vivo:
#   1. o rollback documentado EXECUTA sem erro, na ordem em que esta escrito;
#   2. depois dele, os objetos criados por R2 realmente sumiram;
#   3. as migrations REAPLICAM sobre o banco revertido;
#   4. depois da reaplicacao, os objetos voltaram.
#
# Roda por ultimo, depois das assertions, porque e o unico estagio que muda o schema.
set -euo pipefail

CONTAINER_NAME="$1"
MIGRATIONS_DIR="$2"

R2A="$MIGRATIONS_DIR/20260803010000_product_identity_quantity.sql"
R2B="$MIGRATIONS_DIR/20260803020000_gtin_integrity.sql"
HARDENING_CONTRIB="$MIGRATIONS_DIR/20260803007500_contribution_table_privilege_hardening.sql"

psql_run() {
  docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres
}

# `-t -A` de proposito: sem eles o psql devolve cabecalho, alinhamento e "(1 row)" junto do
# numero, e a comparacao com "13" nunca bate -- o valor esta certo e o teste reprova.
psql_valor() {
  docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -q -t -A -U postgres -d postgres
}

# Extrai o SQL entre os marcadores e remove o prefixo de comentario. `sed` guarda apenas o
# miolo; o `s/^-- \{0,3\}//` tira o "-- " e a indentacao que o comentario acrescenta.
extrair_rollback() {
  sed -n '/ROLLBACK-SQL-BEGIN/,/ROLLBACK-SQL-END/p' "$1" \
    | grep -v 'ROLLBACK-SQL-\(BEGIN\|END\)' \
    | sed 's/^-- \{0,3\}//'
}

objetos_presentes() {
  psql_valor <<'SQL'
SELECT count(*) FROM (
  SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='products'
     AND column_name IN ('package_type','quantity_value','quantity_unit','units_per_package')
  UNION ALL
  SELECT 1 FROM pg_class WHERE relname='products_exact_identity_idx'
  UNION ALL
  SELECT 1 FROM pg_constraint WHERE conname LIKE 'products_%'
     AND conname IN ('products_package_type_check','products_quantity_unit_check',
                     'products_quantity_value_positive','products_units_per_package_positive',
                     'products_quantity_pair_complete','products_gtin_valid')
  UNION ALL
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('pa_is_valid_gtin','pa_gtin_check_digit')
) t;
SQL
}

antes=$(objetos_presentes | tr -d ' \n')
echo "==> Antes do rollback: $antes objetos de R2 presentes (esperado 13)."
if [ "$antes" != "13" ]; then
  echo "::error::Estado inicial inesperado: $antes objetos de R2, esperado 13." >&2
  exit 1
fi

echo "==> Executando o rollback DOCUMENTADO de R2-B (extraido do proprio arquivo)..."
extrair_rollback "$R2B" | psql_run

echo "==> Executando o rollback DOCUMENTADO de R2-A..."
extrair_rollback "$R2A" | psql_run

depois=$(objetos_presentes | tr -d ' \n')
echo "==> Depois do rollback: $depois objetos de R2 presentes (esperado 0)."
if [ "$depois" != "0" ]; then
  echo "::error::O rollback documentado nao removeu tudo: sobraram $depois objeto(s). O bloco de ROLLBACK das migrations esta incompleto." >&2
  exit 1
fi

echo "==> Reaplicando R2-A e R2-B sobre o banco revertido..."
psql_run < "$R2A"
psql_run < "$R2B"

final=$(objetos_presentes | tr -d ' \n')
echo "==> Depois da reaplicacao: $final objetos de R2 presentes (esperado 13)."
if [ "$final" != "13" ]; then
  echo "::error::A reaplicacao nao restaurou o schema: $final objetos, esperado 13." >&2
  exit 1
fi

echo "==> Rollback e reaplicacao de R2 confirmados contra banco vivo."

# ============================================================================
# R2.6 - a mesma prova, para o hardening de privilegio das tabelas de contribuicao.
#
# Uma migration que so REVOGA tem um modo de falha silencioso proprio: `REVOKE` nao levanta
# erro quando nao ha o que revogar, nem quando revoga do papel errado. Um drill que so mede
# o estado final nao distingue "revogou" de "nunca teve" -- foi exatamente esse o defeito
# que deixou o drill verde por dois meses enquanto staging tinha 42 privilegios de escrita
# por papel.
#
# O ciclo abaixo elimina a ambiguidade medindo os TRES estados: 0 privilegios publicos
# depois da migration, 36 depois do rollback documentado, 0 de novo depois da reaplicacao.
# 36 = 3 tabelas x 2 papeis x 6 privilegios -- todos menos INSERT, que a Onda 3 revogou e
# que o rollback DESTA migration nao pode devolver.
# ============================================================================
privilegios_publicos_de_contribuicao() {
  psql_valor <<'SQL'
SELECT count(*)
FROM unnest(ARRAY['price_submissions','product_watch_requests','decision_feedback']) AS t(tabela)
CROSS JOIN unnest(ARRAY['anon','authenticated']) AS p(papel)
CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) AS v(priv)
WHERE has_table_privilege(p.papel, format('public.%I', t.tabela), v.priv);
SQL
}

conferir_privilegios() {
  local esperado="$1" momento="$2" atual
  atual=$(privilegios_publicos_de_contribuicao | tr -d ' \n')
  echo "==> $momento: $atual privilegio(s) publico(s) nas tabelas de contribuicao (esperado $esperado)."
  if [ "$atual" != "$esperado" ]; then
    echo "::error::$momento: esperado $esperado, medido $atual." >&2
    exit 1
  fi
}

conferir_privilegios 0 "Antes do rollback do hardening"

echo "==> Executando o rollback DOCUMENTADO do hardening de contribuicao (extraido do proprio arquivo)..."
extrair_rollback "$HARDENING_CONTRIB" | psql_run

# Este numero e o coracao do estagio. Se ele desse 0, o rollback nao teria devolvido nada --
# e a passagem seguinte, de volta a 0, seria indistinguivel de um banco onde a migration
# nunca precisou fazer coisa alguma.
conferir_privilegios 36 "Depois do rollback do hardening"

echo "==> Reaplicando o hardening de contribuicao sobre o banco revertido..."
psql_run < "$HARDENING_CONTRIB"

conferir_privilegios 0 "Depois da reaplicacao do hardening"

echo "==> Rollback e reaplicacao do hardening de privilegio confirmados contra banco vivo."
