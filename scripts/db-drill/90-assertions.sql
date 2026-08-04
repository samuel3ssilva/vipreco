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

  RAISE NOTICE 'R2-A: os cinco CHECKs rejeitam dado invalido em sete casos, contra banco vivo.';
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

-- ----------------------------------------------------------------------------
-- As bordas numericas. numeric(12,4) nao e enfeite: ele define o que o banco aceita, o
-- que ele ARREDONDA em silencio e o que ele recusa. Arredondamento silencioso e
-- justamente o caminho por onde um zero entraria numa coluna que exige > 0.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
BEGIN
  -- Escala decimal: 0,00004 nao cabe em 4 casas. O Postgres arredonda para 0,0000 -- e ai
  -- o CHECK > 0 precisa pegar. Se ele nao pegasse, entraria um produto de quantidade zero
  -- por caminho nenhum que o dominio consegue enxergar.
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill escala que arredonda para zero', 'unidade', 0.00004, 'g', true);
    failures := array_append(failures, 'aceitou 0,00004 -- arredondou para zero e o CHECK > 0 nao pegou');
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- E a menor quantidade que de fato cabe continua entrando: a regra e recusar zero, nao
  -- recusar valor pequeno.
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill menor escala valida', 'unidade', 0.0001, 'g', true);
  EXCEPTION WHEN check_violation THEN
    failures := array_append(failures, 'recusou 0,0001 -- a menor quantidade representavel deveria entrar');
  END;

  -- Quantidade grande demais para o tipo: o banco recusa por estouro, e nao trunca. Um
  -- truncamento silencioso aqui viraria um produto com quantidade errada e valida.
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill quantidade grande demais', 'unidade', 1000000000, 'g', true);
    failures := array_append(failures, 'aceitou 1e9 em numeric(12,4) -- truncou em vez de recusar');
  EXCEPTION WHEN numeric_value_out_of_range THEN NULL;
  END;

  -- E o maior valor que cabe entra, inclusive passando pela multiplicacao do indice
  -- (x1000 para kg), que acontece FORA do numeric(12,4) e portanto nao estoura.
  BEGIN
    INSERT INTO public.products (name, package_type, quantity_value, quantity_unit, is_demo)
    VALUES ('Drill maior quantidade valida', 'unidade', 99999999.9999, 'kg', true);
  EXCEPTION WHEN numeric_value_out_of_range THEN
    failures := array_append(failures, 'a conversao do indice estourou no maior valor representavel');
  END;

  DELETE FROM public.products WHERE name LIKE 'Drill %escala valida' OR name LIKE 'Drill maior%';

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Bordas numericas de quantity_value (R2-A) erradas em % caso(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-A: arredondamento para zero e recusado, estouro e recusado, bordas validas entram.';
END
$$;

-- ----------------------------------------------------------------------------
-- units_per_package NAO faz parte da identidade. A consequencia disso e concreta e
-- precisa estar provada: o que separa um pack de 6 de um pack de 12 e o TOTAL em
-- quantity_value, e nao a contagem. Um backfill que escreva 350 no lugar de 2100 nao
-- produz erro de digitacao -- produz dois SKUs disputando a mesma identidade.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
BEGIN
  -- Preenchido como o contrato manda (total), os dois packs sao produtos diferentes.
  INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, units_per_package, is_demo)
  VALUES ('Refri drill', 'Marca drill', 'Original', '6 x 350 ml', 'pack', 2100, 'ml', 6, true);

  BEGIN
    INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, units_per_package, is_demo)
    VALUES ('Refri drill', 'Marca drill', 'Original', '12 x 350 ml', 'pack', 4200, 'ml', 12, true);
  EXCEPTION WHEN unique_violation THEN
    failures := array_append(failures, 'pack de 6 e pack de 12 colidiram -- o total deveria separa-los');
  END;

  -- Preenchido errado (conteudo de cada item no lugar do total), os dois viram a mesma
  -- identidade e o segundo e barrado. E o comportamento correto do indice, e e por isso
  -- que o comentario de quantity_value diz TOTAL com todas as letras.
  INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, units_per_package, is_demo)
  VALUES ('Suco drill', 'Marca drill', 'Uva', '6 x 350 ml', 'pack', 350, 'ml', 6, true);

  BEGIN
    INSERT INTO public.products (name, brand, variant, size_text, package_type, quantity_value, quantity_unit, units_per_package, is_demo)
    VALUES ('Suco drill', 'Marca drill', 'Uva', '12 x 350 ml', 'pack', 350, 'ml', 12, true);
    failures := array_append(failures, 'units_per_package entrou na identidade -- 350/6 e 350/12 deveriam colidir');
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  DELETE FROM public.products WHERE name IN ('Refri drill', 'Suco drill');

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Identidade de pack (R2-A) errada em % caso(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-A: o total separa packs de contagens diferentes; units_per_package nao e identidade.';
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

-- ----------------------------------------------------------------------------
-- A afirmacao que sustenta o REVOKE, testada em vez de assumida.
--
-- A migration revoga EXECUTE de anon e authenticated e afirma, em comentario, que isso
-- NAO quebra a constraint -- porque a expressao de um CHECK e avaliada como parte da
-- definicao da tabela, e nao exige que o autor do INSERT possa chamar a funcao.
--
-- Se essa afirmacao fosse falsa, o efeito nao seria um GTIN invalido entrando: seria todo
-- INSERT de um papel sem EXECUTE morrendo com insufficient_privilege. Ou seja, o risco e
-- de disponibilidade, e nao de integridade -- mas continua sendo risco, e continua sendo
-- uma afirmacao sobre o comportamento do Postgres que ninguem verificou.
--
-- O papel de teste existe so aqui dentro, e some ao fim do bloco. anon e authenticated
-- nao serviriam para esta prova: eles nao tem INSERT em products desde a Onda 3, entao o
-- INSERT pararia antes de chegar na constraint.
--
-- ISOLAR A VARIAVEL DEU TRABALHO, E O TRABALHO ENSINOU ALGO
--
-- A primeira versao deste bloco reprovou, e a leitura ingenua seria "a premissa da
-- migration esta errada". Nao estava: `products` tem o trigger `products_search_text`, e
-- funcao de TRIGGER e chamada com o privilegio de quem escreve. O INSERT morria em
-- pa_products_search_text() -- que a Onda 3 revogou de PUBLIC -- antes de chegar perto do
-- CHECK. Dois caminhos diferentes para o mesmo SQLSTATE 42501.
--
-- Dai a assimetria que este bloco documenta, e que vale para o rollout: quem escreve em
-- products PRECISA de EXECUTE nas funcoes de TRIGGER, e NAO precisa nas funcoes usadas em
-- CHECK. Por isso o papel recebe as duas de trigger e continua sem a de GTIN: assim, um
-- 42501 que sobrar so pode ter vindo do CHECK.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
BEGIN
  -- BYPASSRLS de proposito. `products` tem RLS, e uma negacao de RLS levanta o MESMO
  -- SQLSTATE 42501 (insufficient_privilege) que a falta de EXECUTE numa funcao. Sem isso
  -- o teste confundiria uma coisa com a outra e acusaria a migration de um defeito que
  -- ela nao tem. O papel existe para isolar exatamente uma variavel: o privilegio de
  -- EXECUTE. Ele nao representa anon, nem authenticated, nem qualquer papel real.
  CREATE ROLE drill_sem_execute NOLOGIN BYPASSRLS;
  GRANT USAGE ON SCHEMA public TO drill_sem_execute;
  -- `products.id` tem DEFAULT gen_random_uuid(), e o Supabase instala pgcrypto no schema
  -- `extensions`. Sem USAGE aqui o INSERT morre no DEFAULT -- um TERCEIRO caminho
  -- diferente para o mesmo SQLSTATE 42501.
  GRANT USAGE ON SCHEMA extensions TO drill_sem_execute;
  GRANT INSERT, DELETE ON public.products TO drill_sem_execute;

  -- As de TRIGGER, sim: sem elas o INSERT morre em pa_products_search_text() e o teste
  -- estaria medindo outra coisa.
  GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO drill_sem_execute;
  GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO drill_sem_execute;

  -- A de CHECK, nao. E a unica variavel do experimento.
  REVOKE ALL ON FUNCTION public.pa_is_valid_gtin(text) FROM drill_sem_execute;

  IF has_function_privilege('drill_sem_execute', 'public.pa_is_valid_gtin(text)', 'EXECUTE') THEN
    failures := array_append(failures, 'o papel de teste ficou com EXECUTE -- a prova abaixo nao valeria nada');
  END IF;

  SET LOCAL ROLE drill_sem_execute;

  -- GTIN invalido: precisa morrer por check_violation. Se vier insufficient_privilege, a
  -- premissa da migration esta errada e o REVOKE quebra escrita legitima.
  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill papel sem execute invalido', '7896089012345', true);
    failures := array_append(failures, 'a constraint nao rejeitou para um papel sem EXECUTE');
  EXCEPTION
    WHEN check_violation THEN NULL;
    WHEN insufficient_privilege THEN
      -- SQLERRM junto de proposito: 42501 tem varias origens (RLS, USAGE de schema,
      -- funcao de trigger, funcao de CHECK) e uma mensagem generica manda o proximo
      -- leitor adivinhar. A mensagem do Postgres diz exatamente qual objeto faltou.
      failures := array_append(failures, format('INSERT de GTIN invalido falhou por privilegio, nao por CHECK -- %s', SQLERRM));
  END;

  -- E o GTIN valido precisa ENTRAR: a constraint roda, aprova, e ninguem precisou de
  -- EXECUTE para isso.
  BEGIN
    INSERT INTO public.products (name, gtin, is_demo)
    VALUES ('Drill papel sem execute valido', '614141000036', true);
  EXCEPTION
    WHEN insufficient_privilege THEN
      failures := array_append(failures, format('GTIN valido foi barrado por privilegio -- %s', SQLERRM));
  END;

  RESET ROLE;

  -- O drill nao deixa papel nem privilegio para tras. Todo GRANT precisa voltar antes do
  -- DROP ROLE: privilegio pendente e uma dependencia, e o Postgres recusa remover o papel.
  DELETE FROM public.products WHERE name LIKE 'Drill papel sem execute%';
  REVOKE ALL ON public.products FROM drill_sem_execute;
  REVOKE ALL ON FUNCTION public.pa_products_search_text() FROM drill_sem_execute;
  REVOKE ALL ON FUNCTION public.pa_normalize_text(text) FROM drill_sem_execute;
  REVOKE USAGE ON SCHEMA public FROM drill_sem_execute;
  DROP ROLE drill_sem_execute;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'Premissa do REVOKE de EXECUTE (R2-B) errada em % ponto(s):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-B: a constraint valida GTIN mesmo para papel sem EXECUTE na funcao -- o REVOKE nao quebra escrita.';
END
$$;

-- ----------------------------------------------------------------------------
-- search_path fixado. Funcao usada em CHECK e resolvida com o search_path de quem
-- escreve, se ela nao tiver o proprio -- e ai basta um schema na frente de public para
-- que `substr` ou `length` passem a ser outra coisa. O drill nunca tinha conferido isso
-- em funcao nenhuma; passa a conferir nas seis.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  failures text[] := ARRAY[]::text[];
  fn text;
  config text[];
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'pa_is_valid_gtin', 'pa_gtin_check_digit', 'pa_normalize_text',
    'pa_set_updated_at', 'pa_products_search_text', 'approve_submission'
  ]
  LOOP
    SELECT p.proconfig INTO config
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = fn;

    IF config IS NULL OR NOT (config && ARRAY['search_path=public']) THEN
      failures := array_append(failures, format('public.%s nao fixa search_path=public (tem: %s)', fn, coalesce(array_to_string(config, ','), 'nada')));
    END IF;
  END LOOP;

  IF array_length(failures, 1) IS NOT NULL THEN
    RAISE EXCEPTION E'search_path nao fixado em % funcao(oes):\n% ',
      array_length(failures, 1), array_to_string(failures, E'\n');
  END IF;

  RAISE NOTICE 'R2-B: as seis funcoes do schema public fixam search_path.';
END
$$;
