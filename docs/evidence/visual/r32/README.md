# R3.2 — evidência visual do Card v2

> **Gate aprovado pelo Founder em 06/08/2026** sobre o head `6adcaf7`, e mergeado na `main`
> por [#89](https://github.com/samuel3ssilva/vipreco/pull/89) → **`4222332`**. Comentário canônico:
> [issuecomment-5205835268](https://github.com/samuel3ssilva/vipreco/pull/89#issuecomment-5205835268).

Capturas do laboratório do Card v2 (`/laboratorio-card-v2`), geradas em navegador de verdade
por `scripts/visual/screenshot-card-v2.ts`, contra o servidor de desenvolvimento local.

**Todas regeradas em 06/08/2026 a partir do head da branch**, depois da reconciliação da §"O
alarme falso" abaixo e da correção de reprodutibilidade da §"A captura agora dá o mesmo arquivo
duas vezes".

| Arquivo                        | O que é                                      | Viewport CSS | PNG          | SHA-256 (16) |
| ------------------------------ | -------------------------------------------- | ------------ | ------------ | ------------ |
| `card-v2-320.png`              | página inteira                               | 320 px       | 640 × 21150  | `de288010…`  |
| `card-v2-390.png`              | página inteira                               | 390 px       | 780 × 19448  | `4c67c226…`  |
| `card-v2-desktop.png`          | página inteira                               | 1280 px      | 2560 × 14744 | `c956b469…`  |
| `card-v2-variants.png`         | recorte da grade "em lista"                  | 900 px       | 3536 × 6364  | `58431b13…`  |
| `card-v2-list-390.png`         | **quatro cards consecutivos**                | 390 px       | 1528 × 6492  | `c5297eb4…`  |
| `card-v2-comparison-board.png` | **North Star V2** ao lado das oito variantes | 1400 px      | 2800 × 7200  | `de5700eb…`  |

Para conferir que os arquivos são estes:

```bash
shasum -a 256 docs/evidence/visual/r32/*.png
```

### A captura agora dá o mesmo arquivo duas vezes

Até 06/08/2026, recapturar do **mesmo commit** produzia PNGs com SHA-256 diferente. A
diferença inteira cabia em 376 linhas de uma imagem de 19 448: o card de **carregamento**, cujo
esqueleto usa `animate-pulse`. A foto pegava a pulsação numa fase qualquer, e a fase depende de
quantos milissegundos o navegador levou até ali.

Isso não era cosmético. Sem reprodutibilidade não existe como distinguir _"a evidência está
velha"_ de _"a captura simplesmente varia"_ — e foi exatamente essa ambiguidade que custou uma
rodada de revisão, quando o Founder leu na evidência publicada algo que o código não fazia.

`scripts/visual/cdp.ts` passou a injetar `animation: none; transition: none` imediatamente antes
de fotografar, depois da espera de carregamento — a folha precisa sobreviver à hidratação. Não é
`animation-play-state: paused`, que congelaria numa fase qualquer, que é o defeito. `none`
devolve a propriedade ao valor base: opacidade 1, o mesmo que quem tem `prefers-reduced-motion`
já via. Nenhuma medida de layout muda, porque `animate-pulse` só anima opacidade.

Guardado por `src/routes/laboratorio-card-v2.contract.test.ts`, §"a evidência visual é
reproduzível". Para conferir na mão: rodar o script duas vezes e comparar os hashes.

As três capturas de página inteira mudaram de hash nesta correção; `variants`, `list-390` e o
painel comparativo saíram **idênticos** ao que já estava versionado — o recorte deles não
alcança o card de carregamento.

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

| Captura   | Antes  | Depois | Diferença        |
| --------- | ------ | ------ | ---------------- |
| 320 px    | 22 184 | 21 150 | −1 034 px de PNG |
| 390 px    | 20 158 | 19 448 | −710             |
| desktop   | 15 404 | 14 744 | −660             |
| variantes | 6 880  | 6 364  | −516             |

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
- **Nenhum histórico de preço, no card e na legenda.** "antes R$ 14,90 · 13% mais barato que em
  25/07/2026" saiu do card e do fixture em 06/08/2026 (DL-030). Falta o contrato — P-01, qual
  observação anterior conta —, não a implementação. A legenda que ainda o prometia também saiu;
  ver "O alarme falso" abaixo.
- **A diferença entre mercados não foi removida: ela ainda não existe.** O North Star V2 mostra
  "R$ 0,50 abaixo da próxima oferta observada", que compara o primeiro e o segundo mercado da
  mesma consulta, no mesmo instante. R3.2 entrega o card **isolado**: ele recebe uma oferta, não
  um conjunto comparável, e não tem de onde tirar o segundo preço. Ela entra com a comparação, em
  R5/R6. Não depende de P-01.
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

## O alarme falso do histórico de preço, e o que ele ensinou

Na revisão de 06/08/2026 o Founder/PMO leu, na evidência, que o Card v2 ainda exibia "antes
R$ …", "13% mais barato" e comparação com data histórica — enquanto o checkpoint afirmava que
o histórico tinha sido removido. A contradição era real. **A causa não era nenhuma das duas
coisas que se esperaria.**

**Não era código obsoleto.** O histórico saiu em `7532290`, e `card-v2.test.ts` prova por dois
caminhos que ele não volta: a visão não tem campo de preço anterior, e um `previous_price` na
entrada não produz saída nenhuma.

**Não era captura obsoleta.** Os seis PNG foram gerados **pelo mesmo commit** que removeu o
histórico. Entre ele e o head (`3a8ad90`) só houve um merge de `main` que tocou 10 arquivos, todos
em `docs/` — zero mudanças de render, verificado com `git diff` restrito aos diretórios que
desenham o card.

**Eram duas outras coisas, e as duas eram legítimas de confundir:**

1. **A coluna de referência do painel comparativo era o North Star R3.0**, e é esse mockup que
   mostra "Preço anterior: R$ 20,49" com queda percentual — porque é justamente o desenho que
   está sendo criticado. Numa comparação lado a lado, a coluna da esquerda se lê como "o que
   entregamos" com uma facilidade desconfortável. **Corrigido:** a comparação principal passou a
   ser contra o **North Star V2**, a referência atual, cuja classificação de roadmap põe
   "histórico de preço e alertas de queda" em _fora do escopo atual_. O R3.0 continua no painel,
   embaixo, rotulado como histórico e com o motivo escrito.
2. **A legenda da variante A ainda prometia o percentual.** Ela dizia "há observação anterior com
   data, então o percentual aparece — em frase, não só em cor", logo acima de um card que não
   mostra percentual nenhum. **Corrigido**, e agora há teste: `laboratorio-card-v2.contract.test.ts`
   reprova qualquer legenda que fale em percentual, preço anterior, observação anterior, economia
   ou queda.

**A lição é a segunda.** O contrato provava o dado e a regra, e passou o tempo todo. Ninguém
estava provando o **rótulo** — e quem revisa um Gate visual lê o rótulo e o card como uma coisa
só. Uma legenda errada engana exatamente tão bem quanto um componente errado.

O painel também ganhou um bloco em destaque, "Histórico de preço: onde ele aparece, e onde não
aparece", que distingue três coisas que estavam sendo lidas como uma: o card entregue (não
exibe), o R3.0 (exibe, e é a referência criticada) e a **diferença entre mercados** do V2
("R$ 0,50 abaixo da próxima oferta observada"), que compara dois mercados no mesmo instante,
não depende de P-01 e **não foi o que DL-030 removeu**.

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
