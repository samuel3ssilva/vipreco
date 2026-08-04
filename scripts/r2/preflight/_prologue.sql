-- R2.3 — prólogo de toda consulta remota do preflight. Nunca roda sozinho.
--
-- Camada B da guarda de read-only (`docs/data/R2-APPLICATION-GATE.md`). As camadas são
-- três e independentes de propósito:
--
--   A. estática — `read-only-guard.ts` reprova qualquer verbo de escrita nos `.sql`
--   B. transacional — este arquivo, que impede a escrita mesmo se a A falhar
--   C. verificação — a primeira consulta do preflight confirma, no banco, que B pegou
--
-- Não presumimos que a credencial seja read-only. Ela quase certamente não é: o único
-- papel do Supabase que enxerga `supabase_migrations.schema_migrations` também escreve
-- em tudo. A garantia tem que vir da sessão, não do usuário.
--
-- Os `SET` vêm DENTRO da transação, e como `SET LOCAL`, porque a connection string de
-- staging pode ser a do pooler em modo transaction — onde parâmetro de sessão fora de
-- transação não sobrevive de um statement para o outro.

BEGIN;

SET TRANSACTION READ ONLY;

-- Uma auditoria que trava o banco é pior do que auditoria nenhuma. Estes três limites
-- garantem que o pior caso do preflight é ele mesmo falhar.
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
