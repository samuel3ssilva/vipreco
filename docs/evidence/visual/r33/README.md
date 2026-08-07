# Evidência visual de R3.3 / R3.3A — Home e Achados

Sete arquivos, todos gerados do head da branch `feat/r33-home-achados`, no mesmo navegador e com
animação congelada. Os scripts que os produzem estão em `scripts/visual/`.

| Arquivo                             | O que é                                                        | Script                       |
| ----------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `home-achados-320.png`              | página inteira a 320 px                                        | `screenshot-home.ts`         |
| `home-achados-390.png`              | página inteira a 390 px — o celular comum                      | `screenshot-home.ts`         |
| `home-achados-430.png`              | página inteira a 430 px — celular grande                       | `screenshot-home.ts`         |
| `home-achados-desktop.png`          | página inteira a 1280 px                                       | `screenshot-home.ts`         |
| `home-achados-list-390.png`         | recorte da seção de Achados a 390 px                           | `screenshot-home.ts`         |
| `home-achados-states.png`           | os sete estados da seção de Achados, lado a lado               | `screenshot-home-estados.ts` |
| `home-achados-comparison-board.png` | Home anterior · North Star V2 · Home entregue, com as decisões | `comparison-board-home.ts`   |

## Reprodutibilidade — o que é garantido, e o que não é

**Garantido dentro de uma execução.** `states` e `comparison-board` capturam **duas vezes** e
falham se os dois PNGs não forem byte a byte idênticos. Os dois congelam animação; o laboratório
de estados congela também o relógio (`AGORA` fixo), senão "ontem" e "há 2 dias" mudariam de texto
conforme a hora em que o script rodasse.

**Não garantido entre ambientes**, e o motivo tem nome: `VITE_WHATSAPP_NUMBER`. O CTA de WhatsApp
**falha fechado** — sem a variável, o bloco inteiro não é renderizado, e a página sai centenas de
pixels mais curta do que a que o entrevistado vê em staging, que define a variável como _secret_
do Environment.

Foi exatamente o que aconteceu em 06/08/2026: uma recaptura sem a variável produziu 6946 px onde
a evidência publicada tinha 7380, com hash diferente — o que se lê como "a evidência envelheceu"
quando na verdade é "o ambiente mudou". `screenshot-home.ts` passou a **avisar** quando o CTA não
está na página.

**Para reproduzir estas capturas**, defina `VITE_WHATSAPP_NUMBER` no `.env` antes de subir o
servidor. Qualquer número em formato E.164 serve: ele vive **só no `href`** e nunca aparece na
tela, então não muda um pixel do PNG. Não use, nem peça, o número real do piloto — ele não é
necessário aqui, e a evidência não é lugar de dado de contato.

## Como o "antes" do painel comparativo é produzido

A coluna 1 **não é uma captura antiga guardada em disco**: é a Home de `origin/main` servida por
um segundo `vite dev`, num worktree efêmero, fotografada no mesmo navegador e no mesmo instante
que a Home entregue. Sem isso, metade do que o painel mostrasse como mudança de R3.3 seria
diferença de fonte, de versão de navegador ou de data de fixture.

```bash
git worktree add --detach /tmp/antes origin/main
ln -s "$PWD/node_modules" /tmp/antes/node_modules
cp .env /tmp/antes/.env
(cd /tmp/antes && bunx vite dev --port 8081 --strictPort) &
bun run dev &
bun scripts/visual/comparison-board-home.ts
```

O script **reprova** se o "antes" não tiver 4 abas ou o "depois" não tiver 2 — servidor errado, ou
worktree fora de `origin/main`, faria o painel afirmar uma mudança que não aconteceu.

## Uma nota sobre a barra de navegação nas capturas de página inteira

A barra inferior é `position: fixed`. Numa captura de página inteira ela aparece **uma vez, na
altura do viewport**, sobreposta ao conteúdo daquele ponto — é artefato da captura, não da
página. Ele existe igualmente nas capturas anteriores a R3.3A, e o comportamento real está nas
medições de `screenshot-home.ts`, que contam as abas no DOM em cinco larguras.
