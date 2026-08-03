-- R0.5 / TD-001 - alinha pa_normalize_text() ao contrato unico de normalizacao.
--
-- O PROBLEMA
--
-- Existiam duas normalizacoes e elas divergiam. `normalizeSearchText()` (TypeScript)
-- colapsa espaco repetido e remove espaco das pontas; `pa_normalize_text()` (SQL) fazia
-- apenas minusculas e remocao de acento. Duas consequencias:
--
--   1. um termo digitado com espaco duplo era colapsado no cliente e nao encontrava um
--      `search_text` gravado com espaco duplo;
--   2. mais grave: o indice products_canonical_identity_idx considerava '500 g', '500  g'
--      e '500g' TRES identidades distintas. Numa operacao manual por WhatsApp, a mesma
--      oferta digitada duas vezes com espacamento diferente cria um SKU novo, e a
--      comparacao se parte em tres sem nenhum erro visivel.
--
-- O CONTRATO (supabase/normalization-vectors.json)
--
--   1. nulo vira string vazia
--   2. minusculas
--   3. remover diacriticos do portugues
--   4. qualquer sequencia de espaco em branco vira um unico espaco
--   5. remover espaco das pontas
--
-- O que o contrato NAO faz, de proposito: nao remove o espaco entre numero e unidade.
-- '500g' continua diferente de '500 g'. Colapsar os dois exigiria interpretar o texto
-- para descobrir onde termina o numero e comeca a unidade -- a resposta certa para esse
-- caso e quantidade estruturada (quantity_value + quantity_unit), que e trabalho de E1,
-- nao um truque de string.
--
-- NAO DESTRUTIVA. Nenhuma linha e apagada, nenhum produto e unido, nenhuma duplicata e
-- resolvida automaticamente. Unir ou excluir produto e decisao humana.
--
-- ============================================================================
-- ORDEM DE APLICACAO (esta migration NAO foi aplicada em nenhum ambiente)
-- ============================================================================
--
--   1. rodar o script read-only de colisoes (scripts/normalization-collisions.ts)
--      contra o ambiente alvo;
--   2. se o relatorio NAO vier vazio, PARAR: unir ou excluir produto e decisao do
--      Founder/PMO, nunca do CTO;
--   3. so entao aplicar esta migration.
--
-- Por que a ordem importa: products_canonical_identity_idx e um indice FUNCIONAL sobre
-- pa_normalize_text(). Trocar a funcao invalida o conteudo do indice, e o REINDEX abaixo
-- FALHA se existirem linhas que so eram distintas pelo espacamento. Isso e protecao, nao
-- defeito -- o banco recusa a mudanca em vez de aceitar uma uniao silenciosa.

CREATE OR REPLACE FUNCTION public.pa_normalize_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(coalesce(input, ''),
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
    '\s+', ' ', 'g'));
$$;

-- O indice funcional guarda o resultado ANTIGO da funcao. Sem reconstruir, buscas por
-- igualdade passariam a comparar valor novo contra chave antiga.
REINDEX INDEX public.products_canonical_identity_idx;

-- search_text e materializado por trigger na escrita, entao as linhas existentes ainda
-- carregam o valor antigo. Recalcula com a funcao nova. A propria trigger recomputa o
-- mesmo valor -- o UPDATE existe para dispara-la, nao para gravar algo diferente.
UPDATE public.products SET search_text = public.pa_normalize_text(
  concat_ws(' ', name, brand, variant, size_text, gtin, category)
);

COMMENT ON FUNCTION public.pa_normalize_text(text) IS
  'Contrato unico de normalizacao (R0.5/TD-001): minusculas, sem diacritico do portugues, espaco em branco colapsado, pontas removidas. Espelhado em src/lib/normalize.ts e verificado pelos mesmos vetores em supabase/normalization-vectors.json. NAO remove o espaco entre numero e unidade -- isso e quantidade estruturada, nao normalizacao de texto.';

-- ============================================================
-- ROLLBACK EXATO (nao executar automaticamente -- so por decisao humana):
--
--   CREATE OR REPLACE FUNCTION public.pa_normalize_text(input text)
--   RETURNS text
--   LANGUAGE sql
--   IMMUTABLE
--   SET search_path = public
--   AS $rollback$
--     SELECT lower(translate(coalesce(input, ''),
--       'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
--       'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));
--   $rollback$;
--
--   REINDEX INDEX public.products_canonical_identity_idx;
--
--   UPDATE public.products SET search_text = public.pa_normalize_text(
--     concat_ws(' ', name, brand, variant, size_text, gtin, category)
--   );
--
--   COMMENT ON FUNCTION public.pa_normalize_text(text) IS NULL;
--
-- O rollback e seguro em qualquer estado: a funcao antiga e menos restritiva, entao o
-- REINDEX de volta nunca encontra colisao que ja nao existisse antes.
-- ============================================================
