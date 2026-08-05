-- =============================================================================
-- R2.4 - FINGERPRINT SEMANTICO DO SCHEMA `public`
--
-- Roda IDENTICO nos dois lados da comparacao:
--
--   a) contra um Postgres efemero em CI, com as OITO migrations anteriores a R2
--      aplicadas e nada mais -- o estado que o repositorio AFIRMA ser o de staging;
--   b) contra o banco de staging, em transacao READ ONLY -- o estado que staging TEM.
--
-- =============================================================================
-- POR QUE UM FINGERPRINT, E NAO `supabase db diff`
-- =============================================================================
--
-- Staging nao tem historico de migrations: `supabase_migrations.schema_migrations` nao
-- existe (medido, run 31032153539). Adotar as oito versoes como baseline sem prova seria
-- carimbar como aplicadas dez migrations que ninguem viu aplicar -- trocar uma incerteza
-- CONHECIDA por uma certeza FALSA, que e estritamente pior.
--
-- A procedencia historica nao da para recuperar: nao ha registro de quem rodou o que, e
-- nenhuma consulta traz de volta um log que nunca existiu. Mas a procedencia nao e a
-- unica coisa que importa. O que a aplicacao de R2 realmente exige e que o ESTADO ATUAL
-- do schema seja aquele contra o qual as migrations foram escritas e testadas. Isso e
-- verificavel, e e isto que este arquivo verifica.
--
-- A adocao do baseline passa a se apoiar numa afirmacao mais fraca e comprovada, em vez
-- de uma mais forte e presumida:
--
--   NAO: "estes dez arquivos foram os comandos executados neste banco"
--   SIM: "o estado deste banco e semanticamente identico ao que estes oito arquivos
--         produzem a partir do zero"
--
-- =============================================================================
-- O QUE ENTRA
-- =============================================================================
--
-- tabelas, colunas (ordem logica, tipo, nulabilidade, default), constraints com a
-- definicao completa e o estado de validacao, indices com predicado e expressao,
-- funcoes com corpo completo, volatilidade e modo de seguranca, triggers, RLS, policies
-- com USING e WITH CHECK, grants de tabela e de funcao, extensoes e comentarios.
--
-- O QUE NAO ENTRA, e por que
--
--   owner            nao e normativo neste projeto: a plataforma escolhe, e nenhuma
--                    migration o declara. Comparar owner produziria drift que nao
--                    significa nada.
--   OIDs             identificador interno; muda a cada CREATE.
--   estatisticas     reltuples, tamanho, ultimo vacuum -- nao sao schema.
--   dado             nenhuma linha de nenhuma tabela de negocio e lida aqui.
--
-- TODA saida passa por `regexp_replace(..., '\s+', ' ')`. Quebra de linha dentro de um
-- valor destruiria o formato `chave|valor`, e diferenca de espaco em branco e
-- explicitamente nao-semantica.
--
-- ESTRITAMENTE READ-ONLY. So SELECT e WITH sobre SELECT.
-- =============================================================================

SELECT 'fp.guard.read_only', current_setting('transaction_read_only');
SELECT 'fp.db.version', split_part(version(), ' ', 2);

-- -----------------------------------------------------------------------------
-- Tabelas, com RLS. `relkind` entra: uma view onde deveria haver tabela e drift.
-- -----------------------------------------------------------------------------
SELECT
  'fp.tabela',
  format('%s|kind=%s,rls=%s,forcada=%s',
    c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
ORDER BY c.relname;

-- -----------------------------------------------------------------------------
-- Colunas, em ordem LOGICA.
--
-- `row_number()` sobre `attnum`, e nao o `attnum` cru: uma coluna removida deixa buraco
-- na numeracao fisica sem mudar a ordem em que `SELECT *` devolve. O buraco nao e
-- semantico; a ordem e.
-- -----------------------------------------------------------------------------
SELECT
  'fp.coluna',
  format('%s.%s|pos=%s,tipo=%s,notnull=%s,default=%s',
    c.relname,
    a.attname,
    row_number() OVER (PARTITION BY c.relname ORDER BY a.attnum),
    format_type(a.atttypid, a.atttypmod),
    a.attnotnull,
    coalesce(regexp_replace(pg_get_expr(d.adbin, d.adrelid), '\s+', ' ', 'g'), '(nenhum)'))
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid
LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'v', 'm', 'p')
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

-- -----------------------------------------------------------------------------
-- Constraints, com a definicao completa e o estado de validacao.
--
-- `convalidated` importa mais aqui do que em qualquer outro lugar: e exatamente o
-- estado em que as constraints de R2 nascem, e confundir `NOT VALID` com validada
-- inverteria o significado da FASE 6 do runbook.
-- -----------------------------------------------------------------------------
SELECT
  'fp.constraint',
  format('%s.%s|tipo=%s,validada=%s,def=%s',
    rel.relname, con.conname, con.contype, con.convalidated,
    regexp_replace(pg_get_constraintdef(con.oid), '\s+', ' ', 'g'))
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
ORDER BY rel.relname, con.conname;

-- -----------------------------------------------------------------------------
-- Indices, pela definicao completa: colunas, expressoes, unicidade e predicado
-- parcial estao todos dentro do `CREATE INDEX` que o Postgres devolve.
-- -----------------------------------------------------------------------------
SELECT
  'fp.indice',
  format('%s.%s|%s',
    t.relname, i.relname,
    regexp_replace(pg_get_indexdef(x.indexrelid), '\s+', ' ', 'g'))
FROM pg_index x
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
ORDER BY t.relname, i.relname;

-- -----------------------------------------------------------------------------
-- Funcoes: definicao completa, volatilidade e modo de seguranca.
--
-- `pg_get_functiondef` traz corpo, linguagem, `SET search_path`, volatilidade e
-- `SECURITY DEFINER` de uma vez. Os tres campos avulsos vem junto porque um corpo
-- identico com volatilidade diferente e drift real -- e o achado da Onda 3 foi
-- exatamente de um atributo que o texto da migration nao mostrava.
-- -----------------------------------------------------------------------------
SELECT
  'fp.funcao',
  format('%s(%s)|volatil=%s,secdef=%s,kind=%s,def=%s',
    p.proname,
    pg_get_function_identity_arguments(p.oid),
    p.provolatile, p.prosecdef, p.prokind,
    regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g'))
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p', 'w')
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

-- -----------------------------------------------------------------------------
-- Triggers de usuario. `tgisinternal` exclui os que o Postgres cria sozinho para
-- sustentar foreign key -- esses ja aparecem como constraint, e conta-los duas vezes
-- so criaria ruido.
-- -----------------------------------------------------------------------------
SELECT
  'fp.trigger',
  format('%s.%s|%s',
    rel.relname, tg.tgname,
    regexp_replace(pg_get_triggerdef(tg.oid), '\s+', ' ', 'g'))
FROM pg_trigger tg
JOIN pg_class rel ON rel.oid = tg.tgrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public' AND NOT tg.tgisinternal
ORDER BY rel.relname, tg.tgname;

-- -----------------------------------------------------------------------------
-- Policies, com USING e WITH CHECK separados.
--
-- Juntar as duas expressoes escondia a diferenca entre "quem pode LER" e "o que pode
-- ser ESCRITO", que sao a autorizacao inteira deste projeto.
-- -----------------------------------------------------------------------------
SELECT
  'fp.policy',
  format('%s.%s|cmd=%s,permissiva=%s,papeis=%s,using=%s,check=%s',
    rel.relname, pol.polname, pol.polcmd, pol.polpermissive,
    coalesce((SELECT string_agg(pg_get_userbyid(r), ',' ORDER BY pg_get_userbyid(r))
              FROM unnest(pol.polroles) AS r), 'PUBLIC'),
    coalesce(regexp_replace(pg_get_expr(pol.polqual, pol.polrelid), '\s+', ' ', 'g'), '(nenhum)'),
    coalesce(regexp_replace(pg_get_expr(pol.polwithcheck, pol.polrelid), '\s+', ' ', 'g'), '(nenhum)'))
FROM pg_policy pol
JOIN pg_class rel ON rel.oid = pol.polrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
ORDER BY rel.relname, pol.polname;

-- -----------------------------------------------------------------------------
-- Grants de tabela, lidos de `relacl`.
--
-- E nao de `information_schema.role_table_grants`, que so mostra grant em que o usuario
-- corrente e grantor, grantee ou membro. Uma lista silenciosamente incompleta aqui
-- pareceria "nenhum grant perigoso" -- exatamente a leitura errada, e a que passa
-- despercebida.
-- -----------------------------------------------------------------------------
-- A IDENTIDADE DE UM GRANT E A TRIPLA INTEIRA, e nao so o nome da tabela.
--
-- Com a tabela sozinha como identidade, `products` teria uma linha por grant e todas
-- colidiriam: o comparador guardaria a ultima e as demais sumiriam sem aviso. Um grant
-- de INSERT para `anon` desapareceria exatamente da comparacao que existe para acha-lo.
-- Com a tripla, um grant a mais aparece como "so no ambiente", que e o que ele e.
SELECT
  'fp.grant_tabela',
  format('%s:%s:%s|concedido',
    c.relname,
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    a.privilege_type)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- Grants de funcao. O achado critico da Onda 3 morava aqui: `REVOKE ... FROM PUBLIC`
-- nao desfaz um EXECUTE concedido direto a `anon`, e so o catalogo mostra a diferenca.
-- -----------------------------------------------------------------------------
SELECT
  'fp.grant_funcao',
  format('%s(%s):%s:%s|concedido',
    p.proname,
    pg_get_function_identity_arguments(p.oid),
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
    a.privilege_type)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(p.proacl) a
WHERE n.nspname = 'public'
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- Comentarios de objeto do schema public.
--
-- Entram porque neste projeto eles sao normativos: as migrations de R2 escrevem
-- `COMMENT ON COLUMN` dizendo que `size_text` e texto de exibicao e nunca fonte de
-- calculo. Um ambiente sem esse comentario perdeu documentacao que a migration
-- entregou -- pequeno, mas e drift, e drift silencioso e o que se esta procurando.
-- -----------------------------------------------------------------------------
SELECT
  'fp.comentario',
  format('tabela:%s|%s', c.relname, regexp_replace(d.description, '\s+', ' ', 'g'))
FROM pg_description d
JOIN pg_class c ON c.oid = d.objoid AND d.objsubid = 0
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY 2;

SELECT
  'fp.comentario',
  format('coluna:%s.%s|%s', c.relname, a.attname,
    regexp_replace(d.description, '\s+', ' ', 'g'))
FROM pg_description d
JOIN pg_class c ON c.oid = d.objoid
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND d.objsubid > 0
ORDER BY 2;

SELECT
  'fp.comentario',
  format('funcao:%s(%s)|%s', p.proname, pg_get_function_identity_arguments(p.oid),
    regexp_replace(d.description, '\s+', ' ', 'g'))
FROM pg_description d
JOIN pg_proc p ON p.oid = d.objoid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY 2;

SELECT
  'fp.comentario',
  format('indice:%s|%s', i.relname, regexp_replace(d.description, '\s+', ' ', 'g'))
FROM pg_description d
JOIN pg_class i ON i.oid = d.objoid AND i.relkind = 'i'
JOIN pg_namespace n ON n.oid = i.relnamespace
WHERE n.nspname = 'public' AND d.objsubid = 0
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- Extensoes relevantes: as que as migrations dependem para existir.
--
-- Lista fechada de proposito. O Supabase instala uma duzia de extensoes de plataforma
-- que o Postgres do drill nunca teria, e compara-las produziria drift em toda execucao
-- -- ruido que treinaria qualquer leitor a ignorar a saida inteira.
-- -----------------------------------------------------------------------------
SELECT
  'fp.extensao',
  format('%s|schema=%s', e.extname, ns.nspname)
FROM pg_extension e
JOIN pg_namespace ns ON ns.oid = e.extnamespace
WHERE e.extname IN ('pgcrypto', 'pg_trgm', 'unaccent', 'citext')
ORDER BY e.extname;
