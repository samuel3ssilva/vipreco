-- Onda 3 - correcao critica (achado ao vivo no rollout de staging, 2026-07-30): o padrao
-- "REVOKE ALL ... FROM PUBLIC" usado nas migrations anteriores
-- (20260727155843_approve_submission.sql e 20260729210000_harden_helper_function_grants.sql) nao
-- remove o EXECUTE que o Supabase concede explicitamente a anon/authenticated na criacao de toda
-- funcao no schema public -- via ALTER DEFAULT PRIVILEGES configurado pela propria plataforma no
-- provisionamento do projeto, fora do nosso controle de versionamento. Esse grant e direto
-- (anon/authenticated nomeados), nao mediado pelo pseudo-role PUBLIC, entao
-- "REVOKE ... FROM PUBLIC" nunca o atingia. Confirmado ao vivo em staging
-- (wjurqpclauwtbjhhvigy): anon e authenticated apareciam com EXECUTE nas tres funcoes auxiliares
-- mesmo apos a migration 20260729210000 ja aplicada.
--
-- Mais grave: approve_submission(uuid) -- SECURITY DEFINER, escreve em prices a partir de
-- price_submissions -- usa o mesmo padrao desde a Onda 1 e pode estar no mesmo estado em
-- producao: anon/authenticated com EXECUTE direto, o que permitiria a qualquer visitante
-- anonimo aprovar sua propria sugestao de preco via RPC, ignorando por completo o fluxo de
-- moderacao. Esta migration revoga explicitamente de anon e authenticated (alem de PUBLIC,
-- mantido por clareza) nas quatro funcoes.
--
-- Nao edita nenhuma migration ja aplicada (20260727155843, 20260729210000) -- e uma migration
-- corretiva nova, conforme CLAUDE.md. Nao destrutiva: apenas REVOKE/GRANT de EXECUTE, nenhuma
-- alteracao de definicao de funcao, tabela, coluna, policy ou dado.

REVOKE ALL ON FUNCTION public.pa_normalize_text(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pa_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pa_products_search_text() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_submission(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pa_set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO service_role;

-- ============================================================
-- ROLLBACK EXATO (nao executar automaticamente -- so por decisao humana):
--
--   GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.pa_set_updated_at() TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO anon, authenticated;
-- ============================================================
