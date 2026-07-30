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

  it("marca noindex apenas em hosts tecnicos *.workers.dev", () => {
    const staging = buildSecurityHeaders(
      "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/buscar",
    );
    const production = buildSecurityHeaders(
      "https://vipreco-production.samuel-bortoletto.workers.dev/",
    );
    const officialDomain = buildSecurityHeaders("https://vipreco.com.br/");

    expect(staging.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(production.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(officialDomain.get("X-Robots-Tag")).toBeNull();
  });

  it("nao quebra com uma URL invalida", () => {
    expect(() => buildSecurityHeaders("not-a-url")).not.toThrow();
    expect(buildSecurityHeaders("not-a-url").get("X-Robots-Tag")).toBeNull();
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
