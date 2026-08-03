# Registro de dívida técnica

**Status: NORMATIVO.** Achados da auditoria R0 e do trabalho subsequente. Cada item tem severidade,
dependência e o PR planejado.

Severidade: **alta** = produz erro silencioso em dado ou em ordenação · **média** = degrada com
escala · **baixa** = incompletude sem efeito hoje.

| ID     | Título                                    | Severidade | Estado                    |
| ------ | ----------------------------------------- | ---------- | ------------------------- |
| TD-001 | normalização SQL e TypeScript divergentes | **alta**   | PR técnico B desta rodada |
| TD-002 | comparação sem terceiro desempate         | **alta**   | PR técnico A desta rodada |
| TD-003 | `markets.city` não consumido              | baixa      | R2                        |
| TD-004 | `getProductsPriceStats` sem `limit`       | média      | R4                        |
| TD-005 | dupla busca na rota de produto            | baixa      | R5                        |
| TD-006 | rota de produto sem `og:image` própria    | baixa      | R5                        |
| TD-007 | `pg_trgm` instalado e não usado           | baixa      | R4                        |
| TD-008 | rotas dinâmicas fora do `sitemap.xml`     | baixa      | R5                        |

---

## TD-001 — Normalização SQL e TypeScript divergentes

**Severidade: alta.**

`normalizeSearchText()` (TypeScript) colapsa espaço repetido e remove espaço das pontas.
`pa_normalize_text()` (SQL) faz apenas minúsculas e remoção de acento.

**Risco: duplicação silenciosa de produtos.** O índice `products_canonical_identity_idx` considera
`"500 g"`, `"500  g"` e `"500g"` três identidades distintas. Numa operação manual por WhatsApp, a
mesma oferta digitada duas vezes com espaçamento diferente cria um SKU novo, e a comparação se parte
em três sem nenhum erro visível. Efeito secundário: um termo com espaço duplo não encontra o
`search_text` correspondente.

**Ação:**

1. migration corretiva que alinha `pa_normalize_text()` ao contrato único;
2. testes de contrato com os **mesmos vetores** nos dois lados;
3. script read-only que relata colisões potenciais — **sem unir, sem apagar**;
4. rollback documentado.

**Dependência:** nenhuma. **PR:** `fix/product-normalization-contract` (esta rodada).
**Contrato:** [`../data/PRODUCT-IDENTIFIERS.md`](../data/PRODUCT-IDENTIFIERS.md) §2.

**Ponto de atenção da aplicação:** `products_canonical_identity_idx` é índice funcional sobre a
função. Trocá-la exige recriar o índice, e a recriação **falha** se existirem linhas que só eram
distintas pelo espaçamento — o banco recusa a mudança em vez de aceitar uma união silenciosa. Por
isso a ordem é: rodar o script de colisões, obter relatório vazio, e só então aplicar. Relatório não
vazio é `HUMAN ACTION REQUIRED`.

---

## TD-002 — Comparação sem terceiro desempate

**Severidade: alta.**

`latestValidPricePerMarket()` ordenava por preço e, no empate, por `observed_at` decrescente. Sem
terceiro critério, dois mercados com preço e data idênticos ficavam na ordem de inserção do `Map`,
que depende da ordem de retorno do banco.

**Risco: ordem não determinística.** A mesma consulta podia produzir duas listas diferentes — e a
primeira posição é a que o produto chama de "menor preço". O `CLAUDE.md`, princípio inviolável #3,
pede desempate determinístico.

**Ação:** critério estável (`id`) como terceiro desempate, no domínio e na consulta correspondente,
com teste de preço e `observed_at` idênticos e prova de resultado idêntico em execuções repetidas.

**Dependência:** nenhuma. **PR:** `fix/comparison-deterministic-tiebreaker` (esta rodada).
**Contrato:** [`../product/COMPARISON-SPEC.md`](../product/COMPARISON-SPEC.md) §4.

---

## TD-003 — `markets.city` não consumido

**Severidade: baixa.**

A coluna foi criada em `20260727155726` com `NOT NULL DEFAULT 'Artemis'` e índice próprio, e não
aparece em `MARKET_FIELDS` (`src/services/catalog.ts`) nem no tipo `Market`
(`src/types/domain.ts`).

**Risco: modelo geográfico incompleto na interface.** Quando o piloto passar de Artemis para
Piracicaba, dois mercados de bairros homônimos em cidades diferentes ficam indistinguíveis.

**Ação:** incluir a cidade no contrato de identidade de mercado — campo, tipo e exibição.
**Não remover a coluna.**

**Dependência:** D12 (resolvida). **PR:** R2.

---

## TD-004 — `getProductsPriceStats` sem `limit`

**Severidade: média.**

A função busca **todos** os preços válidos dos produtos do resultado, com join em `markets`, e agrega
em JavaScript, sem `limit`. Hoje é seguro: a RLS já filtra para preços válidos e há 4 mercados.

**Risco:** com dezenas de mercados e vários preços válidos por mercado, a consulta cresce sem teto —
e ela roda a cada busca.

**Ação:** `limit` explícito, cache por termo, e reavaliar se a estatística precisa mesmo rodar em
todos os resultados ou só nos visíveis. **PR:** R4.

---

## TD-005 — Dupla busca na rota de produto

**Severidade: baixa.**

`getProductComparison` é chamado no loader **e** em `useQuery` com `initialData`, o que dispara uma
segunda requisição imediata no primeiro carregamento.

**Ação:** `staleTime` adequado ou remoção do `useQuery` onde o loader já resolve. **PR:** R5.

---

## TD-006 — Rota de produto sem `og:image` própria

**Severidade: baixa.**

A rota declara `twitter:card: summary` e não declara `og:image`. Um link de produto compartilhado no
WhatsApp exibe a prévia genérica de demonstração da raiz.

**Ação:** `og:image` própria da comparação, estática. Gerador dinâmico por oferta continua fora do
MVP. **PR:** R5.

---

## TD-007 — `pg_trgm` instalado e não usado

**Severidade: baixa.**

A extensão está instalada e o índice `products_search_text_idx` é `gin_trgm_ops`, mas os operadores
de similaridade (`%`, `similarity()`) não são usados. A busca só faz `ilike` com curinga dos dois
lados — um termo com erro de digitação não encontra nada.

**Ação:** fallback por similaridade acima de um limiar, rotulado como sugestão e nunca misturado ao
resultado exato. **PR:** R4.

---

## TD-008 — Rotas dinâmicas fora do `sitemap.xml`

**Severidade: baixa.**

`buildSitemapXml` lista quatro rotas fixas. `/produto/$productId` não entra. Enquanto não há
catálogo real nem indexação pública, não tem efeito — vira lacuna de descoberta quando houver.

**Ação:** gerar as entradas de produto a partir do catálogo. **PR:** R5, junto com a emenda ao
sitemap que o PR #44 introduz. **Dependência:** P-03 (rota da comparação).
