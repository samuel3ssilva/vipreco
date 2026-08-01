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
    expect(html).toContain("Ver como funciona");
    expect(html).toContain('href="#como-funciona"');
    expect(html).toContain('id="como-funciona"');
  });

  it("mostra um exemplo fictício com produto, preço, mercado, data e origem juntos", () => {
    expect(html).toContain("Exemplo fictício");
    expect(html).toContain("Café torrado e moído, tradicional");
    expect(html).toContain("14,90");
    expect(html).toContain("Mercado de exemplo");
    expect(html).toContain("informado ontem · informado pelo mercado");
    expect(html).toContain("Informado pelo mercado");
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

  it("diz que pagamento não muda a comparação orgânica", () => {
    expect(html).toContain("A ordem não é vendida.");
    expect(html).toContain("Pagamento nunca muda a comparação orgânica.");
    expect(html).toContain("Pagamento não altera a comparação orgânica.");
  });

  it("separa informação orgânica de conteúdo patrocinado, que ainda não existe", () => {
    expect(html).toContain("Informação orgânica");
    expect(html).toContain("Conteúdo patrocinado");
    expect(html).toContain("Não existe hoje.");
  });

  it("só fala em validade quando o mercado informa", () => {
    expect(html).toContain("Validade só quando o mercado informa.");
    expect(html).toContain("O ViPreço não inventa prazo");
    expect(html).toContain("Validade, quando houver");
  });

  it("não precisa cadastrar o mercado inteiro, e sem quantidade mínima", () => {
    expect(html).toContain("Não precisa cadastrar o mercado inteiro");
    expect(html).toContain("não existe quantidade mínima nem obrigação de envio");
  });

  it("apresenta o piloto como preparação, não como operação em curso", () => {
    expect(html).toContain("O piloto está sendo preparado em Artemis");
    expect(html).toContain(
      "A operação inicial será pequena, manual e acompanhada de perto para entender o que funciona para moradores e mercados.",
    );
    expect(html).toContain("não é uma inscrição, e nada foi publicado ainda");
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
  it("responde as seis perguntas do mandato", () => {
    for (const pergunta of [
      "O ViPreço vende os produtos?",
      "O ViPreço altera o preço no caixa?",
      "Preciso enviar todos os produtos?",
      "Posso corrigir uma informação?",
      "O mercado paga para aparecer primeiro?",
      "Como demonstrar interesse?",
    ]) {
      expect(html, `falta a pergunta "${pergunta}"`).toContain(pergunta);
    }
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
