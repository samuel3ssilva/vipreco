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

## Compartilhamento

Web Share API → WhatsApp → copiar o link. Em DEMO o texto começa obrigatoriamente pelo aviso de
exemplo fictício; nenhum preço fictício circula sem ele. Nada de dado pessoal, nenhum SDK,
nenhuma imagem gerada por Achado. Fechar a folha é cancelamento, não erro.

O endereço de compartilhamento (`wa.me/?text=`) não leva número: quem recebe é escolhido na hora.
Ele não é, e não deve virar, o destino operacional do CTA — esse continua vindo do secret.

## Alvo de toque

Todo controle interativo da Home mede pelo menos 48×48 px, medido no navegador com
`getBoundingClientRect`. A utilitária `btn-touch-48` é declarada depois de `btn-base`/`btn-sm`
porque as três definem `min-height` e é a ordem no arquivo que decide qual vence.

## Rollback

Cada PR da Parte 2 é revertível isoladamente, na ordem inversa do merge: 2D (CTA fixo,
compartilhamento, alvos), 2C (estados da busca), 2B (hero e ordem), 2A (card oficial).
