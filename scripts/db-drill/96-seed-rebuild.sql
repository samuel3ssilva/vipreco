-- =============================================================================
-- R2.3C - PROVA DE QUE STAGING E RECONSTRUIVEL A PARTIR DE ARQUIVO VERSIONADO
--
-- O drill ja provava que o SCHEMA se reconstroi do zero a partir de
-- supabase/migrations/. Nao provava nada sobre o DADO: o seed.sql nunca era
-- aplicado. Metade de uma prova de reconstrucao e o tipo de coisa que passa por
-- prova inteira ate o dia em que alguem precisa reconstruir de verdade.
--
-- G6 (recuperacao verificada) exige, entre outras coisas, "dados integralmente
-- representados por seed ou fixtures versionados" e "reconstrucao desde zero
-- comprovada no schema drill". Este arquivo fecha a metade que depende so de
-- arquivo versionado. A outra metade -- staging conter exatamente isto e nada
-- alem -- depende de leitura remota, e continua em aberto.
--
-- Roda DEPOIS de supabase/seed.sql, contra o Postgres efemero do drill.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Contagens exatas.
--
-- Exatas, e nao ">= 1": o objetivo e detectar tanto perda quanto DUPLICACAO. O
-- seed ja duplicou linhas de preco uma vez, quando nao tinha id explicito -- por
-- isso ele hoje usa `ON CONFLICT DO NOTHING`, e por isso a contagem exata e o
-- teste que teria pego aquilo.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  esperado CONSTANT jsonb := '{"markets": 4, "products": 7, "prices": 22}';
  tabela text;
  contado bigint;
  alvo bigint;
BEGIN
  FOR tabela IN SELECT jsonb_object_keys(esperado) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', tabela) INTO contado;
    alvo := (esperado ->> tabela)::bigint;
    IF contado <> alvo THEN
      RAISE EXCEPTION
        'Reconstrucao do seed divergiu em public.%: esperado %, encontrado %.',
        tabela, alvo, contado;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Nenhuma linha fora de is_demo.
--
-- O seed versionado so pode produzir dado ficticio. Uma linha com is_demo = false
-- vinda daqui significaria dado tratado como real num arquivo que qualquer um
-- aplica em qualquer ambiente.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tabela text;
  fora bigint;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['markets', 'products', 'prices'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE is_demo IS DISTINCT FROM true', tabela)
      INTO fora;
    IF fora <> 0 THEN
      RAISE EXCEPTION 'public.% tem % linha(s) sem is_demo = true vindas do seed.', tabela, fora;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Todo GTIN do seed passa no digito verificador GS1.
--
-- A aritmetica abaixo e COPIADA de scripts/r2/target-readiness.sql, e nao
-- re-derivada. A distincao custou uma hora: a primeira versao deste arquivo
-- reescreveu a formula "do jeito que deveria ser" -- indexando da esquerda em vez
-- da direita -- e inverteu os pesos. O resultado reprovava 4 dos 5 GTINs reais do
-- seed e APROVAVA um dos dois ficticios invalidos.
--
-- O modo de falhar e o que interessa: uma formula invertida nao parece quebrada.
-- Ela devolve numeros plausiveis, na faixa certa, e a conclusao que se tira dela e
-- "o dado esta errado" -- exatamente o lugar errado para procurar.
--
-- Indice a partir da DIREITA do corpo: i = 0 e o digito mais a direita antes do
-- verificador, e ele pesa 3. Mesma convencao de gtinCheckDigit() em src/lib/gtin.ts
-- e de public.pa_gtin_check_digit() na migration de R2-B.
--
-- Este e o teste que impede a volta dos dois GTINs invalidos que o commit 1102967
-- anulou. Sem ele, reintroduzi-los no seed nao quebraria nada ate a FASE 6 do
-- rollout, contra o banco real, no `VALIDATE CONSTRAINT`.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  invalidos bigint;
BEGIN
  SELECT count(*)
    INTO invalidos
    FROM public.products c
   WHERE c.gtin IS NOT NULL
     AND (
       SELECT (10 - (SUM(
         (substr(c.gtin, length(c.gtin) - 1 - i, 1))::integer
           * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
       ) % 10)) % 10
       FROM generate_series(0, length(c.gtin) - 2) AS i
     ) <> (substr(c.gtin, length(c.gtin), 1))::integer;

  IF invalidos <> 0 THEN
    RAISE EXCEPTION
      'O seed versionado contem % GTIN(s) com digito verificador invalido. O valor nao e impresso.',
      invalidos;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3B. A aritmetica inline concorda com a funcao do banco, GTIN a GTIN.
--
-- A migration de R2-B afirma, em comentario, que pa_gtin_check_digit() e "a traducao
-- literal de gtinCheckDigit() em src/lib/gtin.ts". Isso vale para a FUNCAO. Nao valia
-- para as consultas de auditoria, que reimplementam a mesma conta inline porque
-- precisam rodar contra bancos onde a funcao ainda nao existe -- e uma copia sem
-- verificacao e uma divergencia esperando a hora.
--
-- Aqui as duas rodam lado a lado sobre os mesmos dados. Se alguem reescrever qualquer
-- uma delas "do jeito que deveria ser", o drill reprova -- que e exatamente o que
-- faltou quando a versao anterior deste arquivo fez isso.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  divergentes bigint;
BEGIN
  SELECT count(*)
    INTO divergentes
    FROM public.products c
   WHERE c.gtin IS NOT NULL
     AND (
       SELECT (10 - (SUM(
         (substr(c.gtin, length(c.gtin) - 1 - i, 1))::integer
           * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
       ) % 10)) % 10
       FROM generate_series(0, length(c.gtin) - 2) AS i
     ) <> public.pa_gtin_check_digit(left(c.gtin, length(c.gtin) - 1));

  IF divergentes <> 0 THEN
    RAISE EXCEPTION
      'A aritmetica inline de auditoria divergiu de pa_gtin_check_digit() em % GTIN(s). Uma das duas esta errada.',
      divergentes;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Nenhum GTIN duplicado.
--
-- O indice unico ja impediria o INSERT, mas a asserção explicita transforma
-- "o banco recusou" em "a reconstrucao foi conferida" -- e e o que o Gate G8 pede.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  duplicados bigint;
BEGIN
  SELECT count(*) INTO duplicados
    FROM (SELECT gtin FROM public.products WHERE gtin IS NOT NULL GROUP BY gtin HAVING count(*) > 1) d;
  IF duplicados <> 0 THEN
    RAISE EXCEPTION 'O seed versionado contem % GTIN(s) duplicado(s).', duplicados;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. O seed e idempotente.
--
-- Nao e detalhe de conveniencia: uma reconstrucao de emergencia raramente acontece
-- de primeira. Se aplicar o seed duas vezes duplicar dado, a recuperacao passa a
-- exigir um banco perfeitamente limpo -- e quem esta recuperando nao tem isso.
--
-- Provado no proprio drill: run.sh aplica o seed DUAS vezes antes deste arquivo, e
-- as contagens da secao 1 tem de continuar exatas.
-- -----------------------------------------------------------------------------
SELECT 'seed.rebuild' AS verificacao, 'ok' AS resultado;
