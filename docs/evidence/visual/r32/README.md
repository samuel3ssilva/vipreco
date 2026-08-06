# R3.2 — evidência visual do Card v2

Capturas do laboratório do Card v2 (`/laboratorio-card-v2`), geradas em navegador de verdade
por `scripts/visual/screenshot-card-v2.ts`, contra o servidor de desenvolvimento local.

| Arquivo                        | O que é                               | Viewport CSS | PNG          |
| ------------------------------ | ------------------------------------- | ------------ | ------------ |
| `card-v2-320.png`              | página inteira                        | 320 px       | 640 × 21240  |
| `card-v2-390.png`              | página inteira                        | 390 px       | 780 × 19494  |
| `card-v2-desktop.png`          | página inteira                        | 1280 px      | 2560 × 14790 |
| `card-v2-variants.png`         | recorte da grade "em lista"           | 900 px       | 3536 × 6364  |
| `card-v2-list-390.png`         | **quatro cards consecutivos**         | 390 px       | 1528 × 6492  |
| `card-v2-comparison-board.png` | North Star ao lado das oito variantes | 1400 px      | 2800 × 4860  |

### A captura da lista responde outra pergunta

`card-v2-variants.png` mostra as oito variantes a 900 px, em duas colunas: ela serve para
conferir que **cada estado é reconhecível**. `card-v2-list-390.png` mostra quatro cards
consecutivos numa coluna só, na largura de um celular comum — e essa é a pergunta que o
usuário faz com o polegar: **quantos cards cabem, e o que se repete demais quando eles vêm um
atrás do outro.** Selo, CTA e bloco de procedência parecem discretos num card isolado e viram
textura numa lista.

Medido nesta execução: **400 px de CSS por card** a 390 px de largura.

### O que encolheu no refinamento de 06/08/2026

Mesma página, mesmas oito variantes, mesmo instante de referência:

| Captura   | Antes  | Depois | Diferença      |
| --------- | ------ | ------ | -------------- |
| 320 px    | 22 184 | 21 240 | −944 px de PNG |
| 390 px    | 20 158 | 19 494 | −664           |
| desktop   | 15 404 | 14 790 | −614           |
| variantes | 6 880  | 6 364  | −516           |

Nenhum dos 17 itens da anatomia saiu por causa de altura. O que saiu foi **repetição**: a
frase que explicava o selo de estado dizia o que a linha de procedência já provava três
linhas abaixo, e o histórico de preço saiu por falta de contrato (DL-030), não por espaço.

Para regerar:

```bash
bun run dev
bun scripts/visual/screenshot-card-v2.ts
bun scripts/visual/comparison-board-card-v2.ts
```

A ordem importa: o painel comparativo embute `card-v2-variants.png`, que o primeiro script
produz.

## O que estas imagens provam

- **As oito variantes obrigatórias existem e se comportam como o contrato manda.** Oferta
  padrão com imagem aprovada e preço unitário; promoção com a condição por extenso;
  correspondência de imagem apenas aproximada caindo em placeholder; oferta expirada e
  oferta desatualizada como estados **diferentes**; quantidade não confiável sem preço
  unitário nenhum; ausência de validade dita em texto; esqueleto; e erro parcial com o
  campo faltante nomeado.
- **Campo condicional some — não vira traço.** Na variante E não há linha de preço unitário:
  não há "—", não há zero, não há "indisponível".
- **A cor nunca é o único canal.** Todo estado traz **rótulo escrito**; a tarja temporal do
  topo é decorativa e `aria-hidden`. A oferta fora da lista orgânica é distinguível por três
  canais independentes: o rótulo, o preço atenuado e a tarja.
- **Nenhum histórico de preço.** "antes R$ 14,90 · 13% mais barato que em 25/07/2026" saiu do
  card e do fixture em 06/08/2026 (DL-030). Falta o contrato — P-01, qual observação anterior
  conta —, não a implementação.
- **Mercado é identificado por texto.** Nenhum logotipo, em nenhuma variante.
- **Nenhum dado real.** "Mercado Exemplo", "Bairro Exemplo", "Produto Demonstrativo",
  instante de referência fixo, e nenhuma chamada de rede: a página não faz nenhuma.

## Medidas, e não só imagens

O script mede a página no navegador em cinco larguras e **falha** se qualquer uma reprovar.
Medido nesta execução:

| Largura | `scrollWidth` | `clientWidth` | Estoura? | CTA abaixo de 48 px |
| ------- | ------------- | ------------- | -------- | ------------------- |
| 320 px  | 320           | 320           | não      | 0                   |
| 360 px  | 360           | 360           | não      | 0                   |
| 390 px  | 390           | 390           | não      | 0                   |
| 430 px  | 430           | 430           | não      | 0                   |
| 1280 px | 1280          | 1280          | não      | 0                   |

Um screenshot mostra que a página **parece** caber. `scrollWidth === clientWidth` prova que
ela cabe. São coisas diferentes, e só a segunda é verificação.

Foco conferido por tecla `Tab` real, e não por `.focus()` programático — `:focus-visible`
distingue os dois: anel de 2 px sólido em `--color-ring`, com 2 px de deslocamento, sobre um
alvo de 48 px de altura.

## Dois defeitos que só apareceram ao OLHAR as imagens

Ficam registrados porque os dois passaram por toda a verificação automática.

**1. O selo de estado virou tarja.** `OfferStatus` vivia num `flex-col`, que estica os filhos
por padrão. O resultado: "Oferta expirada" saía como uma barra vermelha da largura inteira do
card, com peso visual de banner de alerta — exatamente o "cinco cores competindo" que o
mandato §10 pede para evitar. Nenhum teste de texto pegaria: o HTML estava correto, a
classe estava correta, e o desenho estava errado. Corrigido com `items-start`.

**2. O painel comparativo mostrava o cabeçalho da página, e não os cards.** A primeira versão
embutia `card-v2-390.png`, que tem 20 mil pixels de altura, e recortava os primeiros 900 px
com `object-fit: cover`. Os primeiros 900 px são texto explicativo. O painel ficou bonito,
legível e inútil. As conferências automáticas aprovaram todas — largura certa, duas imagens
carregadas, altura suficiente — porque **nenhuma delas sabe o que é um card**. Verificação
automática prova que a imagem existe; não prova que a imagem mostra a coisa certa.

## Limite desta evidência

Os scripts dependem do Chrome instalado na máquina de quem roda. **Não são reproduzíveis em
CI hoje**, e portanto não são gate — são evidência para revisão humana. Um gate que depende
do que existe na máquina de alguém não é gate.

O que **é** gate roda no CI e não depende de navegador: `src/lib/card-v2.test.ts` (as regras
de exibição), `src/components/card-v2/product-card-v2.test.tsx` (o que chega ao HTML) e
`src/routes/laboratorio-card-v2.contract.test.ts` (o que não pode entrar na página).
