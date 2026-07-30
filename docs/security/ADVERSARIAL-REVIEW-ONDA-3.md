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

## Conclusão

As duas revisões adversariais, juntas, encontraram dois gaps reais e específicos (cobertura de
headers em assets estáticos; validação incompleta de deriva de variável de ambiente) — nenhum
deles bloqueante isoladamente, ambos corrigidos antes deste documento ser finalizado. Nenhuma
revisão encontrou bypass de RLS, escalação de privilégio, XSS explorável, vazamento de segredo,
ou falsa sensação de segurança não documentada. `bun run lint && bun run test && bun run build`
e `verify-env:staging`/`verify-env:production` seguem verdes após as duas correções.
