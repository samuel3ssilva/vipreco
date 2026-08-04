import { describe, expect, it } from "vitest";
import {
  QUANTITY_UNITS,
  UNIT_CONVERSIONS,
  isQuantityUnit,
  isValidUnitsPerPackage,
  normalizeQuantity,
  sameNormalizedQuantity,
} from "@/lib/quantity";

describe("tabela de unidades", () => {
  it("tem exatamente as cinco unidades do contrato", () => {
    expect([...QUANTITY_UNITS].sort()).toEqual(["g", "kg", "l", "ml", "un"]);
  });

  it("converge para exatamente três grandezas", () => {
    const grandezas = new Set(Object.values(UNIT_CONVERSIONS).map((c) => c.normalizedUnit));
    expect([...grandezas].sort()).toEqual(["g", "ml", "un"]);
  });

  it("reconhece unidade válida e recusa o resto", () => {
    expect(isQuantityUnit("kg")).toBe(true);
    expect(isQuantityUnit("KG")).toBe(false);
    expect(isQuantityUnit("rolo")).toBe(false);
    expect(isQuantityUnit("cápsula")).toBe(false);
    expect(isQuantityUnit(undefined)).toBe(false);
    expect(isQuantityUnit(500)).toBe(false);
  });
});

describe("normalizeQuantity — os fatores do contrato", () => {
  it("massa: g com fator 1, kg com fator 1000", () => {
    expect(normalizeQuantity({ value: 500, unit: "g" })).toEqual({
      status: "ok",
      quantity: { value: 500, unit: "g" },
    });
    expect(normalizeQuantity({ value: 5, unit: "kg" })).toEqual({
      status: "ok",
      quantity: { value: 5000, unit: "g" },
    });
  });

  it("volume: ml com fator 1, l com fator 1000", () => {
    expect(normalizeQuantity({ value: 900, unit: "ml" })).toEqual({
      status: "ok",
      quantity: { value: 900, unit: "ml" },
    });
    expect(normalizeQuantity({ value: 1, unit: "l" })).toEqual({
      status: "ok",
      quantity: { value: 1000, unit: "ml" },
    });
  });

  it("contagem: un com fator 1", () => {
    expect(normalizeQuantity({ value: 12, unit: "un" })).toEqual({
      status: "ok",
      quantity: { value: 12, unit: "un" },
    });
  });

  it("converge 500 g e 0,5 kg para o mesmo valor normalizado", () => {
    const emGramas = normalizeQuantity({ value: 500, unit: "g" });
    const emQuilos = normalizeQuantity({ value: 0.5, unit: "kg" });
    expect(emGramas.status).toBe("ok");
    expect(emQuilos.status).toBe("ok");
    if (emGramas.status === "ok" && emQuilos.status === "ok") {
      expect(sameNormalizedQuantity(emGramas.quantity, emQuilos.quantity)).toBe(true);
    }
  });

  it("é determinístico em decimal — 1,5 kg é exatamente 1500", () => {
    // Sem arredondamento explícito, 1.5 * 1000 é exato, mas 0.1 * 1000 não é. O contrato
    // fixa numeric(12,4); o arredondamento aqui é o que impede duas execuções da mesma
    // conversão de produzirem chaves de identidade diferentes.
    expect(normalizeQuantity({ value: 1.5, unit: "kg" })).toEqual({
      status: "ok",
      quantity: { value: 1500, unit: "g" },
    });
    expect(normalizeQuantity({ value: 0.1, unit: "l" })).toEqual({
      status: "ok",
      quantity: { value: 100, unit: "ml" },
    });
    expect(normalizeQuantity({ value: 0.3, unit: "kg" })).toEqual({
      status: "ok",
      quantity: { value: 300, unit: "g" },
    });
  });

  it("dá o mesmo resultado em execuções repetidas", () => {
    const entradas = [
      { value: 0.35, unit: "l" as const },
      { value: 1.005, unit: "kg" as const },
      { value: 12, unit: "un" as const },
    ];
    for (const entrada of entradas) {
      const primeira = JSON.stringify(normalizeQuantity(entrada));
      for (let i = 0; i < 5; i++) {
        expect(JSON.stringify(normalizeQuantity(entrada))).toBe(primeira);
      }
    }
  });
});

describe("normalizeQuantity — rejeições explícitas", () => {
  it("zero e negativo são rejeitados, nunca convertidos", () => {
    expect(normalizeQuantity({ value: 0, unit: "g" })).toEqual({
      status: "rejected",
      rejection: "not_positive",
    });
    expect(normalizeQuantity({ value: -500, unit: "g" })).toEqual({
      status: "rejected",
      rejection: "not_positive",
    });
  });

  it("NaN e Infinity são rejeitados, e não viram 0 nem NaN público", () => {
    expect(normalizeQuantity({ value: Number.NaN, unit: "kg" })).toEqual({
      status: "rejected",
      rejection: "not_finite",
    });
    expect(normalizeQuantity({ value: Number.POSITIVE_INFINITY, unit: "l" })).toEqual({
      status: "rejected",
      rejection: "not_finite",
    });
  });
});

describe("sameNormalizedQuantity", () => {
  it("nunca compara grandezas diferentes por número", () => {
    expect(sameNormalizedQuantity({ value: 500, unit: "g" }, { value: 500, unit: "ml" })).toBe(
      false,
    );
    expect(sameNormalizedQuantity({ value: 12, unit: "un" }, { value: 12, unit: "g" })).toBe(false);
  });

  it("compara valor dentro da mesma grandeza", () => {
    expect(sameNormalizedQuantity({ value: 500, unit: "g" }, { value: 500, unit: "g" })).toBe(true);
    expect(sameNormalizedQuantity({ value: 500, unit: "g" }, { value: 250, unit: "g" })).toBe(
      false,
    );
  });
});

describe("isValidUnitsPerPackage", () => {
  it("aceita inteiro maior que zero", () => {
    expect(isValidUnitsPerPackage(6)).toBe(true);
    expect(isValidUnitsPerPackage(1)).toBe(true);
  });

  it("recusa zero, negativo, fracionário, nulo e ausente", () => {
    expect(isValidUnitsPerPackage(0)).toBe(false);
    expect(isValidUnitsPerPackage(-6)).toBe(false);
    expect(isValidUnitsPerPackage(6.5)).toBe(false);
    expect(isValidUnitsPerPackage(null)).toBe(false);
    expect(isValidUnitsPerPackage(undefined)).toBe(false);
    expect(isValidUnitsPerPackage(Number.NaN)).toBe(false);
  });
});
