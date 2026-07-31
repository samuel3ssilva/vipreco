import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HTML_CACHE_CONTROL, cacheControlFor, withCacheHeaders } from "@/lib/cache-headers";

function response(contentType: string, headers: Record<string, string> = {}): Response {
  return new Response("<!doctype html>", { headers: { "content-type": contentType, ...headers } });
}

describe("política de cache do documento HTML", () => {
  it("marca o documento SSR para revalidar sempre", () => {
    expect(cacheControlFor(response("text/html; charset=utf-8"))).toBe(HTML_CACHE_CONTROL);
    expect(HTML_CACHE_CONTROL).toBe("no-cache");
  });

  it("não usa no-store — ele desativaria o cache de voltar/avançar sem ganho de frescor", () => {
    expect(HTML_CACHE_CONTROL).not.toContain("no-store");
  });

  it("aplica o header na resposta, preservando status e corpo", async () => {
    const original = new Response("<!doctype html><p>oi</p>", {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "text/html; charset=utf-8", "x-outro": "preservado" },
    });
    const result = withCacheHeaders(original);

    expect(result.headers.get("Cache-Control")).toBe("no-cache");
    expect(result.headers.get("x-outro")).toBe("preservado");
    expect(result.status).toBe(200);
    expect(await result.text()).toContain("<p>oi</p>");
  });

  it("também cobre a página de erro do Worker (500 em text/html)", () => {
    const erro = new Response("<!doctype html>", {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    expect(withCacheHeaders(erro).headers.get("Cache-Control")).toBe("no-cache");
  });
});

describe("nada além do documento HTML é tocado", () => {
  it("não desabilita o cache longo dos assets versionados por hash", () => {
    const asset = response("text/javascript", {
      "cache-control": "public, max-age=31536000, immutable",
    });
    expect(cacheControlFor(asset)).toBeNull();
    expect(withCacheHeaders(asset).headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("não altera estáticos sem hash que já revalidam", () => {
    const favicon = response("image/vnd.microsoft.icon", {
      "cache-control": "public, max-age=0, must-revalidate",
    });
    expect(withCacheHeaders(favicon).headers.get("cache-control")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });

  it("não inventa diretiva para respostas que não são documento HTML", () => {
    expect(cacheControlFor(response("application/xml"))).toBeNull();
    expect(cacheControlFor(response("application/json"))).toBeNull();
    expect(cacheControlFor(new Response(null, { status: 204 }))).toBeNull();
  });

  it("respeita um Cache-Control já definido pela origem, inclusive em HTML", () => {
    const html = response("text/html; charset=utf-8", { "cache-control": "private, max-age=60" });
    expect(cacheControlFor(html)).toBeNull();
    expect(withCacheHeaders(html)).toBe(html);
  });
});

describe("a política está ligada ao Worker", () => {
  // Regressão estática: o módulo pode estar correto e mesmo assim não ser chamado. Cobre os dois
  // caminhos de resposta de `src/server.ts` — o SSR normal e a página de erro do catch.
  const server = readFileSync(join(process.cwd(), "src", "server.ts"), "utf-8");

  it("src/server.ts aplica withCacheHeaders nas duas saídas", () => {
    expect(server).toContain('from "./lib/cache-headers"');
    expect(server.match(/withCacheHeaders\(/g) ?? []).toHaveLength(2);
  });
});
