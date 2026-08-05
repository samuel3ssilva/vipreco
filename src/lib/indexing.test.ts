import { describe, expect, it } from "vitest";
import {
  DEMO_HOST,
  NOINDEX_DIRECTIVE,
  buildRobotsTxt,
  buildSitemapXml,
  canonicalUrl,
  shareableSiteUrl,
  shouldBlockIndexing,
  shouldBlockIndexingForSite,
} from "@/lib/indexing";

const TECNICO_STAGING = "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev";
const TECNICO_PRODUCAO = "https://vipreco-production.samuel-bortoletto.workers.dev";
const DEMONSTRACAO = "https://demo.vipreco.com.br";
const PUBLICO = "https://vipreco.com.br";
const PUBLICO_WWW = "https://www.vipreco.com.br";

describe("quem não pode ser indexado", () => {
  it("a demonstração nunca entra em buscador", () => {
    expect(shouldBlockIndexing(`${DEMONSTRACAO}/para-mercados`)).toBe(true);
    expect(shouldBlockIndexingForSite(DEMONSTRACAO)).toBe(true);
  });

  it("os hosts técnicos também não, staging ou produção", () => {
    for (const url of [TECNICO_STAGING, TECNICO_PRODUCAO]) {
      expect(shouldBlockIndexing(`${url}/buscar`), url).toBe(true);
      expect(shouldBlockIndexingForSite(url), url).toBe(true);
    }
  });

  it("a diretiva também barra o cache do buscador", () => {
    expect(NOINDEX_DIRECTIVE).toBe("noindex, nofollow, noarchive");
  });
});

describe("quem pode", () => {
  it("o domínio público, com ou sem www, é indexável", () => {
    for (const url of [PUBLICO, PUBLICO_WWW]) {
      expect(shouldBlockIndexing(`${url}/`), url).toBe(false);
      expect(shouldBlockIndexingForSite(url), url).toBe(false);
    }
  });

  it("produção nunca herda o noindex da demonstração", () => {
    // O erro que este teste existe para pegar: alguém amarrar o noindex ao modo DEMO — que é o
    // padrão de qualquer build sem configuração — e a produção nascer invisível.
    expect(shouldBlockIndexingForSite(`${PUBLICO}/`)).toBe(false);
    expect(shouldBlockIndexing(`${PUBLICO}/para-mercados`)).toBe(false);
  });

  it("um subdomínio qualquer do domínio público não vira demonstração por engano", () => {
    expect(shouldBlockIndexing("https://blog.vipreco.com.br/")).toBe(false);
    expect(shouldBlockIndexing(`https://${DEMO_HOST}/`)).toBe(true);
  });
});

describe("build sem endereço declarado", () => {
  it("não se apresenta como produto público", () => {
    // Lado seguro do erro: sair do noindex tem que ser decisão escrita em configuração.
    expect(shouldBlockIndexingForSite(undefined)).toBe(true);
    expect(shouldBlockIndexingForSite("")).toBe(true);
    expect(shouldBlockIndexingForSite("não-é-url")).toBe(true);
  });

  it("URL de requisição impossível de interpretar também bloqueia", () => {
    expect(shouldBlockIndexing("not-a-url")).toBe(true);
  });
});

describe("robots.txt", () => {
  it("na demonstração pede que nada seja rastreado", () => {
    expect(buildRobotsTxt(`${DEMONSTRACAO}/robots.txt`)).toBe("User-agent: *\nDisallow: /\n");
  });

  it("no host técnico, idem", () => {
    expect(buildRobotsTxt(`${TECNICO_STAGING}/robots.txt`)).toContain("Disallow: /");
  });

  it("no domínio público libera e aponta o sitemap do próprio host", () => {
    const corpo = buildRobotsTxt(`${PUBLICO}/robots.txt`);
    expect(corpo).toContain("Allow: /");
    expect(corpo).not.toContain("Disallow: /");
    expect(corpo).toContain(`Sitemap: ${PUBLICO}/sitemap.xml`);
  });

  it("nunca aponta um host para o sitemap de outro", () => {
    expect(buildRobotsTxt(`${PUBLICO}/robots.txt`)).not.toContain("workers.dev");
    expect(buildRobotsTxt(`${PUBLICO}/robots.txt`)).not.toContain(DEMO_HOST);
  });
});

describe("sitemap.xml", () => {
  it("sai vazio na demonstração e no host técnico", () => {
    for (const url of [DEMONSTRACAO, TECNICO_STAGING, TECNICO_PRODUCAO]) {
      const xml = buildSitemapXml(`${url}/sitemap.xml`);
      expect(xml, url).toContain("<urlset");
      expect(xml, url).not.toContain("<url>");
      expect(xml, url).not.toContain("<loc>");
    }
  });

  it("no domínio público lista as rotas com endereço absoluto do próprio host", () => {
    const xml = buildSitemapXml(`${PUBLICO}/sitemap.xml`);
    for (const rota of ["/", "/buscar", "/como-funciona", "/para-mercados"]) {
      expect(xml, rota).toContain(`<loc>${PUBLICO}${rota}</loc>`);
    }
    expect(xml).not.toContain("workers.dev");
    expect(xml).not.toContain("<loc>/");
  });
});

describe("endereço que pode circular", () => {
  it("a demonstração pode: é o endereço que o Founder manda", () => {
    expect(shareableSiteUrl(DEMONSTRACAO)).toBe(DEMONSTRACAO);
    expect(canonicalUrl("/para-mercados", DEMONSTRACAO)).toBe(`${DEMONSTRACAO}/para-mercados`);
  });

  it("workers.dev não: é contingência técnica, não se divulga", () => {
    expect(shareableSiteUrl(TECNICO_STAGING)).toBeNull();
    expect(canonicalUrl("/para-mercados", TECNICO_STAGING)).toBeNull();
    expect(canonicalUrl("/", TECNICO_PRODUCAO)).toBeNull();
  });

  it("o domínio público pode", () => {
    expect(canonicalUrl("/buscar", PUBLICO)).toBe(`${PUBLICO}/buscar`);
  });

  it("sem endereço configurado, não existe canônico — melhor nenhum do que errado", () => {
    expect(shareableSiteUrl(undefined)).toBeNull();
    expect(canonicalUrl("/", undefined)).toBeNull();
    expect(canonicalUrl("/", "não-é-url")).toBeNull();
  });
});
