import { describe, expect, it } from "vitest";
import {
  compareWithUsualMarket,
  isValidPrice,
  lastUpdatedAt,
  latestValidPricePerMarket,
} from "@/lib/comparison";
import type { Market, PriceWithMarket } from "@/types/domain";

const NOW = new Date("2026-07-27T12:00:00Z");

function market(id: string, overrides: Partial<Market> = {}): Market {
  return {
    id,
    name: `Mercado ${id}`,
    neighborhood: null,
    address: null,
    maps_url: null,
    is_active: true,
    is_demo: true,
    ...overrides,
  };
}

function price(overrides: Partial<PriceWithMarket> & { id: string; market_id: string; price: number }): PriceWithMarket {
  return {
    product_id: "p1",
    source_type: "receipt",
    observed_at: "2026-07-25T12:00:00Z",
    valid_until: null,
    special_condition: null,
    source_reference: null,
    is_featured: false,
    is_active: true,
    is_demo: true,
    market: market(overrides.market_id),
    ...overrides,
  };
}

describe("isValidPrice", () => {
  it("aceita preço ativo, já observado e sem validade", () => {
    expect(isValidPrice({ is_active: true, observed_at: "2026-07-20T00:00:00Z", valid_until: null }, NOW)).toBe(true);
  });

  it("rejeita preço inativo", () => {
    expect(isValidPrice({ is_active: false, observed_at: "2026-07-20T00:00:00Z", valid_until: null }, NOW)).toBe(false);
  });

  it("rejeita oferta vencida", () => {
    expect(
      isValidPrice({ is_active: true, observed_at: "2026-07-01T00:00:00Z", valid_until: "2026-07-10T00:00:00Z" }, NOW),
    ).toBe(false);
  });

  it("rejeita preço com data futura", () => {
    expect(isValidPrice({ is_active: true, observed_at: "2026-08-01T00:00:00Z", valid_until: null }, NOW)).toBe(false);
  });
});

describe("latestValidPricePerMarket", () => {
  it("mantém apenas o preço mais recente de cada mercado e ordena do menor ao maior", () => {
    const result = latestValidPricePerMarket(
      [
        price({ id: "a1", market_id: "m1", price: 20, observed_at: "2026-07-20T00:00:00Z" }),
        price({ id: "a2", market_id: "m1", price: 15, observed_at: "2026-07-26T00:00:00Z" }),
        price({ id: "b1", market_id: "m2", price: 12, observed_at: "2026-07-24T00:00:00Z" }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["b1", "a2"]);
  });

  it("descarta preços vencidos e mercados inativos", () => {
    const result = latestValidPricePerMarket(
      [
        price({ id: "a", market_id: "m1", price: 9, valid_until: "2026-07-01T00:00:00Z" }),
        price({ id: "b", market_id: "m2", price: 11, market: market("m2", { is_active: false }) }),
        price({ id: "c", market_id: "m3", price: 13 }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["c"]);
  });
});

describe("compareWithUsualMarket", () => {
  const entries = latestValidPricePerMarket(
    [
      price({ id: "a", market_id: "m1", price: 10 }),
      price({ id: "b", market_id: "m2", price: 14.5 }),
    ],
    NOW,
  );

  it("informa quando não há mercado habitual", () => {
    expect(compareWithUsualMarket(entries, null).kind).toBe("no-usual-market");
  });

  it("informa quando o mercado habitual não tem preço", () => {
    expect(compareWithUsualMarket(entries, "m9").kind).toBe("no-price");
  });

  it("informa quando o mercado habitual já é o mais barato", () => {
    expect(compareWithUsualMarket(entries, "m1").kind).toBe("cheapest");
  });

  it("calcula a diferença em relação ao mercado habitual", () => {
    const result = compareWithUsualMarket(entries, "m2");
    expect(result).toMatchObject({ kind: "difference", difference: 4.5 });
  });
});

describe("lastUpdatedAt", () => {
  it("retorna null sem preços", () => {
    expect(lastUpdatedAt([])).toBeNull();
  });

  it("retorna a observação mais recente", () => {
    const result = lastUpdatedAt([
      price({ id: "a", market_id: "m1", price: 10, observed_at: "2026-07-20T00:00:00Z" }),
      price({ id: "b", market_id: "m2", price: 11, observed_at: "2026-07-26T00:00:00Z" }),
    ]);
    expect(result).toBe("2026-07-26T00:00:00Z");
  });
});
