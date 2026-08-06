import { existsSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { beforeAll, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { Route as RotaRobots } from "@/routes/robots[.]txt";
import { Route as RotaSitemap } from "@/routes/sitemap[.]xml";

/**
 * O bloqueio de indexação medido no comportamento, não no código-fonte.
 *
 * As três camadas do mandato têm um teste cada, e as três são exercitadas de verdade: o HTML sai
 * de um `renderToString` real, e as duas rotas de texto são chamadas com uma `Request` real.
 *
 * O header é a quarta camada e vive em `src/lib/security-headers.test.ts`; a lógica pura, em
 * `src/lib/indexing.test.ts`.
 */

const STAGING = "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev";
const PRODUCAO_SIMULADA = "https://vipreco.com.br";

type Handler = (args: { request: Request }) => Promise<Response>;

function handlerDe(rota: typeof RotaRobots | typeof RotaSitemap): Handler {
  const opcoes = rota.options as unknown as {
    server?: { handlers?: { GET?: Handler } };
  };
  const get = opcoes.server?.handlers?.GET;
  if (!get) throw new Error("a rota não expõe um handler GET");
  return get;
}

async function pedir(rota: typeof RotaRobots | typeof RotaSitemap, url: string): Promise<Response> {
  return handlerDe(rota)({ request: new Request(url) });
}

async function renderizar(path: string): Promise<string> {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

describe("o ambiente de teste é o ambiente bloqueado", () => {
  it("nenhuma origem pública está declarada — é o que torna as asserções abaixo determinísticas", () => {
    // Se alguém adicionar `VITE_PUBLIC_SITE_URL` ao `.env` local, os testes de HTML abaixo
    // passariam a medir outra coisa. Melhor falhar aqui, com o motivo escrito, do que ali.
    expect(import.meta.env.VITE_PUBLIC_SITE_URL ?? "").toBe("");
  });
});

describe("robots.txt — servido pelo Worker, decidido por host", () => {
  it("bloqueia tudo em staging", async () => {
    const resposta = await pedir(RotaRobots, `${STAGING}/robots.txt`);
    const corpo = await resposta.text();

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Type")).toContain("text/plain");
    expect(corpo).toContain("Disallow: /");
    expect(corpo).not.toContain("Allow: /");
  });

  it("bloqueia tudo em localhost", async () => {
    const corpo = await (await pedir(RotaRobots, "http://localhost:8080/robots.txt")).text();
    expect(corpo).toContain("Disallow: /");
  });

  it("bloqueia num domínio público que este build não declarou", async () => {
    const corpo = await (await pedir(RotaRobots, `${PRODUCAO_SIMULADA}/robots.txt`)).text();
    expect(corpo).toContain("Disallow: /");
  });

  it("não anuncia sitemap enquanto estiver bloqueado", async () => {
    const corpo = await (await pedir(RotaRobots, `${STAGING}/robots.txt`)).text();
    expect(corpo).not.toContain("Sitemap:");
  });

  it("não é mais um arquivo estático — se voltar a `public/`, deixa de passar pelo Worker", () => {
    expect(existsSync(join(process.cwd(), "public", "robots.txt"))).toBe(false);
  });
});

describe("sitemap.xml — só existe onde há o que indexar", () => {
  it("responde 404 em staging", async () => {
    const resposta = await pedir(RotaSitemap, `${STAGING}/sitemap.xml`);
    expect(resposta.status).toBe(404);
  });

  it("responde 404 em localhost e num domínio não declarado", async () => {
    expect((await pedir(RotaSitemap, "http://localhost:8080/sitemap.xml")).status).toBe(404);
    expect((await pedir(RotaSitemap, `${PRODUCAO_SIMULADA}/sitemap.xml`)).status).toBe(404);
  });

  it("não vaza nenhuma rota do produto no corpo do 404", async () => {
    const corpo = await (await pedir(RotaSitemap, `${STAGING}/sitemap.xml`)).text();
    for (const rota of ["/buscar", "/para-mercados", "/como-funciona", "<urlset"]) {
      expect(corpo).not.toContain(rota);
    }
  });
});

describe("HTML — a meta robots no documento", () => {
  let home = "";
  let mercados = "";

  beforeAll(async () => {
    home = await renderizar("/");
    mercados = await renderizar("/para-mercados");
  });

  it("a Home declara noindex, nofollow, noarchive", () => {
    expect(home).toMatch(/name="robots"[^>]*content="noindex, nofollow, noarchive"/);
  });

  it("/para-mercados declara o mesmo — a rota que vai circular na entrevista", () => {
    expect(mercados).toMatch(/name="robots"[^>]*content="noindex, nofollow, noarchive"/);
  });

  it("nenhum canonical é emitido — nada finge ser produção", () => {
    expect(home).not.toMatch(/rel="canonical"/);
    expect(mercados).not.toMatch(/rel="canonical"/);
  });

  it("nenhuma URL de produção aparece no HTML de um build não público", () => {
    expect(home).not.toContain("vipreco.com.br");
    expect(mercados).not.toContain("vipreco.com.br");
  });
});

describe("ausência de regressão — o produto continua o mesmo", () => {
  it("a faixa de ambiente de teste continua no HTML", async () => {
    expect(await renderizar("/")).toContain("AMBIENTE DE TESTE");
  });

  it("as rotas do produto continuam renderizando conteúdo", async () => {
    const home = await renderizar("/");
    expect(home).toContain("Artemis");
    expect(home.length).toBeGreaterThan(2000);
  });
});
