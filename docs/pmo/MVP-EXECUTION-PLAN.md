# Plano de execução do MVP

**Status: NORMATIVO** para a sequência. **Nenhuma etapa a partir de R1 está autorizada.** Autorizar
implementação é ato separado do Founder/PMO.

Estimativas são **tamanhos relativos**, derivados do repositório real: número de arquivos afetados,
existência de migration, e se há backfill com revisão humana. Não são estimativas de tempo.

---

## Sequência

```
R0.5 fonte da verdade            ◄── esta rodada
 └─ R1 produto exato
     └─ R2 contrato de dados
         └─ R3 protótipos
             └─ R4 busca
                 └─ R5 comparação
                     └─ R6 Card v2      ◄── corte natural para o Gate V1
                         └─ R7 imagens e promoções
                             └─ R8 estados (gate) + analytics (gate separado)
                                 └─ R9 QA e piloto
```

**Corte recomendado:** se o objetivo for chegar rápido a uma comparação confiável para o Gate V1, o
corte natural é **R0.5–R6**. R7 e R8 não bloqueiam E2 e concentram os dois maiores riscos.

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
| **Dependências**       | R4; **P-03 precisa estar resolvida**                                                                                                                                               |
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

| Pendência                                     | Bloqueia      |
| --------------------------------------------- | ------------- |
| P-01 — janela do preço anterior               | R8            |
| P-02 — tecnologia de armazenamento de eventos | R8            |
| P-03 — rota da comparação                     | R5            |
| P-04 — política de Dependabot                 | higiene de CI |
| P-05 — configuração do prazo de 24 h          | R8            |

---

## Fora deste plano

O trabalho de domínio (`demo.vipreco.com.br`) está **pausado**. O PR #44 permanece aberto, verde e
intacto. Retomar é decisão do Founder/PMO e não depende de nenhuma etapa acima.
