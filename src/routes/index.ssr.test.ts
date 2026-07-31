// Prova de que o conteúdo da Home chega no HTML renderizado no servidor, antes de qualquer
// hidratação: o router é montado em memória, o loader da rota "/" é executado e a árvore é
// renderizada com `renderToString` (nenhum navegador, nenhum JavaScript de cliente envolvido).
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { beforeAll, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { DEMO_MARKETS, buildDemoOpportunities } from "@/lib/demo-opportunities";

async function renderRoute(path: string): Promise<string> {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

let html = "";

beforeAll(async () => {
  html = await renderRoute("/");
});

describe("HTML inicial da Home (SSR)", () => {
  it("contém os três produtos e mercados do fixture antes da hidratação", () => {
    const fixture = buildDemoOpportunities();
    expect(fixture).toHaveLength(3);
    for (const entry of fixture) {
      expect(html).toContain(entry.product.name);
      expect(html).toContain(entry.market.name);
    }
  });

  it("contém os três preços do fixture antes da hidratação", () => {
    for (const entry of buildDemoOpportunities()) {
      expect(html).toContain(entry.price.toFixed(2).replace(".", ","));
    }
  });

  it("mantém os links de cada Achado para a página do produto", () => {
    for (const entry of buildDemoOpportunities()) {
      expect(html).toContain(`href="/produto/${entry.product.id}"`);
    }
  });

  it("traz o seletor de mercado habitual já preenchido", () => {
    for (const market of DEMO_MARKETS) {
      expect(html).toContain(market.name);
    }
    expect(html).toContain("Seu mercado habitual");
  });

  it("não tem nenhum carregamento visível — nem dos Achados, nem dos mercados", () => {
    expect(html).not.toContain("Carregando");
    expect(html).not.toContain("Estamos começando a mapear preços");
    expect(html).not.toContain("Não conseguimos carregar as oportunidades");
    expect(html).not.toContain("Não conseguimos carregar a lista de mercados");
  });

  it("abre com a faixa de ambiente, antes de qualquer outro conteúdo", () => {
    expect(html).toContain("AMBIENTE DE TESTE");
    expect(html).toContain("esta não é a versão pública do ViPreço");
    expect(html.indexOf("AMBIENTE DE TESTE")).toBeLessThan(html.indexOf("Achados da semana"));
  });

  it("marca os Achados com o selo de dados fictícios", () => {
    expect(html).toContain("dados fictícios · exemplos para demonstrar o formato");
    expect(html).toContain("Exemplos fictícios");
  });

  it("não repete o aviso de ambiente dentro da página — a faixa é o único lugar", () => {
    expect(html).not.toContain("Ambiente de teste com preços fictícios");
  });

  it("traz a navegação 'Achados' e a entrada de mercado no header", () => {
    expect(html).toContain(">Achados<");
    expect(html).toContain("Tenho um mercado");
    expect(html).not.toContain(">Início<");
  });

  it("não contém copy operacional do piloto (guardrails da North Star)", () => {
    for (const termo of ["Mande a oferta", "resumo semanal", "Achado de hoje", "cashback"]) {
      expect(html, `HTML inicial não deve conter "${termo}"`).not.toContain(termo);
    }
  });

  it("sem destino de WhatsApp configurado, nenhum CTA e nenhum link quebrado", () => {
    // O ambiente de teste não define VITE_WHATSAPP_NUMBER — é exatamente o estado de staging
    // enquanto o número real não for cadastrado.
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("Receber os Achados no WhatsApp");
  });

  it("não apresenta nenhum mercado real como participante", () => {
    for (const entry of buildDemoOpportunities()) {
      expect(entry.market.name).toMatch(/^Mercado (principal|local \d)$/);
    }
  });
});

describe("rotas vizinhas continuam renderizando (regressão do loader)", () => {
  it("/buscar continua funcionando", async () => {
    const busca = await renderRoute("/buscar");
    expect(busca).toContain("Buscar produto");
    expect(busca).toContain('type="search"');
  });

  it("/como-funciona continua funcionando", async () => {
    expect(await renderRoute("/como-funciona")).toContain("Como funciona");
  });

  it("/para-mercados continua funcionando", async () => {
    expect(await renderRoute("/para-mercados")).toContain("mercado");
  });
});
