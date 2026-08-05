-- =============================================================================
-- R2 - PRONTIDAO DO AMBIENTE ALVO, PARTE **POST-GTIN**: DEPOIS DE R2-B
--
-- Esta consulta saiu de `target-readiness-post.sql` em R2.6, e a razao e concreta: ela
-- chama `public.pa_is_valid_gtin()`, funcao que **R2-B** cria. O runner roda G7-POST logo
-- depois de R2-A, como o gate manda -- e ali a funcao ainda nao existe. O arquivo inteiro
-- morria em `function does not exist`, e um ambiente correto reprovava.
--
-- E a mesma licao da separacao PRE/POST, um nivel abaixo: um arquivo que mistura dois
-- momentos so pode passar num deles.
--
-- ESTRITAMENTE READ-ONLY. So SELECT e WITH sobre SELECT.
--
-- NAO devolve o codigo -- so o `id` e os dois vereditos. Qualquer linha na saida e uma
-- divergencia entre as duas implementacoes do mesmo algoritmo, e uma divergencia invalida
-- a auditoria PRE retroativamente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8. DEPOIS DE R2-B: a funcao de GTIN concorda com a aritmetica que a auditoria
--    usou ANTES da aplicacao.
--
--    A parte PRE calcula o digito verificador em linha porque precisa responder sem
--    a funcao. A partir daqui existem DUAS implementacoes do mesmo algoritmo no mesmo
--    banco, e duas implementacoes sao duas chances de divergir. Esta consulta compara
--    as duas sobre os GTINs que realmente existem no ambiente: qualquer linha na saida
--    e uma divergencia, e uma divergencia invalida a auditoria PRE retroativamente.
--
--    Nao devolve o codigo -- so o `id` e os dois vereditos.
-- -----------------------------------------------------------------------------
WITH avaliados AS (
  SELECT
    p.id,
    public.pa_is_valid_gtin(p.gtin) AS pela_funcao,
    -- `CASE`, e nao `AND`: o Postgres NAO garante ordem de avaliacao dos operandos de
    -- `AND`, entao o cast `::integer` poderia ser avaliado sobre um codigo com letra e
    -- abortar a consulta inteira. `CASE` garante a ordem. E a mesma protecao que a
    -- parte PRE usa, pelo mesmo motivo.
    CASE
      WHEN p.gtin !~ '^[0-9]+$' THEN false
      WHEN length(p.gtin) NOT IN (8, 12, 13, 14) THEN false
      ELSE (
        SELECT (10 - (SUM(
          (substr(p.gtin, length(p.gtin) - 1 - i, 1))::integer
            * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
        ) % 10)) % 10
        FROM generate_series(0, length(p.gtin) - 2) AS i
      ) = (substr(p.gtin, length(p.gtin), 1))::integer
    END AS pela_aritmetica_da_auditoria
  FROM public.products p
  WHERE p.gtin IS NOT NULL
)
SELECT id, pela_funcao, pela_aritmetica_da_auditoria
FROM avaliados
WHERE pela_funcao IS DISTINCT FROM pela_aritmetica_da_auditoria
ORDER BY id;
