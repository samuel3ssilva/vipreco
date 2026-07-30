# Matriz de autorização do banco — Onda 3

Fonte: leitura integral de `supabase/migrations/` (4 arquivos, ordem cronológica confirmada,
cada um tocado por exatamente um commit — sem edição pós-aplicação) e `supabase/seed.sql`.
Estado ao vivo (staging `wjurqpclauwtbjhhvigy`, produção `wpgglxgddnekzojozqlm`) foi validado
estruturalmente no fechamento da Onda 2 (6 tabelas, 6 policies, 6 tabelas com RLS, 4 funções,
`pg_trgm` ativa em ambos) — os detalhes linha-a-linha abaixo vêm do código versionado, que é a
fonte da verdade para o que muda nesta Onda.

"Antes" = estado ao final da Onda 2 (`main` em `559e9f6`). "Depois" = estado ao final desta
Onda, após `20260729210000_harden_helper_function_grants.sql` e
`20260729223000_close_public_write_surfaces.sql` (checkpoint do PMO em 2026-07-29: fecha o
INSERT público de `price_submissions`, `product_watch_requests` e `decision_feedback` — nenhuma
delas tem superfície legítima de escrita pública no MVP atual).

## Tabelas

| Recurso                  | Role                    |                    SELECT                    |                         INSERT                         | UPDATE | DELETE | Policy aplicável                                           | Justificativa                                                                  | Antes                                                          | Depois                      |
| ------------------------ | ----------------------- | :------------------------------------------: | :----------------------------------------------------: | :----: | :----: | ---------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- | --------------------------- |
| `markets`                | `anon`, `authenticated` |            ✅ (`is_active=true`)             |                           ❌                           |   ❌   |   ❌   | `"Mercados ativos sao publicos"`                           | Catálogo público, editorial (não escrito pela comunidade)                      | igual                                                          | igual                       |
| `markets`                | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | CI/migrations/backoffice                                                       | igual                                                          | igual                       |
| `products`               | `anon`, `authenticated` |            ✅ (`is_active=true`)             |                           ❌                           |   ❌   |   ❌   | `"Produtos ativos sao publicos"`                           | Catálogo público                                                               | igual                                                          | igual                       |
| `products`               | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | CI/migrations/backoffice                                                       | igual                                                          | igual                       |
| `prices`                 | `anon`, `authenticated` | ✅ (ativo + válido + produto/mercado ativos) |                           ❌                           |   ❌   |   ❌   | `"Precos validos sao publicos"`                            | Só o preço válido mais recente é público (principle #2 do CLAUDE.md)           | igual                                                          | igual                       |
| `prices`                 | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Única escrita real é via `approve_submission()` (SECURITY DEFINER, ver abaixo) | igual                                                          | igual                       |
| `price_submissions`      | `anon`, `authenticated` |                      ❌                      | ❌ (policy dormente — sem GRANT, RLS nunca é avaliada) |   ❌   |   ❌   | `"Visitantes podem enviar sugestoes pendentes"` (dormente) | Moderação pública fora do MVP; sem endpoint server-side/anti-abuso pronto      | ✅ (`status='pending'`, produto/mercado ativos, `comment`≤280) | **❌ — fechado nesta Onda** |
| `price_submissions`      | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Moderação server-side                                                          | igual                                                          | igual                       |
| `product_watch_requests` | `anon`, `authenticated` |                      ❌                      | ❌ (policy dormente — sem GRANT, RLS nunca é avaliada) |   ❌   |   ❌   | `"Visitantes podem registrar interesse"` (dormente)        | Etapa futura, sem superfície legítima no MVP atual                             | ✅ (produto ativo)                                             | **❌ — fechado nesta Onda** |
| `product_watch_requests` | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Backoffice                                                                     | igual                                                          | igual                       |
| `decision_feedback`      | `anon`, `authenticated` |                      ❌                      | ❌ (policy dormente — sem GRANT, RLS nunca é avaliada) |   ❌   |   ❌   | `"Visitantes podem enviar feedback"` (dormente)            | Sem superfície legítima de escrita pública no MVP atual                        | ✅ (produto ativo)                                             | **❌ — fechado nesta Onda** |
| `decision_feedback`      | `service_role`          |                      ✅                      |                           ✅                           |   ✅   |   ✅   | GRANT ALL                                                  | Backoffice                                                                     | igual                                                          | igual                       |

Todas as seis tabelas têm `ENABLE ROW LEVEL SECURITY` — nenhuma tabela exposta pela Data API
está sem RLS. Nenhuma sequence explícita existe (todas as PKs usam `gen_random_uuid()`), então
não há GRANT de sequence a auditar.

## Funções

| Função                      | SECURITY          | `search_path`     | EXECUTE (antes)                                                 | EXECUTE (depois)      | Justificativa                                                                               |
| --------------------------- | ----------------- | ----------------- | --------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| `pa_normalize_text(text)`   | INVOKER (default) | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Usada só por trigger e índice funcional; nenhum caller externo precisa chamá-la diretamente |
| `pa_set_updated_at()`       | INVOKER (default) | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Função de trigger, só toca `NEW`                                                            |
| `pa_products_search_text()` | INVOKER (default) | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Função de trigger, só toca `NEW`                                                            |
| `approve_submission(uuid)`  | **DEFINER**       | `public` (fixado) | `PUBLIC, anon, authenticated` (ver correção abaixo) | apenas `service_role` (após `20260730120000`) | Única escrita legítima de `price_submissions` → `prices` — **correção crítica, ver abaixo**  |

### Correção crítica (achado ao vivo no rollout de staging, 2026-07-30): `REVOKE ALL ... FROM PUBLIC` não bastava

A coluna "Antes" da tabela acima estava **errada** nas quatro linhas até este achado. A hipótese
original — de que `REVOKE ALL ... FROM PUBLIC` removia o `EXECUTE` para `anon`/`authenticated`,
porque o default do Postgres é conceder `EXECUTE` a `PUBLIC` — nunca foi verificada contra um
banco vivo (Docker indisponível durante toda a Onda 3; nenhuma revisão adversarial teve acesso a
banco). Ao aplicar `20260729210000_harden_helper_function_grants.sql` em staging e rodar a
verificação do passo 3 do plano de rollout, o resultado real mostrou `anon` e `authenticated` com
`EXECUTE` direto nas três funções auxiliares, apesar da migration já aplicada.

**Causa raiz:** o Supabase provisiona todo projeto com `ALTER DEFAULT PRIVILEGES` no nível de
plataforma, concedendo `EXECUTE` explicitamente a `anon`, `authenticated` e `service_role` em toda
função criada dali em diante no schema `public` — fora do nosso controle de versionamento. Esse
grant é direto (papéis nomeados), não mediado pelo pseudo-role `PUBLIC`. `REVOKE ... FROM PUBLIC`
só desfaz o default SQL-padrão (que também existe, mas é redundante aqui); não desfaz esse grant
direto da plataforma.

**Consequência mais grave — `approve_submission(uuid)` (Onda 1, `20260727155843`):** criada com o
mesmo padrão `REVOKE ALL ... FROM PUBLIC`. Sendo `SECURITY DEFINER` e a única função que escreve
em `prices` a partir de `price_submissions`, se `anon`/`authenticated` tiverem `EXECUTE` direto
nela (mesmo mecanismo confirmado nas três funções auxiliares), **qualquer visitante anônimo
poderia chamá-la via RPC (`POST /rest/v1/rpc/approve_submission`) e aprovar sua própria sugestão
de preço, ignorando por completo o fluxo de moderação** — desde a Onda 1, em produção incluída.

**Corrigido** em `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql`:
`REVOKE ALL ... FROM PUBLIC, anon, authenticated` nas quatro funções (as três auxiliares +
`approve_submission`), migration nova e não destrutiva (não edita as migrations já aplicadas, por
`CLAUDE.md`). Regressão estática nova em `supabase/function-execute-grants.test.ts` assume, de
propósito, o oposto do teste de `INSERT` em tabelas: estado inicial **concedido** (não revogado)
por papel, refletindo o comportamento real do Supabase — não o default teórico do Postgres.

`approve_submission`'s owner efetivo (necessário para avaliar o alcance real do
`SECURITY DEFINER`) **não é verificável a partir do repositório** — `NOT VERIFIED`, requer
`\df+ public.approve_submission` no banco vivo.

## Views, triggers, extensões, Storage, Auth

| Item      | Achado                                                                                                                                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Views     | Nenhuma view definida                                                                                                                                                                                                                                                                                                            |
| Triggers  | `markets_updated_at`, `products_search_text`, `prices_updated_at` — todos disparam funções já auditadas acima, sem escrita fora do registro sendo processado                                                                                                                                                                     |
| Extensões | `pg_trgm`, instalada em schema `extensions` (não polui `public`)                                                                                                                                                                                                                                                                 |
| Storage   | Nenhum bucket ou policy de Storage definido em migration versionada. **NOT VERIFIED** se existe bucket criado fora de versionamento — checagem read-only do painel recomendada no checkpoint                                                                                                                                     |
| Auth      | `supabase/config.toml` não tem seção `[auth]` — configuração de signup/redirect/confirmação vive só no painel hospedado, fora de controle de versão. **NOT VERIFIED** — nenhuma interface de login existe no app (confirmado por grep, Fase C), mas o estado exato do Auth do projeto hospedado não é auditável pelo repositório |

## `is_demo` — não é fronteira de RLS

`is_demo` existe em `markets`, `products` e `prices`, mas nenhuma policy de SELECT o referencia.
É um rótulo de proveniência, não um controle de acesso — o isolamento real entre dado fictício e
dado real é inteiramente procedural (só `staging` recebe `supabase/seed.sql`; produção foi
confirmada com 0 linhas nas três tabelas no fechamento da Onda 2). Mudar isso exigiria RLS
adicional condicionada a `is_demo`, uma decisão de produto fora do escopo desta correção pontual
— registrado como risco residual aceito no threat model.

## Mudanças aplicadas nesta Onda

1. `supabase/migrations/20260729210000_harden_helper_function_grants.sql`: `REVOKE ALL
... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role` nas três funções auxiliares.
2. `supabase/migrations/20260729223000_close_public_write_surfaces.sql` (checkpoint do PMO):
   `REVOKE INSERT ... FROM anon, authenticated` em `price_submissions`, `product_watch_requests`
   e `decision_feedback`. Não destrutiva — nenhuma tabela, coluna ou policy foi removida; as três
   policies de INSERT continuam definidas no catálogo, agora dormentes (sem o `GRANT`
   correspondente, o Postgres nunca chega a avaliar a `USING`/`WITH CHECK` da policy — o
   privilégio de tabela é checado antes da RLS). `service_role` inalterado em todas as três.
   **Efeito de produto (resolvido no segundo ajuste do PMO):** os três fluxos de UI que escreviam
   nessas tabelas (`SubmitPriceForm`, `registerWatchRequest`, `DecisionFeedback`) não são mais
   renderizados em nenhuma rota pública — estrutura preservada e interface pública não renderizada
   enquanto a superfície de escrita permanecer fechada. Os componentes e a função continuam no
   repositório, sem exclusão destrutiva; `src/routes/produto.$productId.tsx` simplesmente não os
   importa nem os monta, e `PriceCard` não expõe mais o callback (`onReport`) que abria o
   formulário a partir de cada card. Ver `docs/security/THREAT-MODEL-ONDA-3.md` §5.2 e
   `src/routes/produto.$productId.public-surfaces.test.ts`.

Nenhuma outra tabela, policy ou RLS foi alterada — a auditoria não encontrou nenhuma policy
permissiva demais, nenhum `GRANT ALL` desnecessário e nenhuma tabela sem RLS. Ambas as migrations
ficam `NOT VERIFIED` contra um Postgres ao vivo nesta sessão (Docker indisponível no host de
desenvolvimento) — revisão feita por leitura de assinatura/semântica e por uma suíte de testes
estáticos (`supabase/close-public-write-surfaces.test.ts`) que resolve o estado final de GRANT/
REVOKE lendo todas as migrations em ordem cronológica. A verificação contra banco vivo (leitura
pública preservada, INSERT anônimo rejeitado) é o passo 5/11 do plano de rollout — ver
`docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`.
