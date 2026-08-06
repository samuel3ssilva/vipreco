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

| Onde                                         | O quê                                                         |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/card-v2.ts`                         | **as regras** — função pura que decide o que pode ser exibido |
| `src/components/card-v2/product-card-v2.tsx` | o card e o seu esqueleto                                      |
| `src/components/card-v2/identity.tsx`        | `ProductIdentity`, `ProductImage`                             |
| `src/components/card-v2/market.tsx`          | `MarketBadge`, `NeighborhoodLabel`                            |
| `src/components/card-v2/price.tsx`           | `PriceDisplay`, `UnitPrice`, `PromotionCondition`             |
| `src/components/card-v2/provenance.tsx`      | `ProvenanceBlock`, `ValidityLabel`, `OfferStatus`             |
| `src/components/card-v2/fixtures.ts`         | as ofertas fictícias das oito variantes                       |
| `src/routes/laboratorio-card-v2.tsx`         | o laboratório, com portão e `noindex`                         |

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
| **A**  | Oferta padrão                     | imagem aprovada e exata, preço unitário presente, validade informada    |
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
variante e quantidade · **estado, quando não ativo** · preço observado · preço unitário
condicionado · mercado e bairro · promoção · procedência (fonte, data, validade) · aviso
parcial · CTA.

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
| ~~`previous_*`~~           | **removido em 06/08/2026** — §9.1 e DL-030                 |
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
- todo estado tem **rótulo escrito**; a tarja temporal é `aria-hidden`, e a oferta fora da
  lista orgânica é distinguível por três canais independentes — rótulo, preço atenuado e
  tarja;
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

### 6.3 O guarda de "a Home não mudou" era vazio — duas vezes

Um controle positivo (`card-v2.ts` **deve** aparecer como novo) reprovou duas vezes, e cada
reprovação expôs um buraco diferente.

**Localmente:** o teste usava `git diff origin/main...HEAD`, que só enxerga o que já foi
commitado. Na árvore de trabalho ele devolvia "não mudou" para tudo, inclusive para arquivos
que a branch estava criando naquele instante. Um guarda que só acorda depois do commit não
protege quem está editando. Passou a comparar a árvore de trabalho e a considerar arquivos
ainda não rastreados.

**No CI:** `actions/checkout` clona com profundidade 1 por padrão, então `origin/main` **não
existe** no runner. O `catch` devolvia `false` — literalmente **"não mudou"** — e o check
ficava verde por vacuidade justamente onde alguém lê o verde como prova de que a Home
continua intacta. Confirmado reproduzindo o cenário: um `git clone --depth 1` da própria
branch não resolve `origin/main`.

A resposta não é "não mudou": é **"não medi"** — e, no fim, nem "não medi" é resposta
aceitável para um check que alguém lê como garantia.

**Fechado no PR [#90](https://github.com/samuel3ssilva/vipreco/pull/90)** (merge `9d40c82`),
em duas metades, nenhuma suficiente sozinha:

1. **`fetch-depth: 0`** no `actions/checkout` do CI — `origin/main` passa a existir no
   runner, e a comparação passa a ser **possível**;
2. **`src/test-support/git-guard.ts`**, que **lança** quando não consegue comparar — a
   impossibilidade deixa de ser confundível com sucesso. Se a linha do `fetch-depth` sumir
   amanhã, o CI fica vermelho com o motivo escrito, em vez de verde sem ter medido.

A segunda metade é a que não caduca: a primeira é configuração, a segunda é contrato.

A prova de que não é vacuidade está no PR: o mesmo commit, no mesmo clone, falha em 9 testes
com `git clone --depth 1` e passa com histórico completo. Antes da correção, os mesmos 9
passavam nos dois casos.

O controle positivo mudou de lugar por um motivo concreto: ele vivia aqui e usava
`src/lib/card-v2.ts`, que **esta branch cria**. Provava o detector hoje e viraria uma falha
na `main` no dia do merge, quando o arquivo deixasse de ser novidade. Agora vive junto do
guarda, feito com um arquivo temporário, e independe de qual branch está sendo testada.

`src/routes/laboratorio-visual.contract.test.ts`, da R3.1, tinha o mesmo buraco e passou a
usar o guarda compartilhado no mesmo PR.

---

## 7. O que continua fora

Nada aqui foi decidido por esta entrega, e cada item tem gate próprio:

- **Home, busca, comparação, detalhe, navegação e ranking** — inalterados, provado por `git diff` dentro de teste;
- **promoções tipificadas** (`unit_limit`, `buy_x_pay_y`, …) — MVP-E2-07, sem coluna no banco;
- **preço anterior e variação percentual** — removidos em 06/08/2026 (§9.1, DL-030); voltam em
  R6/R8, depois de **P-01** ser decidida. **A Home ainda os exibe**, por `AchadoCard.tsx`, e é
  caminho protegido desta branch: pendência de R3.3;
- **política de imagem aplicada a imagem real** — R6; a única imagem do laboratório é um
  desenho geométrico embutido, rotulado como demonstração;
- **backfill de quantidade** — MVP-E1-08, proibido;
- **`FeaturedOfferCard`** — depende de um critério objetivo de destaque que ainda não existe,
  e destaque sem critério é ranking editorial.

---

## 8. Divergência de mapeamento — **RESOLVIDA EM 06/08/2026**

O card oficial do Card v2 é **MVP-DESIGN-03**, e o
[`TRELLO-MAPPING.md`](../pmo/TRELLO-MAPPING.md) o registrava em **Etapa R6**, dependendo de
MVP-DESIGN-02. O roadmap visual do `R3-COMPONENT-INVENTORY.md` §2 o colocava em **R3.2**, e a
§3 daquele documento registrava o conflito como pendente de decisão.

O mandato de R3.2 autorizava construir o Card v2 **e** determinava mover o card apenas
"quando o mapping oficial permitir". O mapping não permitia, e reescrever o plano de execução
por conta própria trocaria a fonte normativa por uma leitura minha.

**O Founder/PMO decidiu pela opção A** no mandato de 06/08/2026: o Card v2 é R3.2, a Home é
R3.3, a busca é R4 e a comparação é R5. Registro em
[`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) DL-028 e em
[`../product/ROADMAP-MVP-V2.md`](../product/ROADMAP-MVP-V2.md) §3. As quatro etapas foram
atualizadas no mapping e no quadro real — **só o campo `Etapa`**; objetivo, aceite, gate e
evidência de cada card continuam intactos.

---

## 9. Refinamento visual de 06/08/2026

Segunda passada sobre o mesmo card, com o PR ainda sem merge. **Nenhuma anatomia mudou:** os
17 itens continuam os mesmos, as oito variantes continuam as mesmas, nenhum componente foi
redesenhado. O que mudou foi **ritmo e peso**.

### 9.1 O histórico de preço saiu

O card exibia "antes R$ 14,90 · 13% mais barato que em 25/07/2026", e exibia direito: frase em
vez de percentual colorido, data ao lado, nada calculado dentro do JSX, corte de 1% aplicado
sobre o valor estabilizado. **A regra estava certa. O que faltava era o contrato.**

"Preço anterior" só significa alguma coisa depois que alguém disser **qual** observação
anterior conta — a última? a de sete dias atrás? a mais alta da janela? Essa decisão é a
pendência **P-01** (card MVP-DOCS-02) e nunca foi tomada. Sem ela, dois cards com o mesmo dado
exibem percentuais diferentes e os dois estão "certos" — e um percentual que ninguém consegue
defender corrói a confiança que o produto existe para construir.

Saiu do domínio, do componente, do fixture e da demonstração. Não sobrou caminho desligado por
configuração nem campo atrás de flag: quem reintroduzir isso em R6/R8 vai escrever contra o
contrato que P-01 produzir. Dois testes novos impedem a volta silenciosa — um verifica que a
visão não expõe campo de histórico, outro que um `previous_price` vindo de JSON não produz
saída nenhuma.

**O mesmo histórico continua vivo na Home, e isso é um achado, não um esquecimento.**
`AchadoCard.tsx` renderiza `previous_price` desde a Parte 2, alimentado por
`demo-opportunities.ts`. Não toquei: `src/components/AchadoCard.tsx` é caminho protegido desta
branch e o mandato proíbe alterar pixels fora do Card v2. **Fica registrado como pendência de
R3.3**, quando a Home for reescrita — e sob a mesma regra: com P-01 decidida, ou sem histórico.

### 9.2 Revisão especializada — Fable 5

Executada em 06/08/2026 sobre as quatro capturas anteriores e os cinco arquivos do componente.
Nove recomendações, classificadas uma a uma:

| #   | Recomendação                                          | Severidade | Decisão     |
| --- | ----------------------------------------------------- | ---------- | ----------- |
| 1   | Separação entre zonas uniforme demais                 | alta       | **adotar**  |
| 2   | Altura em lista (~450 px de CSS por card a 320 px)    | alta       | **adotar**  |
| 3   | CTA em caixa repetida vira "mural de botões"          | média      | **adaptar** |
| 4   | Selo de estado sólido domina a identidade             | média      | **adotar**  |
| 5   | Frases explicativas duplicam a procedência            | média      | **adotar**  |
| 6   | A 320 px o bloco de procedência muda de forma         | baixa      | **adotar**  |
| 7   | `package_type` cru repete a variante e vem sem acento | baixa      | **adotar**  |
| 8   | Quantidade longa em mono bold pesa sobre a identidade | baixa      | **adotar**  |
| 9   | Barriga vazia entre procedência e CTA no desktop      | baixa      | **anotar**  |

**#3 é a única adaptada, e o motivo importa.** A recomendação era transformar o CTA em link
discreto na variante de lista, para economizar altura. Rejeitei a forma e aceitei o
diagnóstico: o CTA é a única ação do card e leva à comparação, que é o **núcleo do produto** —
economizar oito pixels enfraquecendo a ação que o card existe para oferecer troca propósito
por densidade. O que mudou foi o peso: superfície discreta em vez de caixa contornada, com o
mesmo alvo de 48 px e o mesmo texto.

**#9 não virou mudança de código.** A barriga vazia é artefato da grade de duas colunas do
laboratório, onde `mt-auto` empurra o CTA para o fundo de cards de alturas diferentes. Fica
anotado para R3.3: uma tela do consumidor em duas colunas precisa alinhar `items-start` ou
aceitar alturas diferentes.

**O que a revisão olhou e não achou problema** — registrado porque importa tanto quanto o
resto: contraste medido por amostragem de pixel (texto secundário 5,63:1); ausência de rolagem
horizontal a 320 px com preço de quatro dígitos e nome de mercado longo; o bloco fonte + data

- validade inseparável por construção; neutralidade (nada no card influencia ordem); ausência
  de urgência fabricada; placeholder sem espaço quebrado; alvos de toque.

### 9.3 O que encolheu, e o que não

| Captura   | Antes  | Depois | Diferença |
| --------- | ------ | ------ | --------- |
| 320 px    | 22 184 | 21 240 | −944 px   |
| 390 px    | 20 158 | 19 494 | −664      |
| desktop   | 15 404 | 14 790 | −614      |
| variantes | 6 880  | 6 364  | −516      |

**Nenhum dos 17 itens saiu por causa de altura.** O que saiu foi repetição: a frase que
explicava o selo dizia o que a linha de procedência já provava três linhas abaixo. O histórico
saiu por falta de contrato, e teria saído mesmo que o card estivesse curto.

### 9.4 Um token novo, e por que ele é token

O selo de estado passou de vermelho sólido a par suave. Em vez de escrever a cor no
componente, entraram dois tokens em `styles.css` — `--destructive-surface` e
`--destructive-surface-foreground` — e um tom novo no `Badge` da R3.1: `critico-suave`.

É a fundação visual fazendo o trabalho dela. Uma cor escrita à mão dentro de um card é uma
decisão de design que nenhum outro componente enxerga; um token é a mesma decisão disponível
para a próxima tela que precisar dizer "isto não vale mais" sem gritar. Contraste medido:
**5,34:1** — AA para texto normal, e portanto para o `text-xs font-semibold` do selo.

O par sólido continua existindo e continua certo quando a mensagem **é** um alarme.
