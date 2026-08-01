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
3. **o que qualquer pessoa pode fazer** — avisar sobre informação incorreta, venha de onde vier,
   para que seja conferida e corrigida.

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
| `og:image`     | `/og/vipreco-og-para-mercados.png` (absoluta quando `VITE_PUBLIC_SITE_URL` existe)               |
| Dimensões      | 1200×630, `image/png`                                                                            |
| `twitter:card` | `summary_large_image`                                                                            |

O asset é **estático**, como o do consumidor: nenhum gerador dinâmico, nenhuma dependência
externa, nenhum número, métrica, depoimento, logo de mercado real, promessa de venda ou urgência.
Só a promessa da página e o estado real do piloto — "Piloto em preparação · Artemis". O fonte
vetorial fica ao lado, em `public/og/vipreco-og-para-mercados.svg`, e o PNG foi rasterizado a
partir dele com as fontes oficiais (Bricolage Grotesque 800 e Public Sans 600).

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
