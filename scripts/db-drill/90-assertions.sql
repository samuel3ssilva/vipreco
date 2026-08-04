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

-- ============================================================================
-- 6. Contrato unico de normalizacao (R0.5 / TD-001)
-- ============================================================================
--
-- Os MESMOS vetores rodam nos dois lados: aqui, contra pa_normalize_text() num Postgres
-- vivo; e em src/lib/normalize.contract.test.ts, contra normalizeSearchText(). Aquele
-- teste tambem le ESTE arquivo e falha se as duas listas divergirem -- entao acrescentar
-- um vetor aqui sem acrescentar em supabase/normalization-vectors.json quebra o CI, e
-- vice-versa.
--
-- Por que isso importa: o indice products_canonical_identity_idx e funcional sobre esta
-- funcao. Se ela e a normalizacao do cliente discordarem, o banco aceita como produtos
-- distintos duas grafias do mesmo SKU, e a comparacao se parte sem nenhum erro visivel.
DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  vetor record;
  obtido text;
BEGIN
  FOR vetor IN
    SELECT * FROM (VALUES
      ('500 g', '500 g'),
      ('500  g', '500 g'),
      ('500g', '500g'),
      ('1 L', '1 l'),
      ('1L', '1l'),
      ('Café Pilão', 'cafe pilao'),
      ('CAFÉ PILÃO', 'cafe pilao'),
      ('Ypê', 'ype'),
      ('Açúcar Cristal', 'acucar cristal'),
      ('  Arroz  ', 'arroz'),
      (' Detergente   Neutro ', 'detergente neutro'),
      ('Óleo de Soja 900 ml', 'oleo de soja 900 ml'),
      ('7896006711117', '7896006711117'),
      ('07896006711117', '07896006711117'),
      ('', ''),
      ('   ', '')
    ) AS v(entrada, saida)
  LOOP
    obtido := public.pa_normalize_text(vetor.entrada);
    IF obtido IS DISTINCT FROM vetor.saida THEN
      failures := array_append(failures, format(
        'pa_normalize_text(%L) devolveu %L, esperado %L', vetor.entrada, obtido, vetor.saida));
    END IF;
  END LOOP;

  -- Entrada nula tambem faz parte do contrato, e nao cabe na tabela de vetores acima.
  IF public.pa_normalize_text(NULL) IS DISTINCT FROM '' THEN
    failures := array_append(failures, 'pa_normalize_text(NULL) deveria devolver string vazia');
  END IF;

  -- Tabulacao e quebra de linha contam como espaco em branco. Fora da tabela de vetores
  -- porque exigem literal com escape (E'...'), que o teste espelhado nao precisa parsear.
  IF public.pa_normalize_text(E'\t\ncafé\t') IS DISTINCT FROM 'cafe' THEN
    failures := array_append(failures, 'pa_normalize_text nao trata tabulacao e quebra de linha como espaco');
  END IF;

  -- A funcao precisa continuar IMMUTABLE: products_canonical_identity_idx e um indice
  -- funcional sobre ela, e o Postgres so aceita funcao imutavel em indice.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'pa_normalize_text' AND p.provolatile = 'i'
  ) THEN
    failures := array_append(failures, 'pa_normalize_text deixou de ser IMMUTABLE -- o indice funcional de identidade canonica depende disso');
  END IF;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Contrato de normalizacao violado em % vetor(es):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'Contrato de normalizacao: todos os vetores confirmados contra banco vivo.';
END
$$;

-- ============================================================================
-- R2-B / MVP-E1-05 - integridade de GTIN contra banco vivo.
--
-- A MESMA lista de supabase/gtin-vectors.json, e src/lib/gtin.contract.test.ts confere
-- que os dois lados não divergiram. Acrescentar vetor de um lado sem acrescentar do outro
-- quebra o CI antes de chegar aqui.
-- ============================================================================

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  v record;
  obtido boolean;
BEGIN
  FOR v IN
    SELECT * FROM (VALUES
      ('1234567890128', true),
      ('40063812', true),
      ('614141000036', true),
      ('01234567890128', true),
      ('0000000000000', true),
      ('7896089012345', false),
      ('7896089054321', false),
      ('0000000000001', false),
      ('123456789013', false),
      ('123456789012a', false),
      ('123-4567-89012-8', false),
      ('', false),
      ('123456789', false),
      ('123456789012345', false),
      ('+123456789012', false),
      ('1234567890128.0', false)
    ) AS g(codigo, valido)
  LOOP
    obtido := public.pa_is_valid_gtin(v.codigo);
    IF obtido IS DISTINCT FROM v.valido THEN
      failures := array_append(failures, format('pa_is_valid_gtin(%L) devolveu %s, esperado %s', v.codigo, coalesce(obtido::text, 'NULL'), v.valido));
    END IF;
  END LOOP;

  -- NULL nao e invalido: GTIN e opcional, e produto sem GTIN e produto normal.
  IF public.pa_is_valid_gtin(NULL) IS NOT NULL THEN
    failures := array_append(failures, 'pa_is_valid_gtin(NULL) deveria devolver NULL -- GTIN e opcional');
  END IF;

  -- Zero a esquerda e parte do codigo. Se algum caminho convertesse para numero, estes
  -- dois virariam o mesmo valor -- e sao dois codigos diferentes.
  IF public.pa_is_valid_gtin('01234567890128') IS NOT TRUE
     OR public.pa_is_valid_gtin('1234567890128') IS NOT TRUE THEN
    failures := array_append(failures, 'os dois codigos com e sem zero a esquerda deveriam ser validos e independentes');
  END IF;

  -- Propriedade: para qualquer corpo, anexar o digito calculado fecha o codigo.
  IF public.pa_gtin_check_digit('123456789012') <> 8 THEN
    failures := array_append(failures, 'pa_gtin_check_digit divergiu do vetor de referencia EAN-13');
  END IF;
  IF public.pa_gtin_check_digit('4006381') <> 2 THEN
    failures := array_append(failures, 'pa_gtin_check_digit divergiu do vetor de referencia GTIN-8');
  END IF;

  -- A funcao precisa continuar IMMUTABLE: e usada em CHECK.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('pa_is_valid_gtin', 'pa_gtin_check_digit')
      AND p.provolatile = 'i'
    HAVING count(*) = 2
  ) THEN
    failures := array_append(failures, 'pa_is_valid_gtin ou pa_gtin_check_digit nao e IMMUTABLE');
  END IF;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Contrato de GTIN violado em % vetor(es):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'Contrato de GTIN: todos os vetores confirmados contra banco vivo.';
END
$$;

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  fn text;
BEGIN
  -- As duas funcoes novas nao podem ficar executaveis por anon nem por authenticated. O
  -- Supabase concede EXECUTE a esses papeis na criacao de TODA funcao do schema public,
  -- por ALTER DEFAULT PRIVILEGES da plataforma -- foi o achado ao vivo da Onda 3, e a
  -- migration revoga explicitamente por causa dele.
  FOREACH fn IN ARRAY ARRAY['pa_is_valid_gtin(text)', 'pa_gtin_check_digit(text)']
  LOOP
    IF has_function_privilege('anon', format('public.%s', fn), 'EXECUTE') THEN
      failures := array_append(failures, format('anon tem EXECUTE em public.%s', fn));
    END IF;
    IF has_function_privilege('authenticated', format('public.%s', fn), 'EXECUTE') THEN
      failures := array_append(failures, format('authenticated tem EXECUTE em public.%s', fn));
    END IF;
    IF NOT has_function_privilege('service_role', format('public.%s', fn), 'EXECUTE') THEN
      failures := array_append(failures, format('service_role perdeu EXECUTE em public.%s', fn));
    END IF;
  END LOOP;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Grants das funcoes de GTIN (R2-B) errados em % ponto(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-B: as funcoes de GTIN nao sao executaveis por anon nem por authenticated.';
END
$$;

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
BEGIN
  -- A constraint precisa REJEITAR de verdade, e a unicidade parcial que ja existia
  -- precisa continuar existindo -- esta migration nao a recria de proposito.
  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill gtin invalido', '7896089012345', true);
    failures := array_append(failures, 'aceitou GTIN com digito verificador errado');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill gtin com letra', '789600671111a', true);
    failures := array_append(failures, 'aceitou GTIN com caractere nao-digito');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill gtin com espaco', '1234567890128 ', true);
    failures := array_append(failures, 'aceitou GTIN com espaco nas pontas -- trim e trabalho de quem escreve');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Sem GTIN continua sendo um produto perfeitamente normal.
  INSERT INTO public.products (name, gtin, is_demo) VALUES ('Drill sem gtin', NULL, true);

  -- GTIN valido entra.
  INSERT INTO public.products (name, gtin, is_demo)
  VALUES ('Drill gtin valido', '1234567890128', true);

  -- E continua unico entre os preenchidos.
  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill gtin repetido', '1234567890128', true);
    failures := array_append(failures, 'aceitou o mesmo GTIN em dois produtos -- products_gtin_unique_idx sumiu');
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Dois produtos sem GTIN nao colidem: o indice de unicidade e parcial.
  BEGIN
    INSERT INTO public.products (name, gtin, is_demo) VALUES ('Drill outro sem gtin', NULL, true);
  EXCEPTION WHEN unique_violation THEN
    failures := array_append(failures, 'dois produtos sem GTIN colidiram -- a unicidade deveria ser parcial');
  END;

  -- Zero a esquerda: 13 e 14 digitos do mesmo numero sao codigos DIFERENTES, e os dois
  -- cabem no banco ao mesmo tempo.
  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill gtin com zero', '01234567890128', true);
  EXCEPTION WHEN unique_violation THEN
    failures := array_append(failures, '01234567890128 colidiu com 1234567890128 -- algum caminho converteu para numero');
  END;

  DELETE FROM public.products WHERE name LIKE 'Drill %';

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Constraint de GTIN (R2-B) errada em % caso(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-B: GTIN invalido rejeitado, ausente aceito, unicidade parcial preservada, zero a esquerda distinto.';
END
$$;
