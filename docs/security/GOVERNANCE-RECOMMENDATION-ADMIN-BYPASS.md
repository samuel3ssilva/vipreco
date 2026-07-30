# Recomendação de governança — `can_admins_bypass` no Environment `production`

**Origem:** achado registrado (não corrigido) na Onda 3 —
`docs/security/THREAT-MODEL-ONDA-3.md`, tabela de achados, linha
"GitHub Environment `production` — `can_admins_bypass: true`". Investigado nesta Onda
por mandato explícito (`docs/governance/PROMPT-CTO_ONDA-4.md`, item 5).
**Ação tomada nesta Onda:** nenhuma alteração de configuração — apenas leitura (`gh api`,
permitido pela autonomia do CTO), esta recomendação, e a confirmação de que a mudança em
si **não é executável por API/CLI** (ver §3.1 atualizado). Autorização do PMO/Founder
recebida em 2026-07-30 para aplicar exclusivamente `can_admins_bypass: false` — não
aplicada porque o mecanismo autorizado (leitura + escrita mínima e verificável via `gh
api`) não existe para este campo. Bloqueio material reportado, conforme instruído.

---

## 1. Snapshot completo do Environment `production` — ANTES de qualquer mudança

Capturado às 2026-07-30 14:2x UTC (mesma sessão, imediatamente antes da tentativa de
mudança), via `gh api`, somente leitura:

```text
GET /repos/samuel3ssilva/vipreco/environments/production
  id: 18966445813
  created_at: 2026-07-29T18:03:53Z
  updated_at: 2026-07-29T18:03:53Z
  can_admins_bypass: true
  protection_rules:
    - { id: 61244214, type: "branch_policy" }
    - { id: 61244246, type: "required_reviewers",
        prevent_self_review: false,
        reviewers: [{ type: "User", login: "samuel3ssilva" }] }
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true }

GET /repos/samuel3ssilva/vipreco/environments/production/deployment-branch-policies
  total_count: 1
  branch_policies: [{ id: 55957936, name: "main", type: "branch" }]

GET /repos/samuel3ssilva/vipreco/environments/production/secrets
  total_count: 4
  names: [CLOUDFLARE_API_TOKEN, SUPABASE_PROJECT_ID, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL]
  (nomes apenas — nenhum valor lido ou exposto)

GET /repos/samuel3ssilva/vipreco/environments/production/variables
  total_count: 0

GET /repos/samuel3ssilva/vipreco/collaborators
  samuel3ssilva — admin: true (único colaborador do repositório)
```

Este snapshot é idêntico ao capturado na primeira leitura desta Onda (registrado em §2
abaixo) — nada mudou entre as duas leituras, confirmando que nenhuma ação nesta sessão
alterou o Environment antes da tentativa de escrita descrita em §3.1.

## 2. Impacto real, não hipotético

O achado da Onda 3 descrevia o risco em abstrato ("um admin pode pular o required
reviewer"). Com o estado confirmado acima, o impacto concreto hoje é:

- **`samuel3ssilva` é, ao mesmo tempo, o único colaborador do repositório, o único
  admin e o único required reviewer.** Não existe uma segunda identidade que um admin
  "malicioso" precisaria contornar — o "atacante" e o "aprovador" seriam a mesma pessoa
  em qualquer cenário.
- Isso significa que **`can_admins_bypass: true` hoje não abre uma porta que não
  estivesse, na prática, já aberta por outro caminho**: mesmo com `can_admins_bypass:
false`, `prevent_self_review: false` permitiria ao Founder aprovar sua própria
  solicitação de deploy — ele nunca ficaria bloqueado.
- O valor real de desligar `can_admins_bypass` **não é impedir um ataque hoje** (não há
  um segundo ator a se proteger). É **reintroduzir a pausa deliberada de aprovação** que
  o required reviewer deveria garantir — hoje, o bypass de admin faz o deploy de
  produção prosseguir **sem nenhum clique de confirmação**, o que a Onda 2 já observou
  acontecer na prática (run `30500447097`, completou sem pausar). Um clique deliberado de
  "aprovar" é uma proteção contra automação/engano (ex.: `workflow_dispatch` disparado
  por engano, ou por script), não contra um segundo agente malicioso — que não existe
  hoje neste repositório.

## 3. Recomendação

### 3.1 Desligar `can_admins_bypass` — recomendado

**Prioridade:** baixa urgência (nenhuma exploração ativa possível hoje, dado o item 2
acima), mas baixo custo e sem efeito colateral negativo — recomendado fazer no próximo
checkpoint humano disponível.

**Por quê é seguro fazer agora:** com `prevent_self_review: false` inalterado, o Founder
continua podendo aprovar sua própria solicitação de deploy — a mudança não pode travar o
pipeline (não há como ficar esperando uma aprovação que nunca chega). O único efeito é
que o deploy de produção passa a **pausar e esperar um clique explícito de aprovação**
em vez de prosseguir direto.

**Procedimento — BLOQUEIO CONFIRMADO, não executável por este CTO:**

Autorização recebida do PMO/Founder em 2026-07-30 para aplicar exatamente esta mudança,
preservando todo o resto do Environment. Antes de qualquer escrita, confirmei na
documentação oficial da API de Environments do GitHub
(`PUT /repos/{owner}/{repo}/environments/{environment_name}`) quais campos o corpo da
requisição aceita: **apenas `wait_timer`, `prevent_self_review`, `reviewers` e
`deployment_branch_policy`. `can_admins_bypass` não está entre eles — não é um campo
aceito por essa API, em nenhuma forma (nem isoladamente, nem como parte de um objeto
substituído por inteiro).** Não existe, portanto, nenhuma chamada seguro-de-verificar
(`gh api`, REST, GraphQL documentado) que eu possa emitir para alternar esse campo —
não é uma questão de risco de sobrescrever outras propriedades por engano (o que o
mandato pediu para eu evitar), é a ausência total de um mecanismo programático.

O único caminho existente é a **UI web do GitHub**, autenticada como o Founder:
`Settings → Environments → production → Deployment protection rules → desmarcar
"Allow administrators to bypass configured protection rules"`. Isso exige um clique
humano — nenhuma sessão de CLI/API que este CTO tem acesso realiza essa ação.

**Reportado como bloqueio material, conforme instruído.** Nenhuma tentativa de escrita
foi feita. O snapshot de §1 permanece válido como o estado atual, inalterado.

**Validação após a mudança (a ser feita pelo Founder, ou por este CTO em sessão
seguinte, por leitura apenas):**

```bash
gh api repos/samuel3ssilva/vipreco/environments/production --jq '.can_admins_bypass'
# esperado: false
```

Em seguida, disparar `workflow_dispatch` do `deploy-production.yml` uma vez (ou
observar o próximo deploy real) e confirmar que o run **pausa** aguardando aprovação do
required reviewer, em vez de prosseguir direto — essa é a prova funcional de que a
mudança teve efeito.

**Rollback:** marcar a mesma caixa de volta na UI (ou repetir o `PUT` com
`can_admins_bypass=true`, se confirmado que o campo é aceito). Sem efeito colateral —
reversível a qualquer momento, não afeta dado, deploy já feito ou histórico.

### 3.2 `prevent_self_review` — recomendação: **não mudar agora**

Mudar para `true` **deixaria o pipeline de deploy de produção travado
permanentemente**: o único required reviewer é o próprio Founder, que é também quem
dispara o deploy — com self-review bloqueado e nenhum segundo reviewer cadastrado,
nenhuma aprovação futura seria possível até adicionar um segundo colaborador de
confiança como reviewer. Revisitar esta recomendação quando (e somente quando) houver
uma segunda pessoa com acesso ao repositório que possa exercer o papel de reviewer.

## 4. Resumo para o checkpoint

| Mudança                     | Recomendação    | Risco de travar o pipeline                                 | Executável por API/CLI?                                        |
| --------------------------- | --------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| `can_admins_bypass: false`  | Fazer           | Nenhum (`prevent_self_review` continua `false`)            | **Não — confirmado.** Só pela UI web, requer clique do Founder |
| `prevent_self_review: true` | Não fazer agora | Alto — travaria todo deploy de produção com a equipe atual | Sim, via API — mas não recomendado agora                       |

Nenhuma das duas mudanças foi executada por este CTO. A primeira foi autorizada pelo
Founder/PMO nesta Onda, mas não pôde ser aplicada por este CTO — não por falta de
autorização, e sim porque o mecanismo que a aplicaria (API/CLI) não expõe esse campo.
Requer o Founder acessar `Settings → Environments → production` e desmarcar a opção
manualmente. A segunda continua não recomendada, independentemente de quem execute.
