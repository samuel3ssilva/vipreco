// Copy e comportamento da proposta para mercados (Parte 3), provados no HTML renderizado no
// servidor — o mesmo harness de `index.ssr.test.ts`: router em memória, `renderToString`, nenhum
// navegador envolvido. O que este arquivo verifica é o texto que o dono de mercado lê, não a
// classe CSS que o produz.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { WHATSAPP_MARKET_MESSAGE } from "@/lib/whatsapp";
import { OG_IMAGE_MARKETS_ALT, OG_IMAGE_MARKETS_PATH } from "@/lib/og";

async function renderRoute(path: string): Promise<string> {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

// O destino do WhatsApp é resolvido em tempo de render a partir da configuração; sem ele, nenhum
// CTA é renderizado (regra de `docs/mvp/WHATSAPP-ENTRY.md`). Os dois estados são verificados: com
// número configurado, `html`; sem número, `htmlSemDestino`.
let html = "";
let htmlSemDestino = "";

beforeAll(async () => {
  htmlSemDestino = await renderRoute("/para-mercados");
  vi.stubEnv("VITE_WHATSAPP_NUMBER", "5519999999999");
  html = await renderRoute("/para-mercados");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("primeira dobra da proposta", () => {
  it("abre dizendo para quem é, o que resolve e o que fazer depois", () => {
    // Só o corpo: a promessa também aparece na meta description, antes de tudo no documento.
    const corpo = html.slice(html.indexOf("<body"));
    const eyebrow = corpo.indexOf("Para mercados de Artemis");
    const titulo = corpo.indexOf("Seu mercado mais perto de quem compra no bairro");
    const subtexto = corpo.indexOf(
      "Envie alguns produtos pelo WhatsApp. O ViPreço organiza preço, data e origem para os moradores encontrarem as informações com clareza.",
    );
    const acao = corpo.indexOf("Quero conhecer o piloto");

    expect(eyebrow).toBeGreaterThan(-1);
    expect(titulo).toBeGreaterThan(eyebrow);
    expect(subtexto).toBeGreaterThan(titulo);
    expect(acao).toBeGreaterThan(subtexto);
  });

  it("diz, junto do convite, que é conversa inicial e que o piloto está em preparação", () => {
    expect(html).toContain("Conversa inicial, sem compromisso. O piloto ainda está em preparação.");
  });

  it("oferece o caminho de quem ainda não quer conversar, na própria página", () => {
    // O rótulo diz de quem é a explicação: "/como-funciona" já existe, e é a do consumidor.
    expect(html).toContain("Como funciona para o mercado");
    expect(html).toContain('href="#como-funciona"');
    expect(html).toContain('id="como-funciona"');
  });

  it("mostra um exemplo fictício com produto, preço, mercado, data e origem juntos", () => {
    expect(html).toContain("Exemplo fictício");
    expect(html).toContain("Café torrado e moído, tradicional");
    expect(html).toContain("14,90");
    expect(html).toContain("Mercado de exemplo");
    expect(html).toContain("31/07/2026 · informado pelo mercado");
    expect(html).toContain("Informado pelo mercado");
  });

  it("mostra a validade em data absoluta, no formato do card real", () => {
    expect(html).toContain("válido até 05/08/2026");
  });

  it("nunca usa dia da semana nem dia relativo no card estático", () => {
    // O card não tem loader e não recalcula nada: "sábado" e "ontem" congelados no código
    // ficariam errados no dia seguinte. Data absoluta ou nada.
    // Do rótulo do exemplo até o fim da primeira dobra: "Como funciona" aparece antes, no rótulo
    // do CTA secundário, e não serve de limite.
    const cartao = html.slice(html.indexOf("Exemplo fictício"), html.indexOf('id="como-funciona"'));
    for (const relativo of [
      "segunda",
      "terça",
      "quarta",
      "quinta",
      "sexta",
      "sábado",
      "domingo",
      "ontem",
      "hoje",
      "amanhã",
      "esta semana",
      "próxima semana",
      "há 2 dias",
    ]) {
      expect(cartao.toLowerCase(), `o card não pode dizer "${relativo}"`).not.toContain(relativo);
    }
    // E as duas datas que ele mostra são absolutas, no formato oficial.
    expect(cartao.match(/\d{2}\/\d{2}\/\d{4}/g) ?? []).toHaveLength(2);
  });
});

describe("CTA principal e mensagem do WhatsApp", () => {
  it("abre uma conversa individual com a mensagem aprovada", () => {
    expect(WHATSAPP_MARKET_MESSAGE).toBe(
      "Tenho um mercado e quero conhecer o piloto do ViPreço em Artemis",
    );
    expect(html).toContain(
      `https://wa.me/5519999999999?text=${encodeURIComponent(WHATSAPP_MARKET_MESSAGE)}`,
    );
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("repete o convite no fim da página — dois CTAs, um destino só", () => {
    expect(html.match(/Quero conhecer o piloto/g) ?? []).toHaveLength(2);
    expect(html).toContain("Vamos conversar sobre o piloto em Artemis?");
    expect(html).toContain(
      "Uma conversa inicial para entender seu mercado. Sem cadastro automático.",
    );
    const links = html.match(/https:\/\/wa\.me\/\d+\?text=[^"]+/g) ?? [];
    expect(links).toHaveLength(2);
    expect(new Set(links).size).toBe(1);
  });

  it("avisa que o link abre o WhatsApp, para quem usa leitor de tela", () => {
    expect(html).toContain("(abre o WhatsApp)");
  });

  it("o CTA fixo do mobile não sai no HTML do servidor", () => {
    // No servidor não há tela para medir. Renderizar o botão fixo para escondê-lo logo depois
    // produziria um pisca — e, por um instante, um terceiro convite igual na mesma página.
    expect(html).not.toContain("shadow-raised");
    expect(html).not.toContain("safe-area-inset-bottom");
    expect(html.match(/data-market-cta/g) ?? []).toHaveLength(2);
  });

  it("sem destino configurado, nenhum CTA e nenhum link quebrado", () => {
    expect(htmlSemDestino).not.toContain("wa.me");
    expect(htmlSemDestino).not.toContain("Quero conhecer o piloto");
    // A página continua completa: proposta, regras e dúvidas seguem lá.
    expect(htmlSemDestino).toContain("Seu mercado mais perto de quem compra no bairro");
    expect(htmlSemDestino).toContain("Dúvidas frequentes");
  });
});

describe("o que a página promete — e o que ela não promete", () => {
  it("explica os três passos sem afirmar que a operação já roda", () => {
    const posicoes = [
      "1. O mercado envia alguns produtos",
      "2. O ViPreço organiza e confere",
      "3. O morador encontra e compra na loja",
    ].map((trecho) => {
      const posicao = html.indexOf(trecho);
      expect(posicao, `"${trecho}" precisa estar no HTML`).toBeGreaterThan(-1);
      return posicao;
    });
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    // Os passos descrevem como o piloto vai funcionar; a frase abaixo impede que o presente do
    // indicativo dos cards seja lido como operação em curso.
    expect(html).toContain(
      "Nada disso está em operação hoje: o piloto ainda está sendo preparado, e o primeiro passo é a conversa.",
    );
  });

  it("deixa claro que a compra acontece na loja", () => {
    expect(html).toContain("Você compra na loja.");
    expect(html).toContain("O ViPreço não altera o preço no caixa.");
    expect(html).toContain("A compra acontece diretamente no mercado.");
  });

  it("deixa o preço de caixa, o estoque e a operação com o mercado", () => {
    expect(html).toContain(
      "O ViPreço não altera preço de caixa, estoque nem a operação interna do mercado.",
    );
    expect(html).toContain("O produto pode acabar antes da validade informada.");
  });

  it("diz, em português simples, que pagamento não muda a ordem", () => {
    expect(html).toContain("A ordem não é vendida.");
    // A regra que não pode sumir da página: a fronteira do controle, a lista de regras e a
    // resposta sobre pagar para aparecer primeiro dizem todas a mesma frase.
    expect(html.match(/Pagamento não muda a ordem dos resultados\./g) ?? []).toHaveLength(3);
  });

  it("explica o jargão uma vez e não o repete", () => {
    // "Orgânica" é palavra de dentro de casa. A página apresenta o termo como sinônimo do que já
    // disse em português simples, e em nenhum outro lugar o usa como título ou resposta.
    expect(html).toContain(
      "A comparação normal, sem pagamento, também chamada de comparação orgânica, segue as mesmas regras para todos.",
    );
    expect(html.match(/orgânic/gi) ?? []).toHaveLength(1);
  });

  it("separa a comparação normal do conteúdo patrocinado, que ainda não existe", () => {
    expect(html).toContain("Comparação normal");
    expect(html).toContain("Conteúdo patrocinado");
    expect(html).toContain("Não existe hoje.");
    expect(html).toContain("não entrará na comparação nem mudará a ordem dos resultados");
  });

  it("só fala em validade quando o mercado informa", () => {
    expect(html).toContain("Validade só quando o mercado informa.");
    expect(html).toContain("O ViPreço não inventa prazo");
    expect(html).toContain("Validade, quando houver");
  });

  it("não precisa cadastrar o mercado inteiro, e sem quantidade mínima", () => {
    expect(html).toContain("Não precisa cadastrar o mercado inteiro");
    expect(html).toContain("Não existe quantidade mínima nem obrigação de envio");
  });

  it("diz que o mercado pode escolher os produtos que queira destacar", () => {
    expect(html).toContain(
      "O mercado pode escolher produtos que queira destacar, como ofertas, itens sazonais ou produtos com estoque alto. Não é necessário cadastrar o mercado inteiro.",
    );
  });

  it("fala em destacar e divulgar, nunca em anunciar — e sem validade curta nem urgência", () => {
    // "Anunciar" leria como mídia paga, que não existe. Validade curta e queima de estoque são
    // hipótese de entrevista, não proposta desta página.
    for (const termo of [
      "anunciar",
      "anúncio",
      "perto do vencimento",
      "próximo do vencimento",
      "queima de estoque",
      "desconto garantido",
      "contagem regressiva",
    ]) {
      expect(html.toLowerCase(), `a página não deve conter "${termo}"`).not.toContain(termo);
    }
    expect(html).toContain("destacar");
    expect(html).toContain("divulgar");
  });

  it("limita o controle do mercado ao que o próprio mercado enviou", () => {
    expect(html).toContain("Você escolhe quais produtos enviar");
    expect(html).toContain(
      "O mercado pode enviar produtos selecionados e pedir a correção ou retirada das informações que forneceu.",
    );
    expect(html).toContain("Pedido de correção do que enviou");
    expect(html).toContain("Pedido de retirada do que enviou");
  });

  it("diz que a comparação segue as mesmas regras para todos", () => {
    expect(html).toContain(
      "A comparação normal, sem pagamento, também chamada de comparação orgânica, segue as mesmas regras para todos. Pagamento não muda a ordem dos resultados.",
    );
  });

  it("abre um canal de correção para qualquer informação incorreta, não só a do mercado", () => {
    expect(html).toContain("Encontrou uma informação incorreta?");
    // O que a página promete é conferir a origem e corrigir — as duas origens ditas por extenso,
    // sem sugerir que o mercado manda na informação que não é dele.
    expect(html).toContain(
      "Avise o ViPreço. Nós conferimos a origem e fazemos a correção, seja uma informação enviada pelo mercado ou verificada pela nossa equipe.",
    );
  });

  it("nunca atribui ao mercado controle sobre o que aparece ou sobre a ordem", () => {
    // Guardrail de copy: a página não pode sugerir controle sobre a comparação, sobre o que
    // outros mercados informam ou sobre a posição no resultado.
    for (const frase of [
      "Você escolhe o que aparece",
      "o que o mercado manda é o que aparece",
      "você controla o que aparece",
      "escolha sua posição",
      "defina a ordem",
      "saia na frente dos concorrentes",
    ]) {
      expect(html.toLowerCase(), `a página não deve conter "${frase}"`).not.toContain(
        frase.toLowerCase(),
      );
    }
  });

  it("apresenta o piloto como preparação, não como operação em curso", () => {
    expect(html).toContain("O piloto está sendo preparado em Artemis");
    expect(html).toContain(
      "A operação inicial será pequena, manual e acompanhada de perto para entender o que funciona para moradores e mercados.",
    );
    expect(html).toContain("Não é uma inscrição, e nada foi publicado ainda");
  });
});

describe("pontuação da copy pública", () => {
  /**
   * A interface, sem o que não é lido por ninguém: o `<head>` e os blocos de código (o estado de
   * hidratação repete strings do documento e não é copy). Sobram texto visível e atributos —
   * `aria-label`, `alt` e afins são copy para quem usa leitor de tela.
   *
   * Recorte de leitura sobre HTML que este próprio teste acabou de renderizar, não sanitização:
   * nada aqui protege contra entrada hostil, e a busca é literal (`indexOf`) justamente para não
   * ter cara de filtro de tag por expressão regular, que é frágil e não é o que se quer aqui.
   */
  function interfacePublica(fonte: string): string {
    let resto = fonte.slice(fonte.indexOf("<body"));
    let visivel = "";

    for (;;) {
      const candidatos = ["script", "style"]
        .map((tag) => ({ tag, inicio: resto.indexOf(`<${tag}`) }))
        .filter(({ inicio }) => inicio !== -1)
        .sort((a, b) => a.inicio - b.inicio);

      const primeiro = candidatos[0];
      if (!primeiro) return visivel + resto;

      const fechamento = `</${primeiro.tag}>`;
      const fim = resto.indexOf(fechamento, primeiro.inicio);
      if (fim === -1) return visivel + resto.slice(0, primeiro.inicio);

      visivel += resto.slice(0, primeiro.inicio);
      resto = resto.slice(fim + fechamento.length);
    }
  }

  it("não usa travessão em lugar nenhum da interface", () => {
    // Revisão do Founder: frases curtas, pontos, vírgulas e dois-pontos. O travessão saiu.
    for (const [nome, fonte] of [
      ["com destino configurado", html],
      ["sem destino configurado", htmlSemDestino],
    ] as const) {
      const publico = interfacePublica(fonte);
      // O recorte não pode ter comido a página: se sobrasse pouco, o teste passaria à toa.
      expect(publico, nome).toContain("Seu mercado mais perto de quem compra no bairro");
      expect(publico, nome).toContain("Dúvidas frequentes");
      const travessoes = publico.match(/[—–]/g) ?? [];
      expect(travessoes, `${nome}: a interface não pode ter travessão`).toHaveLength(0);
    }
  });

  it("mantém o hífen onde ele é gramatical", () => {
    // A regra é sobre travessão, não sobre hífen: "torrado e moído" convive com "dois-pontos".
    expect(html).toContain("Café torrado e moído, tradicional");
  });
});

describe("nenhuma alegação não comprovada", () => {
  it("não promete venda, tráfego, economia nem vitória sobre concorrente", () => {
    for (const termo of [
      "aumente suas vendas",
      "aumento de vendas",
      "seja o mais barato",
      "vença seus concorrentes",
      "milhares de consumidores",
      "economia garantida",
      "garantido",
      "cashback",
    ]) {
      expect(html.toLowerCase(), `a página não deve conter "${termo}"`).not.toContain(termo);
    }
  });

  it("não apresenta mercado participante, depoimento nem métrica inventada", () => {
    for (const termo of [
      "mercados participantes",
      "mercados já participam",
      "depoimento",
      "vagas",
      "mensalidade",
      "contrato",
    ]) {
      expect(html.toLowerCase(), `a página não deve conter "${termo}"`).not.toContain(termo);
    }
    // Nenhum número solto de audiência ou desempenho: os únicos dígitos livres da página são a
    // numeração das etapas e o preço do exemplo fictício.
    expect(html).not.toMatch(/\b\d{2,}\s*(mil|consumidores|moradores|clientes|acessos|vezes)\b/i);
  });

  it("não afirma operação ativa, painel ou inteligência de mercado", () => {
    for (const termo of [
      "relatório semanal",
      "dashboard",
      "inteligência de mercado",
      "em tempo real",
      "já está no ar",
    ]) {
      expect(html.toLowerCase(), `a página não deve conter "${termo}"`).not.toContain(termo);
    }
    // A única aparição de "painel" na página é a negação — nunca a promessa de um.
    expect(html.match(/painel/gi) ?? []).toHaveLength(1);
    expect(html).toContain("Nesta fase não existe painel de mercado");
  });

  it("não cria urgência artificial", () => {
    for (const termo of [
      "últimas vagas",
      "última chance",
      "corra",
      "só até",
      "por tempo limitado",
    ]) {
      expect(html.toLowerCase(), `a página não deve conter "${termo}"`).not.toContain(termo);
    }
  });
});

describe("dúvidas frequentes", () => {
  it("responde as seis perguntas do mandato e as duas da auditoria", () => {
    for (const pergunta of [
      "O ViPreço vende os produtos?",
      "O ViPreço altera o preço no caixa?",
      "Preciso enviar todos os produtos?",
      "Posso corrigir uma informação?",
      "O mercado paga para aparecer primeiro?",
      "O piloto custa alguma coisa?",
      "Outros mercados poderão ver meus preços?",
      "Como demonstrar interesse?",
    ]) {
      expect(html, `falta a pergunta "${pergunta}"`).toContain(pergunta);
    }
  });

  it("responde sobre custo sem prometer gratuidade nem inventar condição", () => {
    expect(html).toContain(
      "O piloto ainda está em preparação. As condições serão combinadas na conversa inicial. Nada será cobrado sem acordo prévio.",
    );
    for (const termo of [
      "grátis",
      "gratuito",
      "gratuita",
      "sem custo",
      "de graça",
      "sem cobrança",
      "não custa nada",
      "taxa de adesão",
      "plano",
    ]) {
      expect(html.toLowerCase(), `a página não deve dizer "${termo}"`).not.toContain(termo);
    }
  });

  it("responde sobre concorrentes sem esconder que o que é publicado é público", () => {
    expect(html).toContain(
      "Sim. Tudo o que for publicado no ViPreço é público para moradores e mercados. Você escolhe quais informações do seu mercado deseja enviar e pode pedir correção ou retirada do que forneceu. Informações verificadas pelo ViPreço seguem as mesmas regras para todos.",
    );
  });

  it("não responde o que ainda não foi decidido comercialmente", () => {
    for (const termo of [
      "mensalidade",
      "assinatura",
      "prazo de publicação",
      "quantos consumidores",
    ]) {
      expect(html.toLowerCase(), `a página não deve responder sobre "${termo}"`).not.toContain(
        termo,
      );
    }
  });
});

describe("nada é coletado nesta página", () => {
  it("não existe formulário, campo ou cadastro automático", () => {
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<input");
    expect(html).not.toContain("<textarea");
    expect(html).not.toContain("<select");
  });

  it("não existe grupo, canal nem automação de WhatsApp", () => {
    expect(html).not.toContain("chat.whatsapp.com");
    expect(html).not.toMatch(/graph\.facebook|business_management|twilio/i);
  });
});

describe("prévia de link da rota", () => {
  function metaDoHtml(fonte: string, atributo: string, chave: string): string | null {
    const achado = fonte.match(new RegExp(`<meta ${atributo}="${chave}" content="([^"]*)"`, "i"));
    return achado ? achado[1] : null;
  }

  it("tem título e descrição próprios, não os genéricos do produto", () => {
    expect(html).toContain("<title>ViPreço para mercados de Artemis</title>");
    expect(metaDoHtml(html, "name", "description")).toBe(
      "Conheça o piloto local do ViPreço e veja como divulgar alguns produtos com preço, data e origem.",
    );
    expect(metaDoHtml(html, "property", "og:title")).toBe("ViPreço para mercados de Artemis");
    expect(metaDoHtml(html, "property", "og:description")).toBe(
      "Conheça o piloto local do ViPreço e veja como divulgar alguns produtos com preço, data e origem.",
    );
  });

  it("aponta para o asset próprio, com dimensões, tipo, alt e card grande", () => {
    expect(metaDoHtml(html, "property", "og:image")).toContain(OG_IMAGE_MARKETS_PATH);
    expect(metaDoHtml(html, "property", "og:image")).not.toContain("vipreco-og-demo");
    expect(metaDoHtml(html, "property", "og:image:type")).toBe("image/png");
    expect(metaDoHtml(html, "property", "og:image:width")).toBe("1200");
    expect(metaDoHtml(html, "property", "og:image:height")).toBe("630");
    expect(metaDoHtml(html, "property", "og:image:alt")).toBe(OG_IMAGE_MARKETS_ALT);
    expect(metaDoHtml(html, "name", "twitter:card")).toBe("summary_large_image");
    expect(metaDoHtml(html, "property", "og:type")).toBe("website");
  });

  it("não muda a prévia das outras rotas", async () => {
    const home = await renderRoute("/");
    expect(metaDoHtml(home, "property", "og:image")).toContain("vipreco-og-demo.png");
    expect(metaDoHtml(home, "property", "og:title")).toBe("ViPreço — onde está mais barato hoje");
  });
});

// Regressão da versão anterior da página: o relatório semanal de exemplo trazia números
// inventados e sugeria uma inteligência de mercado que não existe. Não pode voltar por descuido.
describe("o relatório semanal antigo não voltou", () => {
  it("nenhum vestígio da seção removida", () => {
    for (const trecho of [
      "Exemplo de relatório semanal",
      "Ofertas publicadas na semana",
      "Vezes que seu mercado apareceu",
      "Vezes em que seu mercado tinha o menor preço",
      "48 (exemplo)",
      "21 (exemplo)",
      "resumo semanal",
      "números ilustrativos",
    ]) {
      expect(html, `o relatório antigo não pode voltar: "${trecho}"`).not.toContain(trecho);
      expect(htmlSemDestino).not.toContain(trecho);
    }
  });
});

describe("navegação e rotas vizinhas", () => {
  it("o caminho de volta para os Achados é explícito", () => {
    expect(html).toContain("Ver os Achados de Artemis");
    expect(html).toContain('href="/"');
  });

  it("não repete a pill do header dentro da própria página de destino", () => {
    expect(html).not.toContain("Tenho um mercado");
  });

  it("as outras rotas continuam renderizando", async () => {
    expect(await renderRoute("/")).toContain("Veja como os Achados de Artemis vão aparecer");
    expect(await renderRoute("/buscar")).toContain("Buscar produto");
    expect(await renderRoute("/como-funciona")).toContain("Como funciona");
  });
});
