# Runbook de resiliência — backup, restore e RPO/RTO

**Onda:** 4 — Resiliência operacional (`PLANO-MESTRE.md` §12.3).
**Natureza:** runbook operacional. Passos marcados **[HUMANO]** dependem de acesso ao
painel do Supabase/Cloudflare ou de decisão do Founder/PMO e não foram executados por
esta Onda — documentados para execução quando autorizado, não simulados.

---

## 1. Inventário de dados a proteger

| Ativo                                                          | Onde vive                                                                                           | Mecanismo de backup hoje                                                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Schema (tabelas, RLS, policies, funções, grants)               | `supabase/migrations/*.sql`, versionado no Git                                                      | Git é o backup — reprodutível do zero, ver §4 (drill automatizado)                                                                 |
| Dados de negócio (`markets`, `products`, `prices`, submissões) | Postgres gerenciado pelo Supabase (staging `wjurqpclauwtbjhhvigy`, produção `wpgglxgddnekzojozqlm`) | Nenhum hoje (plano Free, confirmado) — ver §2 e §6                                                                                 |
| Código-fonte e workflows                                       | GitHub `samuel3ssilva/vipreco`                                                                      | Git (histórico completo) + branch protection em `main`                                                                             |
| Configuração de deploy (Worker)                                | `wrangler.json` gerado no build + nome do Worker                                                    | Reconstruído a cada deploy a partir do código versionado — não há estado a "perder" no Worker em si                                |
| Secrets (`CLOUDFLARE_API_TOKEN`, `SUPABASE_*`)                 | GitHub Environment secrets                                                                          | Fora do escopo de backup de dado — rotação/recuperação é procedimento de credencial, não de dado (ver `docs/security/` da Onda 1C) |

Produção está confirmada vazia desde o fechamento da Onda 2/3 (0 linhas em
`markets`/`products`/`prices`) — o risco de perda de dado real hoje é **zero**, mas o
runbook precisa estar pronto **antes** do Gate R0 liberar dado real, que é exatamente a
dependência que `PLANO-MESTRE.md` §10 registra.

## 2. RPO/RTO propostos

**Atualizado em 2026-07-30 (investigação pós-merge) — corrige a suposição original desta
seção, ver nota completa em §6.** `docs/security/THREAT-MODEL-ONDA-3.md`
(item 2 da lista de abusos) já registrava que o projeto está no **plano Free**. A
suposição original desta seção — de que o plano Free "oferece apenas backup diário
automático com retenção curta" — estava **errada**: confirmado contra a documentação
oficial da Supabase (`supabase.com/docs/guides/platform/backups`) que o **plano Free não
tem nenhum backup automático** — a própria Supabase recomenda que projetos Free exportem
dados manualmente via `supabase db dump` e mantenham backups externos. Backup diário
automático (7 dias de retenção) só existe a partir do **plano Pro** (US$ 25/mês); Team dá
14 dias; Enterprise dá até 30 dias. PITR (RPO de minutos) é add-on pago só em planos
Pro+, ~US$ 100/mês por 7 dias de retenção (US$ 200/14d, US$ 400/28d), e substitui o
backup diário quando ativado. Ver a nota de decisão completa em §6.

Proposta condicionada ao que for decidido em §6:

| Cenário                            | RPO real hoje                                                                               | RTO real hoje                                                                            | Depende de                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Plano Free (confirmado, é o atual) | **Nenhum backup automático — RPO é "tudo desde o último dump manual", que hoje não existe** | Indefinido — não há artefato de onde restaurar dado real hoje                            | Nenhuma ação de plano; só dump manual (ver §6, opção B) |
| Se migrar para Pro (backup diário) | Até 24h (janela entre backups diários)                                                      | Até 4h estimado (restaurar backup + redeploy do Worker) — não medido contra banco real   | Custo de US$ 25/mês, ver §6 opção C                     |
| Se adicionar PITR sobre o Pro      | Minutos (RPO quase contínuo)                                                                | Até 1h estimado — não medido contra banco real                                           | Custo adicional de US$ 100+/mês, ver §6 opção C         |
| Schema (independente do plano)     | Zero — está no Git                                                                          | Minutos (`bun run drill:schema-rebuild` prova reconstrução total, medido: ~12-16s em CI) | Nada — já automatizado nesta Onda                       |

Enquanto o piloto não tiver dado real (pré-Gate R0) e produção continuar confirmada
vazia, a ausência de backup automático no plano Free é um risco **aceito, não
ignorado**: não há transação financeira nem dado de participante em risco hoje. Esta
proposta é, explicitamente, um pré-requisito do Gate R0 (`PLANO-MESTRE.md` §10) — ver §6
para as alternativas concretas e qual delas o PMO/Founder escolhe antes de liberar dado
real.

## 3. Procedimento de restore

### 3.1 Automatizado — reconstrução de schema (feito nesta Onda)

```bash
bun run drill:schema-rebuild
```

Sobe um Postgres efêmero (Docker), simula o ponto cego de plataforma do Supabase
confirmado ao vivo na Onda 3 (grant automático de `EXECUTE` a `anon`/`authenticated` —
`scripts/db-drill/00-platform-baseline.sql`), aplica todas as migrations em ordem e
confirma as garantias de autorização contra o banco vivo resultante
(`scripts/db-drill/90-assertions.sql`). Roda também no CI
(`.github/workflows/db-schema-drill.yml`) a cada mudança em `supabase/migrations/**`.

**O que isso prova:** o schema é 100% reconstruível a partir do Git, e a reconstrução não
reintroduz nenhuma das falhas de autorização já corrigidas. **O que isso não prova:**
que um backup real de dado do Supabase restaura corretamente — isso só um restore real
comprova (§3.2).

### 3.2 Restore real de dado — **[HUMANO]**, não executado nesta Onda

**Atualizado em 2026-07-30:** confirmado que, no plano Free atual, **não existe backup
automático de onde restaurar** — o procedimento abaixo só é executável depois que uma
das alternativas do §6 for escolhida e aplicada (dump manual ou upgrade de plano). Não é
mais apenas uma questão de acesso ao painel — é a ausência do próprio artefato de
backup. Requer acesso ao painel do Supabase (Founder) e, dependendo do mecanismo
escolhido em §6, pode exigir custo (upgrade de plano) ou uma nova credencial (connection
string do Postgres, para dump manual). Procedimento a seguir quando autorizado:

1. Confirmar em `Project Settings → Database → Backups` a lista de backups disponíveis
   para o projeto de **staging** (nunca testar restore contra produção primeiro).
2. Disparar um restore de teste — o Supabase restaura para o mesmo projeto (offline
   durante a operação) ou permite clonar para um projeto novo, dependendo do plano;
   confirmar qual modelo está disponível antes de prosseguir.
3. Após o restore, rodar contra o projeto restaurado:
   - `bun run verify-env:staging` (confirma que a env aponta pro projeto certo);
   - as queries de `docs/security/DATABASE-AUTHORIZATION-MATRIX.md` (grants, RLS,
     `has_function_privilege` para `approve_submission`) — o restore precisa preservar
     as mesmas garantias de autorização, não só os dados;
   - conferir contagem de linhas em `markets`/`products`/`prices` contra o esperado.
4. Medir o tempo total (do clique em "restore" até a confirmação do passo 3) — essa
   medição real substitui o RTO proposto em §2 por um número observado.
5. Documentar o resultado (sucesso/falha, tempo, discrepância) em um adendo a este
   runbook — nunca declarar este passo concluído sem essa evidência.
6. **Nunca** executar o passo 2 contra o projeto de produção sem repetir com sucesso em
   staging primeiro e sem autorização explícita do Founder/PMO para a janela de teste.

### 3.3 Rollback de deploy do Worker (já coberto, registrado aqui por completude)

Não depende de restore de dado — é reconstrução de código. Redeploy do commit anterior
via `workflow_dispatch` dos workflows `deploy-staging.yml`/`deploy-production.yml`
usando o SHA desejado, mesmo padrão já usado nas Ondas 2 e 3
(`docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md`, seção de rollback).

## 4. Testes de falha realizados nesta Onda

| Teste                                                                         | Resultado                                                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Aplicar todas as migrations do zero contra Postgres efêmero                   | Passa — 7 migrations, autorização confirmada (ver `bun run drill:schema-rebuild`)                                                                                                    |
| Reverter a migration corretiva da Onda 3 (`20260730120000`) e rodar o drill   | Falha corretamente — reporta `EXECUTE` indevido em `anon`/`authenticated` nas 4 funções, prova que o drill detecta a exata classe de regressão que causou o achado crítico da Onda 3 |
| `check-uptime` com header de segurança ausente / status != 200 / erro de rede | Marca `ok=false` e identifica a causa em todos os três cenários (`scripts/check-uptime.test.ts`)                                                                                     |

## 5. O que fica pendente para o Founder/PMO

- Confirmar no painel (`Project Settings → Billing`) que ambos os projetos (staging e
  produção) seguem no plano Free — este CTO não teve sessão autenticada no painel nesta
  investigação (ver §6) e se apoiou no registro já feito na Onda 3
  (`docs/security/THREAT-MODEL-ONDA-3.md`), não numa nova checagem ao vivo.
- Escolher uma das quatro alternativas da nota de decisão em §6 antes do Gate R0.
- Revisitar o RPO/RTO proposto no §2 conforme a alternativa escolhida.
- Configurar alerting nativo do Cloudflare/Supabase no painel (e-mail/webhook), se
  desejado além do `uptime-check.yml` já implementado nesta Onda — configuração de
  conta, não código.

## 6. Nota de decisão — restore real do Supabase (investigação pós-merge, 2026-07-30)

**Mandato:** investigar autonomamente usando documentação oficial e leitura de painel
disponível, sem restaurar, criar projeto, contratar PITR, mudar de plano ou gerar custo.
**Painel:** sem sessão autenticada disponível nesta sessão (verificado —
`supabase.com/dashboard/...` redirecionou para a tela de login); investigação baseada
inteiramente na documentação oficial da Supabase (`supabase.com/docs/guides/platform/backups`,
`supabase.com/pricing`, consultadas nesta data).

### 6.1 O que existe no plano atual (Free, confirmado pela Onda 3)

| Pergunta                                 | Resposta                                                                                                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backup automático no Free?               | **Não existe nenhum.** A própria documentação da Supabase recomenda `supabase db dump` manual + backup externo para projetos Free                                                                     |
| Restore de teste exige upgrade?          | **Sim, na prática** — não há artefato de backup para restaurar hoje; upgrade de plano ou dump manual são pré-requisitos antes de qualquer restore ser possível                                        |
| Custo do Pro (backup diário, 7 dias)     | US$ 25/mês (inclui US$ 10/mês de crédito de compute, cobre uma instância Micro)                                                                                                                       |
| Custo de PITR sobre o Pro                | ~US$ 100/mês (7d) a ~US$ 400/mês (28d) — substitui o backup diário, não some com ele                                                                                                                  |
| Restore é in-place ou cria projeto novo? | **In-place — sobrescreve o projeto existente.** O projeto fica **totalmente inacessível** durante o restore, com downtime proporcional ao tamanho do banco                                            |
| Como testar sem arriscar o projeto real? | "Duplicate Project" (clonar o projeto para testar o restore na cópia) — documentado pela Supabase, mas não investigado a fundo (custo/disponibilidade da duplicação em si não confirmados nesta Onda) |
| Impacto em staging se testarmos lá       | Staging ficaria **totalmente fora do ar** durante o teste (mesmo comportamento do restore in-place) — não é uma operação "segura por padrão" só por não ser produção                                  |
| RPO/RTO realmente suportados             | RPO: 24h (Pro, backup diário) ou minutos (Pro+PITR). RTO: depende do tamanho do banco — **não documentado como número fixo pela Supabase**, só "quanto maior o banco, maior o downtime"               |
| Como voltar ao estado anterior           | Fazer downgrade de volta a Free (reversível, mas sem garantia de reembolso de mês já cobrado); nenhum outro efeito colateral documentado                                                              |

### 6.2 Alternativas

**A. Manter restore como `NOT VERIFIED`.**
Custo zero, ação zero. O risco aceito é: se produção precisar de restore real antes do
Gate R0 rever isso, não há nada para restaurar — mas produção está confirmada vazia, então
esse risco é hoje puramente teórico. Recomendado como _default_ até uma decisão
explícita do PMO/Founder.

**B. Executar um "restore gratuito".**
**Não existe, tecnicamente, um restore gratuito via painel** — o plano Free não tem
backup para restaurar. A alternativa mais próxima e genuinamente gratuita é um **dump
lógico manual** (`supabase db dump` ou `pg_dump` direto) seguido de um `pg_restore` de
teste — mas isso exige uma credencial que este CTO não tem hoje (connection string do
Postgres com senha, distinta da chave publishable já usada pela Data API) — ou seja,
mesmo essa opção precisaria de uma nova credencial, o que o mandato desta Onda também
não autoriza. **Não executável sem uma decisão adicional sobre credencial.**

**C. Contratar capacidade temporária (upgrade para Pro).**
Custo real: US$ 25/mês, cobrado por pelo menos um ciclo de faturamento (sem garantia de
reembolso proporcional em downgrade). Depois de pelo menos 24h no Pro (para o primeiro
backup diário existir), testar restore contra **staging**, nunca produção primeiro — e
aceitar que staging fica fora do ar durante o teste. Prova RTO real medido, não estimado.
Requer decisão de custo do PMO/Founder — fora do escopo autônomo desta Onda.

**D. Adiar até imediatamente antes do Gate R0.**
Consistente com `PLANO-MESTRE.md` §10, que já lista "Onda 4 com backup, restore, logs,
alertas e plano de incidente minimamente validados" como dependência do Gate R0 — não
exige, no texto do Plano Mestre, que o restore real já tenha sido exercitado nesta Onda,
apenas que o runbook exista e o risco esteja registrado (o que este documento cumpre).
Adiar a decisão de A/B/C não bloqueia o restante da Onda 4.

### 6.3 Recomendação

**D como caminho imediato, convergindo para C (ou A, se o Founder aceitar o risco)
explicitamente como gate de pré-requisito do Gate R0** — não antes. Não há dado real
hoje; gastar US$ 25+/mês agora para testar um restore que ainda não protege nada real
não é urgente. A decisão de qual alternativa vira definitiva deve ser revisitada como
parte da checklist do Gate R0, não nesta Onda.

**Nenhuma das alternativas foi executada.** Nenhum restore, criação de projeto, upgrade
de plano ou custo foi gerado por este CTO.
