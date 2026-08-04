-- =============================================================================
-- R2.3 - PREFLIGHT REMOTO DE STAGING, PARTE 3: CONTEUDO
--
-- Contagens agregadas e auditoria de GTIN. NENHUMA linha inteira sai daqui:
-- so numeros, e -- no unico ponto em que um identificador precisa aparecer -- o
-- `id` do produto com o GTIN mascarado nos quatro ultimos digitos.
--
-- Arquivo separado de 00-structure.sql porque depende de as tabelas existirem.
-- Num banco vazio ele falha, e falhar aqui e informacao: o runner classifica o
-- ambiente como EMPTY em vez de morrer.
--
-- A aritmetica GS1 e a MESMA de scripts/r2/target-readiness.sql consulta 2, e
-- pelo mesmo motivo: precisa responder ANTES de a migration criar
-- `pa_is_valid_gtin()`. Algoritmo duplicado e algoritmo que diverge, entao
-- `preflight.test.ts` confere que as duas copias nao divergiram no texto.
--
-- ESTRITAMENTE READ-ONLY. So SELECT e WITH sobre SELECT.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Contagens. `real` e `demo` sao a base da classificacao EMPTY / DEMO ONLY /
-- MIXED OR UNKNOWN -- e, ao contrario da medicao anonima de R2.2, aqui as linhas
-- INATIVAS tambem entram na conta. Era exatamente o que faltava para G5.
-- -----------------------------------------------------------------------------
SELECT 'count.markets', format(
  'total=%s,demo=%s,real=%s,ativos=%s',
  count(*), count(*) FILTER (WHERE is_demo),
  count(*) FILTER (WHERE NOT is_demo), count(*) FILTER (WHERE is_active))
FROM public.markets;

SELECT 'count.products', format(
  'total=%s,demo=%s,real=%s,ativos=%s,com_gtin=%s,com_size_text=%s',
  count(*), count(*) FILTER (WHERE is_demo),
  count(*) FILTER (WHERE NOT is_demo), count(*) FILTER (WHERE is_active),
  count(*) FILTER (WHERE gtin IS NOT NULL),
  count(*) FILTER (WHERE size_text IS NOT NULL AND btrim(size_text) <> ''))
FROM public.products;

SELECT 'count.prices', format(
  'total=%s,demo=%s,real=%s,ativos=%s,validos=%s',
  count(*), count(*) FILTER (WHERE is_demo),
  count(*) FILTER (WHERE NOT is_demo), count(*) FILTER (WHERE is_active),
  count(*) FILTER (WHERE is_active AND observed_at <= now()
                     AND (valid_until IS NULL OR valid_until >= now())))
FROM public.prices;

-- -----------------------------------------------------------------------------
-- Tabelas de submissao. So a contagem: o conteudo delas pode conter texto livre
-- escrito por gente, e o mandato proibe leitura de dado pessoal desnecessaria.
-- Para o gate, o numero e suficiente -- e o numero esperado e zero.
-- -----------------------------------------------------------------------------
SELECT 'count.price_submissions', count(*)::text FROM public.price_submissions;
SELECT 'count.product_watch_requests', count(*)::text FROM public.product_watch_requests;
SELECT 'count.decision_feedback', count(*)::text FROM public.decision_feedback;

-- -----------------------------------------------------------------------------
-- GTIN: agregado. Item G8 do gate.
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
),
invalidos AS (
  SELECT id, gtin
  FROM avaliados
  WHERE NOT so_digitos
     OR NOT comprimento_gs1
     OR digito_calculado IS DISTINCT FROM digito_declarado
),
duplicados AS (
  SELECT gtin
  FROM public.products
  WHERE gtin IS NOT NULL
  GROUP BY gtin
  HAVING count(*) > 1
)
SELECT 'gtin.resumo', format(
  'preenchidos=%s,invalidos=%s,duplicados=%s',
  (SELECT count(*) FROM candidatos),
  (SELECT count(*) FROM invalidos),
  (SELECT count(*) FROM duplicados));

-- -----------------------------------------------------------------------------
-- GTIN: quais linhas. O `id` identifica o produto para quem for corrigir; o
-- codigo sai MASCARADO em tudo menos os quatro ultimos digitos.
--
-- Nao e pudor. Um GTIN valido pertence a um produto real, e listar codigo
-- completo em log de CI e o tipo de vazamento que ninguem percebe ter feito.
-- Quatro digitos bastam para conferir de qual linha se esta falando.
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
  'gtin.invalido',
  a.id::text || ':'
    || repeat('*', greatest(length(a.gtin) - 4, 0)) || right(a.gtin, 4)
    || ':' || CASE
        WHEN NOT a.so_digitos      THEN 'contem caractere que nao e digito'
        WHEN NOT a.comprimento_gs1 THEN 'comprimento fora de {8,12,13,14}'
        ELSE 'digito verificador errado'
      END
FROM avaliados a
WHERE NOT a.so_digitos
   OR NOT a.comprimento_gs1
   OR a.digito_calculado IS DISTINCT FROM a.digito_declarado
ORDER BY 2;
