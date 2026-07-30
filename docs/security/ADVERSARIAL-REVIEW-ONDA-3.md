# Revisão adversarial independente — Onda 3

Duas revisões isoladas, cada uma feita por um agente sem conhecimento do raciocínio de
implementação — instruídas a tentar quebrar o trabalho, não confirmá-lo. Ambas rodaram
`git diff main..HEAD` por conta própria antes de começar, sem receber um resumo pré-mastigado
das mudanças.

## Revisão A — Banco e autorização

**Método:** leitura de todas as migrations em ordem, checagem cruzada com
`DATABASE-AUTHORIZATION-MATRIX.md` e `THREAT-MODEL-ONDA-3.md`, sem acesso a banco vivo.

**Item verificado como prioridade:** se `REVOKE ALL ... FROM PUBLIC` na nova migration
(`20260729210000_harden_helper_function_grants.sql`) quebra o trigger/índice funcional que usam
essas funções. **Conclusão independente: não quebra.** PostgreSQL verifica o privilégio de
`EXECUTE` em tempo de parse da DDL que referencia a função (`CREATE TRIGGER`/`CREATE INDEX`), não
a cada disparo do trigger nem a cada avaliação da expressão do índice funcional — a checagem não
é refeita para o role que executa o INSERT/UPDATE. Reforço independente: `anon`/`authenticated`
nunca tiveram INSERT/UPDATE em `products`/`prices`/`markets`, então mesmo o cenário mais
pessimista não os afetaria.

**Achados:** nenhum. RLS presente em todas as 6 tabelas, nenhuma policy permissiva demais,
nenhuma combinação perigosa de policies, nenhum `GRANT ALL` desnecessário, nenhuma sequence
com privilégio excessivo (não há sequences), `search_path` fixado em toda função,
`approve_submission` corretamente restrita a `service_role`. Toda alegação técnica dos dois
documentos de banco bateu com o SQL real.

**Veredito da Revisão A:** sem bloqueios. 0 CONFIRMED, 0 PLAUSIBLE além dos itens já rotulados
`NOT VERIFIED` pelos próprios documentos (owner do `approve_submission`, Storage, Auth do painel).

## Revisão B — Aplicação e borda

**Método:** leitura de `security-headers.ts`/teste, build real (`bun run build`) +
`wrangler dev` contra o build, inspeção de `.output/` por segredos/source maps, revisão dos
`permissions:` de workflow, revisão da lógica de `inert` do diálogo.

**Achados confirmados e corrigidos nesta Onda, em resposta direta à revisão:**

1. **Headers não cobriam assets estáticos.** O binding `ASSETS` do Cloudflare tem precedência de
   roteamento sobre o `fetch` handler do Worker — `/assets/*`, `/favicon.ico` e `/robots.txt`
   nunca passavam por `src/server.ts`, contradizendo a alegação "toda rota, todo ambiente" em
   `EDGE-SECURITY-POLICY.md`. Severidade avaliada como baixa (nenhuma página HTML é servida como
   asset estático, então CSP/framing continuam garantidos em todo documento navegável), mas real.
   **Corrigido:** `public/_headers` criado com `X-Content-Type-Options`, `Referrer-Policy`,
   `X-Frame-Options` e `Strict-Transport-Security` para `/*` — mecanismo nativo do Cloudflare para
   assets estáticos, confirmado que o Nitro mescla (não sobrescreve) com a regra de cache que ele
   já gera. Documentação corrigida para não alegar cobertura além do que é real. Reverificado por
   `fetch` real contra `/favicon.ico` e `/robots.txt` via `wrangler dev` — headers presentes.
2. **`verify-env.ts` validava o par errado para o cenário que deveria prevenir.** O bundle do
   navegador é montado a partir de `VITE_SUPABASE_URL`/`VITE_SUPABASE_PROJECT_ID`
   (`src/integrations/supabase/client.ts` prioriza `import.meta.env.VITE_*`), mas
   `findCrossEnvironmentMismatch` só comparava `SUPABASE_PROJECT_ID` (sem prefixo). Uma edição
   manual de `.env.production` que atualizasse só o par server-side passaria por todas as
   checagens com "OK" enquanto o frontend publicado apontaria para o ambiente errado. Mitigado na
   prática porque os workflows de CI escrevem os dois pares a partir do mesmo secret — mas a
   checagem deveria proteger contra edição manual também, que é o cenário real que motivou o
   script (o próprio incidente da Onda 2 foi uma edição manual de `.env.production`).
   **Corrigido:** nova função `findServerPublicVarDrift` compara `VITE_SUPABASE_URL` com
   `SUPABASE_URL` e `VITE_SUPABASE_PROJECT_ID` com `SUPABASE_PROJECT_ID`, falha fechado se
   divergirem. Testado (3 novos casos) e reverificado contra os `.env`/`.env.production` locais
   reais — ambos continuam `OK`.

**Achados sem ação necessária (avaliados e descartados):**

- `unsafe-inline` em CSP: percorrida diretiva por diretiva: nenhum caminho de injeção de
  `<script src="https://evil.example">` existe hoje; único `dangerouslySetInnerHTML` do
  código é em componente shadcn morto (`chart.tsx`), sem call site.
- `inert` do diálogo: confirmado que nunca é aplicado ao próprio `SubmitPriceForm` (só a
  `header`/`nav`/conteúdo de página ao redor dele) e que sempre é liberado via `onClose`
  (Cancelar, X, Escape) — sem caminho de ficar preso.
- Honeypot/cap client-side: gap real e já documentado honestamente no threat model como item de
  checkpoint humano, não uma falsa sensação de segurança silenciosa.
- Bundle: nenhum source map, nenhum valor de `service_role`/`sb_secret_` real (só menções em
  comentário de biblioteca vendida).
- `permissions:` dos workflows: mínimos e suficientes, nenhum deploy quebraria por falta de
  permissão.
- CORS: não aplicável — o navegador fala direto com o Supabase, fora do controle deste repo.

**Veredito da Revisão B:** 2 CONFIRMED, ambos corrigidos nesta mesma Onda (não ficaram como
pendência para o checkpoint); 0 achados sem correção.

## Conclusão da primeira rodada

As duas revisões adversariais, juntas, encontraram dois gaps reais e específicos (cobertura de
headers em assets estáticos; validação incompleta de deriva de variável de ambiente) — nenhum
deles bloqueante isoladamente, ambos corrigidos antes deste documento ser finalizado. Nenhuma
revisão encontrou bypass de RLS, escalação de privilégio, XSS explorável, vazamento de segredo,
ou falsa sensação de segurança não documentada. `bun run lint && bun run test && bun run build`
e `verify-env:staging`/`verify-env:production` seguem verdes após as duas correções.

## Segunda rodada — checkpoint do PMO (fechamento das 3 tabelas de escrita pública)

O PMO classificou como bloqueante o achado de escrita pública nas três tabelas
(`price_submissions`, `product_watch_requests`, `decision_feedback`) e pediu uma migration de
fechamento. Depois de aplicada (`20260729223000_close_public_write_surfaces.sql`), duas novas
revisões adversariais independentes foram feitas, focadas exclusivamente nesse commit.

### Revisão A2 — o fechamento é realmente hermético?

Leu todas as 6 migrations em ordem para confirmar que `REVOKE INSERT` é o único privilégio que
precisava ser revogado (não havia `SELECT`/`UPDATE`/`ALL`/grant de coluna concedido a
`anon`/`authenticated` nessas três tabelas em nenhuma migration anterior), que nenhuma função
`SECURITY DEFINER` toca `product_watch_requests`/`decision_feedback`, e que o rollout plan não
abre uma janela de inconsistência entre deploy do Worker e aplicação da migration.

**Achado confirmado:** o teste estático (`resolveInsertGrant`) resolvia o grantee comparando o
nome do role em qualquer lugar do statement — um `GRANT ... TO PUBLIC` futuro hipotético (que no
Postgres reabre acesso para `anon`/`authenticated` também) não seria pego pelo regex, apesar do
commit alegar que o teste "falha se qualquer migration futura reabrir o INSERT sem intenção".
**Corrigido** no mesmo commit de resposta: `resolveInsertGrant` agora extrai só a cláusula de
grantees (depois de `TO`/`FROM`) e trata `PUBLIC` como equivalente a qualquer role nomeado; novo
teste prova o comportamento contra um `GRANT ... TO PUBLIC` sintético.

**Veredito A2:** o fechamento em si é hermético contra o estado atual do banco (0 outros
privilégios, 0 caminho via RPC). O único gap era de robustez futura do teste, já corrigido.

### Revisão B2 — a documentação e a UI são honestas sobre a consequência?

**Achado confirmado (severidade média):** `SubmitPriceForm.tsx` mostrava "Verifique sua conexão e
tente novamente" quando a causa real do erro (depois desta migration) é um bloqueio de permissão
deliberado e permanente — não rede. `DecisionFeedback`/`registerWatchRequest` diziam "tente
novamente", implicando que retry ajudaria, quando na verdade a ação está fechada até uma decisão
de produto. **Corrigido:** as três mensagens reescritas para linguagem honesta ("não estamos
aceitando/registrando... no momento"), sem implicar problema transitório e sem remover a UI
(decisão de produto separada).

**Achado confirmado (severidade baixa-média):** `THREAT-MODEL-ONDA-3.md` §3 ainda descrevia as
três tabelas como "protegidas por RLS `WITH CHECK` + honeypot no frontend" — desatualizado depois
do fechamento, mesmo com `DATABASE-AUTHORIZATION-MATRIX.md` já correto. **Corrigido:** §3
atualizada, nova §5.2 registra explicitamente a consequência de produto (os três controles
continuam na UI e sempre falham) diretamente no threat model, não só na matriz de banco.

**Verificado e correto, sem ação:** a migration não cria Turnstile, credencial ou rate limiter
(conforme pedido); as policies das três tabelas continuam definidas e documentadas como
dormentes via `COMMENT ON TABLE`; o teste estático é honesto sobre ser uma checagem textual, não
uma verificação de banco vivo (aponta explicitamente para o plano de rollout onde a verificação
viva acontece).

**Veredito B2:** 2 CONFIRMED, ambos corrigidos na mesma resposta.

## Terceira rodada — segundo ajuste do PMO (não renderizar os 3 controles fechados)

O PMO considerou que fechar o banco e só corrigir o texto de erro não bastava: uma interface que
sempre falha não é um estado final aceitável. Depois de remover a renderização de
`SubmitPriceForm`, `DecisionFeedback`, `registerWatchRequest` (botão "Quero acompanhar") e o botão
"Informar atualização" do `PriceCard`, uma revisão adversarial independente foi feita, focada
exclusivamente nesse commit, com instrução explícita de tentar refutar (não confirmar) quatro
afirmações específicas do PMO.

**Método:** agente sem conhecimento prévio da conversa, leitura completa de
`src/routes/produto.$productId.tsx` e `src/components/PriceCard.tsx`, grep de todo `src/` por
`SubmitPriceForm`, `DecisionFeedback`, `registerWatchRequest`, `onReport` e pelos três nomes de
tabela, checagem cruzada de todas as outras rotas públicas (`index.tsx`, `buscar.tsx`,
`como-funciona.tsx`, `__root.tsx`), confirmação de que a migration de fechamento e seu teste não
foram tocados neste commit, e execução independente de `bun run lint`/`test`/`build`.

**As quatro afirmações do PMO, verificadas:**

1. **Nenhuma entrada pública visível — CONFIRMED.** Nenhuma rota renderiza os três controles;
   a string "Informar atualização" só aparece como prosa em `como-funciona.tsx`, não como botão.
2. **Nenhum caminho alternativo no frontend — CONFIRMED.** Grep completo de `src/` não encontrou
   nenhuma segunda rota, painel de debug ou uso indireto dos componentes/callback fechados.
3. **Escrita direta bloqueada — CONFIRMED.** O commit não tocou
   `20260729223000_close_public_write_surfaces.sql` nem seu teste; os 9 testes de bloqueio de
   INSERT continuam passando.
4. **Nenhuma regressão de leitura — CONFIRMED.** Nenhum estado/import órfão (`showForm`,
   `reportMarketId`, `watched`, `watchStatus`, `BellRing`, `Flag`, `hasWatched`, `markWatched`);
   `lint`/`test`/`build` verdes de forma independente.

**Achado confirmado (severidade média) — lacuna de cobertura do teste, não do código:** o teste
estático original (`produto.$productId.public-surfaces.test.ts`) só lia dois arquivos fixos
(`produto.$productId.tsx`, `PriceCard.tsx`). Uma regressão futura que reintroduzisse os mesmos
controles em outra rota (ex.: uma nova `src/routes/mercado.$id.tsx`) ou uma chamada
`.insert("price_submissions", …)` ad hoc fora de `src/services/catalog.ts` não seria pega.
**Corrigido** no mesmo commit de resposta: o teste agora varre recursivamente todo `src/`
(`ts`/`tsx`), checando em todo arquivo — não só nos dois originalmente tocados — ausência de
import/JSX dos dois componentes fechados, ausência de chamada a `registerWatchRequest`, e ausência
de qualquer `.insert(...)`/`.from(...)` direto nas três tabelas fora de `src/services/catalog.ts`
(o único ponto de acesso a dados autorizado, ver `CLAUDE.md`). O reviewer observou corretamente que
um rótulo de botão reescrito (ex. "Sugerir preço" em vez de "Informar preço") ainda escaparia da
checagem de string — limitação aceita, já que a checagem estrutural (import/JSX/chamada) é o que
detecta reintrodução funcional real; rótulo reescrito sem reintroduzir a função não representa o
risco que este checkpoint fecha.

**Veredito da terceira rodada:** 4/4 afirmações do PMO confirmadas, 1 achado de robustez de teste
confirmado e corrigido. Nenhum bypass de RLS, nenhum caminho de escrita alternativo, nenhuma
regressão de leitura.

## Correção retroativa à Revisão A — achado ao vivo no rollout de staging (2026-07-30)

A Revisão A (primeira rodada, §"Banco e autorização") afirmou, com convicção: *"`approve_submission`
corretamente restrita a `service_role`"* e concluiu 0 achados sobre os grants de função. **Essa
conclusão estava errada**, e o motivo é o mesmo em toda a análise até este ponto: nenhuma revisão,
em nenhuma rodada, teve acesso a um banco Postgres vivo (Docker indisponível durante toda a Onda 3)
para checar `information_schema.role_routine_grants` de verdade. A hipótese de que
`REVOKE ALL ... FROM PUBLIC` bastava foi validada só por leitura de SQL e por raciocínio sobre o
comportamento padrão do Postgres — nunca contra o comportamento real de um projeto Supabase.

Ao aplicar `20260729210000_harden_helper_function_grants.sql` em staging durante o rollout
autorizado, a verificação do passo 3 do plano mostrou `anon` e `authenticated` ainda com `EXECUTE`
direto nas três funções auxiliares — a migration não teve o efeito que toda a documentação (e a
Revisão A) presumia. Investigando a causa: o Supabase concede `EXECUTE` a `anon`/`authenticated`
de forma explícita e direta na criação de toda função (via `ALTER DEFAULT PRIVILEGES` de
plataforma, fora do nosso versionamento) — um mecanismo diferente do default `PUBLIC` do SQL
padrão, e que `REVOKE ... FROM PUBLIC` não desfaz.

Isso significa que **`approve_submission(uuid)` — `SECURITY DEFINER`, criada na Onda 1 com o mesmo
padrão `REVOKE ALL ... FROM PUBLIC` — muito provavelmente estava no mesmo estado em produção desde
então**: `anon`/`authenticated` com `EXECUTE` direto, permitindo (em teoria) que qualquer visitante
anônimo aprovasse sua própria sugestão de preço via RPC, sem passar pela moderação. Nenhum dado
real existe em produção (confirmado vazio desde o fechamento da Onda 2), então o impacto prático
até agora é baixo — mas o controle em si esteve ausente, sem que nenhuma das cinco revisões
adversariais anteriores (incluindo a própria Revisão A) o detectasse.

**Corrigido:** `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql` revoga
explicitamente de `PUBLIC, anon, authenticated` nas quatro funções (as três auxiliares +
`approve_submission`). Nova regressão estática (`supabase/function-execute-grants.test.ts`) assume
por padrão que toda função está **concedida** a `anon`/`authenticated` até prova em contrário —
invertendo a suposição otimista que causou este ponto cego — e prova que um `REVOKE` que só nomeia
`PUBLIC` não seria suficiente. `docs/security/DATABASE-AUTHORIZATION-MATRIX.md` atualizada com a
correção completa.

**Lição estrutural, não só um bug pontual:** todas as afirmações de segurança deste projeto que
dependem de estado de banco (grants, RLS, policies) e que **não foram verificadas contra um banco
vivo** devem ser tratadas como hipóteses, não fatos — mesmo quando o raciocínio sobre o SQL parece
correto. `THREAT-MODEL-ONDA-3.md` §5.1 e o plano de rollout já continham a verificação viva como
prática — este achado é a prova de por que ela é indispensável, não apenas boa prática.

## Conclusão final (atualizada após o achado ao vivo do rollout)

Cinco revisões adversariais no total (três rodadas) mais um achado ao vivo durante o rollout
autorizado de staging (não uma sexta revisão adversarial formal, mas uma verificação real contra
banco vivo que nenhuma revisão anterior pôde fazer) — oito achados confirmados no total, todos
corrigidos. A escalação de privilégio via `approve_submission` (ver seção acima) é o achado mais
severo de toda a Onda 3, e só foi descoberto porque o rollout aplicou a migration em staging e
verificou o resultado real, não porque uma revisão de código o previu. Nenhuma revisão encontrou
bypass de RLS, XSS explorável ou vazamento de segredo; a escalação de privilégio encontrada foi via
grant de função, não via RLS. `bun run lint && bun run test` (88 testes) `&& bun run build` e
`verify-env:staging`/`verify-env:production` seguem verdes.
