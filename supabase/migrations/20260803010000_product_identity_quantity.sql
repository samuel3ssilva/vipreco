-- R2-A / MVP-E1-01 e MVP-E1-02 - persistencia aditiva da identidade exata de produto.
--
-- O QUE ESTA MIGRATION FAZ
--
-- Acrescenta a `products` os tres campos estruturados que o dominio de R1 ja sabe usar,
-- e um indice unico sobre a identidade exata. Nada mais.
--
--   package_type      text, opcional, CHECK com os oito valores do contrato
--   quantity_value    numeric(12,4), opcional, CHECK > 0
--   quantity_unit     text, opcional, CHECK com as cinco unidades
--   units_per_package integer, opcional, CHECK > 0
--
-- Fonte normativa: docs/data/MVP-DATA-CONTRACT.md §1-2 e
-- docs/product/CANONICAL-PRODUCT-SPEC.md §2. O codigo de dominio correspondente ja esta
-- na main: src/lib/quantity.ts, src/lib/product-identity.ts (PRs #50, #51, #52).
--
-- ============================================================================
-- ESTA MIGRATION NAO FOI APLICADA EM NENHUM AMBIENTE
-- ============================================================================
--
-- Aplicar em staging ou em producao e decisao do Founder/PMO (principio 14 do
-- CLAUDE.md). Este arquivo existe versionado e validado pelo drill de CI, e so.
--
-- ============================================================================
-- AS QUATRO DECISOES DE DESENHO, E POR QUE
-- ============================================================================
--
-- 1. TUDO NULLABLE. As colunas nascem vazias em todas as linhas existentes. Nenhuma
--    escrita, nenhum backfill, nenhum UPDATE. `ALTER TABLE ... ADD COLUMN` de coluna
--    nullable sem DEFAULT nao reescreve a tabela e nao trava leitura - so pega
--    ACCESS EXCLUSIVE por um instante para atualizar o catalogo.
--
--    O contrato marca `package_type`, `quantity_value` e `quantity_unit` como
--    obrigatorios. Torna-los NOT NULL agora quebraria toda linha existente. A
--    obrigatoriedade e o estado final, depois do backfill revisado linha a linha
--    (MVP-E1-08); e outra migration, com outro gate.
--
-- 2. `text` + CHECK, e nao ENUM do PostgreSQL. E a convencao ja estabelecida no
--    repositorio: `prices.source_type`, `price_submissions.status` e
--    `price_submissions.source_type` sao todos text + CHECK. Acrescentar um nono
--    `package_type` passa a ser trocar um CHECK -- reversivel, sem ALTER TYPE, sem o
--    caminho unico de remocao de valor de enum, que o Postgres simplesmente nao tem.
--
-- 3. QUANTIDADE NORMALIZADA NAO VIRA COLUNA. O contrato marca `normalized_quantity` e
--    `normalized_unit` como DERIVADO, nao como campo a persistir. Duplicar dado
--    derivavel cria a chance de ele divergir da origem, e o indice abaixo prova que
--    dava para nao duplicar: ele e um indice de EXPRESSAO, calcula a normalizacao no
--    momento de indexar, e nao existe segundo lugar onde o valor possa envelhecer.
--    O dominio ja calcula a mesma coisa em `normalizeQuantity()`; o teste
--    supabase/product-identity-schema.test.ts prova que as duas contas batem.
--
-- 4. O INDICE ANTIGO NAO E REMOVIDO. `products_canonical_identity_idx` guarda a
--    identidade do modelo de hoje (name+brand+variant+size_text). Enquanto houver linha
--    sem campo estruturado -- ou seja, todas elas -- ele e a unica protecao contra
--    duplicata. Os dois convivem: o antigo cobre o texto, o novo cobre a estrutura.
--    Remover o antigo e trabalho de depois do backfill, com gate proprio.

-- ----------------------------------------------------------------------------
-- 1. Colunas
-- ----------------------------------------------------------------------------

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS package_type text,
  ADD COLUMN IF NOT EXISTS quantity_value numeric(12,4),
  ADD COLUMN IF NOT EXISTS quantity_unit text,
  ADD COLUMN IF NOT EXISTS units_per_package integer;

COMMENT ON COLUMN public.products.package_type IS
  'Campo de identidade. Oito valores (CANONICAL-PRODUCT-SPEC.md §4.6). Vidro, sache e '
  'lata do mesmo conteudo sao SKUs diferentes, nao o mesmo produto em embalagens.';
COMMENT ON COLUMN public.products.quantity_value IS
  'Conteudo TOTAL da embalagem, > 0. Num pack e o total, nao o conteudo de cada item: '
  '"6 x 350 ml" e 2100 ml com units_per_package = 6 (MVP-DATA-CONTRACT.md §2). Preencher '
  '350 aqui faria dois packs de contagens diferentes disputarem a mesma identidade. '
  'numeric(12,4) fixa a precisao dos dois lados: o dominio arredonda igual em '
  'src/lib/quantity.ts.';
COMMENT ON COLUMN public.products.quantity_unit IS
  'Unidade declarada: g, kg, ml, l, un. Cinco unidades, tres grandezas.';
COMMENT ON COLUMN public.products.units_per_package IS
  'Itens contaveis dentro do pack, quando o texto os declara. Permite as duas bases de '
  'preco unitario ao mesmo tempo -- por litro entre marcas e por lata na gondola. NAO '
  'entra na identidade: o que separa um pack de 6 de um pack de 12 e o total em '
  'quantity_value, nao esta contagem.';
COMMENT ON COLUMN public.products.size_text IS
  'Texto de EXIBICAO, nunca fonte de calculo. Preservado durante e depois da transicao '
  'para quantidade estruturada (MVP-DATA-CONTRACT.md §1).';

-- ----------------------------------------------------------------------------
-- 2. CHECKs
-- ----------------------------------------------------------------------------
--
-- NOT VALID de proposito: a constraint passa a valer para toda escrita nova
-- imediatamente, sem varrer a tabela inteira no momento do ALTER. Como todas as linhas
-- existentes tem NULL nas quatro colunas -- e CHECK nao reprova NULL -- validar depois e
-- barato e nao muda resultado nenhum. O comando de validacao esta no rollout abaixo.

ALTER TABLE public.products
  ADD CONSTRAINT products_package_type_check
  CHECK (package_type IS NULL OR package_type IN
    ('unidade','pack','kit','garrafa','lata','vidro','sache','caixa')) NOT VALID;

ALTER TABLE public.products
  ADD CONSTRAINT products_quantity_unit_check
  CHECK (quantity_unit IS NULL OR quantity_unit IN ('g','kg','ml','l','un')) NOT VALID;

ALTER TABLE public.products
  ADD CONSTRAINT products_quantity_value_positive
  CHECK (quantity_value IS NULL OR quantity_value > 0) NOT VALID;

ALTER TABLE public.products
  ADD CONSTRAINT products_units_per_package_positive
  CHECK (units_per_package IS NULL OR units_per_package > 0) NOT VALID;

-- Valor e unidade andam juntos: "500" sem unidade nao e quantidade, e "g" sem numero
-- tambem nao. Um dos dois preenchido sozinho e dado pela metade, e dado pela metade e o
-- que produz comparacao errada mais tarde. O dominio devolve a mesma resposta -- a
-- lacuna `quantity_value_missing` ou `quantity_unit_missing` de resolveExactIdentity().
ALTER TABLE public.products
  ADD CONSTRAINT products_quantity_pair_complete
  CHECK ((quantity_value IS NULL) = (quantity_unit IS NULL)) NOT VALID;

-- ----------------------------------------------------------------------------
-- 3. Indice de identidade exata
-- ----------------------------------------------------------------------------
--
-- A tupla de CANONICAL-PRODUCT-SPEC.md §2:
--   (name, brand, variant, package_type, quantity_value, quantity_unit)
-- normalizada pelo contrato unico e com a quantidade convertida para a grandeza base.
--
-- E a conversao que da o ganho sobre o indice de hoje: `500 g` e `0,5 kg` sao a mesma
-- prateleira e passam a colidir por CONTA, e nao por coincidencia de string. O indice
-- sobre size_text nunca conseguiu isso, porque '500 g' e '0,5 kg' sao textos diferentes.
--
-- PARCIAL. So participa a linha que tem identidade estruturada completa. Sem o WHERE, o
-- indice ainda funcionaria -- NULL e distinto de NULL num indice unico -- mas dependeria
-- desse detalhe em vez de dizer a intencao. Aqui a intencao esta escrita: linha sem campo
-- estruturado nao tem identidade exata, e nao e comparada com ninguem.

CREATE UNIQUE INDEX IF NOT EXISTS products_exact_identity_idx ON public.products (
  pa_normalize_text(name),
  pa_normalize_text(coalesce(brand, '')),
  pa_normalize_text(coalesce(variant, '')),
  package_type,
  (quantity_value * CASE quantity_unit WHEN 'kg' THEN 1000 WHEN 'l' THEN 1000 ELSE 1 END),
  (CASE quantity_unit WHEN 'kg' THEN 'g' WHEN 'l' THEN 'ml' ELSE quantity_unit END)
)
WHERE package_type IS NOT NULL
  AND quantity_value IS NOT NULL
  AND quantity_unit IS NOT NULL;

COMMENT ON INDEX public.products_exact_identity_idx IS
  'Identidade exata estruturada (CANONICAL-PRODUCT-SPEC.md §2). Parcial: so linha com '
  'package_type, quantity_value e quantity_unit preenchidos. Convive com '
  'products_canonical_identity_idx, que cobre o modelo textual de hoje.';

-- ============================================================================
-- ROLLOUT
-- ============================================================================
--
--   1. aplicar esta migration (ADD COLUMN nullable + CHECK NOT VALID + indice parcial
--      vazio: sem reescrita de tabela, sem varredura, sem trava de leitura);
--   2. conferir que as quatro colunas existem e que toda linha esta com NULL;
--   3. rodar o preview de backfill (R2-C, read-only) e revisar linha a linha;
--   4. preencher os campos por decisao humana (MVP-E1-08, gate do Founder);
--   5. so entao validar as constraints, uma a uma:
--        ALTER TABLE public.products VALIDATE CONSTRAINT products_package_type_check;
--        ALTER TABLE public.products VALIDATE CONSTRAINT products_quantity_unit_check;
--        ALTER TABLE public.products VALIDATE CONSTRAINT products_quantity_value_positive;
--        ALTER TABLE public.products VALIDATE CONSTRAINT products_units_per_package_positive;
--        ALTER TABLE public.products VALIDATE CONSTRAINT products_quantity_pair_complete;
--   6. tornar os campos obrigatorios e aposentar o indice textual: OUTRA migration,
--      OUTRO gate, depois de o backfill estar completo.
--
-- O passo 3 pode ser feito antes do 1 -- o preview le size_text, que ja existe.
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
--
-- Totalmente reversivel enquanto nao houver dado nas colunas novas. Nada abaixo toca
-- linha, coluna antiga ou indice antigo:
--
--   DROP INDEX IF EXISTS public.products_exact_identity_idx;
--   ALTER TABLE public.products
--     DROP CONSTRAINT IF EXISTS products_quantity_pair_complete,
--     DROP CONSTRAINT IF EXISTS products_units_per_package_positive,
--     DROP CONSTRAINT IF EXISTS products_quantity_value_positive,
--     DROP CONSTRAINT IF EXISTS products_quantity_unit_check,
--     DROP CONSTRAINT IF EXISTS products_package_type_check;
--   ALTER TABLE public.products
--     DROP COLUMN IF EXISTS units_per_package,
--     DROP COLUMN IF EXISTS quantity_unit,
--     DROP COLUMN IF EXISTS quantity_value,
--     DROP COLUMN IF EXISTS package_type;
--
-- Depois do backfill o rollback passa a APAGAR dado curado, e deixa de ser reversivel
-- de verdade. Esse e o ponto sem volta, e ele fica no passo 4, nao aqui.
--
-- ============================================================================
-- O QUE ESTA MIGRATION NAO FAZ
-- ============================================================================
--
--   - nao altera RLS, policy nem grant: `products` continua com leitura publica de
--     linha ativa e sem superficie de escrita publica;
--   - nao toca em `gtin` -- hardening de GTIN e a migration seguinte (R2-B);
--   - nao cria `search_aliases`, `product_identifiers`, `canonical_products`, familia de
--     produto nem alias de fonte;
--   - nao persiste preco unitario: e derivado, e o contrato explica por que armazenar
--     seria pior;
--   - nao remove nem renomeia coluna, indice ou constraint existente;
--   - nao executa UPDATE, INSERT nem DELETE.
