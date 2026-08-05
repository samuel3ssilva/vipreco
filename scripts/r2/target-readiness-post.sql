-- =============================================================================
-- R2 - PRONTIDAO DO AMBIENTE ALVO, PARTE **POST**: DEPOIS DA APLICACAO
--
-- Verifica o que R2-A e R2-B produziram. Toda consulta aqui referencia objeto que as
-- migrations CRIAM, e por isso este arquivo NAO PODE rodar antes delas -- rodar antes
-- e receber `42703 column does not exist`, que e a resposta correta e nao um defeito.
--
-- Ver o cabecalho de `target-readiness-pre.sql` para a historia completa da
-- circularidade que esta separacao desfez. Em uma frase: um gate que exigia, para
-- autorizar a migration, uma prova que so a migration podia produzir.
--
--   G7-PRE        roda ANTES de tudo        -- `target-readiness-pre.sql`
--   G7-POST       roda DEPOIS de R2-A       -- este arquivo
--   G7-POST-GTIN  roda DEPOIS de R2-B       -- `target-readiness-post-gtin.sql`
--   G7            PASS quando os tres passaram, cada um no seu momento
--
-- R2.6 -- A CIRCULARIDADE TINHA UM SEGUNDO ANDAR, e ele so apareceu na aplicacao real.
--
-- Ate aqui este arquivo tambem trazia a consulta 8, que chama `pa_is_valid_gtin()` -- uma
-- funcao que **R2-B** cria. O runner roda G7-POST logo depois de R2-A, como o gate manda, e
-- ali a funcao ainda nao existe: o arquivo inteiro morria em `function does not exist`, e o
-- gate reprovava um ambiente correto.
--
-- E exatamente o defeito que a separacao PRE/POST desfez um nivel acima, repetido aqui
-- dentro: um arquivo que mistura dois momentos so pode passar num deles. A consulta 8 virou
-- `target-readiness-post-gtin.sql`, e roda depois de R2-B.
--
-- ESTE ARQUIVO E ESTRITAMENTE READ-ONLY. So SELECT e WITH sobre SELECT. Ele verifica
-- a aplicacao; nao a conclui, nao a corrige e nao valida constraint -- `VALIDATE
-- CONSTRAINT` e a FASE 6 do runbook, com gate proprio.
--
-- COMO RODA
--   Pelo runner de aplicacao (scripts/r2/apply/), imediatamente depois de cada
--   migration e dentro da mesma janela. Tambem roda no drill de CI, contra o Postgres
--   efemero com todas as migrations aplicadas -- que e onde se prova que ele COMPILA.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5. DEPOIS DE R2-A: as colunas nasceram vazias?
--
--    A migration nao faz backfill. Toda linha existente tem de estar com NULL nos
--    quatro campos. Qualquer numero diferente de zero aqui significa que alguem
--    escreveu fora do fluxo de revisao de MVP-E1-08.
-- -----------------------------------------------------------------------------
SELECT
  count(*) FILTER (WHERE package_type      IS NOT NULL) AS com_package_type,
  count(*) FILTER (WHERE quantity_value    IS NOT NULL) AS com_quantity_value,
  count(*) FILTER (WHERE quantity_unit     IS NOT NULL) AS com_quantity_unit,
  count(*) FILTER (WHERE units_per_package IS NOT NULL) AS com_units_per_package
FROM public.products;

-- -----------------------------------------------------------------------------
-- 6. DEPOIS DE R2-A: colisoes que impediriam o backfill.
--
--    O indice de identidade exata e unico. Duas linhas preenchidas que produzam a
--    mesma tupla nao podem coexistir -- e o backfill precisa descobrir isso ANTES
--    de escrever, nao no meio do UPDATE. A conversao repete a do indice.
-- -----------------------------------------------------------------------------
SELECT
  public.pa_normalize_text(name)                     AS nome,
  public.pa_normalize_text(coalesce(brand, ''))      AS marca,
  public.pa_normalize_text(coalesce(variant, ''))    AS variante,
  package_type,
  quantity_value * CASE quantity_unit
    WHEN 'kg' THEN 1000 WHEN 'l' THEN 1000 ELSE 1 END AS quantidade_base,
  CASE quantity_unit
    WHEN 'kg' THEN 'g' WHEN 'l' THEN 'ml' ELSE quantity_unit END AS unidade_base,
  count(*)                                            AS quantidade,
  array_agg(id ORDER BY id)                           AS produtos
FROM public.products
WHERE package_type IS NOT NULL
  AND quantity_value IS NOT NULL
  AND quantity_unit IS NOT NULL
GROUP BY 1, 2, 3, 4, 5, 6
HAVING count(*) > 1
ORDER BY 1, 2, 3;

-- -----------------------------------------------------------------------------
-- 7. DEPOIS DE R2-A e R2-B: estado das constraints.
--
--    `convalidated = false` significa NOT VALID: a constraint vale para escrita
--    nova, e as linhas antigas ainda nao foram conferidas. E o estado correto
--    ate a FASE 6, e so ela troca isso.
-- -----------------------------------------------------------------------------
SELECT
  con.conname                            AS constraint_nome,
  con.convalidated                       AS ja_validada,
  pg_get_constraintdef(con.oid)          AS definicao
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'public'
  AND rel.relname = 'products'
  AND con.contype = 'c'
ORDER BY con.conname;
