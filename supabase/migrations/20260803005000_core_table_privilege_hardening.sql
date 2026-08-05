-- R2.5 - remove a escrita publica nao intencional das tres tabelas centrais.
--
-- ============================================================================
-- O ACHADO
-- ============================================================================
--
-- Medido em staging pela comparacao de equivalencia (run 31042845838, confirmado em
-- 31048646955): `anon` e `authenticated` detem INSERT, UPDATE, DELETE e TRUNCATE em
-- `markets`, `products` e `prices`. Ninguem concedeu isso numa migration -- vem do
-- provisionamento da plataforma Supabase, que aplica GRANT amplo no schema `public`.
--
-- As migrations deste repositorio nunca precisaram CONCEDER acesso de tabela a `anon`,
-- porque a plataforma ja concedia. Elas so revogam. E ate agora so revogaram nas tres
-- tabelas de submissao (Onda 3), porque so ali alguem tinha olhado.
--
-- ============================================================================
-- POR QUE ISTO E P0 E NAO "DEFESA EM PROFUNDIDADE"
-- ============================================================================
--
-- Para INSERT, UPDATE e DELETE, a RLS segura: as tabelas tem `rls=on` e as unicas policies
-- para papel publico sao de SELECT (`cmd=r`). Sem policy de escrita, a escrita e negada.
-- Isso foi MEDIDO, nao presumido.
--
-- TRUNCATE E DIFERENTE, e e por ele que esta migration existe. No PostgreSQL a RLS **nao
-- se aplica a TRUNCATE** -- a operacao e de tabela inteira, governada exclusivamente pelo
-- privilegio. Nao existe policy que a negue. Hoje, o unico motivo pelo qual `anon` nao
-- apaga `prices` inteira e que o PostgREST nao expoe verbo para TRUNCATE e `anon` e
-- NOLOGIN. Ou seja: a protecao mora numa propriedade da CAMADA HTTP, nao do banco.
--
-- Uma protecao que depende do cliente nao ser capaz de pedir nao e uma protecao; e uma
-- coincidencia com prazo de validade.
--
-- ============================================================================
-- O QUE ESTA MIGRATION NAO FAZ
-- ============================================================================
--
--   * nao cria policy, nao altera policy, nao mexe em RLS;
--   * nao concede NENHUM privilegio novo -- so revoga;
--   * nao toca em `service_role`, que e quem escreve na operacao manual;
--   * nao toca em `price_submissions`, `product_watch_requests` nem `decision_feedback`.
--
-- A ultima linha merece registro explicito, porque ela deixa achado em aberto: a auditoria
-- classificou DELETE, UPDATE e TRUNCATE de `anon` NESSAS tres tabelas tambem como
-- inseguros -- a policy delas e de INSERT (`cmd=a`), e nunca houve contrato de apagar ou
-- alterar contribuicao alheia. O mandato de R2.5 §6 determina nao alterar essas tabelas
-- nesta migration, e a instrucao foi respeitada. Fica registrado como decisao pendente do
-- Founder/PMO, e nao como problema resolvido.

-- ----------------------------------------------------------------------------
-- 1. As tres tabelas centrais.
--
-- SELECT NAO ENTRA NA LISTA. Ler preco, mercado e produto e o produto em si, e a RLS
-- filtra quais linhas aparecem. Revogar SELECT aqui quebraria o comparador inteiro.
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.markets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.products FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prices FROM anon, authenticated;

-- PUBLIC e um papel implicito do qual todo mundo herda. A Onda 3 aprendeu, no achado
-- critico das funcoes, que `REVOKE ... FROM PUBLIC` nao desfaz grant direto -- e a licao
-- simetrica vale aqui: revogar so de `anon` nao desfaz o que estiver em PUBLIC.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.markets FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.products FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.prices FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- 2. DEFAULT PRIVILEGES -- para a proxima tabela nao nascer com o mesmo problema.
--
-- AQUI MORA A ARMADILHA DESTA MIGRATION.
--
-- `ALTER DEFAULT PRIVILEGES` sem `FOR ROLE` aplica ao papel da SESSAO. Se o papel que de
-- fato criou as tabelas for outro, o comando roda, devolve sucesso, e NAO DESFAZ NADA --
-- o pior resultado possivel, porque o gate passa verde sobre um banco inalterado.
--
-- Por isso o bloco abaixo nao chuta: ele LE `pg_default_acl`, descobre quais papeis tem
-- default privilege de tabela no schema `public`, e emite um `ALTER ... FOR ROLE` para
-- cada um. Se nao houver nenhum, nao ha o que desfazer -- e o proprio bloco avisa, em vez
-- de fingir que agiu.
--
-- Ver a auditoria read-only que mede isso em staging antes da aplicacao:
-- scripts/r2/preflight/50-privileges.sql
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  papel text;
  encontrados int := 0;
BEGIN
  FOR papel IN
    SELECT DISTINCT pg_get_userbyid(d.defaclrole)
    FROM pg_default_acl d
    LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE d.defaclobjtype = 'r'
      AND (n.nspname = 'public' OR n.nspname IS NULL)
  LOOP
    encontrados := encontrados + 1;
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated',
      papel
    );
    RAISE NOTICE 'default privileges de tabela ajustados para o papel %', papel;
  END LOOP;

  IF encontrados = 0 THEN
    -- Nao e erro: significa que o grant automatico vem de provisionamento direto, e nao
    -- de `pg_default_acl`. A revogacao do passo 1 continua valendo para as tabelas que
    -- existem; tabela FUTURA volta a depender de como a plataforma provisiona.
    RAISE NOTICE 'nenhum default privilege de tabela em public: nada a ajustar aqui';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 3. Nao existe passo 3.
--
-- Nenhum GRANT, nenhuma policy, nenhum ALTER TABLE, nenhum COMMENT. Uma versao anterior
-- deste arquivo acrescentava um COMMENT explicativo em `public.products`; foi retirado.
-- Uma migration de seguranca que tambem mexe em metadado de schema vira duas mudancas num
-- gate so, e a revisao de cada uma passa a depender de quem le lembrar de separa-las.
-- O lugar da explicacao e aqui em cima, onde ela nao altera o banco.
-- ----------------------------------------------------------------------------

-- ============================================================================
-- ROLLBACK EXATO (nao executar automaticamente -- so por decisao humana):
--
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.markets  TO anon, authenticated;
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.products TO anon, authenticated;
--   GRANT INSERT, UPDATE, DELETE, TRUNCATE ON public.prices   TO anon, authenticated;
--
--   ALTER DEFAULT PRIVILEGES FOR ROLE <papel medido> IN SCHEMA public
--     GRANT INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO anon, authenticated;
--
--   COMMENT ON TABLE public.products IS NULL;
--
-- O rollback devolve uma superficie de escrita publica que nunca teve contrato. Ele existe
-- para o drill poder provar reversibilidade, nao porque alguem deva executa-lo.
-- ============================================================================
