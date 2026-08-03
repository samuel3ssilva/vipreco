# Índice da documentação

Qual documento manda, qual descreve o que já foi feito, e qual é registro histórico.

**Três estados:**

- **NORMATIVO** — vincula o trabalho. Contradizê-lo é erro.
- **DESCRITIVO** — descreve o que existe hoje. Envelhece com o código; corrigir é manutenção.
- **HISTÓRICO** — registro do que foi decidido ou entregue numa data. Não se atualiza, não se apaga.

Documentos com a marcação `SUPERSEDED FOR MVP PRODUCT SCOPE BY ROADMAP-MVP-v3` continuam válidos
**fora** do escopo de produto — a marcação vale só no ponto do conflito, e o ponto está escrito no
próprio documento.

---

## Produto — o que construir

| Documento                                                                | Estado                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------- |
| [`product/ROADMAP-MVP-v3.md`](product/ROADMAP-MVP-v3.md)                 | **NORMATIVO** — fonte oficial do escopo de produto |
| [`product/PRODUCT-PRINCIPLES.md`](product/PRODUCT-PRINCIPLES.md)         | **NORMATIVO** — critérios de desempate             |
| [`product/CANONICAL-PRODUCT-SPEC.md`](product/CANONICAL-PRODUCT-SPEC.md) | **NORMATIVO** — E1                                 |
| [`product/COMPARISON-SPEC.md`](product/COMPARISON-SPEC.md)               | **NORMATIVO** — E2                                 |
| [`product/CARD-V2-SPEC.md`](product/CARD-V2-SPEC.md)                     | **NORMATIVO** — alvo do card                       |

## Dados — como o dado é

| Documento                                                    | Estado        |
| ------------------------------------------------------------ | ------------- |
| [`data/MVP-DATA-CONTRACT.md`](data/MVP-DATA-CONTRACT.md)     | **NORMATIVO** |
| [`data/PRODUCT-IDENTIFIERS.md`](data/PRODUCT-IDENTIFIERS.md) | **NORMATIVO** |
| [`data/PROMOTION-TYPES.md`](data/PROMOTION-TYPES.md)         | **NORMATIVO** |
| [`data/OFFER-STATES.md`](data/OFFER-STATES.md)               | **NORMATIVO** |
| [`data/IMAGE-POLICY.md`](data/IMAGE-POLICY.md)               | **NORMATIVO** |

## Analytics

| Documento                                                            | Estado                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`analytics/MVP-EVENT-TAXONOMY.md`](analytics/MVP-EVENT-TAXONOMY.md) | **NORMATIVO** na taxonomia; a ADR de §4 tem decisão aberta (P-02) |

## PMO — decisão e execução

| Documento                                                          | Estado                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`pmo/MVP-DECISION-LOG.md`](pmo/MVP-DECISION-LOG.md)               | **NORMATIVO** — matriz D1–D12, pendências e log                            |
| [`pmo/MVP-EXECUTION-PLAN.md`](pmo/MVP-EXECUTION-PLAN.md)           | **NORMATIVO** — sequência R1–R9                                            |
| [`pmo/TECHNICAL-DEBT-REGISTER.md`](pmo/TECHNICAL-DEBT-REGISTER.md) | **NORMATIVO**                                                              |
| [`pmo/TRELLO-MAPPING.md`](pmo/TRELLO-MAPPING.md)                   | **NORMATIVO** — mapa do quadro; o quadro não existe                        |
| [`pmo/DEPENDENCY-POLICY.md`](pmo/DEPENDENCY-POLICY.md)             | **NORMATIVO** — política de dependências e inventário dos seis PRs abertos |

## Pós-MVP — registrado, não autorizado

**Nada nesta pasta faz parte do MVP.** Nenhuma etapa pode começar autonomamente; cada uma depende de
Gate humano.

| Documento                                                                                        | Estado                                                            |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md) | **NORMATIVO como registro de intenção** — fora do MVP             |
| [`post-mvp/SOURCE-CONNECTOR-STATUS.md`](post-mvp/SOURCE-CONNECTOR-STATUS.md)                     | registro de avaliação; nenhum estado autoriza implementação       |
| [`post-mvp/AUTOMATION-QUALITY-GATES.md`](post-mvp/AUTOMATION-QUALITY-GATES.md)                   | registro de critério                                              |
| [`post-mvp/PRICE-PROVENANCE-POLICY.md`](post-mvp/PRICE-PROVENANCE-POLICY.md)                     | **NORMATIVO** no que já existe; registro de critério na automação |

## Governança e estratégia

| Documento                                                                                                                                              | Estado                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| [`../PLANO-MESTRE.md`](../PLANO-MESTRE.md)                                                                                                             | **NORMATIVO** em governança, gates, tese, neutralidade e restrições. **Superseded no escopo de produto** (§12.4, §12.5 e §13) |
| [`../PLANO.md`](../PLANO.md)                                                                                                                           | **HISTÓRICO** — tese original e Ondas de fundação                                                                             |
| [`../CLAUDE.md`](../CLAUDE.md)                                                                                                                         | **NORMATIVO** — como trabalhar neste código                                                                                   |
| [`../README.md`](../README.md)                                                                                                                         | **DESCRITIVO**                                                                                                                |
| [`strategy/POST-VALIDATION-PARKING-LOT.md`](strategy/POST-VALIDATION-PARKING-LOT.md)                                                                   | **HISTÓRICO** — Roadmap B estacionado                                                                                         |
| [`governance/PROMPT-CTO_ONDA-2.md`](governance/PROMPT-CTO_ONDA-2.md), [`-3`](governance/PROMPT-CTO_ONDA-3.md), [`-4`](governance/PROMPT-CTO_ONDA-4.md) | **HISTÓRICO** — mandatos                                                                                                      |
| `HANDOFF-2026-07-27.md` (raiz, **não versionado** — está no `.gitignore`)                                                                              | **HISTÓRICO — SUPERSEDED.** Retrato de 27/07 com instruções operacionais obsoletas. Existe só na máquina de quem o recebeu    |

## MVP — o que já foi construído

| Documento                                                          | Estado                                                                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [`mvp/TEST-MVP-PLAN.md`](mvp/TEST-MVP-PLAN.md)                     | **NORMATIVO** em gates V0/V1/V2 e exclusões permanentes. **Superseded** em escopo de rodada (§3 e §5)               |
| [`mvp/HOME-NORTH-STAR.md`](mvp/HOME-NORTH-STAR.md)                 | **DESCRITIVO** da Parte 2. **Superseded** na ordem da página (busca abaixo dos Achados) e na anatomia final do card |
| [`mvp/HOME-INITIAL-RENDER.md`](mvp/HOME-INITIAL-RENDER.md)         | **DESCRITIVO**. A arquitetura de fontes evolui para adapters (D1)                                                   |
| [`mvp/FOR-MARKETS-PAGE.md`](mvp/FOR-MARKETS-PAGE.md)               | **DESCRITIVO** — `/para-mercados`, íntegro                                                                          |
| [`mvp/DEMO-ENVIRONMENT.md`](mvp/DEMO-ENVIRONMENT.md)               | **DESCRITIVO** — modos, três endereços, domínio pausado                                                             |
| [`mvp/WHATSAPP-ENTRY.md`](mvp/WHATSAPP-ENTRY.md)                   | **DESCRITIVO** — íntegro                                                                                            |
| [`mvp/MANUAL-OFFER-OPERATIONS.md`](mvp/MANUAL-OFFER-OPERATIONS.md) | **DESCRITIVO**. **Superseded** no que falta para o v3: imagem, promoção estruturada e estados                       |

## Segurança, operação, acessibilidade e design

Nenhum conflito com o roadmap v3. Todos permanecem vinculantes no que lhes cabe.

| Pasta                              | Estado                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| [`security/`](security/)           | **NORMATIVO** — threat model, matriz de autorização, política de borda, revisão adversarial |
| [`operations/`](operations/)       | **NORMATIVO** — cache HTTP, resposta a incidente, runbook de resiliência, plano da Onda 4   |
| [`accessibility/`](accessibility/) | **NORMATIVO** — auditoria WCAG 2.2 AA                                                       |
| [`design/`](design/)               | **NORMATIVO** — Brand System v2 e recálculo de contraste                                    |

---

## Ordem de precedência

Havendo conflito, vence o de cima:

1. `CLAUDE.md` — princípios invioláveis e regras de trabalho no código
2. `PLANO-MESTRE.md` — governança, gates, neutralidade, ações proibidas
3. `docs/security/` — o que a segurança proíbe
4. `docs/product/ROADMAP-MVP-v3.md` e os documentos normativos de produto e dados
5. o restante
