# Evidência visual do Demo Freeze — `/para-mercados`

Cinco arquivos, todos gerados do head da branch `feat/b2b-visual-demo-polish`, no mesmo navegador
e com animação congelada. Os scripts que os produzem estão em `scripts/visual/`.

| Arquivo                                      | O que é                                                       | Script                                          |
| -------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------- |
| `para-mercados-final-320.png`                | página inteira a 320 px — a largura mais estreita atendida     | `screenshot-para-mercados.ts`                   |
| `para-mercados-final-390.png`                | página inteira a 390 px — o celular comum                     | `screenshot-para-mercados.ts`                   |
| `para-mercados-final-430.png`                | página inteira a 430 px — celular grande                      | `screenshot-para-mercados.ts`                   |
| `para-mercados-final-desktop.png`            | página inteira a 1280 px                                      | `screenshot-para-mercados.ts`                   |
| `para-mercados-final-comparison-board.png`   | três colunas: main · referência do Founder · candidata        | `comparison-board-para-mercados-demo-freeze.ts` |

**A captura de 320 px é nova nesta rodada.** O conjunto de B2B-0 fotografava 390, 430 e desktop, e
320 é justamente onde R3.3B descobriu um estouro que passava despercebido nas outras larguras.
Evidência de responsividade que não fotografa o caso difícil não é evidência de responsividade.

## A altura da página NÃO diminuiu, e o número está aqui

Esta é a medição que mais importa desta rodada, porque é a que contraria a expectativa. As duas
versões foram capturadas pelo **mesmo script, no mesmo navegador, no mesmo instante**, com
`origin/main` servida por um worktree paralelo:

| largura | `origin/main` | candidata | delta            |
| ------- | ------------- | --------- | ---------------- |
| 320 px  | 16582         | 16734     | +152 (+0,9%)     |
| 390 px  | 15342         | 15406     | +64 (+0,4%)      |
| 430 px  | 14602         | 14716     | +114 (+0,8%)     |
| 1280 px | 8642          | 8766      | +124 (+1,4%)     |

São **pixels de dispositivo**, que é o que o PNG mede: o script captura com `deviceScaleFactor: 2`,
então divida por dois para ler em pixels de CSS. Confundir os dois foi o erro da primeira medição
desta rodada, e ele produziu uma "redução de 51%" que nunca existiu. O número certo é o de cima: a
página ficou **praticamente do mesmo tamanho**.

O acordeão das dúvidas recolheu perto de mil pixels de CSS; a rodada gastou o mesmo tanto em coisas
que não existiam — os quatro cartões da primeira impressão, a imagem no exemplo de oferta e as
cinco perguntas novas do §17. **Quem quiser a página mais curta precisa tirar conteúdo, e tirar
conteúdo desta página é decisão do Founder, não do CTO.**

O que mudou é **onde a resposta está**. As seis perguntas do §23 passaram a ser respondidas nas duas
primeiras telas — hero, exemplo de oferta com imagem e quatro cartões de uma linha cada — em vez de
espalhadas por dezenove.

## Uma tentativa que foi revertida, e por quê

A primeira versão desta rodada encurtava a página de verdade: absorvia "Não precisa cadastrar o
mercado inteiro" e "O piloto está sendo preparado em Artemis" em seções vizinhas, e trocava
perguntas do FAQ por versões reescritas da lista do §17.

**O guarda de copy reprovou dezoito testes, e reprovou certo.** Aquelas frases são copy decidida
pelo Founder e fixadas por asserção; o §17 manda *priorizar* as perguntas de entrevista, não
substituir as que já foram decididas. As duas seções voltaram inteiras, as oito perguntas antigas
voltaram com o texto intacto, e as cinco do §17 entraram **somadas** a elas — treze no total.

O mesmo guarda pegou duas coisas que eu tinha introduzido e a página proíbe: **travessão** na copy
pública e **classe de transição** no chevron do acordeão. As duas saíram.

## O acordeão é `<details>` nativo

Treze perguntas, cada uma um `<details>` com a pergunta num `<h3>` dentro do `<summary>`. Nativo, e
não um acordeão de JavaScript: já vem com o estado, o foco de teclado, Enter e Espaço, o anúncio de
expandido/recolhido no leitor de tela e a busca do navegador conseguindo achar texto lá dentro. Um
acordeão feito à mão reimplementaria tudo isso, e costuma reimplementar mal.

O chevron gira **sem transição**, porque `para-mercados.contract.test.ts` reprova qualquer classe de
animação nesta rota. O efeito colateral é bom: a página fica correta por construção para quem pediu
menos movimento ao sistema, em vez de correta por variante condicional.

## O que da referência do Founder NÃO foi copiado

A coluna B do painel é autoridade **estética**. Seis coisas nela são promessas que o produto não
pode fazer, e nenhuma entrou. A lista completa, com o motivo de cada recusa, está no próprio painel
— para o Founder conferir item a item em vez de confiar que a recusa aconteceu. Em resumo: "milhares
de moradores", "mais visibilidade", "destaque nas buscas", "gratuito e seguro", o CTA de adesão
("Participar via WhatsApp" / "Quero participar agora") e o cadastro de ofertas pelo lojista, que não
existe.

## Reprodutibilidade — o que é garantido, e o que não é

**A coluna A do painel não é PNG guardado.** Ela é servida agora, por um worktree efêmero em
`origin/main`, e fotografada no mesmo navegador e no mesmo instante que a candidata. Sem isso,
metade do que o painel mostrasse como mudança de desenho seria diferença de fonte, de versão de
navegador ou de data.

**A coluna B nunca é recortada nem esticada** (`object-fit: contain`). Um mockup de direção visual
cortado mentiria sobre a própria direção. É a mesma regra que o painel da Home já seguia.

**Não garantido entre ambientes**, e o motivo tem nome: `VITE_WHATSAPP_NUMBER`. Os dois CTAs de
conversa **falham fechado** — sem a variável, nenhum deles é renderizado, e a página sai centenas de
pixels mais curta do que a que o entrevistado vê em staging.

Para reproduzir estas capturas, defina `VITE_WHATSAPP_NUMBER` no `.env` antes de subir o servidor.
Qualquer número em formato E.164 serve: ele vive **só no `href`** e nunca aparece na tela. Não use,
nem peça, o número real do piloto.

**E tire a variável depois.** Vários testes afirmam o comportamento de "sem número configurado" e
todos falham com ela presente. Não é fragilidade do teste: o ambiente de captura e o de teste pedem
valores opostos da mesma variável, e o teste está afirmando a garantia que importa. O CI nunca tem a
variável. Capture, apague a linha do `.env`, rode `bun run test`.

```bash
git worktree add --detach /tmp/vp-pm-antes origin/main
ln -sfn "$PWD/node_modules" /tmp/vp-pm-antes/node_modules && cp .env /tmp/vp-pm-antes/.env
(cd /tmp/vp-pm-antes && bunx vite dev --port 8082 --strictPort) &
bunx vite dev --port 8081 --strictPort &
bun scripts/visual/screenshot-para-mercados.ts http://localhost:8082 --prefixo=antes --destino=/tmp/pm-antes-png
bun scripts/visual/screenshot-para-mercados.ts http://localhost:8081 --prefixo=para-mercados-final
bun scripts/visual/comparison-board-para-mercados-demo-freeze.ts --antes=/tmp/pm-antes-png
```

O painel **reprova** se qualquer uma das três imagens não tiver carregado. Um painel com uma coluna
em branco sai plausível e mudo — foi exatamente o defeito que o painel do Card v2 teve na primeira
versão, e ele passou por toda a conferência automática.

## Uma nota sobre a ordem de merge

`src/routes/index.escopo.test.ts`, o guarda de escopo de R3.3, existe **apenas na branch do PR #97**
e lista `src/routes/para-mercados.tsx` e `src/components/MarketShell.tsx` entre os intocáveis. Ele
não roda aqui, porque não está na `main` — e é por isso que esta branch passou.

**Quando o #97 mergear, esse guarda chega na `main` e passa a reprovar esta branch.** As duas saídas
são: mergear este PR antes do #97, ou aposentar o guarda junto com a onda que ele existe para
proteger, que é o destino natural dele. A decisão é do Founder/PMO; o registro fica aqui para que a
escolha seja feita antes de o CI reclamar, e não depois.
