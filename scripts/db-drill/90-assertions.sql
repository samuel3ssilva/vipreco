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
-- R2-A / MVP-E1-01 e MVP-E1-02 - identidade exata estruturada em products.
--
-- Roda contra o banco vivo reconstruido, e nao contra o texto da migration: coluna que
-- existe, CHECK que rejeita de verdade, indice que colide de verdade. O objetivo e provar
-- as tres afirmacoes da migration que o texto sozinho nao sustenta -- que ela e aditiva,
-- que '500 g' e '0,5 kg' passam a colidir, e que nada disso vale para linha sem campo
-- estruturado.
-- ============================================================================

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  col record;
  esperado record;
BEGIN
  -- 1. As quatro colunas existem, sao NULLABLE e tem o tipo do contrato.
  FOR esperado IN
    SELECT * FROM (VALUES
      ('package_type', 'text'),
      ('quantity_value', 'numeric'),
      ('quantity_unit', 'text'),
      ('units_per_package', 'integer')
    ) AS t(nome, tipo)
  LOOP
    SELECT column_name, data_type, is_nullable INTO col
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products' AND column_name = esperado.nome;

    IF col IS NULL THEN
      failures := array_append(failures, format('coluna products.%s nao existe', esperado.nome));
    ELSE
      IF col.data_type IS DISTINCT FROM esperado.tipo THEN
        failures := array_append(failures, format('products.%s e %s, esperado %s', esperado.nome, col.data_type, esperado.tipo));
      END IF;
      -- Nullable nao e detalhe: e o que faz a migration ser aditiva. NOT NULL aqui
      -- quebraria toda linha existente, e a obrigatoriedade so vem depois do backfill.
      IF col.is_nullable <> 'YES' THEN
        failures := array_append(failures, format('products.%s nasceu NOT NULL -- quebraria as linhas existentes', esperado.nome));
      END IF;
    END IF;
  END LOOP;

  -- 2. numeric(12,4), a precisao que o dominio espelha em src/lib/quantity.ts.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'quantity_value'
       AND numeric_precision = 12 AND numeric_scale = 4
  ) THEN
    failures := array_append(failures, 'products.quantity_value nao e numeric(12,4)');
  END IF;

  -- 3. size_text continua existindo. E texto de exibicao, e o contrato manda preservar.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'size_text'
  ) THEN
    failures := array_append(failures, 'products.size_text foi removido -- o contrato manda preservar como texto de exibicao');
  END IF;

  -- 4. O indice textual antigo NAO foi removido. Enquanto houver linha sem campo
  --    estruturado, ele e a unica protecao contra duplicata.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'products_canonical_identity_idx'
  ) THEN
    failures := array_append(failures, 'products_canonical_identity_idx sumiu -- R2-A e aditiva e nao pode remover o indice do modelo textual');
  END IF;

  -- 5. O indice novo existe, e unico e e parcial.
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
     WHERE c.relname = 'products_exact_identity_idx' AND i.indisunique AND i.indpred IS NOT NULL
  ) THEN
    failures := array_append(failures, 'products_exact_identity_idx nao existe, nao e unico ou nao e parcial');
  END IF;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Schema de identidade exata (R2-A) violado em % ponto(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-A: colunas, tipos e indices de identidade exata confirmados contra banco vivo.';
END
$$;

-- ----------------------------------------------------------------------------
-- Comportamento, e nao catalogo: os CHECKs precisam REJEITAR de verdade, e o indice
-- precisa COLIDIR de verdade. Catalogo diz que a constraint existe; so o INSERT diz que
-- ela funciona.
--
-- Cada tentativa tem nome proprio. Se um CHECK falhar em disparar, a linha entra -- e com
-- nomes iguais a segunda entrada bateria no indice de identidade canonica, disfarcando a
-- falha real de unique_violation.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
BEGIN
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill pacote invalido', 'engradado', 500, 'g', true);
    failures := array_append(failures, 'aceitou package_type = engradado, fora dos oito valores do contrato');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill unidade invalida', 'unidade', 500, 'kilo', true);
    failures := array_append(failures, 'aceitou quantity_unit = kilo, fora das cinco unidades');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Embalagem nao tem quantidade nula nem negativa.
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill quantidade zero', 'unidade', 0, 'g', true);
    failures := array_append(failures, 'aceitou quantity_value = 0');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill quantidade negativa', 'unidade', -1, 'g', true);
    failures := array_append(failures, 'aceitou quantity_value negativo');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- Valor sem unidade e unidade sem valor sao dado pela metade, e dado pela metade e o
  -- que produz comparacao errada mais tarde.
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, is_demo)
    VALUES ('Drill valor sem unidade', 'unidade', 500, true);
    failures := array_append(failures, 'aceitou quantity_value sem quantity_unit');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.products (name, package_type, quantity_unit, is_demo)
    VALUES ('Drill unidade sem valor', 'unidade', 'g', true);
    failures := array_append(failures, 'aceitou quantity_unit sem quantity_value');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, units_per_package, is_demo)
    VALUES ('Drill pack vazio', 'pack', 6, 'un', 0, true);
    failures := array_append(failures, 'aceitou units_per_package = 0');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'CHECKs de identidade exata (R2-A) nao rejeitam em % caso(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-A: os sete CHECKs rejeitam dado invalido contra banco vivo.';
END
$$;

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
BEGIN
  -- O ganho real sobre o indice textual: '500 g' e '0,5 kg' sao a mesma prateleira e
  -- passam a colidir por CONTA. O indice sobre size_text nunca conseguiu isso, porque
  -- '500 g' e '0,5 kg' sao dois textos diferentes.
  INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, is_demo)
  VALUES ('Cafe drill', 'Marca drill', 'Tradicional', '500 g', 'unidade', 500, 'g', true);

  BEGIN
    INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Cafe drill', 'Marca drill', 'Tradicional', '0,5 kg', 'unidade', 0.5, 'kg', true);
    failures := array_append(failures, '500 g e 0,5 kg entraram como dois produtos -- a conversao nao esta no indice');
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- E o que NAO pode colidir: mesma conta, grandeza diferente.
  BEGIN
    INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Cafe drill', 'Marca drill', 'Tradicional', '500 ml', 'unidade', 500, 'ml', true);
  EXCEPTION WHEN unique_violation THEN
    failures := array_append(failures, '500 g e 500 ml colidiram -- o indice esta comparando numero sem olhar a grandeza');
  END;

  -- Embalagem diferente e SKU diferente (CANONICAL-PRODUCT-SPEC.md §4.6).
  BEGIN
    INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Cafe drill', 'Marca drill', 'Tradicional', '500 g sache', 'sache', 500, 'g', true);
  EXCEPTION WHEN unique_violation THEN
    failures := array_append(failures, 'unidade e sache colidiram -- package_type nao esta na identidade');
  END;

  -- E o indice e PARCIAL: linha sem campo estruturado nao participa dele. Duas linhas
  -- assim so podem ser barradas pelo indice textual, e este par tem size_text diferente.
  INSERT INTO public.products (name, brand, variant, size_text, is_demo)
  VALUES ('Legado drill', 'Marca drill', 'Tradicional', '500 g', true);
  BEGIN
    INSERT INTO public.products (name, brand, variant, size_text, is_demo)
    VALUES ('Legado drill', 'Marca drill', 'Tradicional', '0,5 kg', true);
  EXCEPTION WHEN unique_violation THEN
    failures := array_append(failures, 'o indice novo barrou linha sem campo estruturado -- ele deveria ser parcial');
  END;

  -- O drill nao deixa linha para tras.
  DELETE FROM public.products WHERE name IN ('Cafe drill', 'Legado drill');

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Indice de identidade exata (R2-A) errado em % caso(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-A: 500 g e 0,5 kg colidem; 500 g e 500 ml nao; linha sem estrutura nao participa.';
END
$$;
