-- =============================================================================
-- R2 - AUDITORIA READ-ONLY DO AMBIENTE ALVO
--
-- Responde, sem escrever nada, se o ambiente esta pronto para receber as
-- migrations 20260803010000 (identidade e quantidade) e 20260803020000 (GTIN).
--
-- ESTE ARQUIVO E ESTRITAMENTE READ-ONLY.
--   - so SELECT e WITH sobre SELECT;
--   - nenhum UPDATE, INSERT, DELETE, MERGE, TRUNCATE, COPY;
--   - nenhum ALTER, CREATE, DROP, GRANT, REVOKE;
--   - nenhuma chamada remota, nenhum secret, nenhum dado pessoal na saida.
--
-- `scripts/r2/target-readiness.test.ts` le este arquivo e FALHA se qualquer verbo
-- de escrita aparecer. Nao e disciplina: e teste.
--
-- COMO RODAR
--   No editor SQL do ambiente alvo (staging ou producao), como service_role ou
--   postgres. Cada consulta e independente; rode todas e guarde a saida como
--   evidencia da FASE 1 do runbook (docs/data/R2-ROLLOUT-RUNBOOK.md).
--
-- QUANDO RODAR
--   ANTES de aplicar qualquer migration. As consultas 1 a 4 nao dependem das
--   colunas novas. As consultas 5 a 7 so respondem depois da migration aplicada,
--   e estao aqui porque a FASE 3 tambem precisa de verificacao.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tamanho do problema. Quantas linhas existem, e quantas tem cada campo.
--    Sem esse numero, "revisar linha a linha" nao tem tamanho conhecido.
-- -----------------------------------------------------------------------------
SELECT
  count(*)                                            AS produtos_total,
  count(*) FILTER (WHERE is_active)                   AS ativos,
  count(*) FILTER (WHERE is_demo)                     AS demonstracao,
  count(*) FILTER (WHERE gtin IS NOT NULL)            AS com_gtin,
  count(*) FILTER (WHERE size_text IS NOT NULL
                     AND btrim(size_text) <> '')      AS com_size_text,
  count(*) FILTER (WHERE size_text IS NULL
                      OR btrim(size_text) = '')       AS sem_size_text
FROM public.products;

-- -----------------------------------------------------------------------------
-- 2. GTIN invalido. ESTA E A CONSULTA QUE DECIDE SE R2-B PODE SER VALIDADA.
--
--    Se vier qualquer linha, PARAR: corrigir ou anular GTIN e curadoria do
--    Founder/PMO, nunca do CTO, e nunca automatica. O ViPreco nao inventa GTIN.
--
--    Aritmetica GS1 escrita aqui em linha, DE PROPOSITO: esta consulta precisa
--    rodar ANTES da migration que cria pa_is_valid_gtin(). Depois de aplicada,
--    a mesma pergunta se responde com `NOT public.pa_is_valid_gtin(gtin)`.
-- -----------------------------------------------------------------------------
WITH candidatos AS (
  SELECT id, gtin
  FROM public.products
  WHERE gtin IS NOT NULL
),
avaliados AS (
  SELECT
    c.id,
    c.gtin,
    c.gtin ~ '^[0-9]+$'                  AS so_digitos,
    length(c.gtin) IN (8, 12, 13, 14)    AS comprimento_gs1,
    CASE
      WHEN c.gtin ~ '^[0-9]+$' AND length(c.gtin) IN (8, 12, 13, 14) THEN (
        SELECT (10 - (SUM(
          (substr(c.gtin, length(c.gtin) - 1 - i, 1))::integer
            * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
        ) % 10)) % 10
        FROM generate_series(0, length(c.gtin) - 2) AS i
      )
    END                                   AS digito_calculado,
    CASE
      WHEN c.gtin ~ '^[0-9]+$' AND length(c.gtin) IN (8, 12, 13, 14)
      THEN (substr(c.gtin, length(c.gtin), 1))::integer
    END                                   AS digito_declarado
  FROM candidatos c
)
SELECT
  id,
  gtin,
  CASE
    WHEN NOT so_digitos      THEN 'contem caractere que nao e digito ASCII'
    WHEN NOT comprimento_gs1 THEN 'comprimento fora de {8, 12, 13, 14}'
    ELSE 'digito verificador errado (o correto seria ' || digito_calculado || ')'
  END AS motivo
FROM avaliados
WHERE NOT so_digitos
   OR NOT comprimento_gs1
   OR digito_calculado IS DISTINCT FROM digito_declarado
ORDER BY id;

-- -----------------------------------------------------------------------------
-- 3. GTIN duplicado entre produtos preenchidos.
--
--    products_gtin_unique_idx existe desde a Onda 1, entao o resultado esperado e
--    VAZIO. Se vier linha, o indice nao esta neste ambiente -- e ai a auditoria
--    descobriu uma divergencia de schema, nao um problema de dado.
-- -----------------------------------------------------------------------------
SELECT gtin, count(*) AS quantidade, array_agg(id ORDER BY id) AS produtos
FROM public.products
WHERE gtin IS NOT NULL
GROUP BY gtin
HAVING count(*) > 1
ORDER BY gtin;

-- -----------------------------------------------------------------------------
-- 4. Os objetos de schema que R2 espera encontrar ANTES de comecar.
--
--    Confirma que o ambiente esta no estado da main de hoje: as duas colunas e o
--    indice de que R2 depende existem, e as colunas que R2 vai criar ainda NAO.
--    Uma coluna nova ja presente significa que a migration foi aplicada antes, e
--    a FASE 3 precisa saber disso.
-- -----------------------------------------------------------------------------
SELECT
  'coluna products.gtin'                AS objeto,
  EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'products'
             AND column_name = 'gtin')  AS presente,
  'esperado presente'                   AS esperado
UNION ALL SELECT
  'coluna products.size_text',
  EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'products'
             AND column_name = 'size_text'),
  'esperado presente'
UNION ALL SELECT
  'indice products_gtin_unique_idx',
  EXISTS (SELECT 1 FROM pg_class WHERE relname = 'products_gtin_unique_idx'),
  'esperado presente'
UNION ALL SELECT
  'indice products_canonical_identity_idx',
  EXISTS (SELECT 1 FROM pg_class WHERE relname = 'products_canonical_identity_idx'),
  'esperado presente'
UNION ALL SELECT
  'funcao pa_normalize_text',
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'pa_normalize_text'),
  'esperado presente'
UNION ALL SELECT
  'coluna products.package_type',
  EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'products'
             AND column_name = 'package_type'),
  'esperado AUSENTE antes de R2-A'
UNION ALL SELECT
  'coluna products.quantity_value',
  EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'products'
             AND column_name = 'quantity_value'),
  'esperado AUSENTE antes de R2-A'
UNION ALL SELECT
  'funcao pa_is_valid_gtin',
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'pa_is_valid_gtin'),
  'esperado AUSENTE antes de R2-B';

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
