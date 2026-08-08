-- =============================================================================
-- SANITIZACAO DA IDENTIDADE DEMO — nenhuma marca real, nenhum GTIN real.
--
-- Terceiro e ultimo arquivo deste repositorio que ALTERA DADO em ambiente remoto. Ele muda
-- DUAS colunas de `products`: `brand` em tres registros e `gtin` em cinco. Todos ficticios
-- (`is_demo = true`).
--
-- POR QUE ISTO PRECISA EXISTIR
--
-- O alinhamento anterior (`align-demo-brands`) resolveu o fluxo Home -> detalhe, e deixou uma
-- pendencia registrada em DL-040: tres produtos alcancaveis SO POR BUSCA continuavam com marca
-- real, e cinco carregavam GTIN real. O contrato de fixture desta demonstracao nao admite
-- nenhum dos dois:
--
--   * MARCA REAL em produto de demonstracao e uso de marca de terceiro sem autorizacao, e ao
--     lado de uma ilustracao generica vira representacao da embalagem daquela marca;
--   * GTIN REAL pendurado em identidade ficticia e pior do que GTIN nenhum: o codigo IDENTIFICA
--     um produto especifico de um fabricante especifico, entao dizer que "Vale Dourado" tem o
--     codigo de outra marca e uma afirmacao falsa sobre um identificador global.
--
-- NAO se inventa GTIN no lugar. Um codigo inventado ou pertence a alguem, ou reprova no digito
-- verificador — as duas saidas sao piores que a ausencia. NULL e a resposta certa, e o campo e
-- opcional por desenho.
--
-- POR QUE NAO E RESEED
--
-- Reseed apaga e recria. Isto muda duas colunas de linhas nomeadas por id, e nao cria nem apaga
-- nenhuma. Nenhum preco, nenhum mercado, nenhuma coluna de R2-A e nenhuma tabela de contribuicao
-- sao tocados.
--
-- O DESENHO: A TRANSACAO SE RECUSA A CONFIAR EM SI MESMA
--
-- Mesmo desenho de `remediate-demo-gtins.sql` e `align-demo-brands.sql`. Pre-condicoes,
-- alteracao e verificacao dentro de UMA transacao; qualquer `RAISE EXCEPTION` aborta o conjunto.
-- As pre-condicoes sao medidas DENTRO, porque medir fora e agir dentro deixa uma janela.
--
-- A verificacao final NAO confere apenas os alvos: ela varre a tabela INTEIRA procurando
-- qualquer marca da lista de reais e qualquer GTIN nao nulo. E essa varredura que transforma
-- "mudei o que eu listei" em "nao sobrou nenhum" — sao afirmacoes diferentes, e so a segunda e
-- a que a demonstracao precisa.
--
-- O trigger `products_search_text` dispara sozinho e reescreve `search_text` a partir de nome,
-- marca, variante, tamanho, GTIN e categoria. E isso o que se quer: sem ele, a busca continuaria
-- achando "Ypê" e continuaria achando o produto pelo codigo de barras que acabou de sair.
-- =============================================================================

BEGIN;

SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '120s';

DO $sanitizacao$
DECLARE
  total_produtos int;
  produtos_demo int;
  atingidas int;
  alterados int;
  sobraram int;

  -- As marcas reais que ainda estavam no catalogo de demonstracao, com o valor ficticio que
  -- cada uma passa a ter. A marca "antes" faz parte da pre-condicao: se o banco ja estiver com
  -- outro valor, esta transacao NAO e a que deve rodar.
  marcas constant text[][] := ARRAY[
    ARRAY['22222222-2222-2222-2222-000000000004', 'Liza', 'Vale Dourado'],
    ARRAY['22222222-2222-2222-2222-000000000005', 'Ypê',  'Brilho Claro'],
    ARRAY['22222222-2222-2222-2222-000000000006', 'Neve', 'Flor Macia']
  ];

  -- A lista completa de marcas reais que NAO podem sobrar em lugar nenhum da tabela depois
  -- desta transacao. Inclui as tres acima e as tres que `align-demo-brands` ja tinha tratado:
  -- a varredura final vale para todas, e nao so para as desta rodada.
  proibidas constant text[] := ARRAY[
    'Liza', 'Ypê', 'Neve', 'Camil', 'Pilão', 'Italac',
    'Tio João', 'Melitta', '3 Corações', 'Qualy', 'Piracanjuba', 'Parmalat'
  ];

  alvo text[];
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. O ambiente e o que dizemos que e?
  -- ---------------------------------------------------------------------------
  SELECT count(*), count(*) FILTER (WHERE is_demo) INTO total_produtos, produtos_demo
  FROM public.products;

  IF total_produtos <> 7 THEN
    RAISE EXCEPTION 'products tem % linha(s), e esta sanitizacao so roda contra as 7 do seed de demonstracao. Abortando sem alterar nada.', total_produtos;
  END IF;

  IF produtos_demo <> total_produtos THEN
    RAISE EXCEPTION 'ha % produto(s) com is_demo = false. Esta transacao so pode tocar dado ficticio. Abortando sem alterar nada.', total_produtos - produtos_demo;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. As tres marcas alvo existem, sao demo, e estao com o valor de ANTES.
  -- ---------------------------------------------------------------------------
  FOREACH alvo SLICE 1 IN ARRAY marcas LOOP
    SELECT count(*) INTO atingidas
    FROM public.products
    WHERE id = alvo[1]::uuid AND brand = alvo[2] AND is_demo;

    IF atingidas <> 1 THEN
      RAISE EXCEPTION 'o produto % nao esta com a marca demo esperada. Abortando sem alterar nada.', alvo[1];
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- 3. Primeira escrita: as tres marcas.
  -- ---------------------------------------------------------------------------
  alterados := 0;

  FOREACH alvo SLICE 1 IN ARRAY marcas LOOP
    UPDATE public.products SET brand = alvo[3] WHERE id = alvo[1]::uuid;
    GET DIAGNOSTICS atingidas = ROW_COUNT;
    alterados := alterados + atingidas;
  END LOOP;

  IF alterados <> 3 THEN
    RAISE EXCEPTION 'os UPDATEs de marca atingiram % linha(s), e a transacao exige exatamente 3. Revertendo.', alterados;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Segunda escrita: TODO GTIN vai para NULL.
  --
  -- Sem lista de ids: a regra e "nenhum produto de demonstracao tem codigo de barras", e uma
  -- lista de ids envelheceria no dia em que alguem acrescentasse o oitavo produto. `WHERE gtin
  -- IS NOT NULL` deixa a instrucao dizer exatamente a regra que ela aplica.
  -- ---------------------------------------------------------------------------
  UPDATE public.products SET gtin = NULL WHERE gtin IS NOT NULL;
  GET DIAGNOSTICS alterados = ROW_COUNT;

  IF alterados <> 5 THEN
    RAISE EXCEPTION 'o UPDATE de GTIN atingiu % linha(s), e a medicao previa exatamente 5. Revertendo.', alterados;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. Verificacao INDEPENDENTE, e ela varre a tabela inteira.
  --
  -- "Mudei as tres que listei" e "nao sobrou nenhuma" sao afirmacoes diferentes. So a segunda
  -- serve para dizer que a demonstracao esta limpa.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO sobraram FROM public.products WHERE brand = ANY(proibidas);

  IF sobraram <> 0 THEN
    RAISE EXCEPTION 'sobraram % produto(s) com marca real no catalogo de demonstracao. Revertendo.', sobraram;
  END IF;

  SELECT count(*) INTO sobraram FROM public.products WHERE gtin IS NOT NULL;

  IF sobraram <> 0 THEN
    RAISE EXCEPTION 'sobraram % produto(s) com GTIN preenchido. Revertendo.', sobraram;
  END IF;

  -- O trigger rodou? `search_text` precisa refletir a linha NOVA — sem marca antiga e sem o
  -- codigo de barras que acabou de sair.
  SELECT count(*) INTO sobraram
  FROM public.products
  WHERE search_text IS DISTINCT FROM public.pa_normalize_text(
    concat_ws(' ', name, brand, variant, size_text, gtin, category)
  );

  IF sobraram <> 0 THEN
    RAISE EXCEPTION 'ha % produto(s) com search_text fora do contrato de normalizacao depois dos UPDATEs. Revertendo.', sobraram;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 6. Nada alem do previsto mudou.
  -- ---------------------------------------------------------------------------
  SELECT count(*), count(*) FILTER (WHERE is_demo) INTO total_produtos, produtos_demo
  FROM public.products;

  IF total_produtos <> 7 OR produtos_demo <> 7 THEN
    RAISE EXCEPTION 'depois dos UPDATEs, products tem % linha(s) e % com is_demo. Esperado 7 e 7. Revertendo.', total_produtos, produtos_demo;
  END IF;

  RAISE NOTICE 'sanitizacao concluida: 3 marca(s) e 5 codigo(s) tratados; 7 produtos, todos is_demo, 0 marca real, 0 GTIN preenchido, 0 search_text fora do contrato';
END
$sanitizacao$;

COMMIT;
