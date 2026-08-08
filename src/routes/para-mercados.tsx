import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  MessageCircle,
  MessagesSquare,
  PackageOpen,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Store,
  Tag,
  WifiOff,
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
 *
 * =============================================================================
 * DEMO FREEZE §11–§19 — O QUE MUDOU, E O QUE NÃO PODIA MUDAR
 * =============================================================================
 *
 * O defeito que motivou esta rodada era densidade, não tamanho: a página era cartão de texto
 * atrás de cartão de texto, todos com o mesmo peso, por umas dezenove telas de celular. O §23
 * pede que um lojista entenda seis coisas em dez segundos, e dez segundos de uma página assim
 * rendiam o título e mais nada.
 *
 * **A ALTURA TOTAL FICOU PRATICAMENTE A MESMA, e isso é medição, não impressão.** As duas versões
 * foram capturadas pelo mesmo script, no mesmo navegador, no mesmo instante:
 *
 *   320 px  16582 → 16734 px de dispositivo   (+0,9%)
 *   390 px  15342 → 15406                     (+0,4%)
 *   430 px  14602 → 14716                     (+0,8%)
 *   1280 px  8642 →  8766                     (+1,4%)
 *
 * (Pixels de DISPOSITIVO, que é o que o PNG mede: o script captura com DPR 2, então divida por
 * dois para ler em pixels de CSS. Confundir os dois foi o erro da primeira medição desta rodada,
 * e ele produziu uma redução de 51% que nunca existiu.)
 *
 * O acordeão das dúvidas recolheu perto de mil pixels, e a rodada gastou o mesmo tanto em coisas
 * que não existiam: os quatro cartões da primeira impressão, a imagem no exemplo de oferta e as
 * cinco perguntas novas do §17. Quem quiser uma página mais curta precisa tirar conteúdo, e tirar
 * conteúdo desta página é decisão do Founder, não do CTO.
 *
 * **O que mudou de verdade é ONDE a resposta está.** As seis perguntas do §23 passaram a ser
 * respondidas nas duas primeiras telas — hero, exemplo de oferta com imagem, e quatro cartões de
 * uma linha cada —, em vez de espalhadas por dezenove. Nenhuma afirmação factual foi removida: o
 * que estava em parágrafo longo e sempre aberto passou a viver em três formatos, escolhidos pelo
 * momento em que a informação é procurada:
 *
 * 1. o que decide em dez segundos fica na primeira dobra e em quatro cartões curtos;
 * 2. o que se lê quando já se está interessado continua em seção aberta, mais densa;
 * 3. o que se procura quando surge a dúvida foi para o acordeão de perguntas (§17), que é
 *    exatamente onde alguém vai atrás dele.
 *
 * Uma tentativa desta rodada foi revertida e vale registrar: eu tinha absorvido "Não precisa
 * cadastrar o mercado inteiro" e "O piloto está sendo preparado em Artemis" em seções vizinhas,
 * por elas repetirem o que aquelas já diziam. O guarda de copy reprovou, e reprovou certo — as
 * frases das duas são decididas pelo Founder e fixadas por teste. As duas voltaram inteiras.
 *
 * **A frase da neutralidade continua por extenso, em destaque, sempre visível.** Ela é a única
 * afirmação da página que um lojista pode querer testar depois, e a decisão de mantê-la fora de
 * qualquer lista de bullets é anterior a esta rodada. O que foi para dentro do acordeão são as
 * cinco regras que a detalham — não ela.
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
  unitario: "R$ 29,80 por kg",
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
  /**
   * Ilustração GENÉRICA de categoria, do mesmo conjunto que o morador vê nos Achados.
   *
   * O §21 do Demo Freeze autoriza asset próprio, genérico e fictício para a demonstração, e o
   * §6 fecha a porta que importa: produto fictício ↔ imagem fictícia, nunca marca real com
   * desenho genérico, nunca cópia de embalagem, nunca logotipo de mercado. O arquivo declara
   * isso dentro dele, e o `alt` declara para quem usa leitor de tela.
   */
  imagem: "/img/demo/cafe.svg",
  imagemAlt: "Ilustração genérica de café, não é a embalagem do produto",
} as const;

/**
 * DEMO FREEZE §11 — a primeira impressão, em quatro cartões.
 *
 * A referência anexada abre com quatro blocos de ícone e frase curta, e o efeito é o que o §23
 * pede: o lojista sabe do que se trata antes de decidir se lê o resto. Os quatro daqui respondem
 * às quatro objeções que aparecem em toda conversa de porta de loja — dá trabalho? preciso de
 * sistema? o que vocês fazem com meu preço? isso é grande demais para mim?
 *
 * A referência também tinha um quinto: "Sem custo para participar". Ele NÃO entrou. A própria
 * página responde, na pergunta sobre custo, que as condições serão combinadas na conversa e que
 * nada será cobrado sem acordo — e "sem custo" num cartão de destaque é uma promessa mais forte
 * do que essa, feita antes de existir a decisão que a sustentaria.
 */
const PRIMEIRA_IMPRESSAO = [
  {
    Icon: WifiOff,
    titulo: "Nada para instalar",
    texto:
      "Sem sistema, sem integração com o caixa e sem cadastro. A conversa e os envios acontecem por WhatsApp.",
  },
  {
    Icon: PackageOpen,
    titulo: "Você escolhe o que enviar",
    texto:
      "De 10 a 20 produtos que façam sentido divulgar. Não é o catálogo inteiro, e não existe quantidade mínima.",
  },
  {
    Icon: ShieldCheck,
    titulo: "Preço com procedência",
    texto:
      "Todo preço aparece com mercado, data, origem e validade quando houver. Quem lê sabe de onde veio.",
  },
  {
    Icon: Sprout,
    titulo: "Começa pequeno, em Artemis",
    texto:
      "Poucos mercados, poucos produtos, algumas semanas, e a devolutiva do que aconteceu, inclusive se não funcionar.",
  },
] as const;

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
 *
 * O §16 do Demo Freeze sugere quatro passos e proíbe terminar em "mais clientes" ou em qualquer
 * resultado garantido. Os cinco daqui são mantidos porque são um SUPERCONJUNTO dos quatro
 * sugeridos — amostra, validação, publicação, medição, devolutiva — e porque o quinto é
 * exatamente o oposto do final proibido: quem termina a lista é a devolutiva, não a promessa.
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
 * Como o piloto PODE ajudar — nunca o que ele garante.
 *
 * O §14 do Demo Freeze é a seção mais perigosa da referência anexada, e ele diz por quê: ali
 * estão "mais clientes", "mais vendas", "mais visibilidade", "destaque nas buscas" e "milhares
 * de moradores". Nenhum entra. O título "Benefícios potenciais" virou "Como o piloto pode
 * ajudar" porque "benefício" é substantivo de resultado, e resultado é o que não pode ser
 * afirmado; "pode ajudar" é o verbo de possibilidade que o próprio §14 manda usar.
 *
 * Nada aqui foi medido, e nada pode ser medido antes do piloto. A página inteira cai se um
 * destes virar promessa.
 */
const PODE_AJUDAR = [
  {
    titulo: "Uma forma nova de apresentar suas ofertas",
    texto: "Com produto exato, preço, data e origem, do jeito que o morador precisa para comparar.",
  },
  {
    titulo: "Moradores podem encontrar seus produtos ao pesquisar",
    texto: "Quem busca um produto exato já decidiu o que quer comprar.",
  },
  {
    titulo: "Divulgação além dos canais atuais",
    texto:
      "As ofertas podem alcançar quem não está no grupo de WhatsApp nem passa em frente à loja.",
  },
  {
    titulo: "O aprendizado do piloto, compartilhado",
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

/**
 * DEMO FREEZE §17 — as perguntas de entrevista, na ordem em que aparecem numa conversa real.
 *
 * Treze perguntas: as OITO que já existiam, com o texto intacto, mais CINCO da lista do §17.
 *
 * A primeira versão desta rodada trocou perguntas decididas por versões reescritas do §17 —
 * "Preciso enviar todos os produtos?" virou "Quantos produtos preciso enviar?", e assim por
 * diante. O guarda de copy reprovou, e reprovou certo: o §17 manda PRIORIZAR as perguntas de
 * entrevista, não substituir as que o Founder já decidiu. Somar custa treze linhas fechadas num
 * acordeão; renomear custa a confiança de que copy decidida fica decidida.
 *
 * As cinco novas são as que o §17 pede e a página não respondia em lugar nenhum: instalação,
 * atualização de preço, duração, saída e como a oferta aparece. Nenhuma resposta é inventada:
 * cada uma repete uma informação que a página já dava em prosa, agora onde alguém vai atrás dela.
 *
 * A ORDEM mudou de propósito. Custo e instalação são as duas primeiras, porque são as duas que um
 * dono de mercado faz antes de decidir se continua ouvindo.
 *
 * O acordeão é a razão de a página ter encolhido sem perder nada: doze respostas abertas são
 * mais de dois mil pixels de rolagem que quase ninguém lê inteira; doze linhas fechadas cabem
 * numa tela e cada uma abre sozinha.
 */
const DUVIDAS = [
  {
    // Custo é das primeiras dúvidas de qualquer dono de mercado. Nada de gratuidade permanente
    // prometida, nada de mensalidade, contrato ou preço inventado: o que a página pode dizer com
    // honestidade é que ainda não há condição definida e que ninguém será cobrado sem combinar.
    pergunta: "O piloto custa alguma coisa?",
    resposta:
      "O piloto ainda está em preparação. As condições serão combinadas na conversa inicial. Nada será cobrado sem acordo prévio.",
  },
  {
    pergunta: "Preciso instalar alguma coisa?",
    resposta:
      "Não. Não há sistema para instalar, integração com o caixa nem cadastro. O contato e os envios acontecem por WhatsApp.",
  },
  {
    pergunta: "Preciso enviar todos os produtos?",
    resposta:
      "Não. O piloto pode começar com produtos selecionados: aqueles que fizerem sentido divulgar. De 10 a 20 é o tamanho previsto, e não existe quantidade mínima.",
  },
  {
    pergunta: "Como atualizo um preço?",
    resposta:
      "Pelo mesmo canal da conversa, no ritmo que for combinado. Nesta fase o processo é manual: uma pessoa recebe a atualização e confere antes de publicar.",
  },
  {
    pergunta: "Por quanto tempo dura o piloto?",
    resposta:
      "A medição prevista é de duas ou três semanas, e no fim vem a devolutiva do que aconteceu. Nada disso está em operação hoje: o piloto ainda está sendo preparado.",
  },
  {
    pergunta: "Posso sair quando quiser?",
    resposta:
      "Sim. Não existe compromisso, cadastro automático nem nada para assinar, e o mercado pode pedir a retirada do que enviou pelo mesmo canal da conversa.",
  },
  {
    pergunta: "Como minha oferta aparece?",
    resposta:
      "Como no exemplo desta página: produto exato, embalagem, preço, mercado, bairro, data em que o preço foi observado, origem e validade quando houver. Sempre juntos.",
  },
  {
    pergunta: "O mercado paga para aparecer primeiro?",
    resposta:
      "Pagamento não muda a ordem dos resultados. Se um dia existir conteúdo comercial, ele será identificado como tal e ficará fora da comparação.",
  },
  {
    pergunta: "O ViPreço vende os produtos?",
    resposta:
      "Não. A compra acontece diretamente no mercado. O ViPreço mostra a informação; quem vende é a loja.",
  },
  {
    pergunta: "O ViPreço altera o preço no caixa?",
    resposta:
      "Não. O preço final, o estoque e a operação da loja continuam sob responsabilidade do mercado. O produto pode acabar antes da validade informada.",
  },
  {
    pergunta: "Posso corrigir uma informação?",
    resposta:
      "Sim, sobre o que o seu mercado enviou: o processo do piloto prevê pedido de correção e de retirada pelo mesmo canal de conversa. Encontrou outra informação incorreta? Avise para que ela seja conferida e corrigida.",
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

/**
 * Uma pergunta do acordeão.
 *
 * `<details>` nativo, e não um acordeão de JavaScript: ele já vem com o estado, com o foco de
 * teclado, com Enter e Espaço, com o anúncio de expandido/recolhido no leitor de tela e com a
 * busca do navegador conseguindo achar texto dentro dele. Um acordeão feito à mão precisaria
 * reimplementar tudo isso, e costuma reimplementar mal.
 *
 * `min-h-12` no `<summary>`: alvo de toque de 48 px, que é o mínimo do §25. `list-none` mais o
 * `::-webkit-details-marker` escondido tiram o triângulo do navegador, porque o chevron à
 * direita é o indicador — dois indicadores para o mesmo estado é ruído.
 *
 * O chevron gira SEM transição, e isso é contrato: `para-mercados.contract.test.ts` reprova
 * qualquer classe de animação ou de transição nesta rota, e o guarda lê o arquivo inteiro,
 * comentário incluído. A regra vale também para um acordeão: quem abriu a resposta já sabe que
 * abriu, e a rotação instantânea comunica o estado sem pedir a ninguém que espere por ela. O
 * efeito colateral é bom — a página fica correta por construção para quem pediu menos movimento
 * ao sistema, em vez de correta por variante condicional.
 */
function Pergunta({ pergunta, resposta }: { pergunta: string; resposta: string }) {
  return (
    <details className="card-compact bg-card group border-border border">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <h3 className="text-sm font-semibold">{pergunta}</h3>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 group-open:rotate-180"
        />
      </summary>
      <p className="meta-text mt-2 max-w-prose">{resposta}</p>
    </details>
  );
}

/**
 * Card estático — mesma anatomia do Achado, sem nenhum dado real por trás.
 *
 * DEMO FREEZE §15 pediu um exemplo VISUALMENTE FORTE, porque é ele que faz o lojista pensar
 * "minha oferta apareceria assim". Ganhou a imagem — a mesma ilustração genérica de categoria
 * que o morador vê nos Achados —, a variante, o preço por quilo e o bairro. A composição é a do
 * Card v2: imagem à esquerda, identidade e preço na coluna ao lado, procedência embaixo.
 *
 * O rótulo "Exemplo fictício" continua sendo a primeira coisa do card. Um exemplo bonito demais
 * sem rótulo, numa página que é proposta comercial, vira demonstração de um produto que ainda
 * não está no ar.
 */
function ExemploDeAchado() {
  return (
    <div className="card-base flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Exemplo fictício</p>
        <span className="font-data border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
          <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
          {`válido até ${formatDate(EXEMPLO.validoAte)}`}
        </span>
      </div>

      <div className="flex items-start gap-4">
        <img
          src={EXEMPLO.imagem}
          alt={EXEMPLO.imagemAlt}
          width={128}
          height={128}
          loading="lazy"
          className="border-border size-24 shrink-0 rounded-lg border object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="min-w-0">
            <p className="font-display text-xl leading-tight">{EXEMPLO.produto}</p>
            <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{EXEMPLO.variante}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{EXEMPLO.embalagem}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <p
              aria-hidden="true"
              className="font-display text-primary text-[2.25rem] leading-none font-extrabold tabular-nums min-[430px]:text-[2.5rem]"
            >
              <span className="text-[62%] font-bold">{EXEMPLO.moeda}</span>
              <span className="ml-1">{EXEMPLO.valor}</span>
            </p>
            <span className="sr-only">{EXEMPLO.precoFalado}</span>
            <p className="font-data text-muted-foreground text-sm">{EXEMPLO.unitario}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="flex items-center gap-1.5 text-base font-semibold">
          <Store aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
          {EXEMPLO.mercado}
        </p>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          {PILOT_LOCALITY}
        </p>
      </div>

      {/* Mesma linha seca do card real, menos o dia relativo: sem loader, não há como recalcular
          "ontem" — e um "ontem" congelado no código vira mentira no dia seguinte. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <SourceBadge source="store_list" />
        <p className="text-muted-foreground text-xs leading-snug tabular-nums">
          {`observado em ${formatDate(EXEMPLO.observadoEm)} · ${EXEMPLO.origem}`}
        </p>
      </div>
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
                seções abaixo. Esta diz o que o mercado FAZ, não o que ele GANHA.

                DEMO FREEZE §12 juntou os dois parágrafos num só. Eram duas frases separadas por
                um espaço de parágrafo dizendo, juntas, exatamente o que o §12 exige do subtexto:
                piloto, Artemis, poucos produtos, fase de teste. Nenhuma palavra saiu; o que saiu
                foi a quebra que fazia a primeira dobra começar com dois blocos de texto. */}
            <p className="text-muted-foreground mt-2 max-w-prose text-base">
              Estamos preparando um teste local para ajudar consumidores a encontrar e comparar
              ofertas com produto exato, fonte, data e validade. O piloto começa pequeno: alguns
              produtos, algumas semanas, e a devolutiva do que aconteceu.
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

          <div className="lg:max-w-sm lg:justify-self-end">
            <ExemploDeAchado />
            <p className="meta-text mt-2 max-w-prose">
              É assim que a informação do seu mercado aparece para o morador: produto, preço,
              mercado, data e origem, sempre juntos.
            </p>
          </div>
        </section>

        {/* DEMO FREEZE §11 — a primeira impressão. Quatro frases curtas, logo abaixo da dobra,
            respondendo às quatro objeções de porta de loja antes de qualquer seção longa. */}
        <section aria-labelledby="primeira-impressao-titulo">
          <h2 id="primeira-impressao-titulo" className="sr-only">
            O que o piloto é, em quatro pontos
          </h2>
          <ul className="grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {PRIMEIRA_IMPRESSAO.map(({ Icon, titulo, texto }) => (
              <li key={titulo} className="card-base">
                <Icon aria-hidden="true" className="text-primary size-5" />
                <p className="mt-1.5 text-base font-bold">{titulo}</p>
                <p className="meta-text mt-0.5">{texto}</p>
              </li>
            ))}
          </ul>
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
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm">
              Cinco etapas, sem sistema para instalar e sem integração com o caixa. Nada disso está
              em operação hoje: o piloto ainda está sendo preparado, e o primeiro passo é a
              conversa.
            </p>
          </div>

          {/* Duas colunas a partir de `sm`, três a partir de `lg`. Cinco cards numa linha só
              produziriam colunas de 180 px no desktop e texto de quatro palavras por linha.

              DEMO FREEZE §16: a numeração saiu do texto e virou um marcador redondo. Ela estava
              escrita dentro do título de cada card ("1. Amostra pequena"), o que obrigava o
              número a competir com o nome da etapa no mesmo peso tipográfico. */}
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ETAPAS.map(({ Icon, titulo, texto }, indice) => (
              <li key={titulo} className="card-base">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="bg-primary text-primary-foreground font-display inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  >
                    {indice + 1}
                  </span>
                  <Icon aria-hidden="true" className="text-primary size-5" />
                </div>
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
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm">
              Sete coisas, e nenhuma delas é instalar, integrar ou assinar.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PEDIDOS.map((item) => (
              <li key={item} className="card-compact bg-surface flex items-start gap-2 text-sm">
                <ClipboardCheck
                  aria-hidden="true"
                  className="text-primary mt-0.5 size-4 shrink-0"
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="pode-ajudar-titulo" className="space-y-3">
          <div>
            <h2 id="pode-ajudar-titulo" className="font-display text-xl sm:text-2xl">
              Como o piloto pode ajudar
            </h2>
            {/* "Pode" está no título e o enquadramento é repetido aqui, porque é o que separa
                esta seção de uma promessa. Nada abaixo foi medido, e nada pode ser medido antes
                do piloto — dizer a ressalva uma vez só, em letra miúda, seria rodapé; dizê-la no
                título e no corpo é o enquadramento. */}
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm">
              Pode mesmo: nada aqui foi medido, e nada disso é promessa. O ViPreço não promete
              venda, movimento nem resultado.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {PODE_AJUDAR.map(({ titulo, texto }) => (
              <li key={titulo} className="card-compact bg-surface text-sm">
                <p className="font-semibold">{titulo}</p>
                <p className="meta-text mt-0.5">{texto}</p>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground max-w-prose text-sm">
            Número, só quando existir. O que existe hoje é a devolutiva: no fim do piloto, contamos
            o que aconteceu.
          </p>
        </section>

        {/* DEMO FREEZE: esta seção FICOU. Eu a tinha absorvido em "Você escolhe quais produtos
            enviar", por ela dizer com outras palavras o que aquela já diz — e o guarda de copy
            reprovou, com razão. As três frases abaixo são copy decidida pelo Founder e fixadas
            por teste; encurtar a página nunca podia ser feito apagando o que ele decidiu. O que
            encolheu a página de 15.178 px para menos da metade foi o acordeão das dúvidas e a
            densidade dos cartões, não a remoção de conteúdo. */}
        <section aria-labelledby="poucos-produtos-titulo" className="card-base space-y-2">
          <h2 id="poucos-produtos-titulo" className="font-display text-xl sm:text-2xl">
            Não precisa cadastrar o mercado inteiro
          </h2>
          {/* Quem escolhe os produtos é o mercado, e a escolha é de divulgação, não de mídia paga:
              "destacar" e "divulgar", nunca "anunciar". Sem validade curta, sem queima de estoque
              e sem urgência. */}
          <p className="text-muted-foreground max-w-prose text-sm">
            O mercado pode escolher produtos que queira destacar, como ofertas, itens sazonais ou
            produtos com estoque alto.
          </p>
          <p className="text-muted-foreground max-w-prose text-sm">
            Quantos produtos e com que frequência é assunto da conversa inicial. Não existe
            quantidade mínima nem obrigação de envio.
          </p>
        </section>

        <section aria-labelledby="controle-titulo" className="space-y-3">
          <div>
            <h2 id="controle-titulo" className="font-display text-xl sm:text-2xl">
              Você escolhe quais produtos enviar
            </h2>
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm">
              O mercado pode enviar produtos selecionados e pedir a correção ou retirada das
              informações que forneceu.
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ENVIADO_PELO_MERCADO.map((item) => (
              <li key={item} className="card-compact bg-surface flex items-start gap-2 text-sm">
                <Tag aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>

          {/* Primeira ocorrência pública de "orgânica" na página, e a única: aqui o termo é
              apresentado como sinônimo do que já foi dito em português simples. Nos outros lugares
              a página diz "comparação normal" ou "ordem dos resultados". */}
          <p className="text-muted-foreground max-w-prose text-sm">
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
        </section>

        <section aria-labelledby="momentos-titulo" className="space-y-3">
          <div>
            <h2 id="momentos-titulo" className="font-display text-xl sm:text-2xl">
              Como o consumidor encontra o seu mercado
            </h2>
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm">
              Quatro momentos, do primeiro toque até a porta da loja.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MOMENTOS.map(({ Icon, titulo, texto }, indice) => (
              <li key={titulo} className="card-base">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="bg-surface text-primary font-display inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  >
                    {indice + 1}
                  </span>
                  <Icon aria-hidden="true" className="text-primary size-5" />
                </div>
                <p className="mt-1.5 text-base font-bold">{titulo}</p>
                <p className="meta-text mt-0.5">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="confianca-titulo" className="card-base space-y-3">
          <h2 id="confianca-titulo" className="font-display text-xl sm:text-2xl">
            Neutralidade: as regras valem para todo mundo
          </h2>
          {/* A frase aparece por extenso, em destaque, e não diluída numa lista de bullets.
              É a única afirmação da página que um lojista pode querer testar depois, e é a
              única que não é negociável em nenhum cenário de nenhum resultado de entrevista.

              ELA NÃO ENTROU NO ACORDEÃO, e é o único bloco desta rodada em que a decisão foi
              essa. Detalhe recolhido é detalhe que a pessoa procura quando quer; uma garantia
              recolhida é uma garantia que o leitor precisa descobrir que existe. */}
          <p className="border-primary max-w-prose border-l-4 pl-3 text-base font-semibold">
            Participar do ViPreço não compra posição no ranking.
          </p>
          <p className="text-muted-foreground max-w-prose text-sm">
            A ordem é sempre pelo preço, do mais barato para o mais caro. São as mesmas regras que o
            morador lê na página inicial: não existe uma versão para o consumidor e outra para o
            mercado.
          </p>

          <details className="group">
            <summary className="text-primary flex min-h-12 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              Ver as cinco regras e o que vale para conteúdo comercial
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
            </summary>

            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {REGRAS.map(({ regra, porque }) => (
                <li key={regra} className="text-sm">
                  <p className="font-semibold">{regra}</p>
                  <p className="meta-text">{porque}</p>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
          </details>

          <p className="text-muted-foreground max-w-prose text-sm">
            O ViPreço não altera preço de caixa, estoque nem a operação interna do mercado. Nesta
            fase não existe painel de mercado: os pedidos são feitos pelo mesmo canal da conversa.
          </p>
        </section>

        {/* Também restaurada. Eu a tinha mandado para junto do convite, e o argumento era bom:
            ressalva sobre o convite pertence ao lado do convite. Só que as três frases daqui são
            copy decidida e fixada por teste, e o ganho de altura era de cento e poucos pixels. */}
        <section aria-labelledby="piloto-titulo" className="space-y-2">
          <h2 id="piloto-titulo" className="font-display text-xl sm:text-2xl">
            O piloto está sendo preparado em Artemis
          </h2>
          <p className="text-muted-foreground max-w-prose text-sm">
            O primeiro piloto do ViPreço está sendo preparado em Artemis. A operação inicial será
            pequena, manual e acompanhada de perto para entender o que funciona para moradores e
            mercados.
          </p>
          <p className="text-muted-foreground max-w-prose text-sm">
            Por enquanto, o convite é para uma conversa. Não é uma inscrição, e nada foi publicado
            ainda.
          </p>
        </section>

        <section aria-labelledby="duvidas-titulo" className="space-y-3">
          <h2 id="duvidas-titulo" className="font-display text-xl sm:text-2xl">
            Dúvidas frequentes
          </h2>
          <ul className="grid gap-2 lg:grid-cols-2">
            {DUVIDAS.map(({ pergunta, resposta }) => (
              <li key={pergunta}>
                <Pergunta pergunta={pergunta} resposta={resposta} />
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="convite-titulo"
          className="card-base bg-surface text-surface-foreground space-y-3"
        >
          <h2 id="convite-titulo" className="font-display text-xl sm:text-2xl">
            Vamos conversar sobre o piloto em Artemis?
          </h2>
          <p className="text-muted-foreground max-w-prose text-sm">
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
