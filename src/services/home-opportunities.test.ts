import { afterEach, describe, expect, it, vi } from "vitest";
import { loadHomeOpportunities } from "@/services/home-opportunities";
import { HOME_OPPORTUNITY_COUNT } from "@/lib/demo-opportunities";

const getWeeklyOpportunities = vi.fn();
vi.mock("@/services/catalog", () => ({
  getWeeklyOpportunities: (...args: unknown[]) => getWeeklyOpportunities(...args),
}));

afterEach(() => {
  getWeeklyOpportunities.mockReset();
});

/** Dentro da janela real da coleta da demo v2 — ver `demo-opportunities.test.ts`. */
const AGORA = new Date("2026-08-09T18:00:00-03:00");

describe("fonte dos Achados da Home", () => {
  // A resolução do modo em si é testada em `src/lib/app-mode.test.ts` — aqui interessa só o que
  // cada modo faz com a fonte dos Achados.
  it("no modo DEMO entrega os Achados do fixture", async () => {
    const resultado = await loadHomeOpportunities("demo", AGORA);
    expect(resultado.source).toBe("demo");
    expect(resultado.opportunities).toHaveLength(HOME_OPPORTUNITY_COUNT);
    expect(resultado.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("no modo DEMO não consulta a fonte remota dos Achados", async () => {
    await loadHomeOpportunities("demo", AGORA);
    expect(getWeeklyOpportunities).not.toHaveBeenCalled();
  });

  it("o modo PILOTO está preparado, mas só é exercido quando escolhido", async () => {
    getWeeklyOpportunities.mockResolvedValue([]);
    const resultado = await loadHomeOpportunities("piloto");
    expect(getWeeklyOpportunities).toHaveBeenCalledWith(HOME_OPPORTUNITY_COUNT);
    expect(resultado.source).toBe("piloto");
  });

  it("o carimbo é o instante do servidor, e as datas do fixture são as reais da coleta", async () => {
    // A demo v2 tem datas ABSOLUTAS (a coleta aconteceu em 08–09/08/2026); o carimbo
    // continua sendo o instante em que o loader rodou. Os dois não são mais a mesma coisa,
    // e o teste deixa isso explícito em vez de amarrar um ao outro.
    const resultado = await loadHomeOpportunities("demo", AGORA);
    expect(resultado.generatedAt).toBe(AGORA.toISOString());
    for (const oferta of resultado.opportunities) {
      expect(new Date(oferta.observed_at).getTime()).toBeLessThanOrEqual(AGORA.getTime());
    }
  });
});
