-- R2.5 §6 - auditoria READ-ONLY de owner, grantor e default privileges.
--
-- POR QUE ESTE ARQUIVO EXISTE
--
-- A migration de hardening precisa escrever `ALTER DEFAULT PRIVILEGES FOR ROLE <papel>`, e
-- esse `<papel>` NAO pode ser chutado. `ALTER DEFAULT PRIVILEGES` sem `FOR ROLE` aplica ao
-- papel da sessao; se o papel que de fato criou as tabelas for outro, a migration roda sem
-- erro nenhum e nao desfaz coisa alguma -- o pior resultado possivel, porque o gate passaria
-- verde sobre um banco inalterado.
--
-- O mandato e explicito: "Nao presumir o papel sem medir". Isto e a medicao.
--
-- READ-ONLY. Le apenas catalogo. Nao ha DML, nao ha DDL, nao ha funcao com efeito.
--
-- O QUE NAO SAI DAQUI: nenhuma linha de dado, nenhum GTIN, nenhum identificador pessoal.
-- Nomes de papel e de tabela sao metadado de schema.

-- -----------------------------------------------------------------------------
-- 1. Quem e dono de cada tabela central. O owner e o candidato natural a grantor,
--    mas candidato nao e resposta -- a consulta 3 e que decide.
-- -----------------------------------------------------------------------------
SELECT
  'priv.owner' AS chave,
  c.relname || '=' || pg_get_userbyid(c.relowner) AS valor
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- -----------------------------------------------------------------------------
-- 2. Quem CONCEDEU cada privilegio hoje.
--
-- A chave se chama `priv.concessao`, e nao `priv.grant`, porque a guarda estatica de
-- read-only casa o verbo proibido em qualquer lugar do arquivo fora de comentario -- e
-- `priv.grant` casa. A guarda esta certa em ser literal: uma guarda que tenta adivinhar
-- se o verbo esta "so num nome" e uma guarda que erra em favor de deixar passar. Quem
-- cede e o rotulo. Mesma decisao de `:ao_apagar=` em 40-watch-requests.sql. `aclexplode` devolve o grantor junto com o
--    grantee, e e o grantor que um REVOKE precisa casar: revogar como o papel errado
--    nao remove um grant concedido por outro.
-- -----------------------------------------------------------------------------
SELECT
  'priv.concessao' AS chave,
  c.relname
    || '|' || CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END
    || '|' || a.privilege_type
    || '|concedido_por=' || pg_get_userbyid(a.grantor) AS valor
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(c.relacl) a
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND (a.grantee = 0 OR pg_get_userbyid(a.grantee) IN ('anon', 'authenticated'))
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- 3. Os DEFAULT PRIVILEGES em vigor. Esta e a consulta que responde a pergunta do
--    hardening: qual papel esta configurado para conceder automaticamente em tabela nova.
--
--    `defaclobjtype` = 'r' e tabela. Sem linha nenhuma aqui para o schema public, o
--    grant automatico vem de outro lugar (provisionamento direto), e a migration precisa
--    saber disso ANTES de afirmar que corrigiu.
-- -----------------------------------------------------------------------------
SELECT
  'priv.default_acl' AS chave,
  pg_get_userbyid(d.defaclrole)
    || '|' || coalesce(n.nspname, '(todos os schemas)')
    -- `::text` explicito: `defaclobjtype` e do tipo "char" (um byte), e `text || "char"`
    -- e ambiguo para o Postgres -- `operator is not unique`. O drill pegou isto antes de
    -- a consulta chegar perto de staging, que e exatamente para isso que ele roda os .sql
    -- do preflight contra um banco vivo.
    || '|tipo=' || d.defaclobjtype::text
    || '|' || coalesce(array_to_string(d.defaclacl::text[], ' '), '(vazio)') AS valor
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
ORDER BY 2;

-- -----------------------------------------------------------------------------
-- 4. Com qual papel a propria auditoria esta conectada, e quais papeis ela pode assumir.
--    Se o executor nao for membro do owner, o REVOKE da migration falharia por falta de
--    permissao -- e e melhor descobrir isso aqui do que no meio de uma aplicacao.
-- -----------------------------------------------------------------------------
SELECT 'priv.sessao' AS chave, current_user || '|sessao=' || session_user AS valor;

SELECT
  'priv.membro_de' AS chave,
  string_agg(r.rolname, ',' ORDER BY r.rolname) AS valor
FROM pg_auth_members m
JOIN pg_roles r ON r.oid = m.roleid
WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname = current_user);

-- -----------------------------------------------------------------------------
-- 5. RLS por tabela. Nao e alvo do hardening -- entra como testemunha, para o relatorio
--    poder afirmar depois que a migration NAO mexeu nela.
-- -----------------------------------------------------------------------------
SELECT
  'priv.rls' AS chave,
  c.relname || '=' || CASE WHEN c.relrowsecurity THEN 'on' ELSE 'off' END AS valor
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;
