import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "../src/lib/security-headers.ts";
import { checkUptime, findMissingHeaders, formatResult, UPTIME_TARGETS } from "./check-uptime.ts";

const TARGET = {
  label: "staging",
  url: "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/",
};

function okFetch(headers: Headers): typeof fetch {
  return (async () => new Response("<html></html>", { status: 200, headers })) as typeof fetch;
}

describe("findMissingHeaders", () => {
  it("retorna vazio quando todo header esperado está presente", () => {
    const expected = new Headers({ "X-Frame-Options": "DENY" });
    const actual = new Headers({ "x-frame-options": "DENY" });
    expect(findMissingHeaders(actual, expected)).toEqual([]);
  });

  it("reporta o header ausente por nome", () => {
    const expected = new Headers({ "Strict-Transport-Security": "max-age=1" });
    const actual = new Headers();
    expect(findMissingHeaders(actual, expected)).toEqual(["strict-transport-security"]);
  });
});

describe("checkUptime", () => {
  it("marca ok=true quando status é 200 e todos os headers de segurança estão presentes", async () => {
    const headers = buildSecurityHeaders(TARGET.url);
    const result = await checkUptime(TARGET, okFetch(headers));
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.missingHeaders).toEqual([]);
  });

  it("marca ok=false quando falta um header de segurança", async () => {
    const headers = buildSecurityHeaders(TARGET.url);
    headers.delete("Content-Security-Policy");
    const result = await checkUptime(TARGET, okFetch(headers));
    expect(result.ok).toBe(false);
    expect(result.missingHeaders).toContain("content-security-policy");
  });

  it("marca ok=false quando o status não é 200", async () => {
    const fetchImpl = (async () =>
      new Response("erro", {
        status: 500,
        headers: buildSecurityHeaders(TARGET.url),
      })) as typeof fetch;
    const result = await checkUptime(TARGET, fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });

  it("marca ok=false e registra o erro quando o fetch rejeita (timeout/rede)", async () => {
    const fetchImpl = (async () => {
      throw new Error("network error");
    }) as typeof fetch;
    const result = await checkUptime(TARGET, fetchImpl);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("network error");
  });
});

describe("formatResult", () => {
  it("inclui host e motivo da falha na mensagem", () => {
    const message = formatResult({
      label: "production",
      url: "https://vipreco-production.samuel-bortoletto.workers.dev/",
      ok: false,
      status: 503,
      missingHeaders: ["x-frame-options"],
    });
    expect(message).toContain("production");
    expect(message).toContain("HTTP 503");
    expect(message).toContain("x-frame-options");
  });
});

describe("UPTIME_TARGETS", () => {
  it("cobre staging e produção, sem URLs novas além das já usadas no smoke test de deploy", () => {
    expect(UPTIME_TARGETS.map((t) => t.label).sort()).toEqual(["production", "staging"]);
    for (const target of UPTIME_TARGETS) {
      expect(target.url).toMatch(/^https:\/\/[a-z0-9.-]+\.workers\.dev\/$/);
    }
  });
});
