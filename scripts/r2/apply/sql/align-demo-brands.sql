-- =============================================================================
-- ALINHAMENTO DAS MARCAS DEMO — o fixture da Home e o banco de staging passam a
-- descrever o MESMO produto.
--
-- Segundo arquivo deste repositorio que ALTERA DADO em ambiente remoto. Ele muda uma
-- coluna, `products.brand`, de quatro registros ficticios (`is_demo = true`).
--
-- POR QUE ISTO PRECISA EXISTIR
--
-- R3.3B trocou as marcas do fixture da Home por marcas ficticias, e o motivo esta escrito
-- em `src/lib/demo-opportunities.ts`: uma ilustracao generica ao lado do nome de uma marca
-- existente E a representacao da embalagem daquela marca, por mais generico que seja o
-- traco. O banco de staging ficou para tras -- a Home mostra "Serra Alta" e a pagina do
-- produto, que le do banco, mostra a marca antiga.
--
-- Quem navega da Home para o detalhe ve os dois nomes na mesma sessao. Numa entrevista com
-- dono de mercado, isso nao le como dado de demonstracao: le como produto que nao sabe o
-- que esta mostrando.
--
-- POR QUE NAO E RESEED
--
-- Reseed apaga e recria. Isto muda UMA coluna de QUATRO linhas nomeadas por id, e nao cria
-- nem apaga nenhuma. Nenhum preco e tocado, nenhum mercado e tocado, nenhum GTIN e tocado,
-- nenhuma coluna de R2-A e tocada. As proibicoes de backfill continuam integrais: nada aqui
-- e inferido, calculado ou derivado -- os quatro valores sao constantes literais, e sao
-- exatamente os que `demo-opportunities.ts` ja usa.
--
-- POR QUE QUATRO, E NAO TRES NEM SETE
--
-- Tres sao os que a Home mostra (arroz, cafe 500 g, leite). O quarto e o cafe de 250 g:
-- ele nao aparece na Home, mas aparece na SECAO DE OUTRO TAMANHO da pagina do cafe de
-- 500 g -- ou seja, exatamente no fluxo que a demonstracao percorre. Deixa-lo com a marca
-- antiga poria os dois nomes lado a lado na mesma tela.
--
-- Os outros tres produtos do seed (oleo, detergente, papel higienico) NAO entram. Eles so
-- sao alcancados por busca digitada, estao fora do fluxo Home -> detalhe, e mexer neles
-- multiplicaria uma contradicao que ja existe e que ninguem decidiu resolver: marca
-- ficticia carregando GTIN real. Fica registrado como pendencia, e nao resolvido as
-- escondidas aqui.
--
-- O DESENHO: A TRANSACAO SE RECUSA A CONFIAR EM SI MESMA
--
-- Mesmo desenho de `remediate-demo-gtins.sql`, e pela mesma razao. Tudo -- pre-condicoes,
-- alteracao e verificacao -- roda dentro de UMA transacao; qualquer `RAISE EXCEPTION`
-- aborta o conjunto inteiro. As pre-condicoes sao medidas DENTRO da transacao, porque medir
-- fora e agir dentro deixa uma janela, e a janela e onde mora a surpresa.
--
-- `ROW_COUNT = 4` prova que quatro linhas mudaram. Nao prova que eram as quatro certas, nem
-- que a marca antiga sumiu do conjunto que importa. A verificacao final le os quatro
-- registros de novo, por id, e confere valor por valor.
--
-- O TRIGGER `products_search_text` DISPARA SOZINHO, e e isso o que se quer: `search_text`
-- e materializado BEFORE UPDATE a partir de nome, marca, variante, tamanho, GTIN e
-- categoria. Sem ele, a busca continuaria achando o produto pela marca antiga e nao pela
-- nova. A verificacao final confere que `search_text` bate com `pa_normalize_text` da linha
-- ja alterada -- isto e, que o trigger de fato rodou.
-- =============================================================================

BEGIN;

SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
SET LOCAL idle_in_transaction_session_timeout = '120s';

DO $alinhamento$
DECLARE
  total_produtos int;
  produtos_demo int;
  alterados int;
  fora_do_esperado int;
  search_text_desatualizado int;
  marcas_antigas int;

  -- Os quatro alvos, e nada alem deles. id, marca esperada ANTES, marca depois.
  --
  -- A marca "antes" faz parte da pre-condicao de proposito: se o banco ja estiver com
  -- outro valor, esta transacao NAO e a que deve rodar, e recusar e melhor do que
  -- sobrescrever um estado que ninguem descreveu.
  alvos constant text[][] := ARRAY[
    ARRAY['22222222-2222-2222-2222-000000000001', 'Camil',  'Ouro do Campo'],
    ARRAY['22222222-2222-2222-2222-000000000002', 'Pilão',  'Serra Alta'],
    ARRAY['22222222-2222-2222-2222-000000000003', 'Italac', 'Boa Serra'],
    ARRAY['22222222-2222-2222-2222-000000000007', 'Pilão',  'Serra Alta']
  ];
  alvo text[];
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. O ambiente e o que dizemos que e?
  -- ---------------------------------------------------------------------------
  SELECT count(*), count(*) FILTER (WHERE is_demo) INTO total_produtos, produtos_demo
  FROM public.products;

  IF total_produtos <> 7 THEN
    RAISE EXCEPTION 'products tem % linha(s), e este alinhamento so roda contra as 7 do seed de demonstracao. Abortando sem alterar nada.', total_produtos;
  END IF;

  IF produtos_demo <> total_produtos THEN
    RAISE EXCEPTION 'ha % produto(s) com is_demo = false. Esta transacao so pode tocar dado ficticio. Abortando sem alterar nada.', total_produtos - produtos_demo;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. Os quatro alvos existem, sao demo, e estao com a marca de ANTES.
  --
  -- Uma linha fora do previsto derruba a transacao inteira. Nao existe "alinha as que
  -- der": um alinhamento parcial produz exatamente o defeito que ele deveria consertar,
  -- so que mais dificil de enxergar.
  -- ---------------------------------------------------------------------------
  FOREACH alvo SLICE 1 IN ARRAY alvos LOOP
    SELECT count(*) INTO fora_do_esperado
    FROM public.products
    WHERE id = alvo[1]::uuid AND brand = alvo[2] AND is_demo;

    IF fora_do_esperado <> 1 THEN
      RAISE EXCEPTION 'o produto % nao esta como marca demo esperada. Abortando sem alterar nada.', alvo[1];
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- 3. A unica escrita. Uma coluna, quatro registros, valores literais.
  --
  -- `SET brand = ...` e nada mais: nenhum outro campo aparece no SET, entao nenhum outro
  -- campo pode mudar por esta instrucao. (`search_text` e `updated_at` mudam pelo
  -- trigger, que e o comportamento contratado da tabela e esta conferido no passo 5.)
  -- ---------------------------------------------------------------------------
  alterados := 0;

  FOREACH alvo SLICE 1 IN ARRAY alvos LOOP
    UPDATE public.products SET brand = alvo[3] WHERE id = alvo[1]::uuid;
    GET DIAGNOSTICS fora_do_esperado = ROW_COUNT;
    alterados := alterados + fora_do_esperado;
  END LOOP;

  IF alterados <> 4 THEN
    RAISE EXCEPTION 'os UPDATEs atingiram % linha(s), e a transacao exige exatamente 4. Revertendo.', alterados;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Verificacao INDEPENDENTE: cada alvo esta com a marca de DEPOIS.
  -- ---------------------------------------------------------------------------
  FOREACH alvo SLICE 1 IN ARRAY alvos LOOP
    SELECT count(*) INTO fora_do_esperado
    FROM public.products
    WHERE id = alvo[1]::uuid AND brand = alvo[3];

    IF fora_do_esperado <> 1 THEN
      RAISE EXCEPTION 'depois do UPDATE, o produto % nao ficou com a marca prevista. Revertendo.', alvo[1];
    END IF;
  END LOOP;

  -- E nenhuma das marcas antigas sobreviveu em lugar nenhum da tabela.
  SELECT count(*) INTO marcas_antigas
  FROM public.products
  WHERE brand IN ('Camil', 'Pilão', 'Italac');

  IF marcas_antigas <> 0 THEN
    RAISE EXCEPTION 'sobraram % produto(s) com marca antiga do fluxo da Home. Revertendo.', marcas_antigas;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. O trigger rodou? `search_text` precisa refletir a linha NOVA.
  --
  -- Sem esta conferencia, um trigger derrubado deixaria a busca achando "Pilão" e nao
  -- "Serra Alta" -- e o alinhamento pareceria feito na pagina do produto e quebrado na
  -- busca, que e o pior dos dois mundos.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO search_text_desatualizado
  FROM public.products
  WHERE search_text IS DISTINCT FROM public.pa_normalize_text(
    concat_ws(' ', name, brand, variant, size_text, gtin, category)
  );

  IF search_text_desatualizado <> 0 THEN
    RAISE EXCEPTION 'ha % produto(s) com search_text fora do contrato de normalizacao depois do UPDATE. Revertendo.', search_text_desatualizado;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 6. Nada alem do previsto mudou.
  -- ---------------------------------------------------------------------------
  SELECT count(*), count(*) FILTER (WHERE is_demo) INTO total_produtos, produtos_demo
  FROM public.products;

  IF total_produtos <> 7 OR produtos_demo <> 7 THEN
    RAISE EXCEPTION 'depois do UPDATE, products tem % linha(s) e % com is_demo. Esperado 7 e 7. Revertendo.', total_produtos, produtos_demo;
  END IF;

  RAISE NOTICE 'alinhamento concluido: 4 marca(s) demo alinhada(s) ao fixture; 7 produtos, todos is_demo, 0 search_text fora do contrato';
END
$alinhamento$;

COMMIT;
