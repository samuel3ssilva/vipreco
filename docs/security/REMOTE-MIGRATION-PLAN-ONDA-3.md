# Plano de rollout remoto — Onda 3

Nenhum passo deste plano foi executado. O merge do PR, as migrations remotas e os deploys
dependem da autorização explícita do PMO/Founder (frase única no checkpoint). Este documento
existe para que a execução, quando autorizada, siga exatamente esta sequência sem decisão
improvisada no momento.

**Correção factual (2026-07-30):** a versão anterior deste documento afirmava, incorretamente,
que este seria o primeiro deploy do Worker de produção. **Está errado.** `vipreco-production` já
foi implantado no fechamento da Onda 2 (`PLANO-MESTRE.md`, "Estado confirmado do fechamento da
Onda 2": *"Worker de staging (`samuel3ssilva-vipreco`) e Worker de produção (`vipreco-production`)
implantados, cada um com Supabase próprio"*) e está publicamente respondendo hoje. Verificado
read-only nesta correção:

```
curl -s -o /dev/null -w "%{http_code}\n" https://vipreco-production.samuel-bortoletto.workers.dev/
# 200
curl -s -o /dev/null -w "%{http_code}\n" https://vipreco-production.samuel-bortoletto.workers.dev/buscar
# 200
curl -sI https://vipreco-production.samuel-bortoletto.workers.dev/ | grep -i "content-security-policy\|x-frame-options\|strict-transport"
# (vazio)
```

O Worker de produção responde `200` em `/` e `/buscar`, e **não envia nenhum dos headers de
segurança desta Onda** (`Content-Security-Policy`, `X-Frame-Options`,
`Strict-Transport-Security`). Isso confirma que a versão atualmente publicada é anterior a esta
Onda 3 inteira — anterior também à remoção dos três controles de UI feita no segundo ajuste do
PMO. **A versão publicada hoje em produção ainda renderiza "Informar preço", "Informar
atualização", "Quero acompanhar" e o widget de feedback de decisão.** Esta verificação foi feita
por HTTP público (sem credencial); não há acesso ao dashboard do Cloudflare nesta sessão para
confirmar a data exata do último deploy — quem executar o rollout deve confirmar isso visualmente
no dashboard antes do passo 11.

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
3. `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql` — **corretiva,
   adicionada após um achado ao vivo durante a aplicação da migration 1 em staging:** `REVOKE ALL
   ... FROM PUBLIC` não remove o `EXECUTE` que o Supabase concede diretamente a
   `anon`/`authenticated` na criação de toda função (`ALTER DEFAULT PRIVILEGES` de plataforma, fora
   do nosso versionamento). Revoga explicitamente de `PUBLIC, anon, authenticated` nas 3 funções
   auxiliares **e em `approve_submission(uuid)`** (Onda 1, mesmo padrão insuficiente, achado mais
   severo desta Onda — ver `docs/security/THREAT-MODEL-ONDA-3.md` §5.3). Se staging já aplicou
   só as migrations 1 e 2, aplicar a 3 antes de prosseguir para qualquer outro passo.

Todas puramente `REVOKE`/`GRANT`/`COMMENT ON TABLE` — nenhum `ALTER TABLE` estrutural, nenhum
`DROP`, nenhuma migration de dado.

## Sequência exata

1. **Merge do PR #12** em `main` (ação humana — Founder/PMO). ✅ Executado (`8623a55`).
2. **Aplicar as três migrations novas em staging** (`wjurqpclauwtbjhhvigy`), na ordem acima, via
   SQL Editor ou CLI — mesmo procedimento manual acompanhado usado nas Ondas 1/2. ✅ Migrations 1
   e 2 já aplicadas; migration 3 (corretiva) pendente — aplicar antes do passo 3.
3. **Confirmar grants e EXECUTE no banco vivo de staging:**
   ```sql
   -- EXECUTE das 3 funções auxiliares + approve_submission: só service_role
   select grantee, routine_name, privilege_type
   from information_schema.role_routine_grants
   where routine_name in
     ('pa_normalize_text','pa_set_updated_at','pa_products_search_text','approve_submission');

   -- INSERT nas 3 tabelas fechadas: só service_role
   select grantee, table_name, privilege_type
   from information_schema.role_table_grants
   where table_name in ('price_submissions','product_watch_requests','decision_feedback')
     and privilege_type = 'INSERT';
   ```
   Esperado: nenhuma linha com `grantee` = `anon` ou `authenticated` em nenhuma das duas queries.
   **Se `anon`/`authenticated` ainda aparecerem na primeira query mesmo após a migration 3, parar
   e reportar — não prosseguir para o passo 4.**
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
9. **Confirmar com o Founder (required reviewer de produção) que ele está disponível para aprovar
   nos próximos minutos** — antes de disparar qualquer coisa. Este passo continua obrigatório
   mesmo com a sequência corrigida abaixo: sem reviewer disponível, não iniciar o passo 10.
10. **Disparar o deploy de produção e deixá-lo pausado, sem aprovar ainda:**
    ```bash
    gh workflow run deploy-production.yml -f confirm="deploy production"
    ```
    `deploy-production.yml` declara `environment: production` no nível do **job**
    (`jobs.deploy`), não em um step isolado — o gate de aprovação do GitHub Environment pausa o
    job inteiro **antes do primeiro step**, antes até do checkout do código. Confirmado lendo o
    arquivo do workflow, não presumido. Neste ponto o job está na fila, pronto para rodar
    checkout → install → build → deploy → smoke test assim que for aprovado — mas nada disso
    rodou ainda.
11. **Com o deploy pausado, aplicar as mesmas três migrations em produção**
    (`wpgglxgddnekzojozqlm`), mesma ordem (incluindo a migration 3, corretiva do achado de
    `EXECUTE` direto — ver seção "Migrations novas" acima), mesmo procedimento manual
    acompanhado. Confirmar grants com a mesma query do passo 3 (incluindo `approve_submission`)
    antes de prosseguir ao passo 12.
12. **Confirmar produção ainda vazia:**
    ```sql
    select count(*) from markets; select count(*) from products; select count(*) from prices;
    -- esperado: 0, 0, 0 (inalterado desde o fechamento da Onda 2)
    ```
13. **Confirmar INSERT anônimo bloqueado nas três tabelas, em produção** — mesmo comando do
    passo 5, contra `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` de produção. Esperado: `401`/`403`
    nas três.
14. **Aprovar imediatamente o deploy pausado no passo 10**, assim que o passo 13 confirmar
    sucesso — o Founder, como required reviewer, aprova o run já enfileirado. O job prossegue
    sozinho a partir daí: checkout, install, build (com o código que já não renderiza os três
    controles), `wrangler deploy`, smoke test.
15. **Confirmar que o smoke test automatizado do workflow passou** (falha o job se `/` ou
    `/buscar` não responderem `200` em 5 tentativas) e, manualmente, que os três controles
    fechados não aparecem mais em `/produto/:id` na URL de produção (mesmo padrão do passo 8).

### Janela real entre a migration de produção e o novo deploy (passos 11–15)

A versão anterior desta seção presumia, incorretamente, que este seria o primeiro deploy do
Worker de produção e que portanto não havia frontend antigo para expor. **Isso estava errado** —
ver a correção factual no topo deste documento. `vipreco-production` já está publicado e, hoje,
ainda serve a versão anterior a esta Onda (sem os headers de segurança, com os três controles
visíveis).

**A janela é real:** entre aplicar a migration de produção (passo 11) e o novo Worker (sem os três
controles) ficar publicado (passo 15), a versão atualmente publicada continua servindo
`SubmitPriceForm`, o botão "Quero acompanhar" e `DecisionFeedback` — visíveis e clicáveis para
qualquer visitante que alcance a URL. Qualquer tentativa de uso deles nessa janela falha (o banco
já rejeita o `INSERT`) exibindo o texto de erro genérico herdado da versão publicada antes desta
Onda ("Verifique sua conexão e tente novamente"), não o texto honesto escrito nesta Onda — porque
o código novo ainda não foi implantado durante a janela.

- **Severidade real: baixa, mas não nula.** A URL `*.workers.dev` não é o lançamento público do
  produto — sem link, sem indexação, DNS do domínio final desligado — e não há dado real em
  produção. Mas qualquer visitante que já conheça a URL (equipe interna, QA, alguém com o link
  salvo) veria uma ação falhar com um texto de erro impreciso durante a janela. Não é uma falha de
  segurança (o banco está corretamente fechado o tempo todo) — é a mesma classe de "interface que
  sempre falha" que motivou este ajuste do PMO, só que temporária em vez de permanente.
- **Por que a sequência 9→15 minimiza essa janela mais do que aplicar a migration primeiro:**
  disparar o deploy antes da migration (passo 10) coloca o job já pronto e pausado, esperando
  apenas um clique. A etapa mais lenta e menos previsível — coordenar um humano disponível para
  aprovar — acontece **antes** da migration (passos 9–10), não depois. Se a ordem fosse invertida
  (migration primeiro, disparar o deploy depois), a janela incluiria o tempo indeterminado entre
  "migration aplicada" e "alguém lembra de disparar o workflow" — não controlável. Com a sequência
  adotada, a janela real passa a ser: tempo para concluir os passos 11–13 (minutos, já em
  andamento) + tempo fixo do pipeline após a aprovação (checkout, install, build, deploy, smoke
  test — tipicamente menos de 2 minutos, ver duração dos runs de CI desta Onda).
- Se o required reviewer não confirmar disponibilidade no passo 9, **não disparar o passo 10** —
  disparar o deploy e deixá-lo pausado por horas/dias sem necessidade não reduz a janela, só a
  torna imprevisível.

## Rollback / compensating migration

As três migrations desta Onda são puramente `REVOKE`/`GRANT`/`COMMENT` — reversíveis sem perda
de dado. Nenhuma delas precisa de uma "migration de compensação" separada; o rollback é o inverso
exato da própria migration, documentado dentro de cada arquivo:

**Reverter `20260729210000_harden_helper_function_grants.sql`:**

```sql
GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.pa_set_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO PUBLIC;
```

(volta ao estado implícito anterior — nenhum efeito funcional esperado, já que nenhum caller
externo usa essas funções via RPC). **Nota:** reverter só esta migration não reabre `EXECUTE` para
`anon`/`authenticated` nas quatro funções — isso nunca dependeu dela (é exatamente o bug que a
migration 3 corrigiu). Para reabrir de verdade, reverter a migration 3 abaixo.

**Reverter `20260730120000_fix_function_grants_explicit_revoke.sql`** (só deve ser executado se
houver um motivo concreto para reabrir `EXECUTE` a `anon`/`authenticated` nessas quatro funções —
para `approve_submission` especificamente, isso reabre a escalação de privilégio descrita em
`docs/security/THREAT-MODEL-ONDA-3.md` §5.3; não reverter sem entender essa consequência):

```sql
GRANT EXECUTE ON FUNCTION public.pa_normalize_text(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pa_set_updated_at() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pa_products_search_text() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_submission(uuid) TO anon, authenticated;
```

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

**Rollback do Worker:** `wrangler rollback` (staging/produção) ou re-deploy do commit anterior —
inalterado, mesmo mecanismo já disponível desde a Onda 2. Em produção especificamente, isso
significa voltar a servir a versão pré-Onda-3 já confirmada publicada hoje (sem headers de
segurança, com os três controles visíveis) — ver a correção factual no topo deste documento.

### Incompatibilidade temporária entre versões — quando o rollback de um lado, sem o outro, reabre o problema

As duas metades deste rollout (migration do banco, deploy do Worker) podem ficar temporariamente
fora de sincronia em dois cenários de falha, e cada um pede uma resposta diferente:

1. **A migration foi aplicada (passo 11) mas o deploy falha ou não é aprovado (falha entre os
   passos 12–15).** Banco fechado + Worker antigo publicado = exatamente a janela descrita acima,
   só que sem previsão de quando termina. **Resposta preferida: corrigir o problema do deploy e
   tentar de novo** (é só um novo `wrangler deploy` — a migration já está correta, não precisa
   repetir). **Só reverter a migration do banco** (SQL de rollback acima) **se o deploy ficar
   bloqueado por mais que alguns minutos** — reabrir o `INSERT` sem a proteção server-side
   reintroduz o risco original que motivou o fechamento (ver "Turnstile e rate limiting" no threat
   model), então é a opção de último recurso, não a primeira.
2. **O deploy foi concluído (Worker novo, sem os três controles, já publicado) mas depois disso
   alguém precisa reverter o Worker para uma versão anterior por outro motivo** (bug não
   relacionado a esta Onda, por exemplo). Se o Worker voltar para uma versão anterior a esta Onda
   enquanto a migration de fechamento **permanece aplicada**, os três controles voltam a aparecer
   na UI publicada — e voltam a falhar sempre, o exato problema que este ajuste do PMO corrigiu.
   **Resposta obrigatória: reverter a migration do banco (reabrir o `INSERT`) junto com, ou antes
   de, reverter o Worker para uma versão pré-Onda-3** — nunca reverter só o Worker e deixar o
   banco fechado. Se o motivo do rollback do Worker não tiver relação com este fechamento, avaliar
   primeiro se um rollback parcial (só do Worker, banco inalterado) é aceitável por uma janela
   curta antes de decidir reverter a migration também.

Em ambos os casos, o objetivo é o mesmo do resto deste documento: nunca deixar "banco fechado" e
"UI que oferece as três ações" publicados ao mesmo tempo por mais tempo do que o estritamente
necessário.

## Critério de parada

Se qualquer verificação (passos 3, 4, 5, 6, 12, 13) não bater com o esperado, **parar antes do
próximo passo**. Em staging, reverter a migration recém-aplicada com o SQL acima e reportar o
desvio exato antes de prosseguir. Em produção, se a falha ocorrer nos passos 12–13 **com o deploy
já disparado e pausado no passo 10**, não aprovar o deploy pausado — cancelar o run
(`gh run cancel`), reverter a migration com o SQL acima, e reportar o desvio antes de tentar de
novo. Nenhum passo deste plano deve ser executado fora de ordem.
