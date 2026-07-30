-- Onda 3 - endurecimento defensivo: remove o EXECUTE padrao que o Postgres
-- concede a PUBLIC em toda funcao nova, alinhando as funcoes auxiliares ao
-- mesmo padrao explicito ja usado em approve_submission(). Nenhuma das tres
-- funcoes abaixo precisa ser chamada diretamente por anon/authenticated: sao
-- usadas apenas por triggers e por indice funcional, que nao passam pelo
-- grant de EXECUTE do chamador.

REVOKE ALL ON FUNCTION public.pa_normalize_text(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pa_set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pa_products_search_text() FROM PUBLIC;

-- service_role mantem acesso administrativo total (migrations, backoffice).
GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pa_set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO service_role;
