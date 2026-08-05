-- =============================================================================
-- R2.6 §20 - REMEDIACAO DOS DOIS GTINs DEMO INVALIDOS.
--
-- UNICO arquivo deste repositorio que ALTERA DADO em ambiente remoto. Ele muda uma
-- coluna, `products.gtin`, de dois registros ficticios (`is_demo = true`), para NULL.
--
-- POR QUE ISTO PRECISA EXISTIR
--
-- R2-B (20260803020000) cria `products_gtin_valid`. Um GTIN invalido presente faz a
-- validacao da constraint FALHAR -- no meio de uma migration, que e o pior lugar do mundo
-- para descobrir um problema de dado. Os dois codigos sao ficticios, foram inventados para
-- o seed de demonstracao antes de existir validacao de digito verificador, e nao
-- correspondem a produto nenhum. NULL e a resposta certa: o campo e opcional, e um GTIN
-- inventado e pior que GTIN nenhum -- ele parece um identificador.
--
-- POR QUE NAO E BACKFILL
--
-- Backfill PREENCHE campo a partir de inferencia. Isto ESVAZIA um campo cujo conteudo e
-- comprovadamente invalido. Nenhum valor e calculado, adivinhado ou derivado; nenhuma
-- coluna de R2-A e tocada; `size_text` nao e lido nem escrito. As proibicoes de backfill
-- do mandato continuam integrais.
--
-- O DESENHO: A TRANSACAO SE RECUSA A CONFIAR EM SI MESMA
--
-- Tudo -- pre-condicoes, alteracao e verificacao -- roda dentro de UMA transacao. Qualquer
-- `RAISE EXCEPTION` aqui dentro aborta o conjunto inteiro; nao existe estado parcial. As
-- pre-condicoes sao medidas DENTRO da transacao, e nao antes: medir fora e agir dentro
-- deixa uma janela entre a medicao e o ato, e uma janela e onde mora a surpresa.
--
-- A verificacao final reavalia a validade com a expressao INTEIRA de novo, em vez de
-- confiar que o UPDATE fez o que o SELECT anterior previu. Um `ROW_COUNT` igual a 2 prova
-- que duas linhas mudaram; nao prova que eram as duas certas.
--
-- A EXPRESSAO DE VALIDADE E A MESMA de `scripts/r2/preflight/20-content.sql`. Copia-la e
-- ruim; divergir dela seria pior -- o preflight diria "2 invalidos" e esta transacao
-- poderia enxergar outro conjunto. Qualquer mudanca em uma exige a mesma na outra, e
-- `apply.test.ts` falha se as duas deixarem de casar.
-- =============================================================================

BEGIN;

SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '120s';

DO $remediacao$
DECLARE
  total_produtos int;
  produtos_demo int;
  duplicados int;
  alvos uuid[];
  alterados int;
  restantes int;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. O ambiente e o que dizemos que e?
  -- ---------------------------------------------------------------------------
  SELECT count(*), count(*) FILTER (WHERE is_demo) INTO total_produtos, produtos_demo
  FROM public.products;

  IF total_produtos <> 7 THEN
    RAISE EXCEPTION 'products tem % linha(s), e a remediacao so roda contra as 7 do seed de demonstracao. Abortando sem alterar nada.', total_produtos;
  END IF;

  IF produtos_demo <> total_produtos THEN
    RAISE EXCEPTION 'ha % produto(s) com is_demo = false. Esta transacao so pode tocar dado ficticio. Abortando sem alterar nada.', total_produtos - produtos_demo;
  END IF;

  SELECT count(*) INTO duplicados
  FROM (SELECT gtin FROM public.products WHERE gtin IS NOT NULL GROUP BY gtin HAVING count(*) > 1) d;

  IF duplicados <> 0 THEN
    RAISE EXCEPTION 'ha % GTIN(s) duplicado(s). Duplicata e achado novo e decisao do Founder/PMO, nao desta transacao. Abortando.', duplicados;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. Exatamente dois invalidos, nem um a mais.
  --
  -- Tres seria achado novo. Um seria estado que ninguem descreveu. Zero significa que a
  -- operacao ja rodou -- e abrir transacao para nao fazer nada e pior do que recusar,
  -- porque produz um run verde que parece ter feito alguma coisa.
  -- ---------------------------------------------------------------------------
  SELECT array_agg(a.id ORDER BY a.id) INTO alvos
  FROM (
    SELECT
      c.id,
      c.gtin ~ '^[0-9]+$'               AS so_digitos,
      length(c.gtin) IN (8, 12, 13, 14) AS comprimento_gs1,
      CASE
        WHEN c.gtin ~ '^[0-9]+$' AND length(c.gtin) IN (8, 12, 13, 14) THEN (
          SELECT (10 - (SUM(
            (substr(c.gtin, length(c.gtin) - 1 - i, 1))::integer
              * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
          ) % 10)) % 10
          FROM generate_series(0, length(c.gtin) - 2) AS i
        )
      END                               AS digito_calculado,
      CASE
        WHEN c.gtin ~ '^[0-9]+$' AND length(c.gtin) IN (8, 12, 13, 14)
        THEN (substr(c.gtin, length(c.gtin), 1))::integer
      END                               AS digito_declarado
    FROM (SELECT id, gtin FROM public.products WHERE gtin IS NOT NULL) c
  ) a
  WHERE NOT a.so_digitos
     OR NOT a.comprimento_gs1
     OR a.digito_calculado IS DISTINCT FROM a.digito_declarado;

  IF coalesce(array_length(alvos, 1), 0) <> 2 THEN
    RAISE EXCEPTION 'foram encontrados % GTIN(s) invalido(s), e esta transacao exige exatamente 2. Abortando sem alterar nada.', coalesce(array_length(alvos, 1), 0);
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. A unica escrita. Uma coluna, dois registros.
  --
  -- `SET gtin = NULL` e nada mais: nenhum outro campo aparece no SET, entao nenhum outro
  -- campo pode mudar. `WHERE id = ANY(alvos)` usa a lista ja medida, e nao reavalia a
  -- condicao -- reavaliar aqui abriria a chance de o conjunto ser outro.
  -- ---------------------------------------------------------------------------
  UPDATE public.products SET gtin = NULL WHERE id = ANY(alvos);
  GET DIAGNOSTICS alterados = ROW_COUNT;

  IF alterados <> 2 THEN
    RAISE EXCEPTION 'o UPDATE atingiu % linha(s), e a transacao exige exatamente 2. Revertendo.', alterados;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Verificacao INDEPENDENTE, ainda dentro da transacao.
  --
  -- ROW_COUNT = 2 prova que duas linhas mudaram. Nao prova que eram as duas certas, nem
  -- que nao sobrou uma terceira. Reavaliar a expressao inteira prova.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO restantes
  FROM (
    SELECT
      c.gtin ~ '^[0-9]+$'               AS so_digitos,
      length(c.gtin) IN (8, 12, 13, 14) AS comprimento_gs1,
      CASE
        WHEN c.gtin ~ '^[0-9]+$' AND length(c.gtin) IN (8, 12, 13, 14) THEN (
          SELECT (10 - (SUM(
            (substr(c.gtin, length(c.gtin) - 1 - i, 1))::integer
              * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
          ) % 10)) % 10
          FROM generate_series(0, length(c.gtin) - 2) AS i
        )
      END                               AS digito_calculado,
      CASE
        WHEN c.gtin ~ '^[0-9]+$' AND length(c.gtin) IN (8, 12, 13, 14)
        THEN (substr(c.gtin, length(c.gtin), 1))::integer
      END                               AS digito_declarado
    FROM (SELECT gtin FROM public.products WHERE gtin IS NOT NULL) c
  ) a
  WHERE NOT a.so_digitos
     OR NOT a.comprimento_gs1
     OR a.digito_calculado IS DISTINCT FROM a.digito_declarado;

  IF restantes <> 0 THEN
    RAISE EXCEPTION 'sobraram % GTIN(s) invalido(s) depois do UPDATE. Revertendo.', restantes;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. Nada alem do previsto mudou.
  -- ---------------------------------------------------------------------------
  SELECT count(*), count(*) FILTER (WHERE is_demo) INTO total_produtos, produtos_demo
  FROM public.products;

  IF total_produtos <> 7 OR produtos_demo <> 7 THEN
    RAISE EXCEPTION 'depois do UPDATE, products tem % linha(s) e % com is_demo. Esperado 7 e 7. Revertendo.', total_produtos, produtos_demo;
  END IF;

  SELECT count(*) INTO duplicados
  FROM (SELECT gtin FROM public.products WHERE gtin IS NOT NULL GROUP BY gtin HAVING count(*) > 1) d;

  IF duplicados <> 0 THEN
    RAISE EXCEPTION 'apareceram % GTIN(s) duplicado(s) depois do UPDATE. Revertendo.', duplicados;
  END IF;

  -- Sem valor de GTIN, sem id, sem nome de produto. So a contagem.
  RAISE NOTICE 'remediacao concluida: 2 GTIN(s) demo invalido(s) anulado(s); 7 produtos, todos is_demo, 0 invalidos, 0 duplicados';
END
$remediacao$;

COMMIT;
