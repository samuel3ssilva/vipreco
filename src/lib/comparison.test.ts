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

function price(
  overrides: Partial<PriceWithMarket> & { id: string; market_id: string; price: number },
): PriceWithMarket {
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
    created_at: "2026-07-25T12:00:00Z",
    market: market(overrides.market_id),
    ...overrides,
  };
}

describe("isValidPrice", () => {
  it("aceita preço ativo, já observado e sem validade", () => {
    expect(
      isValidPrice(
        { is_active: true, observed_at: "2026-07-20T00:00:00Z", valid_until: null },
        NOW,
      ),
    ).toBe(true);
  });

  it("rejeita preço inativo", () => {
    expect(
      isValidPrice(
        { is_active: false, observed_at: "2026-07-20T00:00:00Z", valid_until: null },
        NOW,
      ),
    ).toBe(false);
  });

  it("rejeita oferta vencida", () => {
    expect(
      isValidPrice(
        {
          is_active: true,
          observed_at: "2026-07-01T00:00:00Z",
          valid_until: "2026-07-10T00:00:00Z",
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("rejeita preço com data futura", () => {
    expect(
      isValidPrice(
        { is_active: true, observed_at: "2026-08-01T00:00:00Z", valid_until: null },
        NOW,
      ),
    ).toBe(false);
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

  it("desempata por created_at quando observed_at é igual", () => {
    const result = latestValidPricePerMarket(
      [
        price({
          id: "older",
          market_id: "m1",
          price: 10,
          observed_at: "2026-07-25T00:00:00Z",
          created_at: "2026-07-25T08:00:00Z",
        }),
        price({
          id: "newer",
          market_id: "m1",
          price: 12,
          observed_at: "2026-07-25T00:00:00Z",
          created_at: "2026-07-25T09:00:00Z",
        }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["newer"]);
  });

  it("desempata por id quando observed_at e created_at são iguais", () => {
    const result = latestValidPricePerMarket(
      [
        price({
          id: "a-first",
          market_id: "m1",
          price: 10,
          observed_at: "2026-07-25T00:00:00Z",
          created_at: "2026-07-25T08:00:00Z",
        }),
        price({
          id: "b-second",
          market_id: "m1",
          price: 12,
          observed_at: "2026-07-25T00:00:00Z",
          created_at: "2026-07-25T08:00:00Z",
        }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["b-second"]);
  });
});

// A ordem final entre mercados. O desempate acima decide qual preço vence **dentro** de um
// mercado; estes decidem em que posição cada mercado aparece na lista que o visitante lê.
describe("ordem final da comparação", () => {
  /** Três mercados idênticos em preço e em observação: só o `id` os distingue. */
  const EMPATE_TOTAL = [
    price({ id: "p-c", market_id: "m3", price: 9.9, observed_at: "2026-07-25T00:00:00Z" }),
    price({ id: "p-a", market_id: "m1", price: 9.9, observed_at: "2026-07-25T00:00:00Z" }),
    price({ id: "p-b", market_id: "m2", price: 9.9, observed_at: "2026-07-25T00:00:00Z" }),
  ];

  it("desempata por identificador estável quando preço e observed_at são idênticos", () => {
    const result = latestValidPricePerMarket(EMPATE_TOTAL, NOW);
    expect(result.map((entry) => entry.id)).toEqual(["p-a", "p-b", "p-c"]);
  });

  it("produz a mesma ordem qualquer que seja a ordem de entrada", () => {
    // O banco não promete ordem entre linhas empatadas. Estas seis permutações representam o
    // que ele pode devolver; nenhuma delas pode mudar o que o visitante lê.
    const permutacoes = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];

    for (const ordem of permutacoes) {
      const entrada = ordem.map((indice) => EMPATE_TOTAL[indice]);
      const result = latestValidPricePerMarket(entrada, NOW);
      expect(
        result.map((entry) => entry.id),
        `entrada ${ordem.join("")}`,
      ).toEqual(["p-a", "p-b", "p-c"]);
    }
  });

  it("repete o mesmo resultado em execuções sucessivas com a mesma entrada", () => {
    const primeira = latestValidPricePerMarket(EMPATE_TOTAL, NOW).map((entry) => entry.id);
    for (let execucao = 0; execucao < 20; execucao++) {
      expect(latestValidPricePerMarket(EMPATE_TOTAL, NOW).map((entry) => entry.id)).toEqual(
        primeira,
      );
    }
  });

  it("preço crescente continua vindo antes do desempate por identificador", () => {
    const result = latestValidPricePerMarket(
      [
        price({ id: "p-a", market_id: "m1", price: 12, observed_at: "2026-07-25T00:00:00Z" }),
        price({ id: "p-z", market_id: "m2", price: 9.9, observed_at: "2026-07-25T00:00:00Z" }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["p-z", "p-a"]);
  });

  it("observação mais recente continua vindo antes do desempate por identificador", () => {
    const result = latestValidPricePerMarket(
      [
        price({ id: "p-a", market_id: "m1", price: 9.9, observed_at: "2026-07-20T00:00:00Z" }),
        price({ id: "p-z", market_id: "m2", price: 9.9, observed_at: "2026-07-26T00:00:00Z" }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["p-z", "p-a"]);
  });

  it("destaque, origem e mercado não interferem na ordem", () => {
    // `is_featured` é a camada de conteúdo destacado. Ela vive em seção separada e rotulada, e
    // jamais reordena a lista orgânica — princípio inviolável #4 do CLAUDE.md.
    const result = latestValidPricePerMarket(
      [
        price({
          id: "p-a",
          market_id: "m1",
          price: 9.9,
          observed_at: "2026-07-25T00:00:00Z",
          is_featured: false,
          source_type: "community",
        }),
        price({
          id: "p-b",
          market_id: "m2",
          price: 9.9,
          observed_at: "2026-07-25T00:00:00Z",
          is_featured: true,
          source_type: "receipt",
        }),
      ],
      NOW,
    );

    expect(result.map((entry) => entry.id)).toEqual(["p-a", "p-b"]);
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
