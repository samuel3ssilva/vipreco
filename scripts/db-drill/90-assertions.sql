-- Onda 4 - assertions do drill de reconstrucao de schema. Roda depois de todas as
-- migrations de supabase/migrations/ terem sido aplicadas, contra um Postgres que
-- comecou com o ponto cego de plataforma simulado em 00-platform-baseline.sql. Falha
-- (RAISE EXCEPTION, exit code != 0 do psql) se qualquer garantia de autorizacao do
-- DATABASE-AUTHORIZATION-MATRIX.md nao se sustentar contra um banco vivo.

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  tbl text;
  fn record;
BEGIN
  -- 1. Tabelas de negocio existem e tem RLS habilitado.
  FOREACH tbl IN ARRAY ARRAY['markets', 'products', 'prices', 'price_submissions', 'product_watch_requests', 'decision_feedback']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = tbl) THEN
      failures := array_append(failures, format('tabela public.%s nao existe apos as migrations', tbl));
    ELSIF NOT (SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = tbl) THEN
      failures := array_append(failures, format('RLS nao esta habilitado em public.%s', tbl));
    END IF;
  END LOOP;

  -- 2. Leitura publica continua permitida nas tabelas de catalogo (comparacao neutra e gratuita).
  FOREACH tbl IN ARRAY ARRAY['markets', 'products', 'prices']
  LOOP
    IF NOT has_table_privilege('anon', format('public.%s', tbl), 'SELECT') THEN
      failures := array_append(failures, format('anon perdeu SELECT em public.%s (quebraria o comparador publico)', tbl));
    END IF;
  END LOOP;

  -- 3. As tres superficies de escrita publica fechadas na Onda 3 continuam fechadas.
  FOREACH tbl IN ARRAY ARRAY['price_submissions', 'product_watch_requests', 'decision_feedback']
  LOOP
    IF has_table_privilege('anon', format('public.%s', tbl), 'INSERT') THEN
      failures := array_append(failures, format('anon tem INSERT em public.%s -- superficie fechada na Onda 3 reaberta sem gate', tbl));
    END IF;
    IF has_table_privilege('authenticated', format('public.%s', tbl), 'INSERT') THEN
      failures := array_append(failures, format('authenticated tem INSERT em public.%s -- superficie fechada na Onda 3 reaberta sem gate', tbl));
    END IF;
  END LOOP;

  -- 4. Nenhuma funcao do schema public e chamavel por anon/authenticated -- reproduz
  --    exatamente a checagem que faltou antes do achado ao vivo da Onda 3 (SS5.3): fazer
  --    essa pergunta contra um banco vivo, nao so contra o texto da migration.
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    IF has_function_privilege('anon', fn.signature, 'EXECUTE') THEN
      failures := array_append(failures, format('anon tem EXECUTE em %s -- checar REVOKE explicito (REVOKE FROM PUBLIC sozinho nao basta, ver THREAT-MODEL-ONDA-3.md SS5.3)', fn.signature));
    END IF;
    IF has_function_privilege('authenticated', fn.signature, 'EXECUTE') THEN
      failures := array_append(failures, format('authenticated tem EXECUTE em %s -- checar REVOKE explicito (REVOKE FROM PUBLIC sozinho nao basta, ver THREAT-MODEL-ONDA-3.md SS5.3)', fn.signature));
    END IF;
  END LOOP;

  -- 5. O fluxo de moderacao server-side continua funcional para service_role.
  IF NOT has_function_privilege('service_role', 'public.approve_submission(uuid)', 'EXECUTE') THEN
    failures := array_append(failures, 'service_role perdeu EXECUTE em public.approve_submission(uuid) -- fluxo de moderacao quebraria');
  END IF;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Drill de reconstrucao de schema encontrou % violacao(oes) de autorizacao:\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'Drill de reconstrucao de schema: todas as garantias de autorizacao confirmadas contra banco vivo.';
END
$$;
