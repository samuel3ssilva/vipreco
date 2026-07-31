// Prova de que os Achados da Home chegam no HTML renderizado no servidor, antes de qualquer
// hidratação: o router é montado em memória, o loader da rota "/" é executado e a árvore é
// renderizada com `renderToString` (nenhum navegador, nenhum JavaScript de cliente envolvido).
//
// Limite conhecido e deliberado deste PR: o `UsualMarketPicker` continua buscando os mercados no
// cliente e ainda emite "Carregando mercados…" no HTML inicial. Ele não faz parte dos três
// Achados e migrá-lo está fora do escopo do PR 1A — por isso a asserção abaixo é específica do
// carregamento dos Achados, e não uma proibição cega da palavra "Carregando".
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { beforeAll, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";

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

  it("não contém o carregamento, o vazio nem o erro dos Achados", () => {
    expect(html).not.toContain("Carregando oportunidades");
    expect(html).not.toContain("Estamos começando a mapear preços");
    expect(html).not.toContain("Não conseguimos carregar as oportunidades");
  });

  it("mantém o aviso de dados fictícios", () => {
    expect(html).toContain("Ambiente de teste com preços fictícios");
    expect(html).toContain("Exemplos fictícios");
  });

  it("não contém copy operacional do piloto (guardrails da North Star)", () => {
    for (const termo of [
      "wa.me",
      "Mande a oferta",
      "resumo semanal",
      "Achado de hoje",
      "cashback",
    ]) {
      expect(html, `HTML inicial não deve conter "${termo}"`).not.toContain(termo);
    }
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
