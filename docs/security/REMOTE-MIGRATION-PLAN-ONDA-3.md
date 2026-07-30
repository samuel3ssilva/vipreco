# Plano de rollout remoto — Onda 3

Nenhum passo deste plano foi executado. O merge do PR, as migrations remotas e os deploys
dependem da autorização explícita do PMO/Founder (frase única no checkpoint). Este documento
existe para que a execução, quando autorizada, siga exatamente esta sequência sem decisão
improvisada no momento.

**Confirmado explicitamente:** merge do PR e deploy do Worker **não aplicam** as migrations do
Supabase automaticamente — não existe hoje nenhum passo de CI/CD que rode `supabase db push` ou
equivalente. Migrations remotas continuam um passo manual, deliberado, separado do deploy do
Worker, exatamente como nas Ondas 1 e 2 (aplicadas manualmente via SQL Editor/CLI, uma de cada
vez, com acompanhamento).

## Migrations novas nesta Onda (a aplicar, nesta ordem)

1. `supabase/migrations/20260729210000_harden_helper_function_grants.sql` — `REVOKE`/`GRANT` de
   `EXECUTE` em 3 funções auxiliares.
2. `supabase/migrations/20260729223000_close_public_write_surfaces.sql` — `REVOKE INSERT` de
   `anon, authenticated` em 3 tabelas.

Ambas puramente `REVOKE`/`GRANT`/`COMMENT ON TABLE` — nenhum `ALTER TABLE` estrutural, nenhum
`DROP`, nenhuma migration de dado.

## Sequência exata

1. **Merge do PR #12** em `main` (ação humana — Founder/PMO).
2. **Aplicar as duas migrations novas primeiro em staging** (`wjurqpclauwtbjhhvigy`), na ordem
   acima, via SQL Editor ou CLI — mesmo procedimento manual acompanhado usado nas Ondas 1/2.
3. **Confirmar grants e EXECUTE no banco vivo de staging:**
   ```sql
   -- EXECUTE das 3 funções auxiliares: só service_role
   select grantee, privilege_type
   from information_schema.role_routine_grants
   where routine_name in ('pa_normalize_text','pa_set_updated_at','pa_products_search_text');

   -- INSERT nas 3 tabelas fechadas: só service_role
   select grantee, table_name, privilege_type
   from information_schema.role_table_grants
   where table_name in ('price_submissions','product_watch_requests','decision_feedback')
     and privilege_type = 'INSERT';
   ```
   Esperado: nenhuma linha com `grantee` = `anon` ou `authenticated` em nenhuma das duas queries.
4. **Testar leitura pública preservada em staging** (chave publishable, sem alterar nada):
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/prices?select=id&limit=1" \
     -H "apikey: $SUPABASE_PUBLISHABLE_KEY"
   # esperado: 200
   ```
5. **Testar INSERT anônimo bloqueado nas três tabelas, em staging:**
   ```bash
   for t in price_submissions product_watch_requests decision_feedback; do
     curl -s -o /dev/null -w "$t -> %{http_code}\n" -X POST "$SUPABASE_URL/rest/v1/$t" \
       -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{}'
   done
   # esperado: 401 (ou 403) nas três — nunca 200/201
   ```
6. **Confirmar que os dados demo de staging permaneceram intactos** (contagem antes/depois do
   passo 2 deve ser idêntica — a migration não toca em nenhuma linha):
   ```sql
   select count(*) from markets where is_demo; -- esperado: 4 (inalterado)
   select count(*) from products where is_demo; -- esperado: 7 (inalterado)
   select count(*) from prices where is_demo; -- esperado: 22 (inalterado)
   ```
7. **Deploy do Worker em staging** (`gh workflow run deploy-staging.yml` ou equivalente).
8. **Smoke tests** — já automatizados no workflow (`/` e `/buscar`, 5 tentativas); adicionar
   verificação manual de que os botões "Informar preço", "Informar atualização", "Quero
   acompanhar" e o widget de feedback de decisão **não aparecem** em `/produto/:id` (a interface
   foi removida do código nesta Onda — não é mais um estado de erro esperado, é ausência de UI).
9. **Antes de aplicar a migration em produção, confirmar que o required reviewer de produção está
   disponível para aprovar o deploy do Worker em seguida** (ver "Janela entre migration e deploy
   de produção" abaixo) — não aplicar a migration de produção e deixar o passo 12 pendente por
   horas/dias sem necessidade.
10. **Aplicar as mesmas duas migrations em produção** (`wpgglxgddnekzojozqlm`), mesma ordem, mesmo
    procedimento manual acompanhado.
11. **Confirmar produção ainda vazia:**
    ```sql
    select count(*) from markets; select count(*) from products; select count(*) from prices;
    -- esperado: 0, 0, 0 (inalterado desde o fechamento da Onda 2)
    ```
12. **Confirmar INSERT anônimo bloqueado nas três tabelas, em produção** — mesmo comando do
    passo 5, contra `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` de produção. Esperado: `401`/`403`
    nas três.
13. **Disparar o deploy de produção imediatamente** (`gh workflow run deploy-production.yml`) —
    fica aguardando o required reviewer; `deploy-production.yml` já exige aprovação humana no
    GitHub Environment `production` (inalterado nesta Onda) antes de prosseguir ao passo de
    `wrangler deploy`. Como o passo 9 já confirmou disponibilidade do reviewer, a aprovação deve
    vir em minutos, não em horas.
14. **Após a aprovação do Founder como required reviewer:** concluir o deploy e os smoke tests
    (mesmo padrão do passo 8 — confirmar ausência dos três controles —, contra a URL de
    produção).

### Janela entre a migration de produção e o deploy do Worker (passos 10–14)

Entre aplicar a migration em produção (passo 10) e o deploy do Worker de produção ficar concluído
(passo 14) existe uma janela onde o banco de produção já tem o INSERT público fechado, mas o
Worker de produção ainda não foi implantado com o código que remove a UI correspondente.
**Análise do risco real desta janela, nesta Onda especificamente:**

- Este é o **primeiro deploy do Worker de produção** (confirmado em `PLANO-MESTRE.md` — "nenhum
  deploy executado" até este checkpoint). Não existe hoje nenhum Worker de produção respondendo
  em `vipreco-production.samuel-bortoletto.workers.dev` — não há um frontend antigo (com os três
  controles visíveis) já publicado para expor a um banco recém-fechado. A janela é temporal, mas
  não é uma regressão de nenhum estado anterior.
- A URL `*.workers.dev` não é o lançamento público do produto — não está linkada de lugar nenhum,
  não está indexada, e o DNS do domínio final permanece desligado (decisão já registrada na
  Onda 2). Só alguém que já conheça a URL exata poderia alcançá-la durante a janela.
- Mesmo assim, a janela deve ser minimizada por princípio, não por haver um risco concreto
  identificado: passo 9 (confirmar reviewer disponível antes de aplicar a migration) e passo 13
  (disparar o deploy imediatamente após o passo 12) existem exatamente para isso — o objetivo é
  que o intervalo entre "migration aplicada" e "Worker implantado" seja de minutos, dentro da
  mesma sessão de rollout, não uma pausa arbitrária entre dias diferentes.
- Se o required reviewer não puder aprovar dentro da mesma sessão, o passo 9 deve bloquear —
  **não aplicar a migration de produção até o reviewer confirmar disponibilidade.** Aplicar a
  migration e só depois procurar o reviewer inverteria a ordem que este plano existe para evitar.

## Rollback / compensating migration

Ambas as migrations desta Onda são puramente `REVOKE`/`GRANT`/`COMMENT` — reversíveis sem perda
de dado. Nenhuma delas precisa de uma "migration de compensação" separada; o rollback é o inverso
exato da própria migration, documentado dentro de cada arquivo:

**Reverter `20260729210000_harden_helper_function_grants.sql`:**

```sql
GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.pa_set_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO PUBLIC;
```

(volta ao estado implícito anterior — nenhum efeito funcional esperado, já que nenhum caller
externo usa essas funções via RPC).

**Reverter `20260729223000_close_public_write_surfaces.sql`** (só deve ser executado junto com a
proteção server-side exigida pela seção "Turnstile e rate limiting" do threat model — nunca
isoladamente):

```sql
GRANT INSERT ON public.price_submissions TO anon, authenticated;
GRANT INSERT ON public.product_watch_requests TO anon, authenticated;
GRANT INSERT ON public.decision_feedback TO anon, authenticated;
COMMENT ON TABLE public.price_submissions IS NULL;
COMMENT ON TABLE public.product_watch_requests IS NULL;
COMMENT ON TABLE public.decision_feedback IS NULL;
```

Rollback do Worker: `wrangler rollback` (staging/produção) ou re-deploy do commit anterior —
inalterado, mesmo mecanismo já disponível desde a Onda 2.

## Critério de parada

Se qualquer verificação (passos 3, 4, 5, 6, 11, 12) não bater com o esperado, **parar antes do
próximo passo**, reverter a migration recém-aplicada com o SQL acima, e reportar o desvio exato
antes de prosseguir. Nenhum passo deste plano deve ser executado fora de ordem.
