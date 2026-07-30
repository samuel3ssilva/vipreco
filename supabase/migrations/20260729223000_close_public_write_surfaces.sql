-- Onda 3 (checkpoint PMO 2026-07-29) - fecha as tres superficies de escrita
-- publica que o threat model apontou como alcancaveis direto pela Data API
-- do Supabase, sem passar pelo Worker: price_submissions, product_watch_requests
-- e decision_feedback. Nenhuma delas tem uma superficie legitima de uso no MVP
-- atual (moderacao publica de submissao esta fora de escopo; login nao existe;
-- nao ha proteção server-side/anti-abuso pronta para escrita anonima).
--
-- Nao destrutiva: nenhuma tabela, coluna, policy ou dado e removido. Apenas o
-- privilegio de INSERT de anon/authenticated e revogado. As policies de INSERT
-- criadas na migration inicial permanecem no catalogo, agora dormentes -- sem
-- o GRANT correspondente, o Postgres nunca chega a avaliar a policy (o
-- privilegio de tabela e checado antes da RLS). service_role continua com
-- GRANT ALL (inalterado), entao o fluxo de aprovacao/backoffice nao e afetado.
--
-- Efeito colateral conhecido, registrado para o Founder/PMO: os fluxos de UI
-- que hoje chamam essas tabelas (SubmitPriceForm "Informar preço",
-- registerWatchRequest "Quero acompanhar", DecisionFeedback) degradam para o
-- estado de erro generico ja existente (setStatus("error")) apos esta
-- migration ser aplicada -- nao ha crash, mas as tres acoes passam a falhar
-- de forma consistente ate uma decisao de produto sobre a UI. Nenhuma mudanca
-- de frontend foi feita nesta migration -- fora do escopo deste checkpoint.
--
-- Reabertura futura de qualquer uma delas exige: endpoint/RPC server-side
-- controlado, validacao server-side, protecao anti-abuso automatizada quando
-- justificada, testes de bypass e uma migration propria com novo gate do
-- PMO/Founder -- nao um simples GRANT de volta.

REVOKE INSERT ON public.price_submissions FROM anon, authenticated;
REVOKE INSERT ON public.product_watch_requests FROM anon, authenticated;
REVOKE INSERT ON public.decision_feedback FROM anon, authenticated;

COMMENT ON TABLE public.price_submissions IS
  'Fechada para escrita publica na Onda 3 (checkpoint PMO 2026-07-29). Policy de INSERT para anon/authenticated permanece definida e dormente -- reabrir exige migration propria com endpoint server-side, validacao e novo gate.';
COMMENT ON TABLE public.product_watch_requests IS
  'Fechada para escrita publica na Onda 3 (checkpoint PMO 2026-07-29). Policy de INSERT para anon/authenticated permanece definida e dormente -- reabrir exige migration propria com endpoint server-side, validacao e novo gate.';
COMMENT ON TABLE public.decision_feedback IS
  'Fechada para escrita publica na Onda 3 (checkpoint PMO 2026-07-29). Policy de INSERT para anon/authenticated permanece definida e dormente -- reabrir exige migration propria com endpoint server-side, validacao e novo gate.';

-- ============================================================
-- ROLLBACK EXATO (nao executar automaticamente -- so por decisao humana e
-- somente acompanhado da protecao server-side/anti-abuso exigida acima):
--
--   GRANT INSERT ON public.price_submissions TO anon, authenticated;
--   GRANT INSERT ON public.product_watch_requests TO anon, authenticated;
--   GRANT INSERT ON public.decision_feedback TO anon, authenticated;
--   COMMENT ON TABLE public.price_submissions IS NULL;
--   COMMENT ON TABLE public.product_watch_requests IS NULL;
--   COMMENT ON TABLE public.decision_feedback IS NULL;
-- ============================================================
