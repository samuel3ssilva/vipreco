import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Search,
  Sparkles,
  Store,
  Tag,
} from "lucide-react";
import { MarketShell } from "@/components/MarketShell";
import { MarketWhatsAppCta } from "@/components/MarketWhatsAppCta";
import { SourceBadge } from "@/components/SourceBadge";
import { StickyMarketCta } from "@/components/StickyMarketCta";
import { formatDate } from "@/lib/format";
import { PILOT_LOCALITY } from "@/lib/pilot";
import { OG_IMAGE_MARKETS_ALT, OG_IMAGE_MARKETS_PATH, ogImageMeta } from "@/lib/og";

/** Título e descrição próprios da rota — é o que aparece na aba e na prévia do link. */
const PAGE_TITLE = "ViPreço para mercados de Artemis";
const PAGE_DESCRIPTION =
  "Conheça o piloto local do ViPreço e veja como divulgar alguns produtos com preço, data e origem.";

/**
 * Proposta para supermercados independentes (Parte 3, seções A–I do mandato).
 *
 * É a página que o Founder manda para um dono de mercado. Ela precisa explicar o que é o ViPreço,
 * como participar e o que a plataforma faz com a informação — sem parecer ameaça, sem parecer
 * marketplace e, principalmente, sem afirmar nada que ainda não existe.
 *
 * O que a página deliberadamente **não** faz:
 * - não promete aumento de venda, tráfego ou economia;
 * - não cita mercado participante, número de moradores, vaga, data de lançamento ou preço;
 * - não apresenta painel, relatório ou inteligência de mercado como se já operassem;
 * - não coleta nada: nenhum formulário, nenhum cadastro, nenhum lead — só uma conversa que a
 *   própria pessoa começa, no WhatsApp, quando quiser.
 *
 * Nenhuma consulta a dados: a página é estática de ponta a ponta e não tem loader.
 */

export const Route = createFileRoute("/para-mercados")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      // Asset próprio: a prévia que o Founder manda para um dono de mercado não pode ser a do
      // consumidor. `summary_large_image` vem junto, do mesmo helper.
      ...ogImageMeta({ path: OG_IMAGE_MARKETS_PATH, alt: OG_IMAGE_MARKETS_ALT }),
    ],
  }),
  component: ForMarketsPage,
});

/** Microcopy do convite. Diz o que acontece depois do toque — e o que não acontece. */
const HERO_MICROCOPY = "Conversa inicial, sem compromisso. O piloto ainda está em preparação.";
const CTA_FINAL_MICROCOPY =
  "Uma conversa inicial para entender seu mercado. Sem cadastro automático.";

/**
 * Exemplo fictício, na mesma anatomia do Achado real: é a resposta visual para "o que aparece
 * para o morador". Nome de mercado propositalmente genérico — nenhum mercado real é apresentado
 * como participante, aqui ou em qualquer outro lugar do produto.
 *
 * As datas são **absolutas**, e passam pelo mesmo `formatDate` do card real. A versão anterior
 * dizia "válido até sábado" e "informado ontem": numa página estática, sem loader e sem hora do
 * servidor, dia da semana e dia relativo são afirmações que ninguém recalcula e que ficam erradas
 * no dia seguinte. Data absoluta erra menos, e é o que o morador vê no Achado de verdade.
 */
const EXEMPLO = {
  produto: "Café torrado e moído, tradicional",
  embalagem: "500 g",
  moeda: "R$",
  valor: "14,90",
  precoFalado: "14 reais e 90 centavos",
  mercado: "Mercado de exemplo",
  // AS DUAS DATAS APODRECEM, E O TESTE É O ALARME.
  //
  // A versão anterior dizia "válido até 05/08/2026" e ficou no ar em 06/08: o card vitrine
  // da página exibia uma oferta VENCIDA, que é exatamente o estado que `isValidPrice()`
  // esconde no produto de verdade. O comentário antigo defendia a data absoluta contra o
  // "ontem" congelado, e defendia bem — só que data absoluta também vence.
  //
  // Corrigir a data sem mais nada só adia o mesmo defeito. Por isso
  // `para-mercados.contract.test.ts` reprova quando `validoAte` está no passado: o
  // apodrecimento passa a ser um teste vermelho com o conserto escrito, em vez de uma
  // mentira silenciosa numa página que um lojista lê como proposta.
  /** Meio-dia UTC: qualquer hora entre 03h e 21h cai no mesmo dia no fuso do piloto. */
  observadoEm: "2026-11-24T12:00:00.000Z",
  validoAte: "2026-12-05T12:00:00.000Z",
  origem: "informado pelo mercado",
} as const;

/**
 * Como o consumidor chega até o mercado — os quatro momentos.
 *
 * B2B-0 acrescentou esta seção porque a página explicava bem o que o mercado ENVIA e mal o que
 * o morador VÊ. Para quem toca uma loja, a segunda pergunta é a que decide: "e daí, quem me
 * encontra?".
 *
 * São descrições em texto, e não capturas de tela. O laboratório do Card v2 produziria uma
 * imagem bonita com "Mercado Exemplo" e "R$ 12,90" — e uma imagem com cara de produto pronto,
 * numa página que um lojista lê como proposta, promete um produto que ainda não está no ar. O
 * único exemplo visual da página continua sendo o card estático, rotulado "Exemplo fictício".
 */
const MOMENTOS = [
  {
    Icon: Sparkles,
    titulo: "1. Achados",
    texto:
      "As ofertas do bairro, com preço, mercado e a data em que o preço foi visto. É a primeira tela de quem abre o ViPreço.",
  },
  {
    Icon: Search,
    titulo: "2. Busca por produto exato",
    texto:
      "Não é “café”: é aquele café, daquela marca, de 500 g. Quem busca assim já decidiu o que quer, e só não sabe onde está mais barato.",
  },
  {
    Icon: Store,
    titulo: "3. Comparação entre mercados",
    texto:
      "O mesmo produto, nos mercados que informaram preço, do mais barato para o mais caro. Cada linha traz de onde veio o preço e quando.",
  },
  {
    Icon: MapPin,
    titulo: "4. Como chegar",
    texto:
      "Nome do mercado, bairro e caminho no mapa. O ViPreço termina aqui: quem vende é a loja.",
  },
] as const;

/**
 * As cinco etapas do piloto, do ponto de vista de quem vai participar dele.
 *
 * A versão anterior tinha três passos e parava em "o morador encontra". Faltavam os dois que o
 * mercado mais quer saber: se alguém mede alguma coisa, e se ele vai ficar sabendo do resultado.
 * O quinto passo diz "inclusive se não funcionar" de propósito — uma devolutiva que só existe
 * quando dá certo não é devolutiva, é divulgação.
 */
const ETAPAS = [
  {
    Icon: Tag,
    titulo: "1. Amostra pequena",
    texto:
      "De 10 a 20 produtos que o seu mercado considere importantes. Não é o catálogo inteiro, e não existe quantidade mínima.",
  },
  {
    Icon: MessageCircle,
    titulo: "2. Validação dos preços",
    texto:
      "Do jeito que for mais fácil: mensagem, foto do encarte ou planilha. Produto, embalagem, preço e validade quando houver.",
  },
  {
    Icon: ClipboardCheck,
    titulo: "3. Publicação com data",
    texto:
      "Cada preço é publicado com mercado, data e origem. Nesta fase, uma pessoa confere cada informação antes de publicar.",
  },
  {
    Icon: BarChart3,
    titulo: "4. Medição do interesse",
    texto:
      "Duas ou três semanas para entender se as pessoas do bairro usam. Nenhum número é prometido antes de existir.",
  },
  {
    Icon: MessagesSquare,
    titulo: "5. Devolutiva",
    texto: "Quem conduz o piloto volta e conta o que aconteceu, inclusive se não funcionar.",
  },
] as const;

/**
 * O que se pede ao mercado, e nada além disso.
 *
 * A lista é curta porque o pedido é curto. Cada item aqui é uma coisa que uma pessoa pode fazer
 * numa tarde; nenhum deles é "instalar", "integrar" ou "assinar".
 *
 * O item das atualizações entrou depois da revisão especializada, e entrou por honestidade: a
 * etapa 4 mede duas ou três semanas e pressupõe preço vivo. Sem essa linha, o lojista aceita
 * "uma validação pequena" e descobre o envio recorrente só na conversa — que é puxá-lo por
 * isca. O pedido fica maior; o aceite fica informado.
 */
const PEDIDOS = [
  "Uma conversa de vinte minutos",
  "Contar como o preço e a promoção funcionam hoje no seu mercado",
  "Uma validação pequena, dos preços daquela amostra",
  "Atualizações dos preços durante o piloto, no ritmo que for combinado",
  "Autorização para usar o nome e o endereço do mercado",
  "Sua opinião honesta depois",
  "Uma pessoa de contato",
] as const;

/**
 * Benefícios — todos escritos como **potenciais**, porque é o que são.
 *
 * Nenhum deles foi medido, e nenhum pode ser medido antes do piloto. O verbo de cada linha é
 * condicional ou de possibilidade; a página inteira cai se um deles virar promessa.
 *
 * "As ofertas ALCANÇAM quem não está no grupo" era a única linha no indicativo, e com zero
 * usuários o alcance de hoje é zero. Virou "podem alcançar" depois da revisão especializada.
 */
const BENEFICIOS = [
  {
    titulo: "Visibilidade local",
    texto: "Aparecer para quem está procurando aquele produto, no bairro, naquele momento.",
  },
  {
    titulo: "Divulgação além dos canais atuais",
    texto:
      "As ofertas podem alcançar quem não está no grupo de WhatsApp nem passa em frente à loja.",
  },
  {
    titulo: "Público com intenção",
    texto: "Quem busca um produto exato já decidiu o que quer comprar.",
  },
  {
    titulo: "Aprendizado sobre a região",
    texto: "O que as pessoas de Artemis procuram: informação que hoje ninguém tem.",
  },
] as const;

/**
 * O que o mercado envia — e, por consequência, o que ele decide sobre o **próprio** envio.
 *
 * O escopo é essa fronteira e nada além dela: o mercado não controla a comparação orgânica, o
 * que outros mercados informam nem a ordem dos resultados. Por isso os dois últimos itens dizem
 * "do que enviou" em vez de "correção" e "retirada" soltos.
 */
const ENVIADO_PELO_MERCADO = [
  "Produto",
  "Embalagem",
  "Preço",
  "Validade, quando houver",
  "Unidade ou loja correspondente",
  "Pedido de correção do que enviou",
  "Pedido de retirada do que enviou",
] as const;

const REGRAS = [
  {
    regra: "Todo preço aparece com mercado, data e origem.",
    porque: "Quem lê sabe de onde veio a informação e quando ela foi observada.",
  },
  {
    regra: "Validade só quando o mercado informa.",
    porque: "O ViPreço não inventa prazo. Sem informação, nenhum prazo é exibido.",
  },
  {
    regra: "A ordem não é vendida.",
    porque: "Pagamento não muda a ordem dos resultados.",
  },
  {
    regra: "Errou? É só avisar.",
    porque: "A informação é corrigida ou retirada pelo mesmo canal da conversa.",
  },
  {
    regra: "Você compra na loja.",
    porque: "O ViPreço não altera o preço no caixa.",
  },
] as const;

const DUVIDAS = [
  {
    pergunta: "O ViPreço vende os produtos?",
    resposta:
      "Não. A compra acontece diretamente no mercado. O ViPreço mostra a informação; quem vende é a loja.",
  },
  {
    // Custo é das primeiras dúvidas de qualquer dono de mercado, e estava em sexto lugar.
    // Nada de gratuidade permanente prometida, nada de mensalidade, contrato ou preço
    // inventado: o que a página pode dizer com honestidade é que ainda não há condição
    // definida e que ninguém será cobrado sem combinar antes.
    pergunta: "O piloto custa alguma coisa?",
    resposta:
      "O piloto ainda está em preparação. As condições serão combinadas na conversa inicial. Nada será cobrado sem acordo prévio.",
  },
  {
    pergunta: "O ViPreço altera o preço no caixa?",
    resposta:
      "Não. O preço final, o estoque e a operação da loja continuam sob responsabilidade do mercado. O produto pode acabar antes da validade informada.",
  },
  {
    pergunta: "Preciso enviar todos os produtos?",
    resposta:
      "Não. O piloto pode começar com produtos selecionados: aqueles que fizerem sentido divulgar.",
  },
  {
    pergunta: "Posso corrigir uma informação?",
    resposta:
      "Sim, sobre o que o seu mercado enviou: o processo do piloto prevê pedido de correção e de retirada pelo mesmo canal de conversa. Encontrou outra informação incorreta? Avise para que ela seja conferida e corrigida.",
  },
  {
    pergunta: "O mercado paga para aparecer primeiro?",
    resposta:
      "Pagamento não muda a ordem dos resultados. Se um dia existir conteúdo comercial, ele será identificado como tal e ficará fora da comparação.",
  },
  {
    // A pergunta que um dono de mercado faz de verdade. A resposta não pode esconder que o que é
    // publicado é público, nem sugerir controle sobre o que o ViPreço verifica por conta própria.
    pergunta: "Outros mercados poderão ver meus preços?",
    resposta:
      "Sim. Tudo o que for publicado no ViPreço é público para moradores e mercados. Você escolhe quais informações do seu mercado deseja enviar e pode pedir correção ou retirada do que forneceu. Informações verificadas pelo ViPreço seguem as mesmas regras para todos. Vale lembrar: o preço da gôndola e do encarte já é público hoje. E a comparação é sempre de um produto exato, então não é a sua cesta contra a do concorrente.",
  },
  {
    pergunta: "Como demonstrar interesse?",
    resposta:
      "Pelo botão desta página, que abre uma conversa individual no WhatsApp. Não existe formulário nem cadastro automático.",
  },
] as const;

/** Card estático — mesma anatomia do Achado, sem nenhum dado real por trás. */
function ExemploDeAchado() {
  return (
    <div className="card-base flex flex-col gap-2 p-4">
      <p className="eyebrow">Exemplo fictício</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SourceBadge source="store_list" />
        <span className="font-data inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
          {`válido até ${formatDate(EXEMPLO.validoAte)}`}
        </span>
      </div>

      <div>
        <p className="font-display text-xl leading-tight">{EXEMPLO.produto}</p>
        <p className="meta-text mt-0.5">{EXEMPLO.embalagem}</p>
      </div>

      <p
        aria-hidden="true"
        className="font-display text-[2.125rem] font-extrabold leading-none tabular-nums text-primary"
      >
        <span className="text-[62%] font-bold">{EXEMPLO.moeda}</span>
        <span className="ml-1">{EXEMPLO.valor}</span>
      </p>
      <span className="sr-only">{EXEMPLO.precoFalado}</span>

      <p className="text-base font-semibold">
        {EXEMPLO.mercado} <span className="font-normal">{`· ${PILOT_LOCALITY}`}</span>
      </p>

      {/* Mesma linha seca do card real, menos o dia relativo: sem loader, não há como recalcular
          "ontem" — e um "ontem" congelado no código vira mentira no dia seguinte. */}
      <p className="font-data text-xs leading-snug text-muted-foreground">
        {`${formatDate(EXEMPLO.observadoEm)} · ${EXEMPLO.origem}`}
      </p>
    </div>
  );
}

function ForMarketsPage() {
  return (
    <MarketShell>
      <div className="space-y-10">
        <section
          aria-labelledby="proposta-titulo"
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-8"
        >
          <div>
            {/* Artemis é escrito por extenso na prosa da página, não interpolado: interpolar
                quebraria a frase em dois nós de texto no HTML do servidor. A constante segue
                servindo onde o texto é montado por template — ver `ExemploDeAchado`. */}
            <p className="eyebrow">Para mercados de Artemis</p>
            <h1
              id="proposta-titulo"
              className="font-display mt-1.5 text-3xl leading-tight sm:text-4xl"
            >
              Mostre suas ofertas no piloto do ViPreço em Artemis
            </h1>
            {/* Copy decidida pelo Founder/PMO em 06/08/2026, aplicada ao pé da letra. A versão
                anterior ("Leve mais consumidores de Artemis até suas ofertas") prometia um
                resultado que o piloto não pode garantir, e que a própria página desmentia três
                seções abaixo. Esta diz o que o mercado FAZ, não o que ele GANHA. */}
            <p className="mt-2 max-w-prose text-base text-muted-foreground">
              Estamos preparando um teste local para ajudar consumidores a encontrar e comparar
              ofertas com produto exato, fonte, data e validade.
            </p>
            {/* A FRASE "O VIPREÇO AINDA NÃO ESTÁ NO AR" SAIU DAQUI, POR DECISÃO DO FOUNDER/PMO
                em 06/08/2026. Eu a tinha mantido em linha própria por achar que "estamos
                preparando" apenas sugere, enquanto ela afirma. O Founder decidiu o contrário, e
                a razão é boa: a mesma informação aparece três vezes na primeira dobra — no
                banner de ambiente de teste no topo, no subtítulo, e na microcopy logo abaixo do
                convite. Dizer quatro vezes que o produto não existe faz o lojista parar de ler.

                O que continua é o que a frase NÃO dizia: o tamanho do piloto. */}
            <p className="mt-2 max-w-prose text-base text-muted-foreground">
              O piloto começa pequeno: alguns produtos, algumas semanas, e a devolutiva do que
              aconteceu.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
              <MarketWhatsAppCta microcopy={HERO_MICROCOPY} />
              {/* Âncora, não outra rota: o próximo passo de quem ainda não quer conversar está
                  logo abaixo, na mesma página. */}
              {/* `sm:whitespace-nowrap`: em uma linha só a partir de `sm`, para o botão ficar da
                  mesma altura do convite ao lado — medido em 1280 px, 56 px contra 48 px. */}
              <a
                href="#como-funciona"
                className="btn-base btn-secondary btn-touch-48 w-full rounded-full sm:w-auto sm:whitespace-nowrap"
              >
                Como funciona para o mercado
              </a>
            </div>
          </div>

          <div className="lg:justify-self-end lg:max-w-sm">
            <ExemploDeAchado />
            <p className="meta-text mt-2 max-w-prose">
              É assim que a informação do seu mercado aparece para o morador: produto, preço,
              mercado, data e origem, sempre juntos.
            </p>
          </div>
        </section>

        {/* `tabIndex={-1}`: sem isso, o link âncora rola a página mas deixa o foco do teclado no
            topo — quem chegou aqui pelo teclado continuaria tabulando a primeira dobra.
            `scroll-mt-20`: o header é fixo no topo e, sem essa margem, a âncora parava o título
            exatamente atrás dele — medido em 375 px no staging, com o alvo em `top: 0`. */}
        <section
          id="como-funciona"
          tabIndex={-1}
          aria-labelledby="como-funciona-titulo"
          className="scroll-mt-20 space-y-3"
        >
          <div>
            <h2 id="como-funciona-titulo" className="font-display text-xl sm:text-2xl">
              Como o piloto funciona
            </h2>
            <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
              Cinco etapas, sem sistema para instalar e sem integração com o caixa.
            </p>
          </div>

          {/* Duas colunas a partir de `sm`, três a partir de `lg`. Cinco cards numa linha só
              produziriam colunas de 180 px no desktop e texto de quatro palavras por linha. */}
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ETAPAS.map(({ Icon, titulo, texto }) => (
              <li key={titulo} className="card-base">
                <Icon aria-hidden="true" className="size-5 text-primary" />
                <p className="mt-1.5 text-base font-bold">{titulo}</p>
                <p className="meta-text mt-0.5">{texto}</p>
              </li>
            ))}
          </ol>

          {/* As cinco etapas descrevem como o piloto VAI funcionar. Sem esta linha, o presente do
              indicativo dos cards poderia ser lido como operação em curso — e não está. */}
          <p className="max-w-prose text-sm text-muted-foreground">
            Nada disso está em operação hoje: o piloto ainda está sendo preparado, e o primeiro
            passo é a conversa.
          </p>
        </section>

        <section aria-labelledby="momentos-titulo" className="space-y-3">
          <div>
            <h2 id="momentos-titulo" className="font-display text-xl sm:text-2xl">
              Como o consumidor encontra o seu mercado
            </h2>
            <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
              Quatro momentos, do primeiro toque até a porta da loja.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2">
            {MOMENTOS.map(({ Icon, titulo, texto }) => (
              <li key={titulo} className="card-base">
                <Icon aria-hidden="true" className="size-5 text-primary" />
                <p className="mt-1.5 text-base font-bold">{titulo}</p>
                <p className="meta-text mt-0.5">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="pedidos-titulo" className="space-y-3">
          <div>
            <h2 id="pedidos-titulo" className="font-display text-xl sm:text-2xl">
              O que pedimos ao seu mercado
            </h2>
            <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
              Sete coisas, e nenhuma delas é instalar, integrar ou assinar.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PEDIDOS.map((item) => (
              <li key={item} className="card-compact bg-surface flex items-start gap-2 text-sm">
                <ClipboardCheck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="beneficios-titulo" className="space-y-3">
          <div>
            <h2 id="beneficios-titulo" className="font-display text-xl sm:text-2xl">
              Benefícios potenciais
            </h2>
            {/* "Potenciais" está no título e é repetido aqui, porque é a palavra que separa esta
                seção de uma promessa. Nada abaixo foi medido, e nada pode ser medido antes do
                piloto — dizer "potencial" uma vez só, em letra miúda, seria ressalva; dizer duas,
                no título e no corpo, é o enquadramento. */}
            <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
              Potenciais mesmo: nada aqui foi medido, e nada disso é promessa. O ViPreço não promete
              venda, movimento nem resultado.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICIOS.map(({ titulo, texto }) => (
              <li key={titulo} className="card-compact bg-surface text-sm">
                <p className="font-semibold">{titulo}</p>
                <p className="meta-text mt-0.5">{texto}</p>
              </li>
            ))}
          </ul>

          {/* "Métricas simples, no futuro" era o quinto card desta lista, e a revisão
              especializada apontou o óbvio: um benefício que se declara inexistente engorda a
              lista sem acrescentar nada. O conteúdo continua na página, no lugar certo — a
              devolutiva da etapa 5 é o que de fato existe hoje. */}
          <p className="max-w-prose text-sm text-muted-foreground">
            Número, só quando existir. O que existe hoje é a devolutiva: no fim do piloto, contamos
            o que aconteceu.
          </p>
        </section>

        <section aria-labelledby="poucos-produtos-titulo" className="card-base space-y-2">
          <h2 id="poucos-produtos-titulo" className="font-display text-xl sm:text-2xl">
            Não precisa cadastrar o mercado inteiro
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Para participar do piloto, o mercado não precisa cadastrar todos os itens. A ideia é
            começar com alguns produtos que façam sentido divulgar.
          </p>
          {/* Quem escolhe os produtos é o mercado, e a escolha é de divulgação, não de mídia paga:
              "destacar" e "divulgar", nunca "anunciar". Sem validade curta, sem queima de estoque
              e sem urgência — o uso para produtos perto do vencimento segue como hipótese de
              entrevista, fora desta página. */}
          <p className="max-w-prose text-sm text-muted-foreground">
            O mercado pode escolher produtos que queira destacar, como ofertas, itens sazonais ou
            produtos com estoque alto.
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Quantos produtos e com que frequência é assunto da conversa inicial. Não existe
            quantidade mínima nem obrigação de envio.
          </p>
        </section>

        <section aria-labelledby="controle-titulo" className="space-y-3">
          <div>
            <h2 id="controle-titulo" className="font-display text-xl sm:text-2xl">
              Você escolhe quais produtos enviar
            </h2>
            <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
              O mercado pode enviar produtos selecionados e pedir a correção ou retirada das
              informações que forneceu.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ENVIADO_PELO_MERCADO.map((item) => (
              <li key={item} className="card-compact bg-surface flex items-start gap-2 text-sm">
                <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>

          {/* Primeira ocorrência pública de "orgânica" na página, e a única: aqui o termo é
              apresentado como sinônimo do que já foi dito em português simples. Nos outros lugares
              a página diz "comparação normal" ou "ordem dos resultados". */}
          <p className="max-w-prose text-sm text-muted-foreground">
            A comparação normal, sem pagamento, também chamada de comparação orgânica, segue as
            mesmas regras para todos. Pagamento não muda a ordem dos resultados.
          </p>

          <div className="card-compact bg-surface max-w-prose">
            <p className="text-sm font-bold">Encontrou uma informação incorreta?</p>
            {/* A correção não é privilégio de quem enviou a informação, e também não é promessa de
                remoção a pedido: o que a página promete é conferir a origem e corrigir. Vale para
                o que o mercado mandou e para o que a equipe do ViPreço levantou. */}
            <p className="meta-text mt-0.5">
              Avise o ViPreço. Nós conferimos a origem e fazemos a correção, seja uma informação
              enviada pelo mercado ou verificada pela nossa equipe.
            </p>
          </div>

          <p className="max-w-prose text-sm text-muted-foreground">
            O ViPreço não altera preço de caixa, estoque nem a operação interna do mercado. Nesta
            fase não existe painel de mercado: os pedidos são feitos pelo mesmo canal da conversa.
          </p>
        </section>

        <section aria-labelledby="confianca-titulo" className="card-base space-y-4">
          <div>
            <h2 id="confianca-titulo" className="font-display text-xl sm:text-2xl">
              Neutralidade: as regras valem para todo mundo
            </h2>
            {/* A frase aparece por extenso, em destaque, e não diluída numa lista de bullets.
                É a única afirmação da página que um lojista pode querer testar depois, e é a
                única que não é negociável em nenhum cenário de nenhum resultado de entrevista. */}
            <p className="border-primary mt-2 max-w-prose border-l-4 pl-3 text-base font-semibold">
              Participar do ViPreço não compra posição no ranking.
            </p>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              A ordem é sempre pelo preço, do mais barato para o mais caro. São as mesmas regras que
              o morador lê na página inicial: não existe uma versão para o consumidor e outra para o
              mercado.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {REGRAS.map(({ regra, porque }) => (
              <li key={regra} className="text-sm">
                <p className="font-semibold">{regra}</p>
                <p className="meta-text">{porque}</p>
              </li>
            ))}
          </ul>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="card-compact bg-surface">
              <p className="text-sm font-bold">Comparação normal</p>
              <p className="meta-text mt-0.5">
                É tudo o que existe hoje: preço, mercado, data e origem, ordenados do menor preço
                para o maior. Nada nessa ordem está à venda.
              </p>
            </div>
            <div className="card-compact bg-surface">
              <p className="text-sm font-bold">Conteúdo patrocinado</p>
              <p className="meta-text mt-0.5">
                Não existe hoje. Se um dia existir, virá identificado, em área separada, e não
                entrará na comparação nem mudará a ordem dos resultados.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="piloto-titulo" className="space-y-2">
          <h2 id="piloto-titulo" className="font-display text-xl sm:text-2xl">
            O piloto está sendo preparado em Artemis
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            O primeiro piloto do ViPreço está sendo preparado em Artemis. A operação inicial será
            pequena, manual e acompanhada de perto para entender o que funciona para moradores e
            mercados.
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Por enquanto, o convite é para uma conversa. Não é uma inscrição, e nada foi publicado
            ainda.
          </p>
        </section>

        <section aria-labelledby="duvidas-titulo" className="space-y-3">
          <h2 id="duvidas-titulo" className="font-display text-xl sm:text-2xl">
            Dúvidas frequentes
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {DUVIDAS.map(({ pergunta, resposta }) => (
              <li key={pergunta} className="card-base">
                <h3 className="text-base font-bold">{pergunta}</h3>
                <p className="meta-text mt-1">{resposta}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="convite-titulo"
          className="card-base bg-surface space-y-3 text-surface-foreground"
        >
          <h2 id="convite-titulo" className="font-display text-xl sm:text-2xl">
            Vamos conversar sobre o piloto em Artemis?
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Vinte minutos, sem compromisso e sem nada para assinar. Nada é publicado com o nome do
            seu mercado sem sua autorização.
          </p>
          <MarketWhatsAppCta microcopy={CTA_FINAL_MICROCOPY} />
        </section>

        <Link to="/" className="btn-base btn-secondary btn-touch-48 w-full sm:w-auto">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Ver os Achados de Artemis
        </Link>
      </div>

      {/* Só no mobile, e só quando nenhum dos dois convites do fluxo está na tela. */}
      <StickyMarketCta />
    </MarketShell>
  );
}
