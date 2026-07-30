# Estacionamento pós-validação — preparação do Gate R0 (Roadmap B)

**Decisão estratégica do Founder/PMO (2026-07-30):** o produto será validado primeiro por
um **Teste MVP asset-light** (Roadmap A — `docs/mvp/TEST-MVP-PLAN.md`), com dados
sintéticos e operação manual, antes de investir no Gate R0 completo, NFC-e, cashback,
Pix, portais e automações (Roadmap B — `PLANO-MESTRE.md` §12).

**Nada abaixo foi rejeitado, invalidado ou descartado.** A preparação do Gate R0 feita na
rodada anterior tinha qualidade e continua correta — o que mudou foi a ordem de execução,
não o mérito técnico. Os sete PRs abaixo foram fechados sem merge, com branch e commits
preservados, e cada um recebeu um comentário explicando o motivo do estacionamento.

## Condição geral de reabertura

Qualquer item deste índice pode ser reaberto **após o Gate V1 ou Gate V2** do Teste MVP
(ver `docs/mvp/TEST-MVP-PLAN.md`), quando o Founder decidir avançar para o Roadmap B.
Reabrir significa: revisar a branch contra o `main` atual (provavelmente com conflito,
dado o tempo decorrido), atualizar à luz do que o Teste MVP ensinou, e só então retomar o
processo normal de PR → CI → merge.

## Risco geral de usar este conteúdo antes da validação

Implementar qualquer peça do Roadmap B antes do Teste MVP correria o risco de construir
automação, arquitetura ou processo em cima de hipóteses de produto ainda não confirmadas
(ex.: como o comerciante realmente prefere enviar uma oferta, o que o consumidor realmente
entende como "procedência", se cashback é sequer o mecanismo certo) — exatamente o
princípio obrigatório #9 do mandato desta rodada: "nenhuma automação sem hipótese
previamente validada."

## Índice

| PR                                                      | Título                                                                        | Conteúdo preservado                                                                                                                                            | Classificação | Condição de reabertura                                                                                                                                                                                           | Risco de uso prematuro                                                                                                                                                                                                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#19](https://github.com/samuel3ssilva/vipreco/pull/19) | `feat(r0): simula dedup fiscal, idempotência e retenção com dados sintéticos` | `scripts/r0/pilot-ledger-simulation.ts` + 15 testes: dedup por HMAC, idempotência, retenção/exclusão simulada, sem vazamento em log                            |     **B**     | Quando o Roadmap B retomar o desenho do ledger fiscal real                                                                                                                                                       | Baixo — é lógica pura testada, não schema aplicado; o risco é assumir que o formato de dado (chave, valor, timestamp) já está certo antes de o Teste MVP confirmar como o comerciante/consumidor realmente enviam uma oferta                                               |
| [#20](https://github.com/samuel3ssilva/vipreco/pull/20) | `docs(r0): matriz de prontidão do Gate R0`                                    | Matriz das 15 dependências obrigatórias de `PLANO-MESTRE.md` §10, com estado/lacuna/responsável/critério de aprovação                                          |     **B**     | Reavaliar linha a linha quando o Roadmap B for retomado — algumas linhas (ex.: "sem dados demo em produção") continuam válidas sem mudança; outras (ex.: ledger fiscal) podem mudar de escopo à luz do Teste MVP | Baixo — é uma matriz de estado, não uma decisão; o risco é tratá-la como atual sem reconferir as linhas antes de reabrir                                                                                                                                                   |
| [#21](https://github.com/samuel3ssilva/vipreco/pull/21) | `docs(r0): plano operacional do piloto Artemis pós-Gate R0`                   | Runbook do piloto robusto: comerciante design partner, coorte de 20-25 domicílios, curva de incentivo, fraude, suporte, kill criteria                          |     **B**     | Quando o Roadmap B retomar o piloto com dado real                                                                                                                                                                | Médio — os limites operacionais (nº de comerciantes, coorte, curva de incentivo) foram fixados antes de qualquer sinal do Teste MVP; devem ser revisados à luz do que Gate V1/V2 mostrarem sobre demanda real                                                              |
| [#22](https://github.com/samuel3ssilva/vipreco/pull/22) | `docs(r0): requisitos de privacidade e consentimento para o Gate R0`          | Retenção, exclusão, correção, consentimento por finalidade, rascunho de aviso de privacidade, registro de operações, matriz de acesso — não é parecer jurídico |     **B**     | Quando dado real voltar a ser considerado, como ponto de partida para revisão jurídica                                                                                                                           | Baixo — o conteúdo é conservador por desenho (marca tudo que exige advogado); o risco é usá-lo como se já fosse aprovado juridicamente, o que nunca foi o caso                                                                                                             |
| [#23](https://github.com/samuel3ssilva/vipreco/pull/23) | `docs(r0): mapeia fluxos de dados e ciclo de vida para o Gate R0`             | `DATA-INVENTORY.md` + `DATA-LIFECYCLE-AND-RETENTION.md`: 10 fluxos (incluindo NFC-e, cashback, Pix), campos, retenção, riscos                                  |     **B**     | Quando o Roadmap B for retomado                                                                                                                                                                                  | Baixo — mapeamento factual dos fluxos previstos pelo `PLANO-MESTRE.md`, não uma decisão de produto; continua útil como referência                                                                                                                                          |
| [#24](https://github.com/samuel3ssilva/vipreco/pull/24) | `docs(r0): propõe arquitetura segura do piloto`                               | Proposta de arquitetura (não implementada) para NFC-e/cashback/Pix/comerciante: caminho de escrita mediado, dedup por HMAC, auditoria, antifraude              |     **B**     | Quando o Roadmap B retomar a implementação de escrita real                                                                                                                                                       | Médio — é uma proposta de design, não implementação; o risco é implementar peças dela isoladamente sem o schema completo, criando uma superfície de escrita pública não coberta pelo princípio obrigatório #11 desta rodada ("nenhuma nova superfície pública de escrita") |
| [#25](https://github.com/samuel3ssilva/vipreco/pull/25) | `docs(r0): nota de decisão consolidada do Gate R0 (NO-GO hoje)`               | Síntese dos PRs #19-#24 com recomendação NO-GO para o piloto robusto e caminho de 5 passos até GO COM CONDIÇÕES                                                |     **B**     | Como ponto de partida para reavaliar o Gate R0 após o Gate V1 ou Gate V2                                                                                                                                         | Nenhum — o NO-GO permanece correto para o piloto robusto; **não bloqueia** o Teste MVP asset-light, que roda fora do escopo desta nota                                                                                                                                     |

## Por que nenhum item foi classificado A ou C

- **Nenhum item é A (reutilizável agora).** Todo o conteúdo pressupõe dado real, NFC-e,
  cashback, Pix ou piloto robusto — nenhuma dessas coisas existe no Teste MVP
  asset-light, que roda inteiramente com dados sintéticos e sem nenhuma escrita pública
  nova (princípios obrigatórios #8 e #11 desta rodada).
- **Nenhum item é C (precisa ser revisto antes de qualquer reaproveitamento) de forma
  automática.** O conteúdo foi produzido com rigor técnico e cita evidência real onde
  existia; a revisão que ele precisa é de **sequência e hipótese confirmada**, não de
  correção técnica. Por isso "B" com uma nota de risco por item, em vez de "C" genérico —
  a auditoria desta rodada não encontrou erro técnico nos seis PRs, apenas a ordem errada
  de execução diante da nova estratégia.

## O que isso NÃO significa

- Não significa que o Gate R0 foi aprovado, rejeitado ou alterado — `PLANO-MESTRE.md` §10
  continua exigindo os mesmos 15 itens antes de qualquer dado real.
- Não significa que qualquer trecho de código ou schema destes PRs pode ser copiado para
  o Teste MVP sem revisão — nenhum cherry-pick foi feito, e nenhum deveria ser feito sem
  reconferir contra o escopo do Teste MVP primeiro.
