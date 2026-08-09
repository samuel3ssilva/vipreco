# Demonstração B2C — Açougue Mota

As cinco telas do consumidor, capturadas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px)
contra o servidor de desenvolvimento na branch `feat/demo-acougue-mota`.

| Arquivo          | Tela                                  |
| ---------------- | ------------------------------------- |
| `home.png`       | 1 · Home / Achados                    |
| `busca.png`      | 2 · Resultados da busca (`?q=Frango`) |
| `comparacao.png` | 3 · Comparação do produto             |
| `detalhe.png`    | 4 · Detalhe da oferta                 |
| `whatsapp.png`   | 5 · WhatsApp / retenção               |

## O que está na tela, e de onde veio

**Cinco preços observados no Açougue Mota em 08/08/2026**, lidos nas placas do balcão e
conferidos contra as fotos da coleta:

| Corte                      | Preço observado |
| -------------------------- | --------------- |
| Filé de peito de frango    | R$ 20,99 /kg    |
| Linguiça caseira           | R$ 26,99 /kg    |
| Coxa e sobrecoxa de frango | R$ 11,99 /kg    |
| Patinho bovino             | R$ 46,99 /kg    |
| Acém sem osso              | R$ 39,99 /kg    |

**Cinco preços de exemplo**, para mostrar como a comparação vai funcionar quando houver um
segundo mercado de verdade. Nenhum deles foi observado em lugar nenhum, e a tela diz isso: a
linha do Mercado 2 não tem imagem, não tem procedência, não tem data, tem moldura tracejada e
**não é clicável** — não existe detalhe de uma oferta que ninguém foi ver.

## A ordem não foi escolhida

O Açougue Mota abre as cinco comparações porque é mais barato nas cinco. Não há nenhum campo
que o promova, e não pode haver — princípio 4 do `CLAUDE.md`. O teste correspondente confere
**primeiro** que ele é o menor preço e **depois** que é o primeiro da lista; escrito na ordem
inversa, ele aprovaria exatamente o favorecimento que o princípio proíbe.

## As imagens

Geradas por IA, sem marca, sem logotipo e sem trade dress de ninguém. Elas mostram o **corte**,
não a peça que estava no balcão — e o `alt` diz as duas coisas que quem usa leitor de tela não
tem como conferir sozinho: que a imagem é ilustrativa e que foi gerada por IA.

## Uma leitura que engana

A barra inferior fixa ("Achados / Buscar") aparece **no meio** de cada captura, cobrindo um
pedaço do conteúdo. É artefato de `captureBeyondViewport`: a barra é `position: fixed` e o
Chrome a desenha uma vez, na posição que ocupava no viewport, ao fotografar a página inteira. No
aparelho ela fica colada embaixo e não cobre nada.
