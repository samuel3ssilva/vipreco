-- R2.6 - fecha o achado que 20260803005000 deixou explicitamente em aberto: os privilegios
-- publicos nao intencionais nas tres tabelas de contribuicao.
--
-- ============================================================================
-- O QUE FOI AUDITADO, E O QUE A AUDITORIA ACHOU
-- ============================================================================
--
-- Tabelas: public.price_submissions, public.product_watch_requests,
--          public.decision_feedback. Sao as tres -- e SO as tres -- classificadas nos
--          contratos como superficie publica de contribuicao. O schema `public` tem seis
--          tabelas no total; as outras tres (markets, products, prices) sao de catalogo e
--          foram tratadas em 20260803005000.
--
-- Historia dos privilegios de cada uma:
--
--   1. A migration inicial (20260727005424) concedeu `GRANT INSERT ... TO anon,
--      authenticated` e `GRANT ALL ... TO service_role`, com RLS ligada e uma unica policy
--      por tabela, `FOR INSERT`. Nenhuma policy de SELECT, UPDATE ou DELETE foi criada,
--      entao nenhuma dessas operacoes tem contrato de aplicacao. Nunca teve.
--
--   2. A plataforma Supabase, em paralelo e fora deste repositorio, aplica
--      `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` -- de modo que as tabelas
--      nasceram tambem com SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER para
--      anon e authenticated, sem que migration nenhuma pedisse.
--
--   3. A Onda 3 (20260729223000) revogou o INSERT das tres. Apenas o INSERT: era o unico
--      privilegio que alguem sabia existir, porque era o unico que uma migration havia
--      concedido. O resto do GRANT ALL herdado seguiu intacto e invisivel.
--
-- Medicao em staging (R2.5, runs 31042845838 e 31048646955): `anon` detinha 45 privilegios
-- de tabela no schema public, contra 48 possiveis (6 tabelas x 8 privilegios). Os 3
-- ausentes sao exatamente os 3 INSERT revogados na Onda 3. Ou seja: **todo o resto do
-- GRANT ALL continuava concedido**, nas seis tabelas, para anon e para authenticated.
--
-- ============================================================================
-- CLASSIFICACAO POR PRIVILEGIO (a pergunta que decide o que revogar)
-- ============================================================================
--
--   INSERT     -> ja revogado na Onda 3. O contrato funcional atual NAO permite submissao
--                 publica: CLAUDE.md, principio 5, e explicito -- "Nao existe superficie
--                 publica de escrita: o INSERT das tres tabelas de submissao foi revogado
--                 na Onda 3 e os controles nao sao renderizados". As policies `FOR INSERT`
--                 existem no catalogo, mas dormentes. A regra do mandato -- preservar
--                 INSERT somente quando houver policy ativa **E** contrato funcional que
--                 ainda permita submissao publica -- reprova nas tres: o segundo teste
--                 falha. O REVOKE abaixo e reafirmacao idempotente, nao mudanca.
--
--   UPDATE     -> PERIGOSO. Nunca houve contrato de alterar contribuicao alheia. A RLS
--   DELETE        segura hoje (sem policy, a operacao e negada), mas a policy que segura
--                 e de INSERT (`cmd=a`) -- ela nao cobre nem poderia cobrir estas.
--
--   TRUNCATE   -> PERIGOSO, e por outro motivo, que e o motivo pelo qual estas migrations
--                 de hardening existem: **a RLS nao se aplica a TRUNCATE**. Nao ha policy
--                 que negue. O unico obstaculo hoje e o PostgREST nao expor verbo para a
--                 operacao, e `anon` ser NOLOGIN -- protecao que mora na camada HTTP, nao
--                 no banco.
--
--   SELECT     -> HERDADO E DESNECESSARIO. Nenhuma das tres tem policy de SELECT, entao a
--                 RLS ja nega a leitura; e nenhum caminho do aplicativo le estas tabelas
--                 (src/services/catalog.ts so faz `.insert()` nelas, e esses controles nao
--                 sao renderizados desde a Onda 3). Leitura e trabalho de backoffice, por
--                 `service_role`. O mandato manda preservar SELECT "somente quando
--                 necessario e explicitamente documentado" -- nao e necessario, e nao ha
--                 documento que o exija.
--
--   REFERENCES -> HERDADO E DESNECESSARIO. `anon` e `authenticated` sao NOLOGIN e nao
--   TRIGGER       criam objeto nenhum.
--   MAINTAIN
--
-- Conclusao: nas tres tabelas de contribuicao, anon e authenticated nao precisam de
-- privilegio NENHUM. Nao ha o que preservar, e por isso o comando abaixo e `REVOKE ALL` --
-- que tambem tem a virtude de nao depender da versao do PostgreSQL (MAINTAIN so existe a
-- partir do 17; nomear privilegio a privilegio quebraria contra o 16 do drill).
--
-- ============================================================================
-- O QUE ESTA MIGRATION NAO FAZ
-- ============================================================================
--
--   * nao cria, altera nem remove policy; nao toca em RLS;
--   * nao concede NENHUM privilegio novo -- so revoga;
--   * nao toca em `service_role`, que continua com GRANT ALL e e quem opera o backoffice;
--   * nao toca em markets, products nem prices (20260803005000 ja tratou);
--   * nao altera dado nenhum;
--   * nao adiciona COMMENT. Os COMMENT que a Onda 3 deixou nas tres tabelas continuam
--     corretos depois desta migration, e uma migration de seguranca que tambem mexe em
--     metadado vira duas mudancas num gate so -- mesma decisao registrada em
--     20260803005000.

-- ----------------------------------------------------------------------------
-- 1. As tres tabelas de contribuicao: anon e authenticated ficam sem nada.
-- ----------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON public.price_submissions       FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.product_watch_requests  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON public.decision_feedback       FROM anon, authenticated;

-- PUBLIC e papel implicito do qual todo mundo herda. A licao do achado critico da Onda 3
-- (funcoes) foi que `REVOKE ... FROM PUBLIC` nao desfaz grant direto; a simetrica vale
-- aqui: revogar so de anon/authenticated nao desfaz o que estiver em PUBLIC.
REVOKE ALL PRIVILEGES ON public.price_submissions       FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.product_watch_requests  FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.decision_feedback       FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- 2. DEFAULT PRIVILEGES -- para a proxima tabela nao nascer com o mesmo problema.
--
-- 20260803005000 revogou do default apenas INSERT, UPDATE, DELETE e TRUNCATE, porque era o
-- que aquele escopo cobria. Sobrou SELECT (e REFERENCES/TRIGGER/MAINTAIN) sendo concedido
-- automaticamente a toda tabela nova do schema public. Aqui a heranca e cortada inteira:
-- `REVOKE ALL ON TABLES`.
--
-- CONSEQUENCIA, REGISTRADA PARA NAO VIRAR SURPRESA: a partir daqui, tabela nova em `public`
-- NAO da nada a anon nem a authenticated por heranca. Toda tabela que precise ser lida
-- publicamente exige `GRANT SELECT` explicito na propria migration. Isso ja e o padrao do
-- repositorio -- markets, products e prices sempre tiveram GRANT SELECT explicito na
-- migration inicial -- entao nao ha regressao; ha o fim de uma rede de seguranca que
-- ninguem pediu e que so servia para conceder acesso sem que ninguem decidisse.
-- Falhar fechado e a direcao certa: uma tabela nova que nao aparece na API e um bug obvio
-- e de dois minutos; uma tabela nova exposta sem ninguem ter decidido e o achado desta
-- migration.
--
-- A ARMADILHA, repetida de 20260803005000 porque continua valendo: `ALTER DEFAULT
-- PRIVILEGES` sem `FOR ROLE` aplica ao papel da SESSAO. Se quem criou as tabelas for outro
-- papel, o comando roda, devolve sucesso e nao desfaz nada -- gate verde sobre banco
-- inalterado. O bloco abaixo LE `pg_default_acl` e emite um `ALTER ... FOR ROLE` por papel
-- encontrado, em vez de chutar. Ver a auditoria read-only que mede isso antes da aplicacao:
-- scripts/r2/preflight/50-privileges.sql
-- ----------------------------------------------------------------------------
--
-- R2.6 -- e o mesmo limite de plataforma que 20260803005000 encontrou ao vivo:
-- `ALTER DEFAULT PRIVILEGES FOR ROLE` exige participacao no papel dono do default, e o
-- usuario da conexao de staging nao e membro do papel administrativo do Supabase. A
-- migration inteira e transacional, entao deixar o erro subir reverteria TAMBEM as
-- revogacoes do passo 1 -- trocando a correcao que fecha a escrita publica por uma
-- protecao acessoria. Trata-se `insufficient_privilege` por papel, aplica onde da, e
-- registra o resto em vez de fingir sucesso.
DO $$
DECLARE
  papel text;
  encontrados int := 0;
  sem_permissao text[] := ARRAY[]::text[];
BEGIN
  FOR papel IN
    SELECT DISTINCT pg_get_userbyid(d.defaclrole)
    FROM pg_default_acl d
    LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
    WHERE d.defaclobjtype = 'r'
      AND (n.nspname = 'public' OR n.nspname IS NULL)
  LOOP
    encontrados := encontrados + 1;
    BEGIN
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
        'REVOKE ALL ON TABLES FROM anon, authenticated',
        papel
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
        'REVOKE ALL ON TABLES FROM PUBLIC',
        papel
      );
      RAISE NOTICE 'heranca de privilegio de tabela cortada para o papel %', papel;
    EXCEPTION
      -- SO `insufficient_privilege`. `WHEN OTHERS` transformaria qualquer defeito futuro
      -- em aviso, e um aviso e exatamente o que ninguem le.
      WHEN insufficient_privilege THEN
        sem_permissao := array_append(sem_permissao, papel);
    END;
  END LOOP;

  IF array_length(sem_permissao, 1) > 0 THEN
    RAISE WARNING
      'HERANCA NAO CORRIGIDA: o usuario da conexao nao pode alterar default privileges do(s) papel(is) %. Tabela NOVA em public pode continuar nascendo com GRANT da plataforma. As tres tabelas de contribuicao estao cobertas pelas revogacoes acima. Fechar isto exige acao no painel do Supabase -- decisao do Founder.',
      array_to_string(sem_permissao, ', ');
  END IF;

  IF encontrados = 0 THEN
    -- Nao e erro: significa que o grant automatico vem de provisionamento direto e nao de
    -- `pg_default_acl`. As revogacoes do passo 1 continuam valendo para as tabelas que
    -- existem; tabela FUTURA volta a depender de como a plataforma provisiona, e isso fica
    -- como risco declarado, nao como problema resolvido.
    RAISE NOTICE 'nenhum default privilege de tabela em public: nada a cortar aqui';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 3. AUTOVERIFICACAO.
--
-- Uma migration de revogacao que nao confere o proprio efeito e uma migration que pode
-- mentir: `REVOKE` nao falha quando nao ha o que revogar, e tambem nao falha quando revoga
-- do papel errado. O bloco abaixo mede o estado FINAL com `has_table_privilege` e aborta a
-- transacao inteira se qualquer privilegio publico tiver sobrevivido.
--
-- E o mesmo principio do drill, aplicado dentro da propria migration: a afirmacao "os
-- privilegios foram removidos" passa a ser verificada no lugar onde ela e feita.
--
-- So privilegios que existem em toda versao suportada entram na lista -- MAINTAIN e do
-- PostgreSQL 17, e `has_table_privilege` levanta erro para nome desconhecido, o que
-- reprovaria a migration no Postgres 16 do drill por um motivo que nao e o dela.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tabela text;
  papel text;
  privilegio text;
  sobreviventes text[] := ARRAY[]::text[];
BEGIN
  FOREACH tabela IN ARRAY ARRAY['price_submissions', 'product_watch_requests', 'decision_feedback']
  LOOP
    FOREACH papel IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
      FOREACH privilegio IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']
      LOOP
        IF has_table_privilege(papel, format('public.%I', tabela), privilegio) THEN
          sobreviventes := array_append(sobreviventes, format('%s.%s.%s', papel, tabela, privilegio));
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF array_length(sobreviventes, 1) > 0 THEN
    RAISE EXCEPTION
      'hardening de contribuicao nao surtiu efeito -- privilegios publicos sobreviveram: %',
      array_to_string(sobreviventes, ', ');
  END IF;

  -- Controle negativo: `service_role` opera o backoffice e NAO pode ter sido atingido.
  -- Sem esta checagem, uma migration que revogasse demais passaria por bem-sucedida.
  FOREACH tabela IN ARRAY ARRAY['price_submissions', 'product_watch_requests', 'decision_feedback']
  LOOP
    IF NOT has_table_privilege('service_role', format('public.%I', tabela), 'SELECT') THEN
      RAISE EXCEPTION
        'service_role perdeu SELECT em public.% -- o hardening revogou alem do escopo', tabela;
    END IF;
  END LOOP;
END
$$;

-- ============================================================================
-- ROLLBACK EXATO (nao executar automaticamente -- so por decisao humana).
--
-- Ele devolve o estado ANTERIOR A ESTA MIGRATION, que era: heranca da plataforma intacta
-- MENOS o INSERT que a Onda 3 revogou. Por isso INSERT nao aparece na lista abaixo --
-- concede-lo aqui nao seria reverter esta migration, seria reverter a Onda 3, que tem gate
-- proprio (endpoint server-side, validacao, protecao anti-abuso e decisao do Founder/PMO,
-- conforme 20260729223000).
--
-- O bloco esta entre marcadores porque `scripts/db-drill/95-rollback-reapply.sh` o EXTRAI
-- deste arquivo e o executa contra Postgres vivo. Nada aqui e copiado para o script: um
-- rollback que nunca rodou e uma alegacao, e um rollback duplicado em dois lugares e uma
-- divergencia esperando data. Por isso ele tambem e SQL executavel de verdade -- inclusive
-- o `ALTER DEFAULT PRIVILEGES`, que mede o papel em vez de trazer um `<papel>` de exemplo
-- que nenhum script conseguiria rodar.
--
-- ROLLBACK-SQL-BEGIN
--   GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--     ON public.price_submissions TO anon, authenticated;
--   GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--     ON public.product_watch_requests TO anon, authenticated;
--   GRANT SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--     ON public.decision_feedback TO anon, authenticated;
--
--   DO $rollback$
--   DECLARE
--     papel text;
--   BEGIN
--     FOR papel IN
--       SELECT DISTINCT pg_get_userbyid(d.defaclrole)
--       FROM pg_default_acl d
--       LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
--       WHERE d.defaclobjtype = 'r'
--         AND (n.nspname = 'public' OR n.nspname IS NULL)
--     LOOP
--       EXECUTE format(
--         'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public '
--         'GRANT SELECT, REFERENCES, TRIGGER ON TABLES TO anon, authenticated',
--         papel
--       );
--     END LOOP;
--   END
--   $rollback$;
-- ROLLBACK-SQL-END
--
-- O `GRANT` do default acima devolve SELECT, REFERENCES e TRIGGER e nao os quatro de
-- escrita, porque os quatro ja haviam sido cortados do default por 20260803005000 -- que
-- continua aplicada. Reverter esta migration nao pode desfazer a anterior.
-- ============================================================================
