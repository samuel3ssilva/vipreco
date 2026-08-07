import { describe, expect, it } from "vitest";
import {
  buildEhPublico,
  corpoRobotsTxt,
  DIRETIVA_NAO_INDEXAR,
  ehHostLocal,
  ehHostTecnico,
  hostnameDe,
  podeIndexarHost,
  podeIndexarUrl,
} from "@/lib/indexing";

/**
 * As três origens que existem de verdade neste projeto, para não repetir string mágica.
 * `PRODUCAO` é simulada: nenhum domínio foi decidido nem apontado, e nada aqui a contata.
 */
const STAGING = "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev";
const WORKER_PRODUCAO = "https://vipreco-production.samuel-bortoletto.workers.dev";
const PRODUCAO = "https://vipreco.com.br";

describe("classificação de host", () => {
  it("reconhece os hosts técnicos do Cloudflare", () => {
    expect(ehHostTecnico("samuel3ssilva-vipreco.samuel-bortoletto.workers.dev")).toBe(true);
    expect(ehHostTecnico("vipreco-production.samuel-bortoletto.workers.dev")).toBe(true);
    expect(ehHostTecnico("vipreco.com.br")).toBe(false);
  });

  it("casa pelo sufixo com o ponto, não por conter o texto", () => {
    // Um domínio de terceiro que começa com o texto não é um Worker.
    expect(ehHostTecnico("workers.dev.exemplo.com")).toBe(false);
    // E um domínio que termina com o texto colado também não: o ponto separador é obrigatório.
    expect(ehHostTecnico("naoeworkers.dev")).toBe(false);
  });

  it("reconhece os hosts locais, inclusive os subdomínios de `.localhost`", () => {
    for (const host of ["localhost", "127.0.0.1", "0.0.0.0", "::1", "app.localhost"]) {
      expect(ehHostLocal(host), host).toBe(true);
    }
    expect(ehHostLocal("vipreco.com.br")).toBe(false);
  });

  it("extrai hostname sem lançar, e devolve undefined no que não é URL", () => {
    expect(hostnameDe(STAGING)).toBe("samuel3ssilva-vipreco.samuel-bortoletto.workers.dev");
    expect(hostnameDe("not-a-url")).toBeUndefined();
    expect(hostnameDe("")).toBeUndefined();
    expect(hostnameDe(undefined)).toBeUndefined();
  });
});

describe("buildEhPublico — a porta do build", () => {
  it("fecha quando nenhuma origem foi declarada", () => {
    expect(buildEhPublico(undefined)).toBe(false);
    expect(buildEhPublico("")).toBe(false);
    expect(buildEhPublico("   ")).toBe(false);
  });

  it("fecha quando a origem declarada é técnica — o caso real de staging", () => {
    expect(buildEhPublico(STAGING)).toBe(false);
    expect(buildEhPublico(WORKER_PRODUCAO)).toBe(false);
  });

  it("fecha quando a origem declarada é local", () => {
    expect(buildEhPublico("http://localhost:8080")).toBe(false);
  });

  it("fecha quando a origem declarada é lixo", () => {
    expect(buildEhPublico("nao-e-uma-url")).toBe(false);
  });

  it("abre apenas para um domínio público declarado", () => {
    expect(buildEhPublico(PRODUCAO)).toBe(true);
  });
});

describe("podeIndexarHost — a porta da requisição", () => {
  it("bloqueia staging: build declarado, mas a origem declarada é técnica", () => {
    const host = "samuel3ssilva-vipreco.samuel-bortoletto.workers.dev";
    expect(podeIndexarHost(host, STAGING)).toBe(false);
  });

  it("bloqueia o Worker de produção pelo mesmo motivo", () => {
    expect(podeIndexarHost("vipreco-production.samuel-bortoletto.workers.dev", STAGING)).toBe(
      false,
    );
    expect(
      podeIndexarHost("vipreco-production.samuel-bortoletto.workers.dev", WORKER_PRODUCAO),
    ).toBe(false);
  });

  it("bloqueia o host local", () => {
    expect(podeIndexarHost("localhost", undefined)).toBe(false);
    expect(podeIndexarHost("localhost", PRODUCAO)).toBe(false);
  });

  it("BLOQUEIA um domínio de produção que o build não declarou — a inversão da regra antiga", () => {
    // A regra anterior liberava qualquer host que não terminasse em `.workers.dev`. Este caso
    // é exatamente o que ela deixava passar: um domínio novo, indexável sem decisão de ninguém.
    expect(podeIndexarHost("vipreco.com.br", undefined)).toBe(false);
    expect(podeIndexarHost("vipreco.com.br", STAGING)).toBe(false);
  });

  it("bloqueia quando o build declara um domínio e a resposta sai por outro", () => {
    expect(podeIndexarHost("outro-dominio.com.br", PRODUCAO)).toBe(false);
  });

  it("libera somente o host público declarado, servido por ele mesmo", () => {
    expect(podeIndexarHost("vipreco.com.br", PRODUCAO)).toBe(true);
  });

  it("aceita a URL inteira e não quebra com URL inválida", () => {
    expect(podeIndexarUrl(`${PRODUCAO}/buscar`, PRODUCAO)).toBe(true);
    expect(podeIndexarUrl(`${STAGING}/buscar`, STAGING)).toBe(false);
    expect(() => podeIndexarUrl("not-a-url", PRODUCAO)).not.toThrow();
    expect(podeIndexarUrl("not-a-url", PRODUCAO)).toBe(false);
  });
});

describe("corpoRobotsTxt", () => {
  it("bloqueia tudo e não anuncia sitemap quando o ambiente não é público", () => {
    const corpo = corpoRobotsTxt(false);

    expect(corpo).toContain("User-agent: *");
    expect(corpo).toContain("Disallow: /");
    expect(corpo).not.toContain("Allow: /");
    expect(corpo).not.toContain("Sitemap:");
    expect(corpo.endsWith("\n")).toBe(true);
  });

  it("libera e anuncia o sitemap quando o ambiente é público", () => {
    const corpo = corpoRobotsTxt(true, PRODUCAO);

    expect(corpo).toContain("Allow: /");
    expect(corpo).not.toContain("Disallow: /");
    expect(corpo).toContain(`Sitemap: ${PRODUCAO}/sitemap.xml`);
  });

  it("não duplica a barra quando a origem vem com barra final", () => {
    expect(corpoRobotsTxt(true, `${PRODUCAO}/`)).toContain(`Sitemap: ${PRODUCAO}/sitemap.xml`);
  });
});

describe("a diretiva", () => {
  it("carrega as três palavras que o mandato exige", () => {
    expect(DIRETIVA_NAO_INDEXAR).toBe("noindex, nofollow, noarchive");
  });
});
