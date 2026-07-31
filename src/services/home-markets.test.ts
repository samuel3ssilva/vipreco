import { afterEach, describe, expect, it, vi } from "vitest";
import { loadHomeMarkets } from "@/services/home-markets";
import { DEMO_MARKETS } from "@/lib/demo-opportunities";

const getMarkets = vi.fn();
vi.mock("@/services/catalog", () => ({
  getMarkets: (...args: unknown[]) => getMarkets(...args),
}));

afterEach(() => {
  getMarkets.mockReset();
});

describe("mercados do seletor da Home", () => {
  it("no modo DEMO entrega o fixture versionado", async () => {
    const mercados = await loadHomeMarkets("demo");
    expect(mercados).toHaveLength(DEMO_MARKETS.length);
    expect(mercados?.map((market) => market.name)).toEqual(
      DEMO_MARKETS.map((market) => market.name),
    );
  });

  it("no modo DEMO não consulta o Supabase", async () => {
    await loadHomeMarkets("demo");
    expect(getMarkets).not.toHaveBeenCalled();
  });

  it("no modo DEMO devolve cópias, nunca o fixture compartilhado por referência", async () => {
    const primeiro = await loadHomeMarkets("demo");
    const segundo = await loadHomeMarkets("demo");
    expect(primeiro?.[0]).not.toBe(DEMO_MARKETS[0]);
    expect(primeiro?.[0]).not.toBe(segundo?.[0]);
    expect(primeiro).toEqual(segundo);
  });

  it("o modo PILOTO consulta o catálogo quando escolhido", async () => {
    getMarkets.mockResolvedValue([]);
    await expect(loadHomeMarkets("piloto")).resolves.toEqual([]);
    expect(getMarkets).toHaveBeenCalledTimes(1);
  });

  it("falha do Supabase vira null em vez de derrubar o loader da Home", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    getMarkets.mockRejectedValue(new Error("Não foi possível carregar os mercados agora."));

    await expect(loadHomeMarkets("piloto")).resolves.toBeNull();
    expect(erro).toHaveBeenCalled(); // a falha é registrada, não engolida em silêncio
    erro.mockRestore();
  });
});
