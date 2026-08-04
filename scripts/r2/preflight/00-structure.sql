-- =============================================================================
-- R2.3 - PREFLIGHT REMOTO DE STAGING, PARTE 1: ESTRUTURA
--
-- Le SOMENTE catalogo (pg_catalog e information_schema). Nao toca em nenhuma
-- tabela de dado, e por isso roda com seguranca contra qualquer estado do banco --
-- inclusive um banco vazio, onde `public.products` nem existe.
--
-- Responde exatamente o que a R2.2 nao conseguiu responder com a chave anonima e
-- marcou como NOT VERIFIED: indices, constraints, funcoes, policies e grants. Ver
-- docs/evidence/r2/staging/preflight.md secao 4.
--
-- ESTE ARQUIVO E ESTRITAMENTE READ-ONLY. So SELECT. `read-only-guard.ts` le o
-- arquivo e falha se qualquer verbo de escrita aparecer -- e o proprio workflow
-- roda essa verificacao ANTES de abrir conexao.
--
-- FORMATO DE SAIDA: duas colunas, `chave|valor`, para psql -A -t -F '|'. Toda
-- linha e um fato isolado; nada aqui depende da ordem de leitura.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Camada C da guarda de read-only: confirma NO BANCO que o prologo pegou.
--
-- Nao presumimos que a credencial seja read-only -- ela quase certamente nao e. A
-- garantia vem da transacao, e esta linha e a prova de que a transacao esta como
-- deveria. O runner ABORTA se este valor nao for `on`.
-- -----------------------------------------------------------------------------
SELECT 'guard.read_only', current_setting('transaction_read_only');

-- -----------------------------------------------------------------------------
-- Identificacao do banco. Nunca a URL, nunca o host completo, nunca a senha:
-- o fingerprint de host e de project ref e montado no runner, sanitizado.
-- -----------------------------------------------------------------------------
SELECT 'db.name', current_database();
SELECT 'db.user', current_user;
SELECT 'db.version', split_part(version(), ' ', 2);
SELECT 'db.now_utc', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

-- -----------------------------------------------------------------------------
-- O historico de migrations e legivel? Esta pergunta e o item G3 do gate, e foi
-- a que a chave anonima nao pode responder (PGRST205 -- que e o comportamento
-- CORRETO, e nao um achado). Aqui ela finalmente tem resposta.
-- -----------------------------------------------------------------------------
-- Consultado pelo catalogo, e nao por `to_regclass`: com um schema inexistente o
-- comportamento de `to_regclass` ja variou entre versoes do Postgres, e "as vezes
-- devolve NULL, as vezes levanta erro" nao e base para decidir se o proximo arquivo roda.
SELECT
  'history.table_present',
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'supabase_migrations' AND c.relname = 'schema_migrations'
  )::text;

-- -----------------------------------------------------------------------------
-- Fingerprint de colunas. Uma linha por coluna de `public`.
-- -----------------------------------------------------------------------------
SELECT
  'schema.column',
  c.table_name || '.' || c.column_name || ':' || c.data_type
    || CASE WHEN c.is_nullable = 'NO' THEN ':NOT NULL' ELSE '' END
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.column_name;

-- -----------------------------------------------------------------------------
-- Constraints, com o estado de validacao. `NOT VALID` importa: e exatamente o
-- estado em que R2-B nasce, e o que a FASE 6 do runbook depois valida.
-- -----------------------------------------------------------------------------
SELECT
  'schema.constraint',
  rel.relname || '.' || con.conname || ':' || con.contype::text
    || CASE WHEN con.convalidated THEN ':validada' ELSE ':NOT VALID' END
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
ORDER BY 2;

SELECT 'schema.index', i.tablename || '.' || i.indexname
FROM pg_indexes i
WHERE i.schemaname = 'public'
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- Funcoes, com o modo de seguranca. `SECURITY DEFINER` numa funcao com EXECUTE
-- publico e a forma classica de contornar RLS sem parecer que contorna.
-- -----------------------------------------------------------------------------
SELECT
  'schema.function',
  p.proname || '(' || pg_get_function_identity_arguments(p.oid) || '):'
    || CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- Quem pode EXECUTAR cada funcao. A Onda 3 aprendeu ao vivo que `REVOKE ... FROM
-- PUBLIC` nao basta quando `anon` e `authenticated` tem EXECUTE direto -- e que
-- texto de migration sozinho nao prova o estado real. Esta consulta prova.
-- -----------------------------------------------------------------------------
SELECT
  'schema.grants_function',
  p.proname || ':' || coalesce(g.lista, '(sem EXECUTE explicito)')
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL (
  SELECT string_agg(
           DISTINCT CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
           ','
         ) AS lista
  FROM aclexplode(p.proacl) a
  WHERE a.privilege_type = 'EXECUTE'
) g ON true
WHERE n.nspname = 'public'
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- RLS ligada por tabela, e as policies. Principio 5 do CLAUDE.md: RLS em toda
-- tabela publica, anonimo so le, e so registro ativo/valido.
-- -----------------------------------------------------------------------------
SELECT
  'schema.rls',
  c.relname || ':' || c.relrowsecurity::text || ':forcada=' || c.relforcerowsecurity::text
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY 2;

SELECT
  'schema.policy',
  pol.tablename || '.' || pol.policyname || ':' || pol.cmd || ':'
    || coalesce(array_to_string(pol.roles, ','), '')
FROM pg_policies pol
WHERE pol.schemaname = 'public'
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- Grants de tabela. Qualquer INSERT, UPDATE ou DELETE para `anon` aqui e um
-- achado de seguranca -- a superficie publica de escrita foi fechada na Onda 3.
-- -----------------------------------------------------------------------------
-- Lido de `pg_class.relacl`, e nao de `information_schema.role_table_grants`, porque
-- as views de information_schema so mostram grant em que o usuario corrente e grantor,
-- grantee ou membro. Uma lista silenciosamente incompleta aqui pareceria "nenhum grant
-- perigoso" -- exatamente a leitura errada, e exatamente a que passa despercebida.
SELECT
  'schema.grants_table',
  c.relname || ':'
    || CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END
    || ':' || a.privilege_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm')
ORDER BY 2;
