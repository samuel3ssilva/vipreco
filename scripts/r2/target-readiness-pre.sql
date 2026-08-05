-- =============================================================================
-- R2 - PRONTIDAO DO AMBIENTE ALVO, PARTE **PRE**: SO O SCHEMA LEGADO
--
-- Responde, sem escrever nada, se o ambiente esta pronto para RECEBER as migrations
-- 20260803010000 (identidade e quantidade) e 20260803020000 (GTIN).
--
-- =============================================================================
-- POR QUE ESTE ARQUIVO EXISTE SEPARADO -- A CIRCULARIDADE DO G7
-- =============================================================================
--
-- Ate R2.4 havia um unico `target-readiness.sql` com sete consultas, e o gate G7 dizia
-- "target-readiness executado por inteiro no ambiente alvo". As consultas 5 a 7
-- referenciam `package_type`, `quantity_value` e `pa_is_valid_gtin` -- objetos que a
-- migration CRIA. Antes de aplicar, o script interrompia em `42703 column does not
-- exist`, o gate marcava FAIL, e o FAIL bloqueava a aplicacao.
--
-- Ou seja: G7 exigia, para autorizar a migration, uma prova que so a migration podia
-- produzir. Isso nao e um ambiente reprovado -- e um gate que nao tem como passar. O
-- FAIL nao media staging; media o proprio gate.
--
-- A separacao desfaz a circularidade na ESTRUTURA, e nao num comentario pedindo
-- tolerancia. Este arquivo contem exatamente as consultas que respondem sobre o schema
-- LEGADO; `target-readiness-post.sql` contem as que so respondem depois de R2-A, e
-- `target-readiness-post-gtin.sql` a que so responde depois de R2-B.
--
--   G7-PRE   roda ANTES de aplicar   -- precisa passar para autorizar
--   G7-POST  roda DEPOIS de aplicar  -- verifica o que a aplicacao produziu
--   G7       consolidado: PASS quando os dois passaram, cada um no seu momento
--
-- Antes da aplicacao, o estado correto e `G7-PRE PASS - G7-POST PENDING BY DESIGN`.
-- `PENDING BY DESIGN` nao e um FAIL disfarcado: e a afirmacao de que a pergunta ainda
-- nao pode ser feita. Confundir "ainda nao da para perguntar" com "a resposta foi nao"
-- e o que produziu a circularidade.
--
-- `scripts/r2/target-readiness.test.ts` reprova se qualquer identificador futuro voltar
-- a aparecer aqui como referencia -- e nao apenas como literal de texto numa consulta
-- ao catalogo, que e legitima e e o que a consulta 4 faz.
--
-- =============================================================================
-- ESTE ARQUIVO E ESTRITAMENTE READ-ONLY
--   - so SELECT e WITH sobre SELECT;
--   - nenhum UPDATE, INSERT, DELETE, MERGE, TRUNCATE, COPY;
--   - nenhum ALTER, CREATE, DROP, GRANT, REVOKE;
--   - nenhuma chamada remota, nenhum secret, nenhum dado pessoal na saida.
--
-- COMO RODA
--   Automaticamente, pelo preflight remoto (scripts/r2/preflight/run.sh), dentro da
--   transacao READ ONLY. Tambem pode ser rodado a mao no editor SQL do ambiente alvo.
--   A saida NAO e publicada em log: a consulta 2 devolve GTIN completo.
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
--    rodar ANTES da migration que cria a funcao de validacao. Depois de aplicada,
--    a mesma pergunta se responde pela funcao -- e e isso que a parte POST faz.
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
--
--    OS NOMES DOS OBJETOS FUTUROS APARECEM AQUI COMO LITERAL DE TEXTO, e nunca como
--    referencia. `column_name = 'package_type'` e uma pergunta ao catalogo; ela
--    responde `false` num banco onde a coluna nao existe, em vez de abortar. E essa
--    a diferenca entre uma consulta que PODE rodar antes da migration e uma que nao.
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
