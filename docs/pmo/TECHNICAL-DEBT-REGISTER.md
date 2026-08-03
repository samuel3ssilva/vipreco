# Registro de dívida técnica

**Status: NORMATIVO.** Achados da auditoria R0 e do trabalho subsequente. Cada item tem severidade,
dependência e o PR planejado.

Severidade: **alta** = produz erro silencioso em dado ou em ordenação · **média** = degrada com
escala · **baixa** = incompletude sem efeito hoje.

| ID          | Título                                       | Severidade | Estado                                           |
| ----------- | -------------------------------------------- | ---------- | ------------------------------------------------ |
| **TD-001A** | normalização SQL e TypeScript divergentes    | **alta**   | **RESOLVIDA pelo PR #47**, sujeita ao merge      |
| **TD-001B** | número e unidade com ou sem espaço           | **alta**   | **ABERTA** até a quantidade estruturada de R1/R2 |
| TD-002      | comparação sem terceiro desempate            | **alta**   | **RESOLVIDA pelo PR #46**, sujeita ao merge      |
| TD-003      | `markets.city` não consumido                 | baixa      | R2                                               |
| TD-004      | `getProductsPriceStats` sem `limit`          | média      | R4                                               |
| TD-005      | dupla busca na rota de produto               | baixa      | R5                                               |
| TD-006      | rota de produto sem `og:image` própria       | baixa      | R5                                               |
| TD-007      | `pg_trgm` instalado e não usado              | baixa      | R4                                               |
| TD-008      | rotas dinâmicas fora do `sitemap.xml`        | baixa      | R5                                               |
| TD-009      | estudos anteriores de fontes não localizados | média      | **ABERTA** — bloqueia spike pós-MVP              |

---

## TD-001 — Duplicação silenciosa de produto

O achado original foi dividido em dois, porque **um está resolvido e o outro não**, e tratá-los
como um só faria o PR #47 parecer uma solução completa contra duplicação de SKU. Ele não é.

---

## TD-001A — Normalização SQL e TypeScript divergentes

**Severidade: alta. Estado: RESOLVIDA pelo PR #47, sujeita ao merge.**

`normalizeSearchText()` (TypeScript) colapsa espaço repetido e remove espaço das pontas.
`pa_normalize_text()` (SQL) faz apenas minúsculas e remoção de acento.

**Risco: duplicação silenciosa de produtos por espaçamento.** O índice
`products_canonical_identity_idx` considera `"500 g"` e `"500  g"` identidades distintas. Numa
operação manual por WhatsApp, a mesma oferta digitada duas vezes com espaçamento diferente cria um
SKU novo, e a comparação se parte sem nenhum erro visível. Efeito secundário: um termo com espaço
duplo não encontra o `search_text` correspondente.

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

**O que o PR #47 faz — e o que ele não faz.** Ele alinha SQL e TypeScript e colapsa espaços
repetidos. Ele **não** resolve identidade por quantidade, e **não deve ser descrito como solução
completa contra duplicação de SKU**. O que sobra está em TD-001B.

---

## TD-001B — Número e unidade com ou sem espaço

**Severidade: alta. Estado: ABERTA** até a quantidade estruturada de R1/R2.

Estas quatro grafias continuam sendo, para o banco, produtos diferentes — antes e depois do PR #47:

```
500g      500 g
1L        1 L
```

O contrato de normalização **não colapsa** o espaço entre número e unidade, e isso é decisão, não
esquecimento: colapsar exigiria interpretar o texto para descobrir onde termina o número e começa a
unidade, e o princípio 3 (`dado estruturado antes de interpretação de texto`) decide contra.
Um parser de string acertaria `"500g"` e erraria em `"1kg de arroz tipo 1"`, `"pack 6x350ml"` ou
`"12 rolos"` — e erraria em silêncio.

**A resposta certa é E1.** `quantity_value = 500` + `quantity_unit = 'g'` torna a grafia
irrelevante: `"500g"` e `"500 g"` passam a ser o mesmo SKU porque a **quantidade** é a mesma, não
porque as strings ficaram parecidas.

**Risco enquanto estiver aberta:** a operação manual pode criar SKU duplicado digitando `"500g"` num
dia e `"500 g"` no outro. A mitigação atual é procedimental, não técnica — o checklist de
`docs/mvp/MANUAL-OFFER-OPERATIONS.md` §3 manda conferir se o produto já existe antes de criar.

**Ação:** quantidade e unidade estruturadas (`../data/MVP-DATA-CONTRACT.md` §1–2), com backfill
revisado linha a linha. **Dependência:** R1. **PR:** R1/R2, cards MVP-E1-01 e MVP-E1-08.

---

## TD-002 — Comparação sem terceiro desempate

**Severidade: alta. Estado: RESOLVIDA pelo PR #46, sujeita ao merge.**

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

---

## TD-009 — Estudos anteriores de fontes não localizados

**Severidade: média.** Não é dívida de código: é dívida de evidência.

O Founder/PMO relata **[F]** que dois estudos técnicos sobre fontes foram produzidos — um plano
sobre Pague Menos, São Vicente e Carrefour (`plano-coleta-automatica-ofertas.md`) e uma
investigação complementar sobre Savegnago e Atacadão (`investigacao-savegnago-atacadao.md`).
**NOT LOCATED** nesta missão; **NOT VERIFIED** quanto aos achados. Caminhos inspecionados e
classificação completa em [`../post-mvp/SOURCE-CONNECTOR-STATUS.md`](../post-mvp/SOURCE-CONNECTOR-STATUS.md) §4.

O custo de deixar aberto é concreto: sem os relatórios, PM-DATA-1 recomeça do zero e o trabalho já
feito é pago duas vezes — ou pior, é refeito com conclusões diferentes e ninguém sabe qual valia.

**Ação:** **os relatórios anteriores devem ser localizados, versionados ou substituídos por
evidência reproduzível antes de qualquer spike pós-MVP.** **PR:** nenhum de código — versionar os
arquivos, se encontrados. **Card:** PM-DATA-02. **Dependência:** ação humana do Founder/PMO.
**Fora de escopo:** refazer as investigações, acessar as fontes, reconstruir os relatórios por
suposição.
