# Inventário de componentes e roadmap visual R3 → R7

**Registrado em 2026-08-05.** Normativo para implementação visual.
Subordinado a [`VISUAL-IMPLEMENTATION-CONTRACT.md`](./VISUAL-IMPLEMENTATION-CONTRACT.md).

> **Nada aqui foi implementado.** Nenhum componente, CSS ou rota foi criado na missão que
> escreveu este documento.

---

## 1. Inventário

Legenda de estado: **existe** = está na `main` hoje · **evoluir** = existe e muda ·
**novo** = não existe.

### Estrutura

| Componente         | Estado   | Responsabilidade                            | Campos / props                  | Estados        | Onde aparece | Card |
| ------------------ | -------- | ------------------------------------------- | ------------------------------- | -------------- | ------------ | ---- |
| `AppShell`         | evoluir  | moldura: fundo creme, larguras, área segura | `children`                      | —              | todas        | —    |
| `Header`           | evoluir  | marca e retorno                             | `title?`, `onBack?`, `actions?` | raiz, interna  | todas        | —    |
| `BottomNavigation` | **novo** | navegação primária                          | `current`                       | ativo, inativo | A, B, C, D   | —    |
| `Skeleton`         | evoluir  | carregamento sem deslocar layout            | `variant`                       | —              | todas        | —    |
| `EmptyState`       | evoluir  | ausência **explicada**, com saída           | `titulo`, `descricao`, `acao?`  | —              | A, B         | —    |
| `ErrorState`       | evoluir  | falha com `role="alert"` e nova tentativa   | `mensagem`, `onRetry`           | —              | todas        | —    |

`BottomNavigation` é o único componente estrutural realmente novo — e é também o que **não pode
ser copiado da imagem**: o mockup mostra cinco abas, uma delas "Favoritos", que está fora do
MVP. A composição real sai das rotas existentes, decidida em R3.3.

### Identidade de produto

| Componente         | Estado   | Responsabilidade                                        | Campos                                 | Estados                 | Onde    | Card          |
| ------------------ | -------- | ------------------------------------------------------- | -------------------------------------- | ----------------------- | ------- | ------------- |
| `ProductIdentity`  | **novo** | tornar o SKU reconhecível **antes** do preço            | `name`, `brand`, `variant`, `sizeText` | completa, compacta      | B, C, D | MVP-DESIGN-03 |
| `ProductImage`     | evoluir  | imagem **só** com correspondência exata                 | `src?`, `alt`, `categoria`             | com imagem, placeholder | B, C, D | MVP-DESIGN-04 |
| `ImagePlaceholder` | **novo** | SVG por categoria, decorativo (`alt=""`, `aria-hidden`) | `categoria`                            | —                       | B, C, D | MVP-DESIGN-04 |

`ProductImage` não decide se a imagem corresponde — quem decide é o dado revisado. O componente
só sabe renderizar o que recebe, e cai para placeholder quando não recebe. Ver
[`IMAGE-POLICY.md`](../data/IMAGE-POLICY.md).

### Preço e procedência

| Componente           | Estado   | Responsabilidade                                           | Campos                                     | Estados                               | Onde       | Card      |
| -------------------- | -------- | ---------------------------------------------------------- | ------------------------------------------ | ------------------------------------- | ---------- | --------- |
| `ProvenanceBlock`    | **novo** | o bloco inseparável: fonte, data, validade                 | `sourceType`, `observedAt`, `validUntil`   | vigente, expirando, expirado          | A, B, C, D | MVP-E2-08 |
| `UnitPrice`          | evoluir  | preço unitário **condicional**                             | `quantity`, `unit`, `price`                | presente, **ausente** (não renderiza) | B, C, D    | MVP-E2-06 |
| `OfferStatus`        | **novo** | estado da oferta em **texto**, não só cor                  | `estado`                                   | ativa, expirando, expirada            | C, D       | MVP-E2-08 |
| `ValidityLabel`      | **novo** | validade legível, sem urgência fabricada                   | `validUntil`                               | com data, sem data                    | A, C, D    | MVP-E2-08 |
| `PromotionCondition` | **novo** | promoção **sempre** com a condição junto                   | `tipo`, `condicao`, `limitePorCliente?`    | com limite, sem limite                | C, D       | MVP-E2-07 |
| `MarketPriceRow`     | **novo** | uma linha do ranking: posição, mercado, preço, procedência | `posicao`, `market`, `price`, `provenance` | normal, mais barato, desatualizado    | C          | MVP-E2-05 |

`UnitPrice` tem um estado que é o mais importante e o mais fácil de errar: **ausente**. Ele não
renderiza traço, não renderiza zero, não estima. Some. A quantidade estruturada que o alimenta é
alvo de E1 e **ainda não existe no banco** — `size_text` é texto livre e não serve para cálculo.

### Cards

| Componente          | Estado   | Responsabilidade                          | Campos          | Estados                           | Onde | Card              |
| ------------------- | -------- | ----------------------------------------- | --------------- | --------------------------------- | ---- | ----------------- |
| `ProductCard v2`    | evoluir  | evolução do `AchadoCard` — a peça central | oferta completa | normal, desatualizado, sem imagem | A, B | **MVP-DESIGN-03** |
| `FeaturedOfferCard` | **novo** | destaque do dia, visualmente distinto     | oferta completa | presente, **ausente**             | A    | MVP-DESIGN-05     |

`FeaturedOfferCard` carrega um risco de produto, não de código: se não houver critério objetivo
para eleger o destaque, ele vira ranking editorial — e ranking editorial é o oposto da
neutralidade. Enquanto o critério não estiver escrito e testado, a Home mostra a lista sem
destaque.

`ProductCard v2` tem spec própria em [`CARD-V2-SPEC.md`](./CARD-V2-SPEC.md), incluindo alvo de
toque ≥ 48 px, preço fora da árvore de acessibilidade com `spokenPrice()` e variação percentual
com rótulo textual.

### Ações e confiança

| Componente          | Estado   | Responsabilidade                                       | Campos                 | Estados                         | Onde    | Card      |
| ------------------- | -------- | ------------------------------------------------------ | ---------------------- | ------------------------------- | ------- | --------- |
| `SearchField`       | evoluir  | busca persistente com limpar                           | `value`, `onChange`    | vazio, preenchido, carregando   | A, B    | MVP-E2-02 |
| `WhatsAppCTA`       | existe   | `wa.me` configurável, **sem formulário**               | `numero`, `mensagem?`  | ativo, **oculto** se não houver | A, D, E | —         |
| `ShareAction`       | existe   | compartilhar com feedback **semântico**                | `url`, `titulo`        | ocioso, copiado, erro           | C, D    | MVP-E2-10 |
| `ConfidencePanel`   | **novo** | mercado, fonte, atualização, validade em bloco próprio | `provenance`, `market` | completo, parcial               | D       | MVP-E2-08 |
| `MarketBadge`       | **novo** | identifica o mercado **sem** logotipo de terceiro      | `nome`, `bairro`       | —                               | B, C, D | —         |
| `NeighborhoodLabel` | **novo** | bairro como âncora de proximidade                      | `bairro`, `cidade?`    | —                               | A, C, D | —         |

`MarketBadge` **não** usa logotipo de rede. Os logos no mockup são ilustrativos e não há direito
de uso — a identificação é textual até que exista autorização registrada.

`ShareAction` já teve correção de feedback semântico e de borda visível em rodada anterior;
evoluir não pode regredir isso.

### Fora de escopo do inventário

Favoritos · notificações · login · geolocalização · mapa · comparação de cesta · histórico de
preço para o usuário. Todos em "Fora do MVP",
[`ROADMAP-MVP-v3.md`](./ROADMAP-MVP-v3.md) §4.

---

## 2. Roadmap visual

### Ordem

| Etapa    | Entrega                                  | Toca a Home? |
| -------- | ---------------------------------------- | ------------ |
| **R3.1** | design tokens e fundação visual          | **não**      |
| **R3.2** | `ProductCard v2` isolado, em laboratório | **não**      |
| **R3.3** | Home / Achados                           | sim          |
| **R4**   | busca por produto exato                  | —            |
| **R5**   | comparação entre mercados                | —            |
| **R6**   | detalhe, imagens, promoções e estados    | —            |
| **R7**   | WhatsApp, analytics, acessibilidade e QA | —            |

### O primeiro PR visual

Trata **somente**: tokens, tipografia, espaçamento, primitivas e uma rota de laboratório
isolada.

**Não altera a Home.** A razão é prática: token novo aplicado direto na Home mistura, num único
diff, "a fundação mudou" com "a tela mudou" — e quando algo regride não há como saber qual dos
dois causou. O laboratório isolado deixa o Founder ver a fundação antes de ela ter consequência.

### Critérios de entrada e saída

| Etapa    | Entra quando                                                              | Sai quando                                                                                           |
| -------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **R3.1** | este contrato mergeado; autorização específica do Founder para iniciar R3 | tokens em `src/styles.css`; contraste AA calculado e **medido**; laboratório navegável; Home intacta |
| **R3.2** | R3.1 aprovada                                                             | Card v2 conforme `CARD-V2-SPEC.md`; os 17 itens; testes de contrato; capturas; **Gate do Founder**   |
| **R3.3** | R3.2 aprovada                                                             | Home com busca na primeira dobra; cinco estados; `index.ssr.test.ts` verde; capturas; **Gate**       |
| **R4**   | R3.3 aprovada **e** identidade exata disponível                           | exato separado de similar; sem promessa absoluta; capturas; **Gate**                                 |
| **R5**   | R4 aprovada                                                               | ordem determinística testada; um preço por mercado; neutralidade testada; capturas; **Gate**         |
| **R6**   | R5 aprovada **e** política de imagem aplicável                            | estados da oferta; promoção com condição; preço anterior condicionado; capturas; **Gate**            |
| **R7**   | R6 aprovada                                                               | WhatsApp; analytics first-party; auditoria WCAG 2.2 AA; QA de regressão visual; **Gate**             |

Nenhuma dessas etapas começa na missão que escreveu este documento.

---

## 3. Conflito de etapa com o `TRELLO-MAPPING` — não resolvido aqui

O roadmap acima coloca o **Card v2 antes da Home** (R3.2 → R3.3). O
[`TRELLO-MAPPING.md`](../pmo/TRELLO-MAPPING.md) vigente registra outra coisa:

| Card                                     | Etapa no mapping | Etapa neste roadmap |
| ---------------------------------------- | ---------------- | ------------------- |
| MVP-DESIGN-03 — Card v2, anatomia dos 17 | **R6**           | **R3.2**            |
| MVP-DESIGN-05 — Nova ordem da Home       | **R4**           | **R3.3**            |
| MVP-DESIGN-01 — Protótipo da busca       | R3               | R4                  |
| MVP-DESIGN-02 — Protótipo da comparação  | R3               | R5                  |

**Não alterei o campo `Etapa` desses cards.** Alterá-los seria reescrever o
`MVP-EXECUTION-PLAN.md` por conta própria, a partir de uma ordem que veio no mandato mas que
não foi registrada como decisão de reordenar o plano de execução — e o plano é normativo.

O conflito é real e precisa de decisão explícita do Founder/PMO:

- **opção A** — o roadmap visual (Card v2 primeiro) passa a valer, e as etapas dos quatro cards
  são atualizadas em PR próprio, com registro no decision log;
- **opção B** — o `MVP-EXECUTION-PLAN.md` prevalece, e a §2 deste documento é corrigida para
  refletir R3/R4/R6.

Enquanto não houver decisão, vale o `MVP-EXECUTION-PLAN.md`, pela ordem de precedência do
[`docs/INDEX.md`](../INDEX.md). Este documento fica marcado como **pendente de reconciliação**
neste ponto específico — e só neste.

Registrar o conflito custa um parágrafo. Descobri-lo no meio da implementação custa uma etapa
inteira refeita.
