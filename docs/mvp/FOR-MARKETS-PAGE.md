# /para-mercados — a proposta para supermercados independentes

Decisões técnicas da **Parte 3**. Complementa `HOME-NORTH-STAR.md` (a Home que o morador vê),
`WHATSAPP-ENTRY.md` (o mecanismo do CTA) e `MANUAL-OFFER-OPERATIONS.md` (o que acontece depois
que a conversa começa).

## Para que a página existe

É a página que o Founder manda para um dono de mercado. Não é uma landing de captação: ela
precisa explicar o que é o ViPreço, como participar e o que a plataforma faz com a informação —
e precisa fazer isso sem parecer ameaça, sem parecer marketplace e sem afirmar nada que ainda não
existe.

## Ordem da página

| #   | Seção                                    | O que responde                                     |
| --- | ---------------------------------------- | -------------------------------------------------- |
| 1   | Primeira dobra                           | para quem é, o que resolve, o que fazer depois     |
| 2   | Como funciona                            | os três passos                                     |
| 3   | Não precisa cadastrar o mercado inteiro  | começar com poucos produtos                        |
| 4   | Você escolhe quais produtos enviar       | o que o mercado envia, corrige e retira            |
| 5   | As regras valem para todo mundo          | procedência, validade, ordem não vendida, correção |
| 6   | O piloto está sendo preparado em Artemis | convite para conversa, não inscrição               |
| 7   | Dúvidas frequentes                       | as seis perguntas do mandato                       |
| 8   | Convite final                            | o mesmo CTA, a mesma mensagem                      |

A volta para os Achados fecha a página. Não existe rodapé próprio — a barra inferior do `AppShell`
cumpre esse papel no mobile, igual à Home.

## O convite

Um link. O mesmo mecanismo do CTA do consumidor (`WHATSAPP-ENTRY.md`), com outro texto
pré-preenchido: **"Tenho um mercado e quero conhecer o piloto do ViPreço em Artemis"**. Um número
só no produto inteiro — quem responde é a mesma pessoa, e o texto é o que diz de onde a conversa
veio.

Sem destino configurado, o bloco inteiro some — botão **e** microcopy. Anunciar a explicação de um
botão que não existe é pior do que não ter o botão; e um link quebrado é pior ainda. A página
continua completa: proposta, regras e dúvidas seguem lá.

Nada é coletado nesta página: nenhum formulário, nenhum campo, nenhum cadastro automático, nenhum
CRM, nenhum grupo ou Canal, nenhuma automação de mensagem. Quem começa a conversa é a pessoa.

### O convite fixo do mobile

A página é longa. No mobile, quem está no meio dela ficava sem nenhuma ação à mão: o convite mora
nas duas pontas. O `StickyMarketCta` resolve isso e nunca duplica o convite — ele aparece só
quando **nenhum** dos dois CTAs do fluxo está na tela, e enquanto está no ar são eles que saem da
ordem de foco e da árvore acessível (`inert` + `aria-hidden` + `tabIndex={-1}`).

O mecanismo é o mesmo da Home, extraído para `StickyCta`: faixa abaixo de 640 px (o mesmo recorte
do `sm:hidden`), acima da barra inferior de 56 px, respeitando `env(safe-area-inset-bottom)`,
espaçador no fluxo para não cobrir o último conteúdo, 48 px de alvo, sem animação, só depois da
hidratação. O que é desta rota são três coisas: o destino (`marketWhatsappLink()`), o rótulo
("Quero conhecer o piloto") e a loja de visibilidade.

As duas rotas compartilham a regra, não o estado. `createStickyCtaStore()` dá uma loja a cada
convite e o marcador do DOM é próprio (`data-market-cta`, contra `data-whatsapp-cta` da Home): o
fixo daqui não observa o CTA do morador, e o de lá não silencia este.

## O que a página não diz

O mandato lista o que não pode aparecer; o teste é que garante que continue não aparecendo
(`para-mercados.ssr.test.ts`). Em resumo:

- **nenhuma promessa de resultado** — venda, tráfego, economia, "seja o mais barato";
- **nenhum número inventado** — audiência, desempenho, mercados participantes, vagas, depoimento;
- **nenhuma operação afirmada como ativa** — relatório, inteligência de mercado, painel de
  mercado. A única aparição de "painel" na página é a negação de que exista um;
- **nenhuma decisão comercial ainda não tomada** — mensalidade, contrato, prazo de publicação,
  quantidade garantida de consumidores;
- **nenhuma urgência artificial.**

O relatório semanal de exemplo que existia na versão anterior saiu por isso: os números eram
inventados e a seção sugeria uma inteligência de mercado que não existe.

Sobre **quais** produtos enviar, a página diz o que é verdade e para: o mercado escolhe o que
queira **destacar** ou **divulgar** — ofertas, itens sazonais, estoque alto. Nunca "anunciar", que
leria como mídia paga; e nada de validade curta, queima de estoque, desconto garantido ou contagem
regressiva. O uso para produtos perto do vencimento é hipótese de entrevista, não proposta desta
página, e o teste barra os dois desvios.

## Pontuação

Revisão do Founder: **zero travessões** na interface pública da rota. Onde o travessão separava
duas orações, entrou ponto, vírgula ou dois-pontos, sem alongar a frase. O hífen gramatical
("torrado e moído", "dois-pontos") não é alvo da regra.

`para-mercados.ssr.test.ts` varre o HTML renderizado — corpo e atributos, com e sem destino de
WhatsApp configurado, descontados `<script>` e `<style>` — e falha se um travessão voltar.

## A fronteira do que o mercado controla

Revisão comercial do PMO (01/08/2026). A primeira versão da seção 4 dizia "Você escolhe o que
aparece" e "o que o mercado manda é o que aparece" — copy que, lida por um dono de mercado,
sugeria controle sobre a comparação orgânica inteira: sobre informação legítima de terceiros e
sobre a ordem dos resultados.

A fronteira agora é explícita e tem três partes:

1. **o que o mercado envia** — produto, embalagem, preço, validade quando houver, unidade, e o
   pedido de correção ou de retirada **do que ele mesmo enviou**;
2. **o que não muda** — "comparações orgânicas legítimas seguem as mesmas regras para todos.
   Pagamento não muda a ordem dos resultados";
3. **o que qualquer pessoa pode fazer** — avisar sobre informação incorreta: "Avise o ViPreço.
   Nós conferimos a origem e fazemos a correção, seja uma informação enviada pelo mercado ou
   verificada pela nossa equipe."

O item 3 mudou na segunda revisão do Founder. A versão anterior dizia "para que ela seja conferida
e corrigida, venha de onde vier", que lida rápido soava a promessa de remoção a pedido. A frase
atual diz o que de fato acontece e nomeia as duas origens possíveis, sem virar texto jurídico.

`para-mercados.ssr.test.ts` tem um guardrail de copy para isso: a página não pode voltar a dizer
"Você escolhe o que aparece", "o que o mercado manda é o que aparece", "escolha sua posição",
"defina a ordem" ou equivalentes. A frase aprovada **"Tem um mercado no bairro? Você escolhe o que
aparece."** continua valendo na Home (`LocalStory`), como teaser — o guardrail é da rota, não do
produto inteiro.

## Prévia de link

A rota tem título, descrição e `og:image` próprios: a prévia que o Founder manda para um dono de
mercado não pode ser a do consumidor. `ogImageMeta()` passou a aceitar caminho e alt; sem
argumento, entrega o asset de sempre — nenhuma outra rota muda.

| O quê          | Valor                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `title`        | ViPreço para mercados de Artemis                                                                 |
| `description`  | Conheça o piloto local do ViPreço e veja como divulgar alguns produtos com preço, data e origem. |
| `og:image`     | `/og/vipreco-og-para-mercados-v2.png` (absoluta quando `VITE_PUBLIC_SITE_URL` existe)            |
| Dimensões      | 1200×630, `image/png`                                                                            |
| `twitter:card` | `summary_large_image`                                                                            |

O asset é **estático**, como o do consumidor: nenhum gerador dinâmico, nenhuma dependência
externa, nenhum número, métrica, depoimento, logo de mercado real, promessa de venda ou urgência.
Só o nome, para quem é a página e o estado real do piloto: "ViPreço", "Para mercados de Artemis",
"Piloto em preparação". O fonte vetorial fica ao lado, em
`public/og/vipreco-og-para-mercados-v2.svg`, e o PNG foi rasterizado a partir das mesmas
constantes, com as fontes oficiais (Bricolage Grotesque 800 e Public Sans 600).

### Área central segura

Revisão do Founder: no WhatsApp Desktop a prévia vira uma miniatura lateral, e a primeira versão
da imagem — texto espalhado pela largura, painel verde à direita — perdia as pontas no recorte.

A regra agora é geométrica. Todo conteúdo essencial vive na área central de **630×500**
(x 285..915, y 65..565) de uma imagem de 1200×630. Medido na geração:

| Elemento               | x       | y       |
| ---------------------- | ------- | ------- |
| Marca                  | 483–717 | 126–179 |
| Título, linha 1        | 354–846 | 255–327 |
| Título, linha 2        | 422–778 | 335–407 |
| Selo do piloto         | 431–769 | 462–520 |
| **Caixa do essencial** | 354–846 | 126–520 |

As faixas verdes das laterais (190 px de cada lado, com o símbolo da marca cortado pela borda)
são ornamento: somem no recorte quadrado e não levam informação junto. Conferido em quatro
recortes — 1200×630 inteiro, quadrado central de 630×630, 4:3 central de 840×630 e miniatura de
128 px.

O caminho ganhou `-v2` de propósito. A prévia antiga já circulou e o WhatsApp guarda a imagem por
URL; sem endereço novo, quem já viu o link continuaria vendo o card velho.

## O exemplo fictício

Objetivo 4 do mandato — mostrar como o ViPreço apresenta preço, data e origem — é respondido com
um card estático, rotulado **Exemplo fictício**, na mesma anatomia do Achado real: origem,
validade, produto, embalagem, preço, mercado com a localidade e a linha mono de procedência.

O nome do mercado é propositalmente genérico ("Mercado de exemplo"). Nenhum mercado real é
apresentado como participante, aqui ou em qualquer outro lugar do produto — e não há nome
plausível o bastante para ser confundido com um.

O card é estático de propósito: reaproveitar `AchadoCard` exigiria um `Opportunity` de verdade, e
a página passaria a depender de dado — justamente o que ela não faz.

## Nada é consultado

A rota não tem loader, não importa serviço de dados nem cliente do Supabase, não usa TanStack
Query e não faz requisição por conta própria. É HTML estático servido pelo mesmo SSR das outras
rotas. `para-mercados.contract.test.ts` amarra cada uma dessas ausências.

## Navegação

A pill "Tenho um mercado →" do header desaparece quando a pessoa já está em `/para-mercados`: ali
ela seria um botão que leva à própria página, competindo com o CTA real. A entrada "Para mercados"
da navegação continua no lugar, marcada como ativa — é navegação, não convite.

## Responsividade

Os três passos viram colunas só a partir de `md` (768 px). Em 640 px cada passo virava uma coluna
de 189 px — texto de cinco palavras por linha, card de 246 px de altura. Medido no navegador, não
estimado.

## Rollback

Reverter o commit devolve a versão anterior da página. Nenhuma migration, nenhum dado, nenhuma
configuração de ambiente está envolvida — a única configuração que a página lê é
`VITE_WHATSAPP_NUMBER`, que já existia.
