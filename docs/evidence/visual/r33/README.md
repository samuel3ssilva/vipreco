# Evidência visual de R3.3B — Home e Achados

Sete arquivos, todos gerados do head da branch `feat/r33-home-achados`, no mesmo navegador e com
animação congelada. Os scripts que os produzem estão em `scripts/visual/`.

| Arquivo                           | O que é                                                      | Script                       |
| --------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| `home-final-320.png`              | página inteira a 320 px                                      | `screenshot-home.ts`         |
| `home-final-390.png`              | página inteira a 390 px — o celular comum                    | `screenshot-home.ts`         |
| `home-final-430.png`              | página inteira a 430 px — celular grande                     | `screenshot-home.ts`         |
| `home-final-desktop.png`          | página inteira a 1280 px                                     | `screenshot-home.ts`         |
| `home-final-list-390.png`         | recorte da seção de Achados a 390 px                         | `screenshot-home.ts`         |
| `home-final-states.png`           | os sete estados da seção de Achados, lado a lado             | `screenshot-home-estados.ts` |
| `home-final-comparison-board.png` | quatro áreas: anterior · referência aprovada · R3.3A · R3.3B | `comparison-board-home.ts`   |

**O conjunto `home-achados-*.png` saiu.** Ele fotografava a Home de R3.3A, que o Founder reprovou
na direção visual — e evidência de um desenho superado guardada ao lado da evidência correta é
exatamente o defeito que esta pasta já cometeu uma vez. O registro daquela rodada continua
alcançável pelo histórico do Git, no commit `46f7079`, e o comentário canônico que a publicava
está marcado `SUPERSEDED` com os links desativados.

## As imagens de produto são ilustrações, e o arquivo diz isso

R3.3B §5 autorizou criar assets para que a Home volte a ter produto reconhecível, e delimitou o
que eles não podem ser: cópia de embalagem, marca, logotipo ou trade dress de terceiro. Os três
SVGs de `public/img/demo/` são desenhos planos de **categoria** — um pacote, um saco, uma caixa —,
não têm nenhum texto dentro e trazem, no próprio arquivo, o comentário que declara o que são.

O `alt` de cada uma diz a mesma coisa para quem usa leitor de tela: _"Ilustração genérica de café
— não é a embalagem do produto"_. E o vínculo com a demonstração é medido, não prometido:
`demo-opportunities.ilustrativas.test.ts` reprova qualquer oferta que carregue uma ilustração sem
`is_demo` nas três entidades.

**As marcas do fixture passaram a ser fictícias** pelo mesmo motivo. Um desenho genérico ao lado
do nome de uma marca existente representa a embalagem daquela marca, por mais genérico que seja o
traço — o nome faz o trabalho que o desenho se absteve de fazer. As substitutas vêm da North Star
V2, que já foi aprovada.

> **Divergência registrada:** `supabase/seed.sql` continua com as marcas antigas. Em staging,
> portanto, a Home mostra "Serra Alta" e a página do produto — que lê do banco — mostra a marca
> anterior. Alinhar exige reseed, que é banco, e banco está fora do escopo desta missão (§10:
> "Se encontrar melhoria de backend: documentar; não implementar").

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

**E tire a variável depois.** Oito testes afirmam o comportamento de "sem número configurado" —
`whatsapp.test.ts`, `index.ssr.test.ts`, `para-mercados.ssr.test.ts` e o contrato do CTA fixo de
mercado — e todos falham com ela presente. Não é fragilidade do teste: o ambiente de captura e o
ambiente de teste pedem valores opostos da mesma variável, e o teste está afirmando a garantia
que importa (falhar fechado). O CI nunca tem a variável, então o conflito só existe na máquina de
quem captura. Capture, apague a linha do `.env`, rode `bun run test`.

## Como as três colunas de aplicação do painel são produzidas

Nenhuma delas é captura antiga guardada em disco. As três são servidas **agora**, por servidores
paralelos em worktrees efêmeros, e fotografadas no mesmo navegador e no mesmo instante. Sem isso,
metade do que o painel mostrasse como mudança de desenho seria diferença de fonte, de versão de
navegador ou de data de fixture.

```bash
git worktree add --detach /tmp/vp-antes origin/main
git worktree add --detach /tmp/vp-r33a  46f7079
for d in /tmp/vp-antes /tmp/vp-r33a; do ln -sfn "$PWD/node_modules" $d/node_modules; cp .env $d/.env; done
(cd /tmp/vp-antes && bunx vite dev --port 8081 --strictPort) &
(cd /tmp/vp-r33a  && bunx vite dev --port 8082 --strictPort) &
bun run dev &
bun scripts/visual/comparison-board-home.ts
```

O script **reprova** se a coluna A não tiver 4 abas, se C ou D não tiverem 2, ou se C e D saírem
byte a byte idênticas — servidor errado, ou worktree no head errado, faria o painel afirmar uma
mudança que não aconteceu.

A coluna B é a referência aprovada, lida do arquivo versionado
`docs/product/visual-north-star-v2/telas/tela-1-home.png`. Ela nunca é recortada nem esticada
(`object-fit: contain`): um mockup de direção visual cortado mentiria sobre a própria direção.

## Uma nota sobre a barra de navegação nas capturas de página inteira

A barra inferior é `position: fixed`. Numa captura de página inteira ela aparece **uma vez, na
altura do viewport**, sobreposta ao conteúdo daquele ponto — é artefato da captura, não da
página. Ele existe igualmente nas capturas anteriores, e o comportamento real está nas medições
de `screenshot-home.ts`, que contam as abas no DOM em cinco larguras.
