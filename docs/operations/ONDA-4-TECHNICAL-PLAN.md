# Onda 4 — Resiliência operacional — plano técnico executável

**Mandato:** `docs/governance/PROMPT-CTO_ONDA-4.md`, autorizado pelo PMO/Founder em
2026-07-30, imediatamente após o merge do PR #14 (`main` em `8bbb50c`).
**Escopo oficial:** `PLANO-MESTRE.md` §12.3 — backups, restore real, RPO/RTO iniciais,
logs e alertas, plano de incidente, testes de falha, runbooks mínimos.
**Fronteira desta Onda:** tudo abaixo é implementável em branch, local, reversível, sem
custo novo, sem credencial adicional, sem alteração de DNS, sem dado real e sem tocar em
produção ou nas configurações protegidas do GitHub (Environments/secrets). Onde a Onda 4
exige uma ação real contra a infraestrutura viva (restore de fato, config de Alerting do
Cloudflare/Supabase, `can_admins_bypass`), este documento entrega o procedimento
executável e a validação, mas marca a execução como bloqueio humano — não simula um
resultado que não foi obtido.

---

## 1. O que esta Onda propõe resolver, e por quê

A Onda 3 encontrou, ao vivo, um achado crítico (`approve_submission` exposto a
`anon`/`authenticated` desde a Onda 1 — `docs/security/THREAT-MODEL-ONDA-3.md` §5.3) que
nenhuma das cinco revisões estáticas anteriores detectou, porque nenhuma rodou contra um
banco vivo. A lição direta para a Onda 4: **resiliência não pode ser só documentação — o
que for automatizável sem tocar em produção deve ser automatizado e verificado contra um
sistema vivo (ainda que efêmero e local).** É o fio condutor das quatro peças abaixo.

## 2. Critérios objetivos de conclusão

| #   | Critério                                                                                                                                              | Como se prova                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Migrations reconstroem o schema do zero, com as garantias de autorização da Onda 3 confirmadas contra um banco vivo (não apenas o texto da migration) | `bun run drill:schema-rebuild` verde localmente e no workflow `db-schema-drill.yml`                       |
| 2   | RPO/RTO propostos e documentados, condicionados ao mecanismo de backup real do Supabase                                                               | `docs/operations/RESILIENCE-RUNBOOK.md` §2, com o que é `NOT VERIFIED` marcado explicitamente             |
| 3   | Monitoramento de disponibilidade ativo no repositório, com caminho de alerta funcional                                                                | `.github/workflows/uptime-check.yml` + `scripts/check-uptime.ts` testado (`scripts/check-uptime.test.ts`) |
| 4   | Plano de resposta a incidente documentado (papéis, severidade, detecção, comunicação, postmortem)                                                     | `docs/operations/INCIDENT-RESPONSE-PLAN.md`                                                               |
| 5   | Runbook de backup/restore documentado, incluindo os passos manuais que só o Founder pode executar no painel do Supabase                               | `docs/operations/RESILIENCE-RUNBOOK.md` §3                                                                |
| 6   | Recomendação concreta para `can_admins_bypass: true`, sem execução                                                                                    | `docs/security/GOVERNANCE-RECOMMENDATION-ADMIN-BYPASS.md`                                                 |
| 7   | `bun run lint && bun run test && bun run build` com saída zero; CI e (quando aplicável) CodeQL verdes no(s) PR(s)                                     | Evidência de execução local + link do run de CI                                                           |
| 8   | Nenhum item marcado `[x]`/"concluído" sem validação; nenhum dado real; nenhuma alteração em produção, DNS ou Environment                              | Revisão do diff antes do commit                                                                           |

A Onda 4 só é considerada **pronta para decisão de merge** quando os 8 critérios acima
estiverem satisfeitos. Ela não é considerada **encerrada** até o PMO/Founder decidir o
merge — mesma regra aplicada às Ondas 2 e 3.

## 3. Riscos considerados

| Risco                                                                                                                           | Mitigação                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Simular o provisionamento do Supabase em Postgres vanilla diverge do comportamento real da plataforma                           | `scripts/db-drill/00-platform-baseline.sql` reproduz especificamente o ponto cego **confirmado ao vivo** na Onda 3 (grant direto de `EXECUTE` a `anon`/`authenticated` via `ALTER DEFAULT PRIVILEGES`, fora do controle de versionamento) — não uma suposição nova. Testado no sentido positivo (migrations atuais passam) e no negativo (reverter a migration corretiva faz o drill falhar exatamente como esperado, verificado manualmente durante esta implementação) |
| Workflow de uptime gerar ruído (issue nova a cada falha)                                                                        | Reusa uma única issue rotulada `incidente` (comenta/reabre em vez de duplicar); fecha automaticamente quando a checagem volta a passar                                                                                                                                                                                                                                                                                                                                   |
| Workflow de uptime falhar por instabilidade transitória de rede, gerando alerta falso                                           | Timeout de 10s por host, sem retry automático — aceito como risco residual de baixo custo; retry adicionaria complexidade não pedida pelo escopo desta Onda. Se gerar ruído na prática, ajustar é tarefa de manutenção, não bloqueio                                                                                                                                                                                                                                     |
| Restore real de backup do Supabase não pode ser testado sem acesso ao painel (Founder) ou sem criar infraestrutura nova (custo) | Documentado como bloqueio humano explícito em `RESILIENCE-RUNBOOK.md` §3, com o procedimento exato a seguir quando autorizado — não simulado, não declarado concluído                                                                                                                                                                                                                                                                                                    |
| `can_admins_bypass` — qualquer mudança de Environment é gate humano                                                             | Nenhuma alteração feita; documento de recomendação inclui comando exato (`gh api`), impacto e rollback, mas a execução fica para o PMO/Founder                                                                                                                                                                                                                                                                                                                           |
| Novo workflow agendado consumir minutos de GitHub Actions                                                                       | Ver estimativa de consumo mensal no §3.1 abaixo — nenhum custo novo                                                                                                                                                                                                                                                                                           |

### 3.1 Estimativa de consumo mensal do `uptime-check.yml`

`samuel3ssilva/vipreco` é um **repositório público** (confirmado via
`gh repo view --json visibility` nesta Onda) — GitHub Actions em runners hospedados pela
GitHub são **gratuitos e ilimitados para repositórios públicos**, independente do
consumo. O custo mensal real de rodar este workflow é **zero**, hoje.

Estimativa de tempo de execução, registrada para o caso de o repositório se tornar
privado no futuro (aí sim entraria na cota paga de minutos/mês da conta):

| Etapa | Tempo observado/estimado |
| ----- | ------------------------- |
| Checkout + Setup Bun | ~5-10s (observado em `ci.yml`/`db-schema-drill.yml`) |
| `bun install --frozen-lockfile` | ~1-2s (observado no job `lint, test, build` do PR #15) |
| `bun scripts/check-uptime.ts` (2 requisições HTTP, timeout de 10s cada) | 1-10s, tipicamente < 2s |
| **Total por execução** | **~30s** (estimativa conservadora, com margem para cold start do runner) |
| Execuções por mês (cron `0 */6 * * *`, 30 dias) | 120 |
| **Minutos de Actions por mês** | **~60 min/mês** (arredondado para cima — GitHub Actions cobra em minutos inteiros por execução) |

Mesmo se o repositório virasse privado, 60 min/mês fica muito abaixo da cota gratuita
mensal do plano Free de contas pessoais do GitHub (2.000 min/mês). O ponto central,
porém, é que hoje **este consumo não é cobrado de forma alguma**, por o repositório ser
público.

## 4. Testes

| Componente                      | Teste                                                                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Drill de reconstrução de schema | `scripts/db-drill/run.sh` — integração real (Docker + Postgres efêmero), roda local e em `db-schema-drill.yml`                |
| Checagem de uptime              | `scripts/check-uptime.test.ts` — unitário, `fetch` mockado, cobre 200+headers OK, header ausente, status != 200, erro de rede |
| Regressão geral                 | `bun run lint && bun run test && bun run build` sem saída — mesma barra de qualidade das Ondas anteriores                     |

## 5. Ordem de implementação

1. Registrar mandato (`docs/governance/PROMPT-CTO_ONDA-4.md`) — feito.
2. Este plano técnico — feito.
3. Drill de reconstrução de schema (script + workflow) — feito, validado nos dois sentidos (passa hoje; falha se a correção da Onda 3 for revertida).
4. Checagem de uptime/alerta (script + teste + workflow agendado) — feito.
5. Runbooks operacionais (`RESILIENCE-RUNBOOK.md`, `INCIDENT-RESPONSE-PLAN.md`).
6. Recomendação sobre `can_admins_bypass` (sem execução).
7. `bun run lint && bun run test && bun run build`.
8. Revisão do diff, commits descritivos, abertura de PR(s), checkpoint humano consolidado.

## 6. Fora do escopo desta Onda (registrado, não ignorado)

- **Restore real de um backup do Supabase** — depende do painel (ação do Founder) e,
  dependendo do plano contratado, pode ser uma decisão de custo (PITR é recurso pago em
  planos acima do Free). Ver `RESILIENCE-RUNBOOK.md` §3 para o procedimento exato a seguir
  quando autorizado.
- **Alerting nativo do Cloudflare/Supabase** (e-mail/webhook configurado no painel) — é
  configuração de conta, não código; documentado como recomendação operacional, não
  executado.
- **Mudança em `can_admins_bypass`** — gate humano explícito no mandato desta Onda.
- Qualquer item da trilha de produto ou dado real — permanece bloqueado pelo Gate R0
  (`PLANO-MESTRE.md` §10), que continua exigindo a Onda 4 "minimamente validada", não
  necessariamente com o restore real já exercitado — essa é uma leitura para o PMO/Founder
  confirmar no checkpoint final, não uma decisão unilateral do CTO.
