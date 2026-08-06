# Plano de execução do MVP

**Status: NORMATIVO** para o detalhamento de cada etapa. **A sequência vigente está em
[`../product/ROADMAP-MVP-V2.md`](../product/ROADMAP-MVP-V2.md) §3 e §4** — duas trilhas, B2C e
B2B. Autorizar implementação continua sendo ato separado do Founder/PMO.

> **A ordem mudou em 06/08/2026 (DL-028).** O Card v2 passou de **R6** para **R3.2**, antes da
> Home; a Home é R3.3; a busca é R4; a comparação é R5; R6 vira "detalhe, imagens, promoções e
> estados". As fichas por etapa abaixo continuam corretas no **conteúdo** — objetivo, módulos,
> migration, risco, rollback —; o que mudou é **quando** cada uma acontece. O título de cada
> ficha carrega a etapa nova entre parênteses onde ela difere.
>
> R0 a R2 estão **concluídas**. R3.1 foi entregue (PR #78, `4362efa`) e R3.2 está em revisão
> visual (PR #89, sem merge).

Estimativas são **tamanhos relativos**, derivados do repositório real: número de arquivos afetados,
existência de migration, e se há backfill com revisão humana. Não são estimativas de tempo.

---

## Sequência

**Vigente desde 06/08/2026 (DL-028):**

```
R0  governança e rebaseline               ✔ concluída
 └─ R1 produto exato e equivalência        ✔ concluída
     └─ R2 dados e segurança em staging    ✔ concluída
         └─ R3.0 North Star original       ✔ concluída
             └─ R3.1 fundação visual       ✔ concluída  (PR #78, 4362efa)
                 └─ R3.2 Card v2           ◄── em revisão visual (PR #89, sem merge)
                     └─ R3.3 Home / Achados
                         └─ R4 busca por produto exato
                             └─ R5 comparação do mesmo produto
                                 └─ R6 detalhe, imagens, promoções e estados
                                     └─ R7 WhatsApp, analytics, acessibilidade e QA
                                         └─ R8 produção, domínio e segurança final
                                             └─ R9 piloto Artemis
```

Em paralelo, a trilha B2B — `B2B-0` a `B2B-5`,
[`../product/ROADMAP-MVP-V2.md`](../product/ROADMAP-MVP-V2.md) §4.

**Sequência anterior, histórica** (R0.5 → R1 → R2 → R3 protótipos → R4 busca → R5 comparação →
R6 Card v2 → R7 → R8 → R9). Ela punha o Card v2 depois da busca e da comparação; a inversão está
justificada em DL-028 e em [`../product/ROADMAP-MVP-V2.md`](../product/ROADMAP-MVP-V2.md) §5 — a
Home é uma lista de cards, e desenhar a lista antes da unidade é desenhar duas vezes.

**Corte recomendado:** para chegar a uma comparação confiável no Gate V1, o corte natural vai até
**R5**. R6 e R7 não bloqueiam E2, e R8 concentra os dois maiores riscos do projeto.

### De qual ficha sai cada etapa nova

As fichas deste documento não foram reescritas — o conteúdo delas (objetivo, módulos, migration,
risco, rollback) continua válido. O que mudou foi **onde cada uma cai na sequência**. Reescrever
oito fichas para renumerar títulos trocaria informação verificada por churn de texto; a tabela
abaixo faz o mesmo trabalho sem esse risco.

| Etapa vigente | Ficha que a descreve                       | Observação                                                                    |
| ------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| R0 / R0.5     | [R0.5](#r05--fonte-da-verdade-esta-rodada) | concluída                                                                     |
| R1            | [R1](#r1--produto-exato)                   | concluída                                                                     |
| R2            | [R2](#r2--contrato-de-dados)               | concluída; aplicada em staging                                                |
| R3.0 / R3.1   | [R3](#r3--protótipos)                      | R3.0 é o North Star; R3.1 é a fundação visual                                 |
| **R3.2**      | [R6](#r6--card-v2)                         | **o Card v2 subiu de R6 para cá** — é a mudança de DL-028                     |
| R3.3          | [R4](#r4--busca) (parte da Home)           | a Home vem antes da busca; a ficha R4 cobre as duas e é executada em dois PRs |
| R4            | [R4](#r4--busca) (parte da busca)          | —                                                                             |
| R5            | [R5](#r5--comparação)                      | —                                                                             |
| R6            | [R7](#r7--imagens-e-promoções)             | renomeada para "detalhe, imagens, promoções e estados"                        |
| R7            | —                                          | WhatsApp e acessibilidade já existem; analytics vem da ficha R8               |
| R8            | [R8](#r8--estados-e-analytics)             | mais produção e domínio, hoje pausados                                        |
| R9            | [R9](#r9--qa-e-piloto)                     | —                                                                             |

---

## R0.5 — Fonte da verdade _(esta rodada)_

|                        |                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | roadmap v3 como fonte oficial, decisões registradas, mapa do Trello, duas correções independentes          |
| **Módulos**            | `docs/**`, `CLAUDE.md`, `README.md`; `src/lib/comparison.ts`; `src/lib/normalize.ts` + migration corretiva |
| **Dependências**       | mandato R0.5                                                                                               |
| **Migration**          | uma corretiva, **criada e não aplicada**                                                                   |
| **Revisão do Founder** | sim — é o gate                                                                                             |
| **PRs**                | 3 independentes: documental, desempate, normalização                                                       |
| **Risco**              | baixo                                                                                                      |
| **Rollback**           | reverter commit                                                                                            |
| **Tamanho**            | médio                                                                                                      |

### Estado de validação, por branch

Contagens de teste **não se somam entre branches**. Cada número abaixo é o total daquela branch,
medido nela.

| Branch                                |  Testes | Observação                                      |
| ------------------------------------- | ------: | ----------------------------------------------- |
| `main` (`862a179`)                    | **385** | linha de base                                   |
| PR #45 — documental                   | **385** | só markdown; não acrescenta teste               |
| PR #46 — desempate                    | **391** | +6 sobre a `main`                               |
| PR #47 — normalização                 | **423** | +38 sobre a `main`                              |
| PR #44 — domínio (aberto desde 02/08) | **415** | +30 sobre a `main`; independente dos três acima |

Os quatro PRs partem da mesma `main` e não foram mergeados. Somar 385 + 391 + 423 + 415, ou
apresentar 423 como "o total do projeto", descreveria um estado que não existe em lugar nenhum.

---

## R1 — Produto exato

|                        |                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | estruturar `products` como SKU exato: `package_type`, `quantity_value`, `quantity_unit`, normalizadas; regras EXATO / OUTRO TAMANHO / SIMILAR como funções puras testadas |
| **Módulos**            | migration; `src/types/domain.ts`; novo `src/lib/equivalence.ts`; `src/services/catalog.ts`; fixture demo                                                                  |
| **Dependências**       | R0.5; D6 (resolvida)                                                                                                                                                      |
| **Migration**          | **sim** — aditiva. Backfill a partir de `size_text`, com revisão manual                                                                                                   |
| **Revisão do Founder** | **sim** — o backfill precisa ser conferido linha a linha                                                                                                                  |
| **PRs**                | 2 — (a) schema + tipos + fixture; (b) regras de equivalência + testes                                                                                                     |
| **Risco**              | médio                                                                                                                                                                     |
| **Rollback**           | migration corretiva; `size_text` preservado como texto de exibição                                                                                                        |
| **Tamanho**            | **médio**                                                                                                                                                                 |

**Menor do que o assessment R0 previa.** DL-004 dispensou a tabela `canonical_products` e o backfill
por agrupamento: não há tabela nova nem FK nova.

**Fora de escopo:** camada de família de produto; unicidade de GTIN sob reformulação
([`../data/PRODUCT-IDENTIFIERS.md`](../data/PRODUCT-IDENTIFIERS.md) §4 decide **em** R1, não antes).

---

## R2 — Contrato de dados

|                        |                                                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | quantidade normalizada, preço unitário calculado, `calculation_status`, aliases de busca, `markets.city` no contrato (TD-003) |
| **Módulos**            | migration de aliases; novo `src/lib/quantity.ts`; `src/lib/format.ts`; `src/types/domain.ts`; `src/services/catalog.ts`       |
| **Dependências**       | R1; D7, D12 (resolvidas)                                                                                                      |
| **Migration**          | **sim** — aliases e recriação do texto de busca                                                                               |
| **Revisão do Founder** | **sim**                                                                                                                       |
| **PRs**                | 2–3                                                                                                                           |
| **Risco**              | **alto** — o parser de `size_text` é onde nasce o erro silencioso                                                             |
| **Rollback**           | migration corretiva; `calculation_status` mantém o unitário oculto enquanto houver dúvida                                     |
| **Tamanho**            | **grande**                                                                                                                    |

**É a etapa cara e a que gera erro silencioso.** É onde vale gastar revisão humana.

---

## R3 — Protótipos

|                        |                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | busca em três blocos, comparação com unitário e estados, Card v2 — em rota de desenvolvimento, com dados do fixture |
| **Módulos**            | componentes novos; **nenhum schema**                                                                                |
| **Dependências**       | R2                                                                                                                  |
| **Migration**          | não                                                                                                                 |
| **Revisão do Founder** | **sim** — decide antes de implementar de verdade                                                                    |
| **PRs**                | 1                                                                                                                   |
| **Risco**              | baixo                                                                                                               |
| **Rollback**           | reverter                                                                                                            |
| **Tamanho**            | médio                                                                                                               |

---

## R4 — Busca

|                        |                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | relevância, aliases, GTIN, fallback por similaridade (TD-007), três blocos, busca na primeira dobra (D2), migração da Home para o contrato único (D1), `limit` (TD-004) |
| **Módulos**            | `src/services/catalog.ts`; `src/components/ProductSearch.tsx`; `src/lib/search-state.ts`; `src/routes/index.tsx`; `home-opportunities.ts`; `home-markets.ts`            |
| **Dependências**       | R2, R3; D1, D2                                                                                                                                                          |
| **Migration**          | não                                                                                                                                                                     |
| **Revisão do Founder** | **sim** — muda a ordem da Home                                                                                                                                          |
| **PRs**                | 2 — (a) contrato único e adapters; (b) busca e ordem da Home                                                                                                            |
| **Risco**              | médio                                                                                                                                                                   |
| **Rollback**           | reverter                                                                                                                                                                |
| **Tamanho**            | **grande**                                                                                                                                                              |

**Garantias a preservar:** em DEMO o caminho do Supabase não é avaliado; o HTML inicial continua sem
estado de carregamento; `generatedAt` continua vindo do servidor.

---

## R5 — Comparação

|                        |                                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | exato / outro tamanho / similar; preço unitário; CTA "Comparar em X mercados"; compartilhamento na comparação; `og:image` própria (TD-006); dupla busca (TD-005); sitemap (TD-008) |
| **Módulos**            | `src/routes/produto.$productId.tsx`; `PriceCard`; `PriceSummary`; `src/lib/og.ts`; `src/lib/indexing.ts`                                                                           |
| **Dependências**       | R4. A rota está decidida (D8/DL-014): permanece `/produto/$productId`                                                                                                              |
| **Migration**          | não                                                                                                                                                                                |
| **Revisão do Founder** | sim                                                                                                                                                                                |
| **PRs**                | 2                                                                                                                                                                                  |
| **Risco**              | médio                                                                                                                                                                              |
| **Rollback**           | reverter                                                                                                                                                                           |
| **Tamanho**            | **grande**                                                                                                                                                                         |

---

## R6 — Card v2

|                        |                                                           |
| ---------------------- | --------------------------------------------------------- |
| **Objetivo**           | os 17 itens, com placeholder onde o dado ainda não existe |
| **Módulos**            | `AchadoCard`; `PriceCard`; `src/lib/temporal.ts`          |
| **Dependências**       | R5; D7                                                    |
| **Migration**          | não                                                       |
| **Revisão do Founder** | **sim** — é a peça que o Founder mostra                   |
| **PRs**                | 2                                                         |
| **Risco**              | médio                                                     |
| **Rollback**           | reverter                                                  |
| **Tamanho**            | médio                                                     |

**Corte natural para o Gate V1.**

---

## R7 — Imagens e promoções

|                        |                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| **Objetivo**           | campos de imagem, curadoria, placeholder por categoria, promoções tipificadas                 |
| **Módulos**            | migration de imagem e promoção; componente de imagem; `PriceCard`; **CSP se a origem exigir** |
| **Dependências**       | R6; D4                                                                                        |
| **Migration**          | **sim**                                                                                       |
| **Revisão do Founder** | sim; **revisão de segurança** se o CSP mudar                                                  |
| **PRs**                | 2–3 — imagem e promoção **separadas**                                                         |
| **Risco**              | **alto** — imagem errada e alteração de CSP                                                   |
| **Rollback**           | dropar colunas; reverter CSP                                                                  |
| **Tamanho**            | **grande**                                                                                    |

---

## R8 — Estados e analytics

|                        |                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | `offer_state`, leitura pública controlada, `price_events`, preço anterior; endpoint de analytics          |
| **Módulos**            | migration de estados + superfície de leitura; `src/lib/comparison.ts`; `src/server.ts`; tabela de eventos |
| **Dependências**       | R7; D3, D5; **P-01, P-02 e P-05 precisam estar resolvidas**                                               |
| **Migration**          | **sim — duas, independentes**                                                                             |
| **Revisão do Founder** | **sim — dois gates separados**                                                                            |
| **PRs**                | 2–3, **nunca um só**                                                                                      |
| **Risco**              | **muito alto** — muda o contrato público de leitura e abre superfície de escrita                          |
| **Rollback**           | migration corretiva restaurando a policy anterior; remover o endpoint                                     |
| **Tamanho**            | **muito grande**                                                                                          |

**Concentra os dois maiores riscos do projeto.** Devem ser dois PRs e dois gates independentes, nunca
um. Cada um exige revisão adversarial própria e drill de schema verde antes do merge.

---

## R9 — QA e piloto

|                        |                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Objetivo**           | script versionado de publicação de oferta; `price_events` em uso; runbook atualizado; acessibilidade; smoke; evidências |
| **Módulos**            | `scripts/`; `docs/mvp/MANUAL-OFFER-OPERATIONS.md`                                                                       |
| **Dependências**       | R8                                                                                                                      |
| **Migration**          | não                                                                                                                     |
| **Revisão do Founder** | sim                                                                                                                     |
| **PRs**                | 2                                                                                                                       |
| **Risco**              | médio                                                                                                                   |
| **Rollback**           | reverter                                                                                                                |
| **Tamanho**            | médio                                                                                                                   |

**O item mais importante desta etapa** é o script de publicação. Hoje publicar uma oferta é escrever
SQL à mão no editor do Supabase — o ponto de erro mais provável de todo o fluxo manual. Ele precisa
existir **antes** de qualquer dado real.

---

## Pendências que bloqueiam etapas

| Pendência                                     | Bloqueia |
| --------------------------------------------- | -------- |
| P-01 — janela do preço anterior               | R8       |
| P-02 — tecnologia de armazenamento de eventos | R8       |
| P-05 — configuração do prazo de 24 h          | R8       |

**As três bloqueiam apenas R8.** De R1 a R7 não há nenhuma pendência aberta — P-03 e P-04 foram
fechadas em 03/08/2026 (D8 e D10 em [`MVP-DECISION-LOG.md`](MVP-DECISION-LOG.md)).

---

## Fora deste plano

**Domínio.** O trabalho de `demo.vipreco.com.br` está **pausado**. O PR #44 permanece aberto, verde
e intacto. Retomar é decisão do Founder/PMO e não depende de nenhuma etapa acima.

**Dependências.** Os seis PRs de Dependabot seguem abertos e intocados. A política está em
[`DEPENDENCY-POLICY.md`](DEPENDENCY-POLICY.md), e a janela recomendada para tratá-los é **depois de
R2** — antes disso, três majors de ferramenta chegando junto com um schema novo tornam impossível
dizer qual dos dois quebrou o quê.

**Automação de ingestão de preços.** Trilha PM-DATA-0 a PM-DATA-7, registrada em
[`../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md`](../post-mvp/AUTOMATED-PRICE-INGESTION-ROADMAP.md).
**Não faz parte do MVP, não bloqueia o MVP e não pode começar autonomamente.** Ela só é avaliada
depois que R1 a R9 estiverem entregues e o Gate de necessidade for aprovado — e nenhuma
infraestrutura preventiva é criada por antecipação.
