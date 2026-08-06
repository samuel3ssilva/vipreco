# R3.2 — Card v2 de produto exato

**Registrado em 2026-08-06.** Descritivo do que foi entregue na branch
`feat/r32-product-card-v2`. Subordinado a
[`CARD-V2-SPEC.md`](../product/CARD-V2-SPEC.md),
[`R3-SCREEN-SPEC.md`](../product/R3-SCREEN-SPEC.md),
[`R3-COMPONENT-INVENTORY.md`](../product/R3-COMPONENT-INVENTORY.md) e
[`VISUAL-IMPLEMENTATION-CONTRACT.md`](../product/VISUAL-IMPLEMENTATION-CONTRACT.md).

> **A Home, a busca, a comparação, o detalhe e o ranking não foram tocados.** O Card v2 vive
> isolado numa rota de laboratório, atrás do mesmo portão fechado-por-padrão da R3.1.
> Nenhuma migration, nenhum dado remoto, nenhum deploy.

---

## 1. O que foi construído

| Onde                                         | O quê                                                              |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `src/lib/card-v2.ts`                         | **as regras** — função pura que decide o que pode ser exibido      |
| `src/components/card-v2/product-card-v2.tsx` | o card e o seu esqueleto                                           |
| `src/components/card-v2/identity.tsx`        | `ProductIdentity`, `ProductImage`                                  |
| `src/components/card-v2/market.tsx`          | `MarketBadge`, `NeighborhoodLabel`                                 |
| `src/components/card-v2/price.tsx`           | `PriceDisplay`, `PreviousPrice`, `UnitPrice`, `PromotionCondition` |
| `src/components/card-v2/provenance.tsx`      | `ProvenanceBlock`, `ValidityLabel`, `OfferStatus`                  |
| `src/components/card-v2/fixtures.ts`         | as ofertas fictícias das oito variantes                            |
| `src/routes/laboratorio-card-v2.tsx`         | o laboratório, com portão e `noindex`                              |

### A separação que sustenta o resto

Quase toda regra do `CARD-V2-SPEC.md` é uma decisão sobre **exibir ou não exibir**. Essas
decisões vivem em `montarVisaoDoCard()`, sem DOM, e o componente desenha o que ela permitiu.

A alternativa — condições espremidas entre elementos JSX — funciona igual e se verifica
muito pior: "preço unitário só com quantidade aprovada" vira um `&&` no meio de uma árvore
de elementos, que é a coisa mais fácil de mudar por engano de todo o React. Aqui a mesma
frase se interroga com uma chamada de função, e é o que 49 testes fazem.

---

## 2. As oito variantes

| Chave  | Variante                          | O que ela prova                                                         |
| ------ | --------------------------------- | ----------------------------------------------------------------------- |
| **A**  | Oferta padrão                     | imagem aprovada e exata, preço unitário presente, percentual com data   |
| **B**  | Promoção com condição             | o requisito por extenso, junto do preço, com validade ao lado           |
| **C**  | Sem imagem confiável              | imagem **aprovada porém aproximada** cai em placeholder                 |
| **D1** | Desatualizada — validade vencida  | `expired` pelo relógio; preço atenuado; CTA muda; sai da lista orgânica |
| **D2** | Desatualizada — observação antiga | `desatualizada`, **não** `expired`: nunca houve validade para vencer    |
| **E**  | Quantidade não confiável          | nenhum preço unitário; `size_text` preservado como está escrito         |
| **F**  | Sem validade informada            | a ausência é **dita**; nenhuma data inventada                           |
| **G**  | Carregamento                      | esqueleto com a geometria do card; anúncio uma vez, pela região         |
| **H**  | Erro parcial                      | o campo indisponível é nomeado; o resto do card continua compreensível  |

`D` aparece em duas leituras porque "desatualizada" tem duas causas diferentes no domínio, e
o texto precisa distingui-las. Dizer "expirada" onde validade nenhuma foi informada seria
inventar uma validade só para poder anunciar que ela venceu.

**Nenhuma variante patrocinada foi desenhada.** Não existe contrato normativo aprovado na
`main` para conteúdo pago no card, e desenhá-lo agora decidiria o assunto pelo desenho.

---

## 3. Hierarquia, e as duas decisões que se afastam da ordem recomendada

Ordem entregue, de cima para baixo: imagem ou placeholder · identidade exata · marca,
variante e quantidade · **estado, quando não ativo** · preço observado · preço anterior ·
preço unitário condicionado · mercado e bairro · promoção · procedência (fonte, data,
validade) · aviso parcial · CTA.

**Produto exato aparece antes do preço.** Um preço que o leitor não sabe de qual item é não
serve para comparar nada.

Duas divergências deliberadas em relação à lista numerada do mandato §10:

1. **o rótulo de estado vem ANTES do preço.** Ler "R$ 9,90" e só depois descobrir que a
   oferta expirou é ler como vigente um preço que não é. O estado é condição de leitura do
   número, não nota de rodapé;
2. **a validade sobe para dentro do bloco de procedência**, junto de fonte e data, em vez de
   ficar isolada na posição 7. O `R3-SCREEN-SPEC.md` define fonte, data e validade como um
   bloco inseparável; separá-los para respeitar a numeração cumpriria a ordem e quebraria a
   regra que a ordem existe para servir.

---

## 4. Contrato de dados

`OfertaCardV2` **estende** `Opportunity` — o mesmo tipo que a Home e a comparação já usam.
Uma segunda forma para o mesmo conceito seria o começo de dois contratos para o mesmo dado.

Todo campo acrescentado é **opcional**, e isso não é conveniência:

| Campo                      | Por que é opcional                                         |
| -------------------------- | ---------------------------------------------------------- |
| `quantity_provenance`      | o backfill de quantidade (MVP-E1-08) continua **proibido** |
| `offer_state`              | a coluna é R8, com gate de segurança próprio               |
| `previous_*`               | depende de `price_events`, também R8                       |
| `image`                    | a política de imagem revisada é R6                         |
| `markets_with_valid_price` | depende da contagem de `COMPARISON-SPEC.md` §6             |

Exigir qualquer um deles faria o card só funcionar num banco que ainda não existe. Com todos
ausentes — que é o estado real de staging hoje — o card renderiza identidade, preço, mercado
e procedência, e **omite** o resto.

### O padrão de `quantity_provenance` é `missing`, e o padrão é o lado seguro

Ausência de procedência não é aprovação. Um produto com `quantity_value` preenchido e
procedência não declarada não libera preço unitário — libera a pergunta "quem aprovou isto?".

### O que o card não faz

Não normaliza texto (o contrato único é `normalize.ts` / `pa_normalize_text()`), não infere
quantidade a partir do nome, não persiste preço unitário, não mistura produto similar com
exato, e não sabe o que é ordenação — a ordem da lista orgânica continua sendo de
`comparison.ts`, por preço → observação → `id`.

Os quatro últimos são verificados por teste que lê os **imports** dos arquivos, e não a
promessa do cabeçalho.

---

## 5. Acessibilidade

- `<article>` com `aria-labelledby` apontando para o `<h2>` do próprio card — e o teste
  confere que o `id` referenciado **existe**;
- preço composto em dois tamanhos fora da árvore de acessibilidade, com `spokenPrice()` no
  lugar ("12 reais e 90 centavos");
- todo estado tem rótulo **e** explicação em texto; a tarja temporal é `aria-hidden`;
- variação percentual em frase — "13% mais barato que em 25/07/2026" —, nunca só cor e sinal;
- imagem com `alt` curto e factual; placeholder decorativo, sem `alt` enganoso;
- CTA com nome acessível e 48 px de altura, medido em cinco larguras;
- foco visível conferido com `Tab` de verdade (`:focus-visible`), anel de 2 px;
- o aviso de erro parcial é ligado ao CTA por `aria-describedby`, e o atributo **não** sobra
  apontando para o nada quando não há aviso;
- esqueleto `aria-hidden`, com o anúncio de carregamento na região, uma vez só.

---

## 6. Três defeitos encontrados durante a construção

Todos foram corrigidos. Ficam registrados porque cada um mostra um tipo de verificação que
faltava.

### 6.1 `Surface` engolia `aria-labelledby` — e a primitiva é da R3.1

`<Surface as="article" aria-labelledby={id}>` saía como `<article>` **sem rótulo nenhum**: a
primitiva aceitava só as próprias seis props e descartava o resto. Para quem enxerga, a tela
ficava perfeita; para quem usa leitor de tela, o card era anônimo.

Quem pegou foi o teste de **render**. O código-fonte do card tinha `aria-labelledby` escrito;
o HTML não tinha. Um teste que lesse o arquivo teria aprovado.

A mesma armadilha estava em `Stack` e `Inline`. As três passaram a repassar o resto das
props, com regressão em `primitives.test.tsx`.

### 6.2 Uma queda de exatamente 1% desaparecia

`(10,10 − 10,00) ÷ 10,00 × 100` é exatamente 1 em decimal e `0.9999999999999787` em binário.
Comparando o valor cru contra o limiar de 1%, o próprio limiar que a regra descreve caía
fora. A comparação passou a ser feita sobre o valor estabilizado em seis casas, e o corte
voltou a significar o que está escrito: **abaixo de 1% não é notícia; 1% é.**

### 6.3 O guarda de "a Home não mudou" era vazio antes do commit

O teste de contrato usava `git diff origin/main...HEAD`, que só enxerga o que já foi
commitado — na árvore de trabalho ele devolvia "não mudou" para tudo, inclusive para
arquivos que a branch estava criando naquele instante. Um controle positivo (`card-v2.ts`
**deve** aparecer como novo) reprovou e expôs o problema. Passou a comparar a árvore de
trabalho e a considerar arquivos ainda não rastreados.

---

## 7. O que continua fora

Nada aqui foi decidido por esta entrega, e cada item tem gate próprio:

- **Home, busca, comparação, detalhe, navegação e ranking** — inalterados, provado por `git diff` dentro de teste;
- **promoções tipificadas** (`unit_limit`, `buy_x_pay_y`, …) — MVP-E2-07, sem coluna no banco;
- **preço anterior derivado de `price_events`** — R8;
- **política de imagem aplicada a imagem real** — R6; a única imagem do laboratório é um
  desenho geométrico embutido, rotulado como demonstração;
- **backfill de quantidade** — MVP-E1-08, proibido;
- **`FeaturedOfferCard`** — depende de um critério objetivo de destaque que ainda não existe,
  e destaque sem critério é ranking editorial.

---

## 8. Divergência de mapeamento, não resolvida aqui

O card oficial do Card v2 é **MVP-DESIGN-03**, e o
[`TRELLO-MAPPING.md`](../pmo/TRELLO-MAPPING.md) o registra em **Etapa R6**, dependendo de
MVP-DESIGN-02. O roadmap visual do `R3-COMPONENT-INVENTORY.md` §2 o coloca em **R3.2**, e a
§3 daquele documento já registrava o conflito como pendente de decisão.

O mandato de R3.2 autoriza construir o Card v2 agora **e** determina mover o card apenas
"quando o mapping oficial permitir". O mapping não permite. Então o card permanece onde
está, com o estado registrado, e a reconciliação continua sendo decisão do Founder/PMO —
opção A (o roadmap visual passa a valer e as etapas dos quatro cards são atualizadas em PR
próprio, com registro no decision log) ou opção B (o `MVP-EXECUTION-PLAN.md` prevalece e a §2
do inventário é corrigida).

Reescrever o plano de execução por conta própria trocaria a fonte normativa por uma leitura
minha.
