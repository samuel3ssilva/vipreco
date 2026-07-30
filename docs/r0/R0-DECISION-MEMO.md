# Nota de decisão consolidada — Gate R0

**Trilha:** preparação do Gate R0 (`PLANO-MESTRE.md` §10 e §17.5), autorizada pelo
Founder/PMO em 2026-07-30 imediatamente após o fechamento da Onda 4. Esta nota sintetiza
os seis PRs de preparação abertos nesta rodada e devolve uma recomendação objetiva:
**GO / NO-GO / GO COM CONDIÇÕES**.

**Esta nota não aprova o Gate R0.** É o documento de síntese que o Founder/PMO usa para
decidir — a decisão em si, por `PLANO-MESTRE.md` §10, só pode ser tomada pelo Founder/PMO.

---

## 1. O que foi preparado nesta rodada

| #   | PR                                                      | Arquivo                                                                | Conteúdo                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [#20](https://github.com/samuel3ssilva/vipreco/pull/20) | `docs/r0/R0-READINESS-MATRIX.md`                                       | Matriz das 15 dependências obrigatórias de `PLANO-MESTRE.md` §10, com estado atual, lacuna, responsável, bloqueador e critério de aprovação de cada uma                                                                                                                              |
| 2   | [#23](https://github.com/samuel3ssilva/vipreco/pull/23) | `docs/r0/DATA-INVENTORY.md`, `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md` | Mapeamento dos 10 fluxos de dados previstos (comparação pública, submissão de preço, WhatsApp, comerciante, NFC-e, cashback, Pix, campanhas da indústria, relatórios agregados, suporte/exclusão), com campos, finalidade, acesso, retenção e riscos propostos                       |
| 3   | [#22](https://github.com/samuel3ssilva/vipreco/pull/22) | `docs/r0/PRIVACY-AND-CONSENT-REQUIREMENTS.md`                          | Documento de trabalho de privacidade: retenção, exclusão, correção, consentimento por finalidade, rascunho de aviso de privacidade, registro de operações, matriz de acesso, resposta a incidente de privacidade, riscos de NFC-e/cashback/Pix/WhatsApp — **não é parecer jurídico** |
| 4   | [#24](https://github.com/samuel3ssilva/vipreco/pull/24) | `docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md`                              | Proposta de arquitetura (não implementada) para os fluxos de escrita que o piloto exige e que hoje não existem no schema — caminho de escrita mediado, dedup por HMAC, auditoria, antifraude, segregação staging/produção                                                            |
| 5   | [#21](https://github.com/samuel3ssilva/vipreco/pull/21) | `docs/r0/PILOT-OPERATIONS-RUNBOOK.md`                                  | Plano operacional executável (não iniciado) do piloto Artemis: duração, limites de comerciantes/consumidores, papéis, WhatsApp, cashback, fraude, suporte, incidentes, critérios de pausa/encerramento, métricas                                                                     |
| 6   | [#19](https://github.com/samuel3ssilva/vipreco/pull/19) | `scripts/r0/pilot-ledger-simulation.ts` + testes                       | Único item desta rodada que é código real, testado: prova em 15 testes automatizados os invariantes de dedup fiscal por HMAC, idempotência, retenção/exclusão simulada e ausência de vazamento de chave em log — usando dados exclusivamente sintéticos                              |

Todos os seis PRs estão abertos, com `bun run lint && bun run test && bun run build`
verdes e CI/CodeQL verdes (PR #24 com CodeQL concluindo no momento desta nota — ver §5).
**Nenhum foi mergeado.** Nenhum deles, individualmente ou em conjunto, autoriza dado
real, deploy, DNS, custo ou credencial nova.

## 2. O que está genuinamente verificado hoje

Com evidência ao vivo, citada em `docs/r0/R0-READINESS-MATRIX.md` itens 1, 2, 4 e 5:

- Onda 2 encerrada, staging e produção separados e isolados (produção com 0 linhas,
  escrita anônima bloqueada);
- Onda 3 encerrada, RLS/grants auditados, escalação de privilégio crítica corrigida e
  verificada ao vivo;
- produção testada com deploy real e smoke test;
- sem dados demo em produção, com risco residual de ausência de trava técnica registrado
  e aceito (item 5 da matriz).

Onda 4 está pronta **com uma ressalva explícita**: backup de schema, logs, alertas e
plano de incidente estão prontos e validados ao vivo; **restore real de dado permanece
`NOT VERIFIED`** — decisão já tomada pelo Founder/PMO de adiar essa verificação para o
próprio Gate R0 (`docs/operations/RESILIENCE-RUNBOOK.md` §6.4).

## 3. O que continua NOT VERIFIED ou é lacuna real

- **Restore real de dado do Supabase** — nenhum teste contra banco vivo foi feito; a
  escolha entre dump manual, upgrade Pro ou PITR está em aberto por decisão explícita,
  não por omissão.
- **Ledger fiscal (NFC-e/cashback/Pix)** — não existe hoje nenhuma migration, tabela ou
  função no repositório. `docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md` propõe o desenho e
  `scripts/r0/pilot-ledger-simulation.ts` prova a lógica de dedup/idempotência/retenção
  em isolamento, mas **nenhuma das duas coisas é o ledger real rodando contra um schema
  real**. Este é o maior item de engenharia pendente antes de qualquer dado real.
- **Todo o conteúdo de privacidade e consentimento** (aviso de privacidade, registro de
  consentimento, elegibilidade adulta, retenção, exclusão) existe apenas como documento
  de trabalho técnico — nenhuma linha foi revisada por advogado.
- **Controle de acesso operacional a dado de participante real** — quem, no time, veria
  um cupom real e sob qual justificativa; hoje só existe controle de acesso a schema
  (RLS/grants), não a operação humana sobre dado real.

## 4. Os dois bloqueadores que nenhuma preparação técnica fecha

Por desenho, nenhum documento produzido nesta rodada — nem nenhum outro que um CTO ou
agente de IA venha a escrever — pode marcar estes dois itens como satisfeitos:

1. **Revisão jurídica/privacidade do piloto** — parecer explícito de advogado brasileiro
   especialista em LGPD cobrindo os documentos de trabalho desta rodada (itens 6–13 da
   matriz de prontidão).
2. **Aprovação explícita do Founder/PMO** — a declaração, feita depois de revisar esta
   nota e os seis PRs, de que o Gate R0 está aprovado (`PLANO-MESTRE.md` §10).

## 5. Estado de CI dos seis PRs (no momento desta nota)

| PR  | lint/test/build | CodeQL                                                      |
| --- | --------------- | ----------------------------------------------------------- |
| #19 | verde           | verde                                                       |
| #20 | verde           | verde                                                       |
| #21 | verde           | verde                                                       |
| #22 | verde           | verde                                                       |
| #23 | verde           | verde                                                       |
| #24 | verde           | em execução no momento da checagem — sem indicação de falha |

## 6. Recomendação: **NO-GO hoje, caminho para GO COM CONDIÇÕES**

Não há base para recomendar GO. Dos 15 itens da matriz de prontidão: 4 genuinamente
prontos, 1 pronto com ressalva registrada, 7 existem apenas como documento de trabalho
técnico não revisado, 1 é lacuna real de engenharia (o ledger fiscal), e 2 são
bloqueadores humanos permanentes ainda não iniciados. Isso não é uma falha desta rodada —
é o resultado esperado de uma preparação puramente documental e de código sintético, que
nunca poderia, por si só, fechar itens que exigem revisão jurídica e decisão do Founder.

**Caminho recomendado para GO COM CONDIÇÕES**, na ordem em que cada passo depende do
anterior:

1. Founder/PMO revisa e decide se mergeia (ou pede ajuste) nos PRs #19–#24, item a item —
   sem misturar a decisão de merge com a decisão do Gate R0 em si.
2. Founder aciona revisão jurídica formal (item 14) usando os documentos mergeados de
   privacidade/consentimento (#22) e dados (#23) como insumo.
3. Em paralelo, CTO implementa o ledger fiscal real (item 12) — schema versionado,
   migrations reprodutíveis no mesmo padrão do drill da Onda 4, suíte de testes cobrindo
   duplicidade/nota inválida/cancelamento, tudo com dado sintético — como uma nova tarefa
   de engenharia, não coberta por esta rodada.
4. Founder decide a estratégia de restore real (item 3 da matriz) — dump manual, upgrade
   Pro ou PITR — e, se optar por testar de fato, autoriza a execução contra staging.
5. Com os itens 6–13 fechados (documentos revisados e, onde aplicável, implementados) e o
   parecer jurídico (item 14) em mãos, Founder/PMO declara o Gate R0 aprovado (item 15) —
   o único passo que encerra esta cadeia.

**Nenhum passo acima foi executado por este CTO.** Esta nota é só a síntese e a
recomendação; a decisão e a sequência de execução são do Founder/PMO.
