import { describe, expect, it } from "vitest";
import { searchState } from "@/lib/search-state";

const BASE = { enabled: false, isFetching: false, isError: false, count: 0 };

describe("estado visível da busca", () => {
  it("antes de qualquer ação, o estado é inicial — nunca carregando", () => {
    // Mesmo com a consulta em voo por qualquer motivo, sem ação explícita não há carregamento.
    expect(searchState({ ...BASE })).toBe("inicial");
    expect(searchState({ ...BASE, isFetching: true })).toBe("inicial");
    expect(searchState({ ...BASE, isError: true })).toBe("inicial");
    expect(searchState({ ...BASE, count: 5 })).toBe("inicial");
  });

  it("depois da ação, carregando aparece", () => {
    expect(searchState({ ...BASE, enabled: true, isFetching: true })).toBe("carregando");
  });

  it("erro tem precedência sobre carregando", () => {
    expect(searchState({ ...BASE, enabled: true, isFetching: true, isError: true })).toBe("erro");
  });

  it("vazio e erro são estados diferentes", () => {
    expect(searchState({ ...BASE, enabled: true, count: 0 })).toBe("vazio");
    expect(searchState({ ...BASE, enabled: true, isError: true })).toBe("erro");
  });

  it("com resultado, entrega resultado", () => {
    expect(searchState({ ...BASE, enabled: true, count: 3 })).toBe("resultado");
  });

  it("nenhuma combinação sem ação produz esqueleto, vazio ou erro", () => {
    for (const isFetching of [false, true]) {
      for (const isError of [false, true]) {
        for (const count of [0, 7]) {
          expect(searchState({ enabled: false, isFetching, isError, count })).toBe("inicial");
        }
      }
    }
  });
});
