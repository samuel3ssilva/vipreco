-- R2-B / MVP-E1-05 - integridade de GTIN sobre a coluna que ja existe.
--
-- Contrato normativo: docs/data/PRODUCT-IDENTIFIERS.md §3-4.
-- Codigo de dominio espelhado: src/lib/gtin.ts (PR #50, ja na main).
--
-- ============================================================================
-- ESTA MIGRATION NAO FOI APLICADA EM NENHUM AMBIENTE
-- ============================================================================
--
-- Aplicar em staging ou em producao e decisao do Founder/PMO (principio 14).
--
-- ============================================================================
-- AUDITORIA DO ESTADO ATUAL - O QUE JA EXISTIA, E NAO PRECISOU SER FEITO
-- ============================================================================
--
--   products.gtin              text, NULLABLE          (migration 20260727005424)
--   products_gtin_unique_idx   UNIQUE ... WHERE gtin IS NOT NULL
--                                                      (migration 20260727155418)
--
-- Ou seja: "GTIN e texto", "GTIN e opcional" e "um GTIN preenchido identifica no maximo
-- um product" JA ESTAO GARANTIDOS. A unicidade parcial pedida pelo mandato existe desde a
-- Onda 1, e este arquivo NAO a recria, NAO a renomeia e NAO a substitui -- recriar um
-- indice que ja faz a coisa certa so abriria uma janela sem protecao entre o DROP e o
-- CREATE, em troca de nada.
--
-- O QUE FALTAVA, e o que esta migration acrescenta: validacao de FORMATO. Hoje o banco
-- aceita 'abc', '123' e '7896089012345' (digito verificador errado) sem reclamar.
--
-- ============================================================================
-- A DECISAO DE UNICIDADE SOB REFORMULACAO (PRODUCT-IDENTIFIERS.md §4)
-- ============================================================================
--
-- O documento deixava aberta a escolha entre (a) ampliar o indice para
-- (gtin, normalized_quantity, normalized_unit) e (b) mover a unicidade para uma tabela
-- product_identifiers. O mandato de R2 decidiu, e a decisao e nenhuma das duas:
--
--   "um GTIN preenchido identifica no maximo um product no MVP"
--
-- Ou seja, o indice atual fica exatamente como esta. A consequencia pratica precisa ficar
-- escrita, porque ela e o caso do §4.5: quando um fabricante reformula em silencio e o
-- mesmo codigo passa a designar 900 ml em vez de 1 L, o SKU novo NAO pode carregar o
-- mesmo GTIN. Ele entra com gtin NULL, ou o registro antigo e aposentado. As duas saidas
-- sao ato humano de curadoria; o banco apenas recusa a terceira, que seria fingir que os
-- dois sao o mesmo item.
--
-- O dominio ja responde a mesma coisa sem depender do banco: classifyRelation() devolve
-- OUTRO TAMANHO para mesmo GTIN com quantidade diferente, e a quantidade vence o GTIN.

-- ----------------------------------------------------------------------------
-- 1. Digito verificador GS1
-- ----------------------------------------------------------------------------
--
-- Do digito mais a direita do corpo para a esquerda, alterna peso 3 e 1; soma; o
-- verificador e o que falta para o proximo multiplo de dez. Mesmo algoritmo para GTIN-8,
-- 12, 13 e 14 -- so muda o comprimento do corpo. E a traducao literal de
-- gtinCheckDigit() em src/lib/gtin.ts, e o teste em SQL e em TypeScript usa os mesmos
-- vetores de propriedade para que as duas nao possam divergir em silencio.
--
-- IMMUTABLE porque vai ser usada em CHECK: mesma entrada, mesma saida, sempre.

CREATE OR REPLACE FUNCTION public.pa_gtin_check_digit(body text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (10 - (SUM(
    (substr(body, length(body) - i, 1))::integer * CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END
  ) % 10)) % 10
  FROM generate_series(0, length(body) - 1) AS i;
$$;

COMMENT ON FUNCTION public.pa_gtin_check_digit(text) IS
  'Digito verificador GS1. Espelha gtinCheckDigit() de src/lib/gtin.ts. Espera corpo so '
  'de digitos, sem o verificador.';

-- ----------------------------------------------------------------------------
-- 2. GTIN bem formado
-- ----------------------------------------------------------------------------
--
-- NULL devolve NULL, e e o comportamento certo: GTIN e opcional, e um CHECK nao reprova
-- NULL. Produto sem GTIN e produto normal, nao produto incompleto.
--
-- O que a funcao NAO faz, de proposito:
--   - nao converte para numero em ponto nenhum. Zero a esquerda e parte do codigo:
--     '07896006711117' e '7896006711117' sao dois codigos DIFERENTES, e um cast para
--     bigint os tornaria o mesmo em silencio;
--   - nao remove espaco, hifen nem qualquer outro caractere. Um GTIN com espaco no meio
--     nao e um GTIN "quase certo", e limpar a entrada aqui esconderia o erro de digitacao
--     em vez de mostra-lo. O contrato admite apenas trim das PONTAS, e trim de ponta e
--     trabalho de quem escreve, nao da constraint;
--   - nao inventa nem corrige valor nenhum.

CREATE OR REPLACE FUNCTION public.pa_is_valid_gtin(code text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN code IS NULL THEN NULL
    -- So digitos ASCII, e comprimento GS1. `~ '^[0-9]+$'` recusa vazio, espaco, sinal,
    -- separador decimal e digito nao-ASCII que um to_number() aceitaria.
    WHEN code !~ '^[0-9]+$' THEN false
    WHEN length(code) NOT IN (8, 12, 13, 14) THEN false
    ELSE public.pa_gtin_check_digit(substr(code, 1, length(code) - 1))
         = (substr(code, length(code), 1))::integer
  END;
$$;

COMMENT ON FUNCTION public.pa_is_valid_gtin(text) IS
  'GTIN bem formado: so digitos, comprimento 8/12/13/14, digito verificador GS1 correto. '
  'NULL devolve NULL -- GTIN e opcional. Nunca converte para numero: zero a esquerda faz '
  'parte do codigo. Espelha assessGtin() de src/lib/gtin.ts.';

-- Toda funcao criada no schema public recebe EXECUTE para anon e authenticated por
-- ALTER DEFAULT PRIVILEGES da propria plataforma Supabase, fora do nosso versionamento.
-- Isso foi confirmado ao vivo na Onda 3 (ver 20260730120000). REVOKE explicito nomeando
-- anon e authenticated -- "FROM PUBLIC" sozinho nao alcanca um grant direto.
--
-- Nao afeta a constraint: expressao de CHECK e avaliada como parte da definicao da
-- tabela, e nao depende de o autor do INSERT ter EXECUTE na funcao.
REVOKE ALL ON FUNCTION public.pa_gtin_check_digit(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pa_is_valid_gtin(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pa_gtin_check_digit(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pa_is_valid_gtin(text) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. A constraint
-- ----------------------------------------------------------------------------
--
-- NOT VALID: passa a valer para toda escrita nova imediatamente, sem varrer a tabela. As
-- linhas existentes so sao conferidas no VALIDATE, e o VALIDATE e um passo separado do
-- rollout justamente porque ele pode FALHAR -- e falhar ali e o comportamento desejado.
-- Um GTIN invalido ja gravado e dado que alguem precisa olhar, nao dado que a migration
-- deva corrigir sozinha.
--
-- O seed ficticio ja foi limpo (PR #53): dos sete GTINs, os dois que reprovavam viraram
-- NULL. Os cinco restantes passam. O que existe em staging e em producao NAO foi
-- consultado -- sem credencial, e o mandato proibe conectar.

ALTER TABLE public.products
  ADD CONSTRAINT products_gtin_valid
  CHECK (gtin IS NULL OR public.pa_is_valid_gtin(gtin)) NOT VALID;

COMMENT ON COLUMN public.products.gtin IS
  'primary_gtin do contrato de dominio (PRODUCT-IDENTIFIERS.md §3). Texto, sempre; '
  'opcional; validado no formato e no digito verificador; unico entre os preenchidos. '
  'NAO e a chave de produto -- a chave e product_id, e nada no codigo pode assumir o '
  'contrario. Digito verificador correto prova que o numero e bem formado, nao que ele '
  'seja deste item.';

-- ============================================================================
-- ROLLOUT
-- ============================================================================
--
--   1. ANTES de aplicar, rodar no ambiente alvo (read-only, nao altera nada):
--
--        SELECT id, gtin FROM public.products
--         WHERE gtin IS NOT NULL AND NOT public.pa_is_valid_gtin(gtin);
--
--      -- e preciso ter aplicado so as duas funcoes para isso; se preferir nao aplicar
--      nada antes, a mesma pergunta se responde com src/lib/gtin.ts sobre um dump.
--   2. se o resultado NAO vier vazio: PARAR. Corrigir ou anular GTIN e decisao de
--      curadoria do Founder/PMO, nunca do CTO, e nunca automatica;
--   3. aplicar esta migration (funcoes + CHECK NOT VALID: sem varredura, sem trava);
--   4. so com o resultado do passo 1 vazio:
--        ALTER TABLE public.products VALIDATE CONSTRAINT products_gtin_valid;
--
-- ============================================================================
-- ROLLBACK
-- ============================================================================
--
--   ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_gtin_valid;
--   DROP FUNCTION IF EXISTS public.pa_is_valid_gtin(text);
--   DROP FUNCTION IF EXISTS public.pa_gtin_check_digit(text);
--
-- Nesta ordem: a constraint depende da funcao. Nenhuma linha e tocada em momento algum,
-- entao o rollback e completo -- nao existe dado criado por esta migration que se perca.
--
-- ============================================================================
-- O QUE ESTA MIGRATION NAO FAZ
-- ============================================================================
--
--   - nao cria product_identifiers, canonical_products, familia de produto nem alias de
--     fonte -- todos fora do MVP;
--   - nao recria, nao renomeia e nao remove products_gtin_unique_idx: ele ja garante a
--     unicidade parcial, e mexer nele so abriria janela sem protecao;
--   - nao altera o tipo, a nulabilidade nem o valor de products.gtin;
--   - nao executa UPDATE, INSERT nem DELETE, e nao corrige GTIN nenhum;
--   - nao altera RLS, policy nem grant de tabela; os unicos GRANT/REVOKE aqui sao de
--     EXECUTE nas duas funcoes novas, e existem para FECHAR o acesso que a plataforma
--     abriria sozinha;
--   - nao inventa GTIN: o ViPreco nunca gera um codigo.
