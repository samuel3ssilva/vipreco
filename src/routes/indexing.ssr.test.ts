// A proteção de indexação vista de fora: o que sai no HTML de cada build. O harness é o mesmo de
// `index.ssr.test.ts` — router em memória, `renderToString`, nenhum navegador envolvido.
//
// A meta `robots` depende de `VITE_PUBLIC_SITE_URL`, que é fixada no build. Cada bloco abaixo
// renderiza com um endereço declarado diferente e verifica o que o rastreador receberia.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { NOINDEX_DIRECTIVE } from "@/lib/indexing";

const DEMONSTRACAO = "https://demo.vipreco.com.br";
const TECNICO = "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev";
const PUBLICO = "https://vipreco.com.br";

async function renderComEndereco(siteUrl: string | undefined, path = "/para-mercados") {
  if (siteUrl === undefined) vi.stubEnv("VITE_PUBLIC_SITE_URL", "");
  else vi.stubEnv("VITE_PUBLIC_SITE_URL", siteUrl);

  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

function meta(html: string, chave: string): string | null {
  const achado = html.match(new RegExp(`<meta name="${chave}" content="([^"]*)"`, "i"));
  return achado ? achado[1] : null;
}

function propriedade(html: string, chave: string): string | null {
  const achado = html.match(new RegExp(`<meta property="${chave}" content="([^"]*)"`, "i"));
  return achado ? achado[1] : null;
}

function canonical(html: string): string | null {
  const achado = html.match(/<link rel="canonical" href="([^"]*)"/i);
  return achado ? achado[1] : null;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("build da demonstração", () => {
  it("pede para não ser indexado, e não guardado em cache de buscador", async () => {
    const html = await renderComEndereco(DEMONSTRACAO);
    expect(meta(html, "robots")).toBe(NOINDEX_DIRECTIVE);
  });

  it("mantém a faixa de ambiente e o aviso de dado fictício", async () => {
    const html = await renderComEndereco(DEMONSTRACAO, "/");
    expect(html).toContain("AMBIENTE DE TESTE");
    expect(html).toContain("esta não é a versão pública do ViPreço");
    expect(html.toLowerCase()).toContain("fictício");
  });

  it("aponta canônico e og:url para o endereço da demonstração", async () => {
    const html = await renderComEndereco(DEMONSTRACAO);
    expect(canonical(html)).toBe(`${DEMONSTRACAO}/para-mercados`);
    expect(propriedade(html, "og:url")).toBe(`${DEMONSTRACAO}/para-mercados`);
  });

  it("não divulga o endereço técnico em lugar nenhum do documento", async () => {
    const html = await renderComEndereco(DEMONSTRACAO);
    expect(html).not.toContain("workers.dev");
  });

  it("continua com o piloto em preparação e sem mercado real", async () => {
    const html = await renderComEndereco(DEMONSTRACAO);
    expect(html).toContain("O piloto está sendo preparado em Artemis");
    expect(html).toContain("Mercado de exemplo");
  });
});

describe("build no host técnico", () => {
  it("também não é indexável", async () => {
    const html = await renderComEndereco(TECNICO);
    expect(meta(html, "robots")).toBe(NOINDEX_DIRECTIVE);
  });

  it("não publica canônico: nada deve apontar para workers.dev", async () => {
    const html = await renderComEndereco(TECNICO);
    expect(canonical(html)).toBeNull();
    expect(propriedade(html, "og:url")).toBeNull();
  });
});

describe("build de produção", () => {
  it("não herda o noindex da demonstração", async () => {
    const html = await renderComEndereco(PUBLICO);
    expect(meta(html, "robots")).toBeNull();
  });

  it("publica canônico e og:url no domínio público", async () => {
    const html = await renderComEndereco(PUBLICO);
    expect(canonical(html)).toBe(`${PUBLICO}/para-mercados`);
    expect(propriedade(html, "og:url")).toBe(`${PUBLICO}/para-mercados`);
  });
});

describe("build sem endereço declarado", () => {
  it("não se apresenta como produto público", async () => {
    const html = await renderComEndereco(undefined);
    expect(meta(html, "robots")).toBe(NOINDEX_DIRECTIVE);
    expect(canonical(html)).toBeNull();
  });
});

describe("o canônico acompanha a rota", () => {
  it("cada rota aponta para si mesma", async () => {
    for (const rota of ["/", "/buscar", "/como-funciona", "/para-mercados"]) {
      const html = await renderComEndereco(DEMONSTRACAO, rota);
      expect(canonical(html), rota).toBe(`${DEMONSTRACAO}${rota}`);
    }
  });
});
