import { describe, expect, it } from "vitest";
import {
  identityKey,
  resolveExactIdentity,
  sameExactIdentity,
  sameProductLine,
  type IdentityInput,
} from "@/lib/product-identity";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";
import type { PackageType, QuantityUnit } from "@/types/domain";

function produto(overrides: Partial<IdentityInput> = {}): IdentityInput {
  return {
    name: "Café",
    brand: "Pilão",
    variant: "Tradicional",
    package_type: "unidade" as PackageType,
    quantity_value: 500,
    quantity_unit: "g" as QuantityUnit,
    ...overrides,
  };
}

function resolvido(input: IdentityInput) {
  const resultado = resolveExactIdentity(input);
  if (resultado.status !== "resolved") {
    throw new Error(`esperava identidade resolvida, veio ${JSON.stringify(resultado)}`);
  }
  return resultado.identity;
}

describe("resolveExactIdentity — resolução", () => {
  it("normaliza texto pelo contrato único: caixa, acento e espaço repetido", () => {
    const identidade = resolvido(
      produto({ name: "  CAFÉ  ", brand: "Pilão", variant: "TRADICIONAL" }),
    );
    expect(identidade.name).toBe("cafe");
    expect(identidade.brand).toBe("pilao");
    expect(identidade.variant).toBe("tradicional");
  });

  it("marca e variante ausentes viram string vazia, não lacuna", () => {
    const identidade = resolvido(produto({ brand: null, variant: null }));
    expect(identidade.brand).toBe("");
    expect(identidade.variant).toBe("");
  });

  it("converte a quantidade para a grandeza base", () => {
    expect(resolvido(produto({ quantity_value: 1, quantity_unit: "l" })).quantity).toEqual({
      value: 1000,
      unit: "ml",
    });
  });
});

describe("resolveExactIdentity — lacunas", () => {
  it("registra cada campo faltante, sem inventar valor", () => {
    const resultado = resolveExactIdentity({
      name: "Café",
      brand: null,
      variant: null,
      package_type: null,
      quantity_value: null,
      quantity_unit: null,
    });
    expect(resultado.status).toBe("incomplete");
    if (resultado.status === "incomplete") {
      expect([...resultado.gaps].sort()).toEqual([
        "package_type_missing",
        "quantity_unit_missing",
        "quantity_value_missing",
      ]);
    }
  });

  it("nome vazio é lacuna", () => {
    const resultado = resolveExactIdentity(produto({ name: "   " }));
    expect(resultado.status).toBe("incomplete");
    if (resultado.status === "incomplete") {
      expect(resultado.gaps).toContain("name_missing");
    }
  });

  it("quantidade zero, negativa ou não finita vira lacuna, nunca identidade", () => {
    for (const [valor, esperado] of [
      [0, "quantity_not_positive"],
      [-1, "quantity_not_positive"],
      [Number.NaN, "quantity_not_finite"],
    ] as const) {
      const resultado = resolveExactIdentity(produto({ quantity_value: valor }));
      expect(resultado.status).toBe("incomplete");
      if (resultado.status === "incomplete") {
        expect(resultado.gaps).toContain(esperado);
      }
    }
  });
});

describe("resolveExactIdentity — compatibilidade com o modelo legado", () => {
  it("não olha para size_text: um produto do modelo de hoje volta incompleto", () => {
    // É a resposta certa, não uma limitação. Afirmar "identidade resolvida" a partir de
    // texto livre é exatamente a inferência que o princípio 3 proíbe.
    const legado: IdentityInput = {
      name: "Café",
      brand: "Pilão",
      variant: "Tradicional",
      package_type: null,
      quantity_value: null,
      quantity_unit: null,
    };
    expect(resolveExactIdentity(legado).status).toBe("incomplete");
  });

  it("o fixture demo continua válido e continua sem identidade exata", () => {
    // Nenhum campo novo é obrigatório: o fixture não muda e não quebra.
    for (const achado of buildDemoOpportunities(new Date("2026-08-03T12:00:00Z"))) {
      expect(achado.product.size_text).toBeTruthy();
      expect(resolveExactIdentity(achado.product).status).toBe("incomplete");
    }
  });
});

describe("identityKey", () => {
  it("não depende da ordem em que as propriedades foram escritas", () => {
    const a = resolvido({
      name: "Café",
      brand: "Pilão",
      variant: "Tradicional",
      package_type: "unidade",
      quantity_value: 500,
      quantity_unit: "g",
    });
    const b = resolvido({
      quantity_unit: "g",
      quantity_value: 500,
      package_type: "unidade",
      variant: "Tradicional",
      brand: "Pilão",
      name: "Café",
    });
    expect(identityKey(a)).toBe(identityKey(b));
  });

  it("não junta campos vizinhos: ('ab', 'c') difere de ('a', 'bc')", () => {
    const esquerda = resolvido(produto({ name: "ab", brand: "c" }));
    const direita = resolvido(produto({ name: "a", brand: "bc" }));
    expect(identityKey(esquerda)).not.toBe(identityKey(direita));
  });

  it("500 g e 0,5 kg produzem a mesma chave", () => {
    const emGramas = resolvido(produto({ quantity_value: 500, quantity_unit: "g" }));
    const emQuilos = resolvido(produto({ quantity_value: 0.5, quantity_unit: "kg" }));
    expect(identityKey(emGramas)).toBe(identityKey(emQuilos));
  });

  it("500 g e 500 ml produzem chaves diferentes", () => {
    const massa = resolvido(produto({ quantity_value: 500, quantity_unit: "g" }));
    const volume = resolvido(produto({ quantity_value: 500, quantity_unit: "ml" }));
    expect(identityKey(massa)).not.toBe(identityKey(volume));
  });
});

describe("sameExactIdentity e sameProductLine", () => {
  const base = resolvido(produto());

  it("identidade igual em todos os campos é a mesma", () => {
    expect(sameExactIdentity(base, resolvido(produto()))).toBe(true);
  });

  it.each([
    ["marca", { brand: "Melitta" }],
    ["variante", { variant: "Extraforte" }],
    ["embalagem", { package_type: "sache" as PackageType }],
    ["quantidade", { quantity_value: 250 }],
    ["nome", { name: "Chá" }],
  ])("%s diferente não é a mesma identidade", (_rotulo, override) => {
    expect(sameExactIdentity(base, resolvido(produto(override)))).toBe(false);
  });

  it("mesma linha de produto ignora a quantidade e só a quantidade", () => {
    expect(sameProductLine(base, resolvido(produto({ quantity_value: 250 })))).toBe(true);
    expect(sameProductLine(base, resolvido(produto({ variant: "Extraforte" })))).toBe(false);
    expect(sameProductLine(base, resolvido(produto({ package_type: "pack" })))).toBe(false);
  });
});
