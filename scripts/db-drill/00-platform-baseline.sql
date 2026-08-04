-- Onda 4 - baseline que simula, em Postgres vanilla, as partes do provisionamento da
-- plataforma Supabase que NAO estao versionadas neste repositorio mas que os testes
-- estaticos de migration nao conseguem enxergar. Existe por causa da causa raiz do
-- achado critico da Onda 3 (docs/security/THREAT-MODEL-ONDA-3.md, secao 5.3): o Supabase
-- concede EXECUTE em toda funcao nova do schema public a anon/authenticated via
-- ALTER DEFAULT PRIVILEGES de plataforma, fora do nosso controle de versionamento --
-- e "REVOKE ... FROM PUBLIC" sozinho nao desfaz esse grant direto. Nenhuma revisao
-- estatica anterior (texto de migration) detectou isso; so um banco vivo detectou.
--
-- Este arquivo roda ANTES das migrations versionadas, num Postgres efemero (Docker),
-- para que o drill de scripts/db-drill/run.sh reproduza o mesmo ponto cego contra o
-- qual as migrations precisam se provar -- e nao apenas contra um banco "limpo demais"
-- que nunca teria exposto o problema original.

-- Papeis que o Supabase cria por padrao em todo projeto nunca sao criados aqui pela
-- primeira vez em produzcao/staging (existem desde o provisionamento); replicados aqui
-- apenas para as migrations conseguirem referencia-los.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

-- Supabase instala extensoes no schema dedicado "extensions" e inclui esse schema no
-- search_path de toda conexao -- e por isso que as migrations chamam gen_random_uuid()
-- e extensions.gin_trgm_ops sem qualificar com o nome do schema em todo lugar.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
ALTER DATABASE postgres SET search_path TO public, extensions;

-- Todo projeto Supabase tem o schema de historico de migrations, criado pela plataforma
-- e nunca por uma migration deste repositorio. Replicado aqui (vazio) para que o
-- preflight remoto de R2.3 -- que consulta este catalogo -- possa ser exercitado contra
-- o banco do drill. Ver scripts/r2/preflight/10-migration-history.sql.
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version text PRIMARY KEY,
  statements text[],
  name text
);

-- Reproducao do ponto cego confirmado ao vivo na Onda 3: toda funcao nova criada no
-- schema public recebe EXECUTE automatico para anon/authenticated, direto (nao via
-- PUBLIC). Se uma migration futura criar uma funcao sensivel e confiar apenas em
-- "REVOKE ALL ... FROM PUBLIC", a assertion em 90-assertions.sql deve falhar o drill.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
