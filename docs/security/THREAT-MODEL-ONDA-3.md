# Threat model — Onda 3

**Método:** recuperação read-only de `origin/main` (`559e9f6`) + inspeção do estado versionado
(migrations, RLS, grants, funções, rotas, cliente Supabase, build/deploy, workflows). Estado
ao vivo de Cloudflare/Supabase foi consultado onde a sessão permitia acesso read-only;
itens não verificáveis a partir do repositório estão marcados `NOT VERIFIED`.

## 1. Ativos e dados

| Ativo                                                                  | Onde vive                                      | Sensibilidade                                                           |
| ---------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Catálogo (`markets`, `products`, `prices`)                             | Postgres/Supabase, staging + produção          | Baixa — dado público por design, sem PII                                |
| Sugestões da comunidade (`price_submissions`)                          | Postgres                                       | Baixa/média — sem PII, mas grava texto livre (`comment`, até 280 chars) |
| Instrumentação anônima (`product_watch_requests`, `decision_feedback`) | Postgres                                       | Baixa — sem identificador de pessoa                                     |
| Chave publishable + URL do Supabase                                    | Bundle do cliente (por design)                 | Pública, mas é a chave de acesso a todo o restante deste mapa           |
| Chave `service_role`                                                   | Secrets do GitHub Environment, nunca no bundle | Alta — bypassa RLS inteiramente                                         |
| Token Cloudflare                                                       | Secrets do GitHub Environment                  | Alta — controla deploy do Worker                                        |
| Preferências locais (mercado habitual, watch, feedback respondido)     | `localStorage`/`sessionStorage` do navegador   | Baixa — apenas UUIDs, nunca enviado ao backend                          |
| Código-fonte e histórico                                               | GitHub `samuel3ssilva/vipreco`                 | Média — CI/CodeQL protegem, MFA já endurecido (Onda 1C)                 |

## 2. Papéis e fronteiras de confiança

- **`anon`** (chave publishable) — qualquer visitante do app ou qualquer terceiro que capture a
  chave publishable (ela é pública por design) e chame a Data API diretamente, **sem passar
  pelo Worker Cloudflare**. Fronteira real de autorização é inteiramente RLS/GRANT no Postgres,
  não o frontend nem o Worker.
- **`authenticated`** — papel existe no schema (mesmos GRANTs que `anon` em toda tabela) mas
  **não há nenhum fluxo de login/signup ativo no produto** (ver §5, item "Auth"). Hoje é
  equivalente a `anon` na prática.
- **`service_role`** — usado apenas em CI (secrets do GitHub Environment) para `approve_submission`
  e operações administrativas; nunca no frontend.
- **Worker Cloudflare** — serve o app (SSR + assets estáticos). **Não fica no caminho das
  chamadas do navegador ao Supabase**: o cliente Supabase chama `SUPABASE_URL` diretamente do
  navegador. Isso significa que qualquer proteção implementada só no Worker (ex.: rate limit)
  **não protege as tabelas com INSERT público**, que são acessíveis diretamente via REST do
  Supabase com a chave publishable, sem tocar no Worker.
- **PMO/Founder** — único papel com acesso a secrets, credenciais, DNS, merge e dados reais.

## 3. Superfícies públicas

| Superfície                                                                      | Método                                  | Protegida por                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET` catálogo (`markets`, `products`, `prices`) via Data API                   | REST direto ou via app                  | RLS `SELECT` (`is_active`/validade)                                                                                                                                                    |
| `INSERT price_submissions` via Data API                                         | **Fechada** (checkpoint PMO 2026-07-29) | `REVOKE INSERT FROM anon, authenticated` — policy `WITH CHECK` preservada e dormente (ver §4.2). `SubmitPriceForm` ("Informar preço") continua na UI mas toda tentativa de envio falha |
| `INSERT product_watch_requests` via Data API                                    | **Fechada** (checkpoint PMO 2026-07-29) | `REVOKE INSERT FROM anon, authenticated` — policy dormente. Botão "Quero acompanhar" continua na UI mas toda tentativa falha                                                           |
| `INSERT decision_feedback` via Data API                                         | **Fechada** (checkpoint PMO 2026-07-29) | `REVOKE INSERT FROM anon, authenticated` — policy dormente. Widget de feedback de decisão continua na UI mas toda tentativa falha                                                      |
| `EXECUTE approve_submission(uuid)`                                              | RPC                                     | **Corrigido em 2026-07-30** (ver §5.3) — `REVOKE ALL FROM PUBLIC` sozinho não bastava; `anon`/`authenticated` tinham `EXECUTE` direto (grant de plataforma do Supabase) desde a Onda 1. `20260730120000_fix_function_grants_explicit_revoke.sql` revoga explicitamente — **não chamável por `anon`/`authenticated`** após esta correção |
| Rotas do app (`/`, `/buscar`, `/produto/$id`, `/como-funciona`, `/sitemap.xml`) | HTTP via Worker                         | Nenhum header de segurança hoje (ver §7)                                                                                                                                               |
| `workers.dev` de staging e produção                                             | HTTP                                    | Sem autenticação — por design, ainda não são lançamento público, mas são publicamente alcançáveis e **indexáveis** hoje (ver §7)                                                       |

## 4. Atacantes e abusos plausíveis considerados

1. **Visitante anônimo comum** — não é ameaça; é o usuário-alvo do produto.
2. **Usuário malicioso sem conta** — pode chamar a Data API diretamente (chave publishable é
   pública). Pode tentar: inundar `price_submissions`/`product_watch_requests`/`decision_feedback`
   com INSERTs em massa (spam/esgotamento de armazenamento no plano Free); tentar ler dados fora
   do RLS (bloqueado); tentar `EXECUTE approve_submission` (bloqueado); tentar UPDATE/DELETE em
   qualquer tabela (bloqueado, sem policy para `anon`/`authenticated`).
3. **Comerciante futuro** — sem superfície dedicada hoje (fora do MVP); nenhum risco ativo.
4. **Operador interno futuro** — sem superfície hoje; risco fica para Onda futura quando um
   papel operacional for criado.
5. **Script automatizado / crawler** — pode indexar as URLs `workers.dev` (nenhum `X-Robots-Tag`/
   `noindex` hoje) e pode automatizar INSERTs nas três tabelas de escrita pública (não há
   rate-limit server-side, apenas soft-cap client-side declaradamente insuficiente).
6. **Comprometimento da chave publishable** — não é um "comprometimento" real: a chave é pública
   por design. O risco correto a avaliar é "o que essa chave permite", que é exatamente o RLS
   documentado acima — já auditado e restrito.
7. **Erro de configuração staging/produção** — mitigado por `scripts/verify-env.ts` (fail-closed,
   compara `SUPABASE_PROJECT_ID` contra `config/environments.json` e recusa credencial cruzada)
   e comprovado em produção (0 linhas, escrita anônima 401) durante o fechamento da Onda 2.
8. **XSS via conteúdo de produto/mercado** — nenhum `dangerouslySetInnerHTML` ativo no caminho
   de renderização de dados do Supabase (o único uso existente é em `src/components/ui/chart.tsx`,
   componente shadcn não utilizado em nenhuma rota). React escapa todo conteúdo textual por padrão.
9. **Abuso de endpoints** — coberto no item 2 acima; é o achado central desta Onda (§ "escrita
   pública sem proteção server-side").
10. **Vazamento por logs, bundle ou source map** — nenhum `service_role`, segredo ou source map
    encontrado no bundle/config versionado (ver Fase C). `build.sourcemap` não está explicitamente
    definido — hoje o default do Nitro/Vite é não gerar source map de produção, mas isso não está
    fixado no código (risco de regressão silenciosa se o default mudar).
11. **Uso indevido de função `SECURITY DEFINER`** — `approve_submission` é a única função
    `SECURITY DEFINER` do schema; tem `search_path` fixado. **Achado crítico, corrigido em
    2026-07-30 (§5.3):** até a correção, `EXECUTE` não estava de fato restrito a `service_role` —
    `anon`/`authenticated` tinham `EXECUTE` direto desde a Onda 1 (grant de plataforma do
    Supabase, não desfeito por `REVOKE ALL FROM PUBLIC`), permitindo em teoria que qualquer
    visitante anônimo chamasse `approve_submission(uuid)` via RPC e aprovasse sua própria
    sugestão de preço, sem moderação. Owner efetivo da função continua não verificável a partir
    do repositório — `NOT VERIFIED`, requer checagem `\df+ public.approve_submission` no banco
    vivo.
12. **Falha de RLS** — nenhuma tabela exposta pela API está sem RLS habilitado. Nenhuma policy
    permissiva demais foi encontrada. **Achado relacionado ao item 11, corrigido em 2026-07-30:**
    `pa_normalize_text`, `pa_set_updated_at` e `pa_products_search_text` tinham `EXECUTE` direto
    de `anon`/`authenticated` (mesma causa raiz do item 11) — não apenas o `EXECUTE` padrão de
    `PUBLIC` do Postgres, que era a hipótese original (e estava incompleta). Ver §5.3.
13. **Dado demo em produção** — `is_demo` **não é uma fronteira de RLS**, é apenas rótulo de
    proveniência; a policy de SELECT não distingue `is_demo=true` de `false`. O isolamento é
    inteiramente procedural (seed só é aplicado manualmente em staging). Produção foi confirmada
    com 0 linhas nas tabelas de negócio no fechamento da Onda 2, mas o banco não tem uma trava
    técnica que impeça alguém de rodar `seed.sql` contra produção por engano.
14. **Conteúdo patrocinado confundido com orgânico** — `is_featured` existe apenas em `prices`
    e não há, ainda, nenhuma UI de anúncio/patrocínio implementada; portanto não há risco ativo
    de neutralidade nesta Onda. Ponto para a Onda de produto quando "Achados do dia"/publicidade
    forem implementados: será necessário teste automatizado que `is_featured` nunca entra no
    `ORDER BY` da comparação orgânica (já é regra em `src/lib/comparison.ts`, mas ainda sem teste
    específico de neutralidade contra `is_featured`).
15. **Recurso dormente exposto acidentalmente** — auditado: `approve_submission` **estava**
    exposto por engano até a correção de 2026-07-30 registrada nos itens 11/12 e em §5.3 — não
    estava corretamente fechado, ao contrário do que esta Onda presumiu até o rollout de staging
    provar o contrário. Scaffolding de autenticação (`client.server.ts`, `auth-middleware.ts`,
    `auth-attacher.ts`) existe no repositório, sem nenhum ponto de chamada ativo, mas contradiz o
    princípio "escopo é lei" pela mera presença de código que manuseia `service_role` e verificação
    de JWT. Tratado como achado nesta Onda (ver tabela).

## 5. Tabela de achados

| Ativo                                                                              | Ameaça                                                                                                                                                                                                                                   | Superfície                                                                | Controle existente                                                                                                                                                                                                              | Falha                                                                                                                                           | Severidade                                                                                          | Correção                                                                                                                                                                                                                               | Evidência                                                                                                            | Risco residual                                                                                                                                              |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `price_submissions`/`product_watch_requests`/`decision_feedback`                   | Flood automatizado / esgotamento de armazenamento                                                                                                                                                                                        | INSERT direto via Data API (chave publishable), fora do alcance do Worker | **Fechado no checkpoint do PMO (2026-07-29):** `REVOKE INSERT ... FROM anon, authenticated` nas três tabelas (`supabase/migrations/20260729223000_close_public_write_surfaces.sql`), policies de INSERT preservadas e dormentes | Nenhuma — superfície fechada, não mitigada                                                                                                      | **Resolvido (era Média)**                                                                           | `REVOKE INSERT` não destrutivo; testes de regressão estáticos em `supabase/close-public-write-surfaces.test.ts`; verificação viva (INSERT anônimo rejeitado) faz parte do rollout, ver `docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md` | `supabase/migrations/20260729223000_close_public_write_surfaces.sql`, `supabase/close-public-write-surfaces.test.ts` | Nenhum enquanto a superfície permanecer fechada. Reabertura futura exige endpoint server-side, validação, proteção anti-abuso e novo gate — ver §4.2 abaixo |
| Todas as rotas do Worker                                                           | Clickjacking, MIME sniffing, referrer leakage, uso indevido de permissões do navegador                                                                                                                                                   | Toda resposta HTTP do Worker                                              | Nenhum header de segurança presente                                                                                                                                                                                             | CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, anti-framing ausentes                                                   | **Alta**                                                                                            | Implementados em `src/server.ts` nesta Onda                                                                                                                                                                                            | `docs/security/EDGE-SECURITY-POLICY.md`                                                                              | Baixo após a correção; validar em staging/produção reais no rollout                                                                                         |
| URLs `workers.dev` de staging/produção                                             | Indexação prematura por crawlers antes do lançamento oficial                                                                                                                                                                             | `robots.txt` (`Allow: /`), nenhum `X-Robots-Tag`                          | Nenhum                                                                                                                                                                                                                          | Motores de busca podem indexar o ambiente técnico não lançado                                                                                   | **Média**                                                                                           | `X-Robots-Tag: noindex, nofollow` adicionado condicionalmente por host nesta Onda                                                                                                                                                      | `docs/security/EDGE-SECURITY-POLICY.md`                                                                              | Baixo após a correção                                                                                                                                       |
| `approve_submission(uuid)` (`SECURITY DEFINER`) + `pa_normalize_text`, `pa_set_updated_at`, `pa_products_search_text` | **Escalação de privilégio — achado ao vivo no rollout de staging (2026-07-30), não previsto por nenhuma revisão de código.** `anon`/`authenticated` chamarem `approve_submission` via RPC e auto-aprovarem sugestões de preço, ignorando a moderação | `EXECUTE` via RPC (`POST /rest/v1/rpc/approve_submission`)               | `REVOKE ALL ... FROM PUBLIC` (Onda 1, migration `20260727155843`) — **insuficiente**: não revoga o `EXECUTE` que o Supabase concede direto a `anon`/`authenticated` na criação de toda função (`ALTER DEFAULT PRIVILEGES` de plataforma, fora do versionamento) | A hipótese "REVOKE FROM PUBLIC basta" nunca foi verificada contra banco vivo em nenhuma das cinco revisões adversariais anteriores | **Alta (corrigida antes de qualquer aplicação em produção)**                                        | `REVOKE ALL ... FROM PUBLIC, anon, authenticated` explícito nas quatro funções; regressão estática nova assume concedido por padrão (não revogado)                                                                                    | `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql`, `supabase/function-execute-grants.test.ts` | Nenhum após a correção aplicada e verificada ao vivo; **produção só recebe a migration corrigida — nunca esteve exposta por uma migration desta Onda**, mas pode ter estado exposta desde a Onda 1 via `approve_submission` — ver §5.3 |
| Scaffolding de auth (`client.server.ts`, `auth-middleware.ts`, `auth-attacher.ts`) | Superfície morta que manuseia `service_role`/JWT sem necessidade; risco de alguém futuramente importar `supabaseAdmin` de uma rota, já que `importProtection` só cobre `**/server/**` (diretório), não o sufixo `*.server.ts` usado aqui | Código-fonte, build                                                       | Convenção de nome de arquivo, não imposta pelo build                                                                                                                                                                            | Presença de código morto que contradiz "sem login de consumidor" e cujo guard de build tem uma lacuna                                           | **Média**                                                                                           | Removido nesta Onda (zero call sites confirmados; ver Fase C)                                                                                                                                                                          | commit de remoção + `bun run build` verde                                                                            | Nenhum — funcionalidade inexistente foi apenas removida                                                                                                     |
| `build.sourcemap`                                                                  | Vazamento de código-fonte/estrutura interna via source map público                                                                                                                                                                       | Build de produção                                                         | Default implícito do Nitro/Vite (hoje não gera map, mas não está fixado)                                                                                                                                                        | Ausência de declaração explícita — risco de regressão silenciosa                                                                                | **Baixa**                                                                                           | Fixado explicitamente como `false` para build de cliente nesta Onda                                                                                                                                                                    | `vite.config.ts`                                                                                                     | Nenhum                                                                                                                                                      |
| GitHub Actions (`ci.yml`, `deploy-staging.yml`, `deploy-production.yml`)           | Token do Actions com permissão implícita ampla; `uses:` não fixado por SHA                                                                                                                                                               | Pipeline de CI/CD                                                         | `codeql.yml` já usa `permissions:` mínimo — os outros três não                                                                                                                                                                  | Token `GITHUB_TOKEN` com escopo padrão (potencialmente mais amplo que o necessário); tags mutáveis (`@v4`, `@v2`, `@v3`) em vez de SHA completo | **Baixa/Média**                                                                                     | `permissions:` mínimo adicionado aos três workflows nesta Onda; SHA-pinning avaliado (ver auditoria de supply chain)                                                                                                                   | `.github/workflows/*.yml`                                                                                            | Baixo                                                                                                                                                       |
| `bunx wrangler deploy` (ambos os workflows de deploy)                              | Versão do `wrangler` não fixada — build não reprodutível, superfície de supply chain                                                                                                                                                     | Pipeline de deploy                                                        | Nenhum                                                                                                                                                                                                                          | Deploy usa "latest" do npm no momento da execução                                                                                               | **Baixa**                                                                                           | Versão fixada nesta Onda                                                                                                                                                                                                               | `.github/workflows/deploy-*.yml`                                                                                     | Baixo                                                                                                                                                       |
| `nitro` em versão beta (`3.0.260603-beta`)                                         | Ferramenta de build/deploy crítica em prerelease                                                                                                                                                                                         | `package.json` devDependency                                              | Nenhum — é a versão em uso desde a Onda 1B/2                                                                                                                                                                                    | Instabilidade potencial de uma dependência no caminho crítico de produção                                                                       | **Baixa (NOT VERIFIED — decisão de produto/infra, fora do escopo de correção autônoma desta Onda)** | Nenhuma ação autônoma; registrado para acompanhamento — trocar de beta exige validação de build completa e não é uma "vulnerabilidade direta e material" que justifique atualização fora do escopo                                     | Este documento                                                                                                       | Aceito como risco conhecido                                                                                                                                 |
| `is_demo`                                                                          | Dado fictício aparecer em produção por engano operacional                                                                                                                                                                                | Nenhuma trava técnica — apenas procedimento                               | `seed.sql` só é aplicado manualmente; `seed.test.ts` testa o conteúdo do arquivo, não o banco vivo                                                                                                                              | RLS não distingue `is_demo`                                                                                                                     | **Baixa (residual aceito)**                                                                         | Fora do escopo de mudança de schema desta Onda — mitigação real é operacional (nunca rodar `seed.sql` contra produção) e já documentada em `CLAUDE.md`/`supabase/seed.sql`                                                             | `supabase/seed.sql` cabeçalho                                                                                        | Aceito — mudar isso exigiria RLS adicional sobre `is_demo`, decisão de produto fora do escopo de correção pontual                                           |
| Storage do Supabase                                                                | Bucket público criado fora de versionamento, sem policy auditável                                                                                                                                                                        | Painel Supabase (fora do repositório)                                     | Nenhuma evidência de uso no código versionado                                                                                                                                                                                   | Não verificável via `origin/main`                                                                                                               | **NOT VERIFIED**                                                                                    | Verificação read-only do painel ao vivo recomendada no checkpoint                                                                                                                                                                      | Ausência de qualquer referência a `storage.*` no código                                                              | A confirmar pelo Founder/CTO com acesso ao painel                                                                                                           |
| Config de Auth do Supabase (signup, redirects, confirmação de e-mail)              | Signup público habilitado por padrão do Supabase, sem uso no produto                                                                                                                                                                     | Painel Supabase (fora do repositório)                                     | Nenhuma config versionada (`supabase/config.toml` não tem seção `[auth]`)                                                                                                                                                       | Não verificável via `origin/main`                                                                                                               | **NOT VERIFIED**                                                                                    | Verificação read-only do painel ao vivo recomendada no checkpoint                                                                                                                                                                      | `supabase/config.toml` (1 linha, sem seção `[auth]`)                                                                 | A confirmar pelo Founder/CTO com acesso ao painel                                                                                                           |
| `approve_submission` — owner efetivo                                               | `SECURITY DEFINER` roda com privilégios do owner; owner não é declarado na migration                                                                                                                                                     | Banco vivo                                                                | `REVOKE`/`GRANT` corretos limitam quem chama, mas não documentam quem é o definer                                                                                                                                               | Não verificável via `origin/main`                                                                                                               | **NOT VERIFIED (baixo risco)**                                                                      | Checar `\df+ public.approve_submission` no banco vivo                                                                                                                                                                                  | `supabase/migrations/20260727155843_approve_submission.sql`                                                          | Baixo — mesmo que o owner seja `postgres`/superuser do projeto, apenas `service_role` pode chamar a função                                                  |
| GitHub Environment `production` — `can_admins_bypass: true`                        | Required reviewer é o único controle documentado para gatear deploy de produção, mas admins do repositório podem pular esse gate sem aprovação — **achado ao vivo durante o rollout desta Onda, registrado, não corrigido** (fora do escopo autorizado deste checkpoint) | Configuração do GitHub Environment (fora do código versionado)            | `required_reviewers` (samuel3ssilva) — efetivo apenas para atores sem privilégio de admin                                                                                                                                       | `can_admins_bypass: true` permite que qualquer admin do repo dispare um deploy de produção sem passar pela aprovação — confirmado pelo run `30500447097` (2026-07-29, Onda 2), que completou sem pausar | **Média (registrada, não corrigida — aguarda novo gate)**                                           | Nenhuma ação nesta Onda — mudar `can_admins_bypass` para `false` é decisão de governança do PMO/Founder, não uma correção técnica autônoma; requer avaliar quem precisa de acesso admin ao repositório antes de restringir | `gh api repos/.../environments/production` (`can_admins_bypass: true`), run `30500447097`                            | Aceito como risco conhecido até o Founder/PMO decidir se restringe `can_admins_bypass` — nenhum admin do repo é uma ameaça externa hoje, mas o controle não é tecnicamente absoluto |

## 4.2 Turnstile e rate limiting — status após o checkpoint do PMO

**NÃO APLICÁVEIS ENQUANTO TODAS AS SUPERFÍCIES PÚBLICAS DE ESCRITA ESTIVEREM FECHADAS.
OBRIGATÓRIOS ANTES DE REATIVAR QUALQUER UMA DELAS.**

As três únicas tabelas que aceitavam `INSERT` de `anon`/`authenticated`
(`price_submissions`, `product_watch_requests`, `decision_feedback`) tiveram esse privilégio
revogado em `supabase/migrations/20260729223000_close_public_write_surfaces.sql` (checkpoint do
PMO, 2026-07-29). Sem superfície pública de escrita, não há nenhuma ação/RPC/endpoint anônimo que
produza efeito persistente hoje — logo, criar Turnstile ou um rate limiter agora seria proteger
uma superfície que não existe (contraria o princípio "não implementar controle que apenas pareça
seguro sem proteger uma superfície real").

Qualquer futura reabertura de `price_submissions`, `product_watch_requests` ou
`decision_feedback` — ou criação de qualquer outra ação pública com efeito persistente — deve vir
acompanhada, na mesma migration/PR que reabre a escrita, de: endpoint/RPC server-side controlado,
validação server-side, proteção anti-abuso automatizada quando justificada (Turnstile ou
equivalente), rate limit por risco, testes de bypass, e novo gate do PMO/Founder. Nenhuma
reabertura parcial (grant sem a proteção correspondente) é aceitável.

## 5.1 Verificação viva — INSERT anônimo nas três tabelas fechadas

Confirmado ao vivo contra **produção**, antes da aplicação da migration de fechamento (baseline
para o rollout comparar depois/antes — ver `docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`):
leitura pública de `prices` retorna `200` com array vazio; `INSERT` anônimo em `prices` retorna
`401 permission denied`. O mesmo padrão de RLS+GRANT protegia (antes desta Onda) `prices` — as
três tabelas de submissão pública seguiam padrão diferente (INSERT liberado por design original,
agora fechado). A confirmação de que o `INSERT` anônimo nas três tabelas passa a retornar `401`
**depois** da migration aplicada é o passo 5 (staging) e 11 (produção) do plano de rollout.

## 5.2 Consequência de produto do fechamento — não fica só na matriz de banco

**Atualizado no segundo ajuste do PMO (2026-07-29):** a primeira resposta a este achado (fechar o
banco e apenas corrigir o texto de erro dos três controles) foi avaliada pelo PMO como insuficiente
— uma interface que sempre falha não é um estado final aceitável. Os três controles públicos
ligados às tabelas fechadas deixaram de ser renderizados nas rotas públicas, em staging e em
produção:

- botão "Informar preço" e botão "Informar atualização" por mercado (abriam `SubmitPriceForm`,
  escreve em `price_submissions`);
- botão "Quero acompanhar" (chamava `registerWatchRequest`, escreve em `product_watch_requests`);
- widget de feedback de decisão `DecisionFeedback` (escreve em `decision_feedback`).

`src/routes/produto.$productId.tsx` não importa mais `SubmitPriceForm` nem `DecisionFeedback`, não
chama mais `registerWatchRequest`, e `PriceCard` não expõe mais a prop `onReport` que abria o
formulário a partir de cada card de preço — não há caminho alternativo no frontend para essas três
ações. **Estrutura preservada e interface pública não renderizada enquanto a superfície de escrita
permanecer fechada**: os três componentes (`SubmitPriceForm.tsx`, `DecisionFeedback.tsx`) e a
função `registerWatchRequest` continuam no repositório, sem exclusão destrutiva, prontos para
religar quando a escrita for reaberta com proteção server-side (Turnstile/rate limit, ver §4.2).
Nenhum botão desabilitado, mensagem "em breve", feature flag remota, credencial ou infraestrutura
nova foi introduzida — a remoção é de renderização, resolvida em código, no mesmo PR. Regressão
estática em `src/routes/produto.$productId.public-surfaces.test.ts` garante que os três controles
não voltem a aparecer sem que o teste falhe primeiro.

O texto de erro dos três componentes (corrigido na rodada anterior para não implicar problema de
conexão) permanece no código-fonte como parte do estado dormente dos componentes — deixou de ser
alcançável por qualquer usuário, já que nada os renderiza mais nas rotas públicas.

## 5.3 Escalação de privilégio em `approve_submission` — achado ao vivo no rollout de staging (2026-07-30)

Depois da autorização do PMO/Founder para merge + rollout, `20260729210000_harden_helper_function_grants.sql`
foi aplicada em staging (`wjurqpclauwtbjhhvigy`). A verificação do passo 3 do plano de rollout
mostrou que `anon` e `authenticated` continuavam com `EXECUTE` direto nas três funções auxiliares
— a migration, que só fazia `REVOKE ALL ... FROM PUBLIC`, não teve o efeito esperado.

**Causa raiz:** Supabase concede `EXECUTE` explicitamente a `anon`/`authenticated`/`service_role`
na criação de toda função no schema `public`, via `ALTER DEFAULT PRIVILEGES` configurado pela
própria plataforma no provisionamento do projeto — fora do controle de versionamento deste
repositório. Esse grant é direto (papéis nomeados na ACL), não mediado pelo pseudo-role `PUBLIC`.
`REVOKE ... FROM PUBLIC` desfaz apenas o default SQL-padrão (que também existe, mas é redundante) —
nunca desfez o grant direto da plataforma.

**Por que isso é mais grave do que as três funções auxiliares:** `approve_submission(uuid)` —
`SECURITY DEFINER`, criada na Onda 1 (`20260727155843_approve_submission.sql`) com o mesmo padrão
`REVOKE ALL ... FROM PUBLIC` — é a única função que escreve em `prices` a partir de
`price_submissions`. Se ela estiver no mesmo estado (o que é o cenário mais provável, dado que usa
o padrão idêntico), **qualquer visitante anônimo poderia ter chamado
`POST /rest/v1/rpc/approve_submission` e aprovado sua própria sugestão de preço, sem passar pela
moderação — desde a Onda 1, incluindo em produção.** Nenhuma das cinco revisões adversariais
anteriores (nenhuma com acesso a banco vivo) detectou isso; a Revisão A afirmou explicitamente o
contrário (ver correção retroativa em `docs/security/ADVERSARIAL-REVIEW-ONDA-3.md`).

**Impacto real estimado: baixo, apesar da severidade do controle ausente.** Produção está
confirmada vazia (0 linhas em `markets`/`products`/`prices`) desde o fechamento da Onda 2 — não
havia sugestão de preço real para alguém aprovar indevidamente. O risco era estrutural (o controle
não existia), não um incidente com dado real comprometido.

**Corrigido:** `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql` — nova
migration, não destrutiva, não edita nenhuma das duas migrations já aplicadas — revoga
explicitamente `PUBLIC, anon, authenticated` nas quatro funções (as três auxiliares +
`approve_submission`) e reafirma `service_role`. Regressão estática nova
(`supabase/function-execute-grants.test.ts`) assume por padrão que toda função está **concedida**
a `anon`/`authenticated` até prova em contrário no próprio texto da migration — o oposto da
suposição que causou este ponto cego — e prova que um `REVOKE` que só nomeia `PUBLIC` não seria
suficiente.

**Consequência para o rollout:** a migration corretiva precisa ser aplicada em staging (e
verificada ao vivo de novo) antes de prosseguir para o deploy do Worker de staging, e em produção
antes do deploy de produção — nas mesmas janelas já documentadas em
`docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`, sem alterar a ordem/lógica do plano, só
adicionando esta terceira migration à lista.

## 6. Conclusão da Fase A (atualizada após o rollout completo, incluindo produção)

Merge, rollout de staging e rollout de produção **executados e concluídos** com autorização
explícita do PMO/Founder em cada gate (merge do PR #12, PR #13 com a correção crítica, aplicação
das três migrations em staging e produção, deploy do Worker em ambos, aprovação manual do
required reviewer para produção). O achado de maior severidade prática original desta Onda
(headers/CSP ausentes) foi corrigido e confirmado ao vivo em produção (CSP, HSTS,
X-Frame-Options, X-Content-Type-Options presentes). O achado que o PMO classificou como
bloqueante (escrita pública nas três tabelas) foi fechado e confirmado ao vivo em produção
(`INSERT` anônimo → `401` nas três). O ajuste seguinte do PMO (interface que sempre falha não é
aceitável) foi resolvido e confirmado ao vivo (nenhum dos três controles aparece nas rotas
públicas de produção). O achado mais severo de toda a Onda — escalação de privilégio via
`approve_submission` (§5.3) — foi corrigido e confirmado ao vivo em produção (`RPC` anônimo →
`401`; `EXECUTE` restrito a `postgres`/`service_role` nas quatro funções). Produção confirmada
vazia e DNS inalterado após o deploy. Um risco de governança foi registrado sem correção nesta
Onda: o GitHub Environment `production` permite `can_admins_bypass`, então o required reviewer
não é um controle absoluto contra um admin do próprio repositório (ver tabela de achados) —
decisão de restringir isso fica para o PMO/Founder, fora do escopo autônomo deste checkpoint. Não
resta nenhum item de severidade Média ou superior sem correção, sem confirmação ao vivo, ou sem
`NOT VERIFIED`/risco aceito explicitamente registrado.
