// Onda 4 — checagem de disponibilidade e headers de seguranca dos Workers publicados.
// Usado pelo workflow agendado .github/workflows/uptime-check.yml. Nao depende de
// nenhum secret: as duas URLs sao os mesmos hosts *.workers.dev publicos ja usados pelo
// smoke test dos workflows de deploy (.github/workflows/deploy-staging.yml,
// deploy-production.yml). buildSecurityHeaders é a mesma fonte de verdade que o Worker
// usa em produção (src/lib/security-headers.ts) — se o Worker parar de aplicar um
// header, este script reflete a mudança automaticamente, sem lista duplicada.
import { buildSecurityHeaders } from "../src/lib/security-headers.ts";

export interface UptimeTarget {
  label: string;
  url: string;
}

// Mesmos hosts *.workers.dev hoje hardcoded nos smoke tests dos workflows de deploy —
// nenhuma URL nova, nenhum dado sensível (já são públicos por design, ver
// docs/security/THREAT-MODEL-ONDA-3.md).
export const UPTIME_TARGETS: UptimeTarget[] = [
  { label: "staging", url: "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/" },
  { label: "production", url: "https://vipreco-production.samuel-bortoletto.workers.dev/" },
];

export interface UptimeCheckResult {
  label: string;
  url: string;
  ok: boolean;
  status?: number;
  missingHeaders: string[];
  error?: string;
}

export function findMissingHeaders(actual: Headers, expected: Headers): string[] {
  const missing: string[] = [];
  expected.forEach((_value, key) => {
    if (!actual.get(key)) missing.push(key);
  });
  return missing;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export async function checkUptime(
  target: UptimeTarget,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 10_000,
): Promise<UptimeCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(target.url, { signal: controller.signal });
    const expectedHeaders = buildSecurityHeaders(target.url);
    const missingHeaders = findMissingHeaders(response.headers, expectedHeaders);
    return {
      label: target.label,
      url: target.url,
      ok: response.status === 200 && missingHeaders.length === 0,
      status: response.status,
      missingHeaders,
    };
  } catch (error) {
    return {
      label: target.label,
      url: target.url,
      ok: false,
      missingHeaders: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function formatResult(result: UptimeCheckResult): string {
  if (result.ok) {
    return `OK: ${result.label} (${result.url}) respondeu 200 com todos os headers de segurança.`;
  }
  if (result.error) {
    return `FALHA: ${result.label} (${result.url}) — ${result.error}`;
  }
  const parts: string[] = [];
  if (result.status !== 200) parts.push(`HTTP ${result.status}`);
  if (result.missingHeaders.length > 0) {
    parts.push(`headers ausentes: ${result.missingHeaders.join(", ")}`);
  }
  return `FALHA: ${result.label} (${result.url}) — ${parts.join("; ")}`;
}

async function main() {
  const results = await Promise.all(UPTIME_TARGETS.map((target) => checkUptime(target)));
  for (const result of results) {
    console.log(formatResult(result));
  }
  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
