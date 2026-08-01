# Home da North Star v1.2.2 — hero, cards e busca

Decisões técnicas da **Parte 2**. Complementa `HOME-INITIAL-RENDER.md` (que explica por que a
Home é servida pelo loader) e `DEMO-ENVIRONMENT.md` (que explica o modo DEMO).

## Ordem da página

| #   | Seção                          | Componente                |
| --- | ------------------------------ | ------------------------- |
| 1   | Hero com os Achados            | `HomeHero` + `AchadoCard` |
| 2   | Busca de produto               | `ProductSearch`           |
| 3   | Nenhum preço aparece sozinho   | `TrustSection`            |
| 4   | Pertencimento local            | `LocalStory`              |
| 5   | Entrada resumida para mercados | dentro de `LocalStory`    |

O seletor de mercado habitual (`UsualMarketPicker`) fica entre 2 e 3: é ferramenta de
comparação, e o lugar dele é junto da busca, não no meio das seções de contexto.

**Não existe rodapé próprio.** A barra inferior de navegação do `AppShell` cumpre esse papel no
mobile e a ordem termina na entrada para mercados. Criar um rodapé novo não estava no escopo da
Parte 2.

## Hero: duas coreografias, uma árvore de DOM

O CTA aparece uma vez no DOM. No desktop ele fica logo abaixo do subtexto; no mobile, depois dos
cards. A troca é feita por `order` na grade — **não** renderizando o bloco duas vezes com
`hidden` alternado, que produziria dois CTAs iguais no HTML e confundiria a lógica do CTA fixo.

O par promessa+ação é ancorado no centro vertical da coluna (`self-end` no texto, `self-start` no
CTA). Sem isso, a coluna esquerda ficava colada no topo e sobrava meia tela vazia ao lado dos
cards — o `gap-y` da grade é, ao mesmo tempo, a distância de 24 px entre subtexto e CTA.

Os dois Achados secundários viram carrossel horizontal abaixo de `sm`: `scroll-snap`, faixa
focável pelo teclado com `aria-label`, e grade de duas colunas a partir dali.

## Card oficial

`AchadoCard` tem uma anatomia só e duas ênfases (`destaque`, `secundario`). O que ele **não**
faz, e os testes provam:

- não inventa validade — sem `valid_until`, nenhum chip e nenhum estado "termina em breve";
- não inventa preço anterior — a ausência é o estado normal;
- não afirma gôndola observada fora das origens que de fato observaram a gôndola;
- não cria urgência: nenhuma contagem regressiva, nenhum "publicado agora".

A tarja superior usa só tokens `--vp-time-*` e é decorativa (`aria-hidden`): tudo o que ela
sugere está escrito em texto na linha de procedência. O amarelo de marca continua sem uso.

O preço é composto em dois tamanhos (símbolo a 62% do valor) e fica fora da árvore de
acessibilidade; `spokenPrice` entrega "26 reais e 49 centavos" no lugar.

## Busca: nada carrega antes de uma ação

`searchState({ enabled, isFetching, isError, count })` decide o estado visível. Com `enabled`
falso — o visitante ainda não digitou o suficiente — o resultado é sempre `inicial`, em qualquer
combinação das outras entradas. É o que garante que o HTML inicial não tenha carregamento nenhum.

O esqueleto existe só depois da busca. Vazio e erro são estados distintos: só o erro é anunciado
como alerta.

Os Achados não passam pelo estado da busca. Vêm do loader, em outra seção — uma busca que falha
não apaga o que já está na tela.

## CTA fixo do mobile

`shouldShowStickyCta` recebe a situação de cada CTA equivalente (`data-whatsapp-cta`) e responde
se o fixo aparece. Basta um visível para ele sumir.

O estado inicial é **medido na mão**, não esperado do `IntersectionObserver`: durante a
verificação, o motor não entregou nem a notificação inicial de um alvo fora da tela nem as
mudanças seguintes. Rolagem e redimensionamento recalculam, sem `requestAnimationFrame` no meio —
uma rede de segurança que depende de quadros de animação some justamente onde seria necessária.

O botão fica acima da barra de navegação, respeita `safe-area-inset-bottom` e reserva no fluxo o
espaço que ocupa.

O contrato é de **visibilidade, não de posição de rolagem**. Em telas curtas o CTA da hero pode
nascer abaixo da dobra, e aí é correto o fixo já aparecer no topo — foi o que o QA observou em
375×812 e o PMO aceitou. A altura do hero não foi mexida para forçar o CTA para dentro da
primeira dobra.

### Quem está no comando

`shouldShowStickyCta` resolve o lado visual. O lado de acessibilidade mora em
`src/lib/cta-visibility.ts`: enquanto o fixo está no ar, o CTA equivalente da página sai da ordem
de tabulação e da árvore acessível (`inert` + `aria-hidden`, com `tabIndex={-1}` no link como rede
para motores sem `inert`). Fora da tela não é o mesmo que fora do caminho de quem navega por
teclado ou leitor de tela — sem isso, tabular pela página encontrava duas ações idênticas.

O estado é compartilhado porque nenhum dos dois componentes é ancestral do outro. A medida também
consulta a faixa em que o fixo existe (`max-width: 639.98px`, o mesmo recorte do `sm:hidden`): no
desktop o botão está oculto por `display: none`, e sem essa guarda o CTA da página sairia da ordem
de foco sem nada para substituí-lo. Rolagem, redimensionamento, rotação e mudança de faixa
remedem; sair da página devolve o comando ao CTA do fluxo.

Um caso de borda conhecido, e deliberadamente não tratado: se o CTA da página estiver **com o
foco** e a pessoa rolar a página com o dedo ou com o mouse até ele sair da tela, ele fica inerte
enquanto focado e o foco volta para o começo do documento. Chegar nesse estado exige rolar por um
meio que não é o teclado logo depois de focar pelo teclado — navegador e leitor de tela rolam o
elemento focado para dentro da tela sozinhos, e nesse caso a medida já o considera visível e o
fixo nem aparece. Mover o foco por conta própria para o botão fixo resolveria o caso raro criando
um problema pior: foco que se desloca sem a pessoa ter pedido.

## Compartilhamento

Web Share API → WhatsApp → copiar o link. Em DEMO o texto começa obrigatoriamente pelo aviso de
exemplo fictício; nenhum preço fictício circula sem ele. Nada de dado pessoal, nenhum SDK,
nenhuma imagem gerada por Achado. Fechar a folha é cancelamento, não erro.

Cada desfecho diz uma coisa diferente, e nenhum afirma mais do que aconteceu. A Web Share API só
resolve depois que o sistema aceitou o compartilhamento — essa é a única que anuncia "Achado
compartilhado". Abrir o WhatsApp apenas leva o visitante até a tela de envio, onde ele ainda pode
fechar sem mandar nada: o anúncio é "WhatsApp aberto para compartilhar".

O endereço de compartilhamento (`wa.me/?text=`) não leva número: quem recebe é escolhido na hora.
Ele não é, e não deve virar, o destino operacional do CTA — esse continua vindo do secret.

## Alvo de toque

Todo controle interativo da Home mede pelo menos 48×48 px, medido no navegador com
`getBoundingClientRect`. A utilitária `btn-touch-48` vence `btn-base`/`btn-sm` porque as três
definem `min-height` e ela sai depois no CSS gerado — verificado no artefato de build por
`src/styles.cascade.test.ts`, não presumido da ordem do arquivo fonte.

## Cascata das utilities

O Tailwind v4 **reordena** as utilities no build pelo conjunto de propriedades que cada uma
declara. A ordem escrita em `src/styles.css` não sobrevive, e chega a mudar conforme o conjunto de
classes compilado.

Foi assim que o botão de compartilhar ficou sem borda no staging: `.btn-quiet` saiu depois de
`.border-border` e o atalho `border: 1px solid transparent` apagou a cor. Trocar o atalho por
longhands não resolveria — continuariam dois `border-color` disputando por uma ordem que ninguém
controla daqui.

A regra que ficou: **onde a diferença é visível ao visitante, não dependa de ordem.** `btn-quiet`
lê `--btn-quiet-border` (transparente por omissão) e `btn-quiet-bordered` define a variável. Duas
propriedades diferentes nunca disputam a cascata. `src/styles.cascade.test.ts` compila o CSS de
verdade e prova que a disputa deixou de existir.

## Rollback

Cada PR da Parte 2 é revertível isoladamente, na ordem inversa do merge: 2D (CTA fixo,
compartilhamento, alvos), 2C (estados da busca), 2B (hero e ordem), 2A (card oficial).

## Baseline técnico da Parte 2

**Baseline funcional da Parte 2: `a4418af`.** Commit da `main` aceito pelo PMO em 01/08/2026 como
o estado de referência do código da Parte 2.

**Deploy de staging correspondente: run `30678532699`**, disparado na `main` com
`headSha a4418af`. É esse run que publicou o código do baseline.

| O quê                | Estado                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| PRs contidos         | #37 (`ece616e`), #38 (`9710668`), #39 (`8efac37`), #40 (`a4418af`)             |
| Testes               | 284 verdes em 29 arquivos                                                     |
| CI e CodeQL          | verdes                                                                        |
| Produção             | inalterada — último deploy em 30/07 (`b88e514`), sem nada da Parte 2          |
| Schema e dados reais | inalterados — nenhum arquivo de `supabase/migrations` tocado nos quatro PRs   |

### Baseline não é o mesmo que o topo da `main`

O baseline marca **o código**, não o ponteiro da branch. A `main` pode avançar depois de `a4418af`
por mudanças exclusivamente documentais — este próprio registro é uma delas — sem que o código
publicado em staging mude: enquanto nenhum deploy novo for disparado, staging continua servindo o
que o run `30678532699` publicou a partir de `a4418af`.

O que invalida o baseline é mudança em `src/`, workflows, infraestrutura, configuração, schema ou
dados — não um commit de documentação. Alterado o código, um baseline novo precisa ser fixado, com
seu próprio deploy e seu próprio smoke.

Os três primeiros PRs entraram por merge commit e seus commits seguem alcançáveis pela `main`; o
#40 entrou por squash, de propósito, para não trazer junto o histórico da branch. As branches
`feat/lp-pr2a-achado-card`, `feat/lp-pr2b-hero-home-order`, `feat/lp-pr2c-busca-estados` e
`feat/lp-pr2d-cta-fixo-compartilhar` foram apagadas depois disso.
