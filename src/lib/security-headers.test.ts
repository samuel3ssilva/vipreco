import { describe, expect, it } from "vitest";
import {
  buildSecurityHeaders,
  CONTENT_SECURITY_POLICY,
  withSecurityHeaders,
} from "@/lib/security-headers";

describe("buildSecurityHeaders", () => {
  it("aplica CSP restritiva sem unsafe-eval e com framing bloqueado", () => {
    const headers = buildSecurityHeaders(
      "https://vipreco-production.samuel-bortoletto.workers.dev/",
    );
    const csp = headers.get("Content-Security-Policy");

    expect(csp).toBeTruthy();
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("connect-src 'self' https://*.supabase.co");
  });

  it("aplica os demais headers de borda em toda resposta", () => {
    const headers = buildSecurityHeaders("https://vipreco.com.br/");

    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
  });

  // A REGRA MUDOU DE SENTIDO. Antes: bloqueia `*.workers.dev`, libera o resto. Agora: bloqueia
  // tudo, e so o host publico declarado pelo build escapa. Como nenhum build de teste declara
  // `VITE_PUBLIC_SITE_URL`, TODO host aqui e bloqueado -- inclusive o dominio oficial, que na
  // regra antiga passava sem que ninguem tivesse decidido nada. Ver `src/lib/indexing.test.ts`
  // para os casos com origem declarada.
  it("marca noindex, nofollow, noarchive em staging e no Worker de producao", () => {
    const staging = buildSecurityHeaders(
      "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/buscar",
    );
    const workerProducao = buildSecurityHeaders(
      "https://vipreco-production.samuel-bortoletto.workers.dev/",
    );

    expect(staging.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(workerProducao.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
  });

  it("marca noindex tambem no host local", () => {
    expect(buildSecurityHeaders("http://localhost:8080/").get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("marca noindex num dominio publico que este build NAO declarou", () => {
    expect(buildSecurityHeaders("https://vipreco.com.br/").get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });

  it("nao enfraquece nenhum dos demais headers ao bloquear indexacao", () => {
    const headers = buildSecurityHeaders(
      "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/",
    );

    expect(headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=");
  });

  it("nao quebra com uma URL invalida", () => {
    expect(() => buildSecurityHeaders("not-a-url")).not.toThrow();
    // E FALHA FECHADO: uma URL que nao da para analisar nao pode virar permissao de indexar.
    expect(buildSecurityHeaders("not-a-url").get("X-Robots-Tag")).toBe(
      "noindex, nofollow, noarchive",
    );
  });
});

describe("withSecurityHeaders", () => {
  it("preserva status e corpo da resposta original, adicionando os headers", async () => {
    const original = new Response("ok", { status: 201, headers: { "content-type": "text/plain" } });
    const result = withSecurityHeaders(
      original,
      "https://vipreco-production.samuel-bortoletto.workers.dev/",
    );

    expect(result.status).toBe(201);
    expect(result.headers.get("content-type")).toBe("text/plain");
    expect(result.headers.get("Content-Security-Policy")).toBe(CONTENT_SECURITY_POLICY);
    expect(await result.text()).toBe("ok");
  });

  it("nao sobrescreve um Content-Type ja definido pela resposta original", () => {
    const original = new Response(null, { headers: { "content-type": "application/json" } });
    const result = withSecurityHeaders(original, "https://vipreco.com.br/");

    expect(result.headers.get("content-type")).toBe("application/json");
  });
});
