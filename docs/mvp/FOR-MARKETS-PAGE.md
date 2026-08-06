# /para-mercados — a proposta para supermercados independentes

Decisões técnicas da **Parte 3**. Complementa `HOME-NORTH-STAR.md` (a Home que o morador vê),
`WHATSAPP-ENTRY.md` (o mecanismo do CTA) e `MANUAL-OFFER-OPERATIONS.md` (o que acontece depois
que a conversa começa).

## Para que a página existe

É a página que o Founder manda para um dono de mercado. Não é uma landing de captação: ela
precisa explicar o que é o ViPreço, como participar e o que a plataforma faz com a informação —
e precisa fazer isso sem parecer ameaça, sem parecer marketplace e sem afirmar nada que ainda não
existe.

## Ordem da página — **atualizada em 06/08/2026 (B2B-0)**

| #   | Seção                                         | O que responde                                     |
| --- | --------------------------------------------- | -------------------------------------------------- |
| 1   | Primeira dobra                                | para quem é, o que ainda não é, o que fazer depois |
| 2   | Como o piloto funciona                        | as **cinco** etapas                                |
| 3   | **Como o consumidor encontra o seu mercado**  | os quatro momentos _(nova)_                        |
| 4   | **O que pedimos ao seu mercado**              | os seis pedidos _(nova)_                           |
| 5   | **Benefícios potenciais**                     | cinco, todos condicionais _(nova)_                 |
| 6   | Não precisa cadastrar o mercado inteiro       | começar com poucos produtos                        |
| 7   | Você escolhe quais produtos enviar            | o que o mercado envia, corrige e retira            |
| 8   | Neutralidade: as regras valem para todo mundo | a frase por extenso, mais procedência e validade   |
| 9   | O piloto está sendo preparado em Artemis      | convite para conversa, não inscrição               |
| 10  | Dúvidas frequentes                            | as seis do mandato mais custo e concorrentes       |
| 11  | Convite final                                 | o mesmo CTA, a mesma mensagem                      |

### O que B2B-0 mudou, e por quê

A página explicava bem o que o mercado **envia** e mal o que o morador **vê**. Para quem toca
uma loja, a segunda pergunta é a que decide — "e daí, quem me encontra?" —, e ela não tinha
resposta em lugar nenhum.

| Onde           | Antes                                             | Depois                                                                                         |
| -------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Primeira dobra | "Seu mercado mais perto de quem compra no bairro" | "Leve mais consumidores de Artemis até suas ofertas", e o subtítulo diz que **não está no ar** |
| Como funciona  | três passos, terminando em "o morador encontra"   | cinco etapas; as duas novas são **medir** e **devolutiva**                                     |
| Neutralidade   | diluída numa lista: "A ordem não é vendida."      | a frase por extenso, em destaque                                                               |
| CTA            | "Quero conhecer o piloto"                         | "Quero conversar sobre o piloto"                                                               |

**O subtítulo da primeira dobra é a mudança que mais importa.** Um lojista que descobre no meio
da conversa que o produto ainda não está no ar relê tudo o que ouviu antes com desconfiança — e
com razão. Dizer isso na primeira dobra custa uma linha e compra a conversa inteira.

**"Conhecer" virou "conversar"** porque conhecer é passivo e não pede nada; conversar nomeia
exatamente o que está sendo pedido, que são vinte minutos.

**Os cinco benefícios são potenciais, e a palavra aparece no título E no corpo.** Dizê-la uma vez
só, em letra miúda, seria ressalva; dizê-la duas é o enquadramento.

A página acompanha o kit de entrevistas em
[`../business/interviews/`](../business/interviews/): o roteiro mostra o protótipo no bloco 6, e
a página cumpre o mesmo papel quando alguém a abre sozinho.

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
("Quero conversar sobre o piloto") e a loja de visibilidade.

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

## As duas perguntas que faltavam

Auditoria final da Parte 3. Um dono de mercado faz as duas antes de qualquer outra, e a página
respondia só por omissão.

**"O piloto custa alguma coisa?"** — "O piloto ainda está em preparação. As condições serão
combinadas na conversa inicial. Nada será cobrado sem acordo prévio." Não promete gratuidade, não
define mensalidade, contrato nem preço, e não sugere cobrança escondida: nenhuma dessas decisões
foi tomada, e inventar qualquer uma delas seria pior do que não responder. O teste barra "grátis",
"gratuito", "sem custo", "de graça", "taxa de adesão" e "plano".

**"Outros mercados poderão ver meus preços?"** — "Sim. Tudo o que for publicado no ViPreço é
público para moradores e mercados. Você escolhe quais informações do seu mercado deseja enviar e
pode pedir correção ou retirada do que forneceu. Informações verificadas pelo ViPreço seguem as
mesmas regras para todos." O produto é um comparador público; esconder isso na conversa comercial
seria mentira com data para vencer. A fronteira do controle continua a mesma.

## Jargão

"Orgânica" é palavra de dentro de casa. A página usa o termo **uma vez**, e nessa vez o explica:

> A comparação normal, sem pagamento, também chamada de comparação orgânica, segue as mesmas
> regras para todos. Pagamento não muda a ordem dos resultados.

Nos outros lugares a página diz "comparação normal" ou "ordem dos resultados" — inclusive no card
que antes se chamava "Informação orgânica" e agora se chama "Comparação normal". A regra
**"Pagamento não muda a ordem dos resultados."** aparece nas três posições em que a pergunta se
coloca: na fronteira do controle, na lista de regras e na resposta sobre pagar para aparecer
primeiro. O teste conta as ocorrências dos dois lados.

## Datas do exemplo

O card fictício mostrava "válido até sábado" e "informado ontem". A página não tem loader, não
recebe hora do servidor e não recalcula nada: dia da semana e dia relativo escritos no código
ficam errados no dia seguinte e continuam errados para sempre.

Agora as duas datas são absolutas e passam pelo mesmo `formatDate` do Achado real — "válido até
05/08/2026" e "31/07/2026 · informado pelo mercado". A linha de procedência perde o segmento
relativo do card real ("· ontem ·"), que é justamente a parte que exige recálculo. Um teste
proíbe dia da semana e dia relativo dentro do card.

Consequência assumida: sendo absolutas e estáticas, as datas envelhecem. O card está rotulado
**Exemplo fictício** e a alternativa — recalcular no cliente — reintroduziria divergência de
hidratação e a relatividade que a auditoria pediu para tirar.

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
