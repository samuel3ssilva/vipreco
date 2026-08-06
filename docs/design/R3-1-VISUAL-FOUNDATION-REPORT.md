# R3.1 — fundação visual: o que foi construído, o que foi medido, o que diverge

**Registrado em 05/08/2026.** Descritivo. Acompanha o PR de `feat/r31-visual-foundation`,
que **não** deve ser mergeado antes do Gate visual do Founder.

Fontes normativas: [`../product/VISUAL-IMPLEMENTATION-CONTRACT.md`](../product/VISUAL-IMPLEMENTATION-CONTRACT.md),
[`../product/R3-SCREEN-SPEC.md`](../product/R3-SCREEN-SPEC.md),
[`../product/R3-COMPONENT-INVENTORY.md`](../product/R3-COMPONENT-INVENTORY.md).

---

## 1. O que R3.1 fez

| Camada          | O que aconteceu                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Tokens**      | **nenhum token novo.** A camada `--vp-*` já existia e já cobria tudo o que o mandato §13.A pede |
| **Catálogo**    | `src/design/tokens.ts` — o que existe, em que grupo, para que serve e para que **não** serve    |
| **Verificação** | 127 testes amarram o catálogo ao `styles.css` e medem contraste sobre os valores reais          |
| **Primitivas**  | 11, em `src/components/primitives/`, renderizadas em teste — não verificadas por leitura        |
| **Laboratório** | `/laboratorio-visual`, com portão de build e `noindex`                                          |

### Por que a fundação não criou token

A camada `--vp-*` do Brand System v2 já traz cor, tipografia, espaço, raio, sombra, ícone,
largura, breakpoint, foco, estado desabilitado e movimento. Acrescentar uma segunda escala
por cima seria a abstração excessiva contra a qual o mandato §13.C avisa — e o efeito
prático seria pior que o custo: dois lugares definindo a mesma cor divergem, sempre.

O que faltava não era token. Era **prova**. Os valores viviam num arquivo CSS que ninguém
podia consultar por código e cujo contraste ninguém tinha como reconferir depois do
recálculo da Onda 3. Agora o catálogo é lido por teste, e o teste falha se o CSS mudar sem
o catálogo mudar junto.

---

## 2. O que foi medido

Medições feitas contra o `bun run dev` real, no navegador, e não estimadas.

| O quê                                          | 320 px       | 390 px  | 1280 px |
| ---------------------------------------------- | ------------ | ------- | ------- |
| Scroll horizontal da página                    | **não**      | **não** | **não** |
| Elementos estourando fora de container rolável | **0**        | **0**   | **0**   |
| Alvos interativos abaixo de 48 px              | **0** (de 6) | **0**   | **0**   |

A tabela de contraste da §5 do laboratório é mais larga que 320 px de propósito, e rola
**dentro do próprio container** (`overflow-x-auto`). O documento não rola na horizontal —
que é a propriedade que importa. Conteúdo largo rolando em si mesmo é o padrão correto;
o que não pode acontecer é a página inteira deslizar.

### Foco, por teclado e não por suposição

Com `Tab`, o primeiro controle recebe `outline: 2px solid rgb(14, 92, 60)` com `2px` de
offset — exatamente `--vp-focus`. Medido com `:focus-visible` confirmado pelo navegador.

Vale registrar por que a primeira medição **não** serviu: `elemento.focus()` por script não
ativa `:focus-visible` no Chromium para um elemento que também é focável por mouse. Isso é
comportamento correto do navegador, não defeito — e é a razão de a verificação ter sido
refeita com tecla de verdade.

### Contraste

Os 13 pares de [`tokens.ts`](../../src/design/tokens.ts) atingem o mínimo do WCAG 2.2 — 4.5:1
para texto normal, 3:1 para contorno e componente. Calculado pela fórmula de luminância
relativa sobre os hex resolvidos, e não copiado do recálculo anterior.

O teste inclui controle positivo: `--vp-text-faint` sobre o creme mede **abaixo** de 4.5:1,
e a suíte afirma isso. Sem esse caso, um defeito que fizesse a função devolver sempre um
número grande passaria a suíte inteira em silêncio.

---

## 3. Divergências

### D1 — `--vp-action-disabled` existe e não é usado

**Medido:** um botão primário desabilitado renderiza `background-color: rgb(14, 92, 60)`
com `opacity: 0.6`. O token `--vp-action-disabled` (`#c9d6cf`) não participa.

Vem da utilitária `btn-base:disabled`, que é compartilhada por **todos** os botões do
produto. Trocar opacidade por token de cor mudaria a aparência de cada botão existente — o
que está fora do escopo de uma fundação que não deve tocar a Home.

**Não corrigido de propósito.** É decisão de direção visual, não de implementação: ou o
token some, ou a utilitária muda e todos os botões mudam junto. As duas saídas são do
Founder.

### D2 — as famílias tipográficas não são self-hosted

`--vp-font-display` pede "Bricolage Grotesque" e `--vp-font-body` pede "Public Sans".
Nenhuma das duas é servida pelo projeto: o que renderiza hoje é a pilha de fallback
(`system-ui` e afins). O mandato §13.B manda **confirmar** as fontes e não adicionar fonte
sem licença e necessidade — então esta é a confirmação, e não uma tarefa executada.

Consequência prática: o screenshot do laboratório mostra a métrica do fallback, não a da
marca. Ao aprovar forma e densidade, é isso que está sendo aprovado.

### D3 — os seis conflitos do contrato continuam conflitos

Preço unitário, preço anterior, barra de cinco abas, Favoritos, sino de notificação e
logotipos de rede seguem exatamente como a §2 do contrato visual os registrou. R3.1 não
implementou nenhum, e o laboratório não os insinua.

Isso é resultado, não pendência: uma fundação que trouxesse "só um exemplinho" de preço
unitário estaria decidindo, por implementação, uma questão que o contrato reservou.

---

## 4. O que **não** foi feito, e por quê

| Item                           | Por quê                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| Home                           | proibido pelo mandato §13; um teste compara a branch com `origin/main`    |
| as cinco telas                 | R3.2 em diante, cada uma com contrato e Gate próprios                     |
| `BottomNavigation`             | a composição real sai das rotas, decidida em R3.3 — não copiada da imagem |
| `ProductCard v2`               | tem spec própria (`CARD-V2-SPEC.md`) e depende de dado                    |
| qualquer dependência nova      | nenhuma foi adicionada                                                    |
| **arquivos PNG de screenshot** | ver abaixo                                                                |

### Sobre os screenshots

O mandato §15 pede screenshots em 320 px, 390 px e desktop, e o contrato visual §4 explica
por quê: sem eles, a revisão do Founder vira confiança cega.

**As três telas foram capturadas e conferidas**, e as medições da §2 saíram delas. O que
não foi possível foi **gravar arquivos PNG versionados**: o ambiente de execução não tem
navegador headless, e instalar um (Playwright ou equivalente) adicionaria dependência que o
mandato §16 pede para não adicionar.

O caminho de um comando, sem instalar nada:

```bash
bun run dev
```

e abrir `http://localhost:8080/laboratorio-visual`. O portão está aberto em
desenvolvimento; em build de produção a rota **não existe** sem `VITE_VISUAL_LAB=1`.

Registrado como `NOT VERIFIED` no checkpoint, e não como concluído.

---

## 5. Comparação com o North Star

Sem pixel perfect nesta fase, como o mandato §15 permite.

| Dimensão     | Alinhado                                                           | Divergente                          |
| ------------ | ------------------------------------------------------------------ | ----------------------------------- |
| Cores        | fundo creme, verde-escuro principal, verde suave, amarelo restrito | —                                   |
| Cantos       | raio consistente, card como unidade de leitura                     | —                                   |
| Sombras      | discretas, três degraus, separam sem decorar                       | —                                   |
| Densidade    | respiro generoso em 320 px, sem aperto                             | —                                   |
| Legibilidade | contraste AA em todos os pares medidos                             | —                                   |
| Hierarquia   | não avaliável: depende de tela com conteúdo, que é R3.2            | —                                   |
| Tipografia   | escala instalada e conferida                                       | **D2** — famílias em fallback       |
| Estados      | foco, desabilitado, carregando e placeholder presentes             | **D1** — desabilitado por opacidade |

---

## 6. O que segue para o Card v2

- decidir D1 (o token de desabilitado, ou a utilitária compartilhada);
- decidir D2 (self-hosting das famílias, com licença);
- `ProductIdentity`, `ProvenanceBlock`, `UnitPrice`, `OfferStatus`, `ValidityLabel`,
  `PromotionCondition`, `MarketPriceRow` — todos dependem de dado e de contrato funcional,
  e nenhum cabe numa fundação;
- o critério objetivo de eleição do destaque do dia. Enquanto ele não estiver escrito e
  testado, `FeaturedOfferCard` não existe: sem critério, destaque vira ranking editorial, e
  ranking editorial é o oposto da neutralidade.
