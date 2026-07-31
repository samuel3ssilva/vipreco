// Regressão estática, no mesmo espírito de `produto.$productId.public-surfaces.test.ts`: garante
// que a Home continua servida pelo loader e que ninguém reintroduz, por engano, a busca no
// cliente ou o texto de carregamento que este PR eliminou.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HOME_ROUTE = join(process.cwd(), "src", "routes", "index.tsx");
const home = readFileSync(HOME_ROUTE, "utf-8");

describe("Home servida pelo loader (SSR)", () => {
  it("declara um loader na rota", () => {
    expect(home).toMatch(/loader:\s*\(\)\s*=>\s*loadHomeOpportunities\(\)/);
  });

  it("lê os Achados do loader, não de um useQuery no cliente", () => {
    expect(home).toContain("Route.useLoaderData()");
    expect(home).not.toMatch(/\buseQuery\s*\(/);
    expect(home).not.toContain("@tanstack/react-query");
  });

  it("não busca as oportunidades direto no catálogo", () => {
    expect(home).not.toContain("getWeeklyOpportunities");
    expect(home).not.toContain("@/services/catalog");
  });

  it("não tem mais estado de carregamento dos Achados", () => {
    expect(home).not.toContain("Carregando oportunidades");
    expect(home).not.toMatch(/variant="loading"/);
  });
});
