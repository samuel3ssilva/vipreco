# Recomendação de governança — `can_admins_bypass` no Environment `production`

**Origem:** achado registrado (não corrigido) na Onda 3 —
`docs/security/THREAT-MODEL-ONDA-3.md`, tabela de achados, linha
"GitHub Environment `production` — `can_admins_bypass: true`". Investigado nesta Onda
por mandato explícito (`docs/governance/PROMPT-CTO_ONDA-4.md`, item 5).
**Ação tomada nesta Onda:** nenhuma alteração de configuração — apenas leitura (`gh api`,
permitido pela autonomia do CTO) e esta recomendação. Qualquer mudança real requer novo
gate humano, conforme o mandato.

---

## 1. Estado real confirmado ao vivo (2026-07-30, somente leitura)

```text
GET /repos/samuel3ssilva/vipreco/environments/production
  can_admins_bypass: true
  protection_rules:
    - branch_policy (deployment_branch_policy.custom_branch_policies = true)
    - required_reviewers:
        prevent_self_review: false
        reviewers: [samuel3ssilva]

GET /repos/samuel3ssilva/vipreco/environments/production/deployment-branch-policies
  branch_policies: [{ name: "main", type: "branch" }]

GET /repos/samuel3ssilva/vipreco/collaborators
  samuel3ssilva — admin: true (único colaborador do repositório)
```

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

**Procedimento:**

- Via UI (caminho confirmado disponível, já que o campo aparece no retorno da API):
  `Settings → Environments → production → Deployment protection rules → desmarcar
"Allow administrators to bypass configured protection rules"`.
- Via API — **NOT VERIFIED nesta Onda** (não testado ao vivo porque seria uma escrita
  em configuração protegida, fora do mandato autônomo): a documentação pública da API
  de Environments do GitHub não confirma, no momento desta análise, que
  `can_admins_bypass` seja um campo aceito pelo corpo de
  `PUT /repos/{owner}/{repo}/environments/{environment_name}` — pode ser um campo
  somente-leitura nessa API, ajustável apenas pela UI. **Antes de tentar via API,
  confirmar na documentação vigente do GitHub ou tentar num ambiente de teste** — não
  presumir que o `PUT` abaixo funciona sem essa checagem:

  ```bash
  # NOT VERIFIED — confirmar suporte do campo antes de executar
  gh api --method PUT repos/samuel3ssilva/vipreco/environments/production \
    -f can_admins_bypass=false
  ```

**Validação após a mudança (qualquer que seja o caminho usado):**

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

| Mudança                     | Recomendação    | Risco de travar o pipeline                                 | Quando revisitar                          |
| --------------------------- | --------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `can_admins_bypass: false`  | Fazer           | Nenhum (`prevent_self_review` continua `false`)            | Já pode ser feito                         |
| `prevent_self_review: true` | Não fazer agora | Alto — travaria todo deploy de produção com a equipe atual | Quando houver 2º colaborador de confiança |

Nenhuma das duas mudanças foi executada por este CTO — ambas dependem de decisão e
execução do Founder/PMO, conforme o mandato desta Onda.
