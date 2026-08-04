import { describe, expect, it } from "vitest";
import { comparableUnitPrices, computeUnitPrice, type UnitPriceInput } from "@/lib/unit-price";

function entrada(overrides: Partial<UnitPriceInput> = {}): UnitPriceInput {
  return {
    price: 17.49,
    quantity: { value: 500, unit: "g" },
    provenance: "confirmed",
    ...overrides,
  };
}

function ok(input: UnitPriceInput) {
  const resultado = computeUnitPrice(input);
  if (resultado.status !== "ok") {
    throw new Error(`esperava cálculo, veio ${JSON.stringify(resultado)}`);
  }
  return resultado;
}

describe("as três bases do contrato", () => {
  it("massa vira preço por quilo", () => {
    const resultado = ok(entrada({ price: 17.49, quantity: { value: 500, unit: "g" } }));
    expect(resultado.basis).toBe("per_kg");
    expect(resultado.display).toBe(34.98);
  });

  it("quilo e grama chegam ao mesmo preço por quilo", () => {
    const emGramas = ok(entrada({ price: 26.49, quantity: { value: 5000, unit: "g" } }));
    const emQuilos = ok(entrada({ price: 26.49, quantity: { value: 5, unit: "kg" } }));
    expect(emQuilos.value).toBe(emGramas.value);
    expect(emQuilos.basis).toBe("per_kg");
  });

  it("volume vira preço por litro", () => {
    const resultado = ok(entrada({ price: 9, quantity: { value: 900, unit: "ml" } }));
    expect(resultado.basis).toBe("per_l");
    expect(resultado.display).toBe(10);
  });

  it("contagem vira preço por unidade", () => {
    const resultado = ok(entrada({ price: 24, quantity: { value: 12, unit: "un" } }));
    expect(resultado.basis).toBe("per_un");
    expect(resultado.display).toBe(2);
  });
});

describe("pack com conteúdo declarado", () => {
  it("6 × 350 ml devolve preço por litro e preço por lata", () => {
    const resultado = ok(
      entrada({ price: 21, quantity: { value: 2100, unit: "ml" }, unitsPerPackage: 6 }),
    );
    expect(resultado.basis).toBe("per_l");
    expect(resultado.display).toBe(10);
    expect(resultado.perPackageUnit?.display).toBe(3.5);
  });

  it("pack sem conteúdo interno não inventa preço por item", () => {
    const resultado = ok(entrada({ price: 21, quantity: { value: 2100, unit: "ml" } }));
    expect(resultado.perPackageUnit).toBeNull();
  });

  it("conteúdo interno inválido é ignorado, nunca arredondado para caber", () => {
    for (const invalido of [0, -6, 6.5, Number.NaN]) {
      const resultado = ok(
        entrada({ quantity: { value: 2100, unit: "ml" }, unitsPerPackage: invalido }),
      );
      expect(resultado.perPackageUnit).toBeNull();
    }
  });
});

describe("nada é calculado fora de quantidade aprovada", () => {
  it.each([
    ["missing", "unavailable"],
    ["unsupported", "unavailable"],
  ] as const)("proveniência %s deixa o unitário indisponível", (proveniencia, status) => {
    expect(computeUnitPrice(entrada({ provenance: proveniencia })).status).toBe(status);
  });

  it("quantidade ambígua não vira número", () => {
    expect(computeUnitPrice(entrada({ provenance: "ambiguous" }))).toEqual({
      status: "ambiguous",
      ambiguity: "quantity_ambiguous",
    });
  });

  it("quantidade apenas lida de texto ainda não libera cálculo", () => {
    // O contrato exige "estruturadas **e aprovadas**". Uma leitura de `size_text` é
    // proposta, não aprovação.
    expect(computeUnitPrice(entrada({ provenance: "parsed" }))).toEqual({
      status: "ambiguous",
      ambiguity: "quantity_not_approved",
    });
  });

  it("peso variável — sem quantidade, sem cálculo", () => {
    expect(computeUnitPrice(entrada({ quantity: null, provenance: "unsupported" }))).toEqual({
      status: "unavailable",
      unavailability: "quantity_unavailable",
    });
  });
});

describe("entradas inválidas viram estado, nunca 0 nem NaN", () => {
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("preço %s é rejeitado", (preco) => {
    expect(computeUnitPrice(entrada({ price: preco }))).toEqual({
      status: "unavailable",
      unavailability: "price_invalid",
    });
  });

  it.each([0, -500, Number.NaN])("quantidade %s é rejeitada", (valor) => {
    expect(computeUnitPrice(entrada({ quantity: { value: valor, unit: "g" } }))).toEqual({
      status: "unavailable",
      unavailability: "quantity_invalid",
    });
  });

  it("nenhum caminho devolve NaN dentro de um resultado `ok`", () => {
    const casos: UnitPriceInput[] = [
      entrada(),
      entrada({ price: 0.01, quantity: { value: 1, unit: "un" } }),
      entrada({ price: 999.99, quantity: { value: 0.0001, unit: "kg" } }),
    ];
    for (const caso of casos) {
      const resultado = computeUnitPrice(caso);
      if (resultado.status === "ok") {
        expect(Number.isFinite(resultado.value)).toBe(true);
        expect(Number.isFinite(resultado.display)).toBe(true);
      }
    }
  });
});

describe("arredondamento e preservação do preço", () => {
  it("o cálculo interno guarda a precisão cheia; só a exibição arredonda", () => {
    const resultado = ok(entrada({ price: 10, quantity: { value: 3, unit: "un" } }));
    expect(resultado.value).toBeCloseTo(3.3333333, 6);
    expect(resultado.display).toBe(3.33);
  });

  it("arredondamento comercial resolve o caso binário de 1,005", () => {
    // `Math.round(1.005 * 100)` devolve 100 porque 1.005 em binário é 1.00499999….
    const resultado = ok(entrada({ price: 1.005, quantity: { value: 1000, unit: "g" } }));
    expect(resultado.display).toBe(1.01);
  });

  it("é determinístico: dez execuções, o mesmo número", () => {
    const caso = entrada({ price: 26.49, quantity: { value: 5, unit: "kg" } });
    const primeira = JSON.stringify(computeUnitPrice(caso));
    for (let i = 0; i < 10; i++) {
      expect(JSON.stringify(computeUnitPrice(caso))).toBe(primeira);
    }
  });

  it("o preço original não é alterado pelo cálculo", () => {
    const caso = entrada({ price: 17.49 });
    computeUnitPrice(caso);
    expect(caso.price).toBe(17.49);
    expect(caso.quantity).toEqual({ value: 500, unit: "g" });
  });
});

describe("comparabilidade entre unitários", () => {
  it("per_kg só se compara com per_kg", () => {
    const massa = computeUnitPrice(entrada({ quantity: { value: 500, unit: "g" } }));
    const outraMassa = computeUnitPrice(entrada({ quantity: { value: 250, unit: "g" } }));
    const volume = computeUnitPrice(entrada({ quantity: { value: 500, unit: "ml" } }));
    const contagem = computeUnitPrice(entrada({ quantity: { value: 12, unit: "un" } }));

    expect(comparableUnitPrices(massa, outraMassa)).toBe(true);
    expect(comparableUnitPrices(massa, volume)).toBe(false);
    expect(comparableUnitPrices(volume, contagem)).toBe(false);
  });

  it("resultado sem cálculo nunca é comparável", () => {
    const calculado = computeUnitPrice(entrada());
    const semCalculo = computeUnitPrice(entrada({ provenance: "ambiguous" }));
    expect(comparableUnitPrices(calculado, semCalculo)).toBe(false);
    expect(comparableUnitPrices(semCalculo, semCalculo)).toBe(false);
  });
});

describe("pack contado em unidade sem conteúdo declarado", () => {
  const base = {
    price: 18,
    quantity: { value: 1, unit: "un" } as const,
    provenance: "confirmed" as const,
  };

  it("bloqueia em vez de apresentar preço por pack como preço por unidade", () => {
    // O estado `package_content_unknown` existia no tipo e não era produzido por caminho
    // nenhum. É o único caso em que a base mente: "1 un" é o pack, não o item.
    expect(computeUnitPrice({ ...base, packageType: "pack" })).toEqual({
      status: "ambiguous",
      ambiguity: "package_content_unknown",
    });
    expect(computeUnitPrice({ ...base, packageType: "pack", unitsPerPackage: 0 })).toEqual({
      status: "ambiguous",
      ambiguity: "package_content_unknown",
    });
  });

  it("com conteúdo declarado, calcula normalmente", () => {
    const resultado = computeUnitPrice({
      ...base,
      quantity: { value: 6, unit: "un" },
      packageType: "pack",
      unitsPerPackage: 6,
    });
    expect(resultado.status).toBe("ok");
    if (resultado.status === "ok") {
      expect(resultado.basis).toBe("per_un");
      expect(resultado.display).toBe(3);
    }
  });

  it("não bloqueia massa nem volume: 6 × 350 ml dá preço por litro sem saber a contagem", () => {
    const resultado = computeUnitPrice({
      price: 18,
      quantity: { value: 2100, unit: "ml" },
      provenance: "confirmed",
      packageType: "pack",
    });
    expect(resultado.status).toBe("ok");
    if (resultado.status === "ok") {
      expect(resultado.basis).toBe("per_l");
      expect(resultado.perPackageUnit).toBeNull();
    }
  });

  it("sem packageType o comportamento não muda", () => {
    expect(computeUnitPrice(base).status).toBe("ok");
    expect(computeUnitPrice({ ...base, packageType: null }).status).toBe("ok");
    expect(computeUnitPrice({ ...base, packageType: "unidade" }).status).toBe("ok");
  });
});
