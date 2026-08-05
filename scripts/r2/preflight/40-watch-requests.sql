-- =============================================================================
-- R2.4 - PREFLIGHT REMOTO DE STAGING, PARTE 5: A LINHA DE product_watch_requests
--
-- A auditoria de R2.3E encontrou UMA linha aqui, e ela reprovou G5 e G13 -- os dois
-- gates de "nenhum dado alem do demo". Reprovar foi correto: a regra dizia que as tres
-- tabelas de submissao deveriam estar vazias, e uma delas nao estava.
--
-- Mas "existe uma linha" nao e uma classificacao. Este arquivo existe para transformar
-- o numero num fato decidivel, com o MINIMO de leitura possivel.
--
-- =============================================================================
-- O QUE ESTA CONSULTA DELIBERADAMENTE NAO FAZ
-- =============================================================================
--
-- Nao devolve o `id` da linha. Nao devolve o `product_id`. Nao devolve conteudo de
-- coluna nenhuma alem do INSTANTE, e o instante sai agregado (minimo e maximo), nao
-- linha a linha. Com uma linha os dois coincidem, e isso e aceito: o instante e a
-- evidencia central da classificacao, porque a revogacao do INSERT publico tem data.
--
-- O que sustenta a classificacao nao e o conteudo -- e a ESTRUTURA. Se a tabela nao
-- tem coluna capaz de guardar dado pessoal, nenhuma linha dela pode conter dado
-- pessoal, e nao e preciso olhar linha nenhuma para afirmar isso. Por isso a consulta
-- mais importante aqui e a que lista as COLUNAS.
--
-- E a lista de colunas e lida do catalogo REMOTO, e nao do arquivo de migration. A
-- pergunta e sobre o que existe naquele banco; presumir que ele espelha o repositorio
-- seria presumir justamente o que o resto desta missao esta medindo.
--
-- ESTRITAMENTE READ-ONLY. So SELECT.
-- =============================================================================

SELECT 'watch.total', count(*)::text FROM public.product_watch_requests;

-- -----------------------------------------------------------------------------
-- As colunas que a tabela TEM neste ambiente. A classificacao A/B se decide aqui:
-- `render-summary.ts` compara cada nome com uma lista fechada de campos capazes de
-- carregar identificador de pessoa, e compara cada TIPO com os que aceitam texto
-- livre. Nenhum dos dois exige ler uma linha.
-- -----------------------------------------------------------------------------
SELECT
  'watch.column',
  c.column_name || ':' || c.data_type || ':'
    || CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'product_watch_requests'
ORDER BY c.ordinal_position;

-- -----------------------------------------------------------------------------
-- Quando. Agregado, e em UTC.
--
-- Esta e a unica leitura de CONTEUDO no arquivo inteiro, e ela existe porque a
-- pergunta "a linha entrou antes ou depois de a superficie publica de escrita ser
-- fechada" so tem resposta aqui. A resposta nao muda a classificacao de privacidade
-- -- essa se decide pela estrutura --, mas muda o que a linha DIZ sobre o ambiente.
-- -----------------------------------------------------------------------------
SELECT 'watch.instante', format(
  'primeiro=%s,ultimo=%s',
  coalesce(to_char(min(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'nenhum'),
  coalesce(to_char(max(created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'nenhum'))
FROM public.product_watch_requests;

-- -----------------------------------------------------------------------------
-- As foreign keys que saem desta tabela, com a acao de DELETE.
--
-- Importa para R2 por um motivo pratico: `ON DELETE CASCADE` significa que apagar um
-- produto apagaria a linha junto. Nenhuma migration de R2 apaga produto -- mas a
-- pergunta "a aplicacao pode destruir esta linha sem querer" merece resposta medida,
-- e nao deducao.
-- -----------------------------------------------------------------------------
SELECT
  'watch.fk',
  -- `ao_apagar`, e nao o nome ingles do verbo: a guarda estatica de read-only casa a
  -- palavra em qualquer lugar do arquivo fora de comentario, inclusive dentro de um
  -- literal de texto inofensivo como este. A guarda esta certa em ser literal -- um
  -- parser de SQL aqui seria mais codigo para errar do que garantia --, entao quem cede
  -- e o rotulo.
  con.conname || ':' || destino.relname || ':ao_apagar=' || CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE con.confdeltype::text END
FROM pg_constraint con
JOIN pg_class origem ON origem.oid = con.conrelid
JOIN pg_class destino ON destino.oid = con.confrelid
JOIN pg_namespace ns ON ns.oid = origem.relnamespace
WHERE ns.nspname = 'public'
  AND origem.relname = 'product_watch_requests'
  AND con.contype = 'f'
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- A relacao com `products`, agregada.
--
-- Diz se as linhas apontam para produto que existe, e se esse produto e de
-- demonstracao. Uma solicitacao sobre um produto ficticio e telemetria sobre dado
-- ficticio -- o que nao a torna menos real como evento, mas responde a pergunta de
-- se ha algum dado de piloto escondido aqui.
--
-- Nenhum `id` sai desta consulta. So contagens.
-- -----------------------------------------------------------------------------
SELECT 'watch.produto_alvo', format(
  'linhas=%s,produto_existe=%s,produto_demo=%s,produto_real=%s',
  count(*),
  count(p.id),
  count(*) FILTER (WHERE p.is_demo),
  count(*) FILTER (WHERE p.id IS NOT NULL AND NOT p.is_demo))
FROM public.product_watch_requests w
LEFT JOIN public.products p ON p.id = w.product_id;

-- -----------------------------------------------------------------------------
-- As outras duas tabelas de submissao, para que a classificacao valha para as tres.
-- So a contagem: `price_submissions` e `decision_feedback` TEM colunas de texto livre
-- e de escolha, e ler qualquer conteudo delas seria exatamente o que o mandato proibe.
-- -----------------------------------------------------------------------------
SELECT 'watch.outras', format(
  'price_submissions=%s,decision_feedback=%s',
  (SELECT count(*) FROM public.price_submissions),
  (SELECT count(*) FROM public.decision_feedback));
