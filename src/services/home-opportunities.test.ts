import { afterEach, describe, expect, it, vi } from "vitest";
import { loadHomeOpportunities, resolveHomeOpportunitySource } from "@/services/home-opportunities";
import { HOME_OPPORTUNITY_COUNT } from "@/lib/demo-opportunities";

const getWeeklyOpportunities = vi.fn();
vi.mock("@/services/catalog", () => ({
  getWeeklyOpportunities: (...args: unknown[]) => getWeeklyOpportunities(...args),
}));

afterEach(() => {
  getWeeklyOpportunities.mockReset();
});

describe("fonte dos Achados da Home", () => {
  it("usa DEMO por padrão, inclusive sem variável configurada", () => {
    expect(resolveHomeOpportunitySource(undefined)).toBe("demo");
    expect(resolveHomeOpportunitySource("")).toBe("demo");
    expect(resolveHomeOpportunitySource("qualquer-coisa")).toBe("demo");
  });

  it("só entra no modo PILOTO com opt-in explícito", () => {
    expect(resolveHomeOpportunitySource("piloto")).toBe("piloto");
  });

  it("no modo DEMO entrega três Achados do fixture", async () => {
    const resultado = await loadHomeOpportunities("demo");
    expect(resultado.source).toBe("demo");
    expect(resultado.opportunities).toHaveLength(HOME_OPPORTUNITY_COUNT);
    expect(resultado.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("no modo DEMO não consulta a fonte remota dos Achados", async () => {
    await loadHomeOpportunities("demo");
    expect(getWeeklyOpportunities).not.toHaveBeenCalled();
  });

  it("o modo PILOTO está preparado, mas só é exercido quando escolhido", async () => {
    getWeeklyOpportunities.mockResolvedValue([]);
    const resultado = await loadHomeOpportunities("piloto");
    expect(getWeeklyOpportunities).toHaveBeenCalledWith(HOME_OPPORTUNITY_COUNT);
    expect(resultado.source).toBe("piloto");
  });

  it("usa o mesmo instante para o carimbo e para as datas do fixture", async () => {
    const agora = new Date("2026-07-31T02:30:00.000Z");
    const resultado = await loadHomeOpportunities("demo", agora);
    expect(resultado.generatedAt).toBe(agora.toISOString());
    const maisRecente = resultado.opportunities[0];
    expect(new Date(maisRecente.observed_at).getTime()).toBe(agora.getTime() - 86_400_000);
  });
});
