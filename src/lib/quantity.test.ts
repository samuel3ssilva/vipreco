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

  it("não deixa passar nome herdado de Object.prototype", () => {
    // Regressão: com `value in UNIT_CONVERSIONS` a guarda percorria a cadeia de protótipos
    // e aceitava `toString` como unidade. `UNIT_CONVERSIONS["toString"]` é uma função,
    // `.factor` é `undefined`, e a conversão devolvia `NaN` com `status: "ok"`.
    for (const herdado of ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"]) {
      expect(isQuantityUnit(herdado)).toBe(false);
    }
  });

  it("a tabela de conversão não é mutável", () => {
    const alvo = UNIT_CONVERSIONS as unknown as Record<string, unknown>;
    expect(() => {
      alvo.kg = { normalizedUnit: "g", factor: 1 };
    }).toThrow();
    expect(UNIT_CONVERSIONS.kg.factor).toBe(1000);
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
    expect(normalizeQuantity({ value: Number.NEGATIVE_INFINITY, unit: "g" })).toEqual({
      status: "rejected",
      rejection: "not_finite",
    });
  });

  it("transbordo depois do fator é rejeitado, não devolvido como Infinity", () => {
    // Regressão: a guarda validava só a entrada. `1e308` é finito; `1e308 kg` só transborda
    // depois de multiplicar por 1000, e o resultado saía com `status: "ok"`.
    for (const unit of ["kg", "l"] as const) {
      const resultado = normalizeQuantity({ value: 1e308, unit });
      expect(resultado).toEqual({ status: "rejected", rejection: "not_finite" });
    }
    const maximo = normalizeQuantity({ value: Number.MAX_VALUE, unit: "kg" });
    expect(maximo.status).toBe("rejected");
  });

  it("unidade desconhecida vira estado, não exceção", () => {
    // Regressão: o tipo promete `QuantityUnit`, mas uma linha vinda do banco, de um fixture
    // antigo ou de JSON pode trazer `"kilo"`. Antes, indexar a tabela devolvia `undefined` e
    // a leitura de `.factor` estourava — falha por exceção em vez de por estado.
    const suja = { value: 500, unit: "kilo" } as unknown as Parameters<typeof normalizeQuantity>[0];
    expect(() => normalizeQuantity(suja)).not.toThrow();
    expect(normalizeQuantity(suja)).toEqual({ status: "rejected", rejection: "unknown_unit" });

    const herdada = { value: 500, unit: "toString" } as unknown as Parameters<
      typeof normalizeQuantity
    >[0];
    expect(normalizeQuantity(herdada)).toEqual({ status: "rejected", rejection: "unknown_unit" });
  });

  it("nenhuma rejeição devolve quantidade: não existe 0 nem NaN de consolação", () => {
    const entradas = [
      { value: 0, unit: "g" as const },
      { value: -1, unit: "g" as const },
      { value: Number.NaN, unit: "g" as const },
      { value: 1e308, unit: "kg" as const },
    ];
    for (const entrada of entradas) {
      const resultado = normalizeQuantity(entrada);
      expect(resultado.status).toBe("rejected");
      expect(resultado).not.toHaveProperty("quantity");
    }
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
