import { describe, expect, it } from "vitest";
import { classifyRelation, keepExact, type EquivalenceInput } from "@/lib/equivalence";

/** Café Pilão Tradicional 500 g, unidade, com GTIN bem formado. */
function cafe(overrides: Partial<EquivalenceInput> = {}): EquivalenceInput {
  return {
    name: "Café",
    brand: "Pilão",
    variant: "Tradicional",
    package_type: "unidade",
    quantity_value: 500,
    quantity_unit: "g",
    category: "Mercearia",
    gtin: null,
    ...overrides,
  };
}

describe("EXATO", () => {
  it("mesma tupla é exato e é comparável", () => {
    expect(classifyRelation(cafe(), cafe())).toEqual({
      relation: "exact",
      reason: "same_identity",
      comparable: true,
    });
  });

  it("a normalização faz `CAFÉ` e `  café ` serem o mesmo item", () => {
    const resultado = classifyRelation(cafe({ name: "CAFÉ" }), cafe({ name: "  café " }));
    expect(resultado.relation).toBe("exact");
  });

  it("500 g e 0,5 kg são o mesmo item — a convergência é por estrutura", () => {
    const resultado = classifyRelation(
      cafe({ quantity_value: 500, quantity_unit: "g" }),
      cafe({ quantity_value: 0.5, quantity_unit: "kg" }),
    );
    expect(resultado.relation).toBe("exact");
  });

  it("categoria diferente não desfaz identidade — categoria não é identidade", () => {
    const resultado = classifyRelation(cafe(), cafe({ category: "Bebidas" }));
    expect(resultado.relation).toBe("exact");
  });

  it("GTIN ausente não impede exato quando os atributos batem", () => {
    expect(classifyRelation(cafe({ gtin: null }), cafe({ gtin: null })).relation).toBe("exact");
  });

  it("a ordem dos argumentos não muda a resposta", () => {
    const a = cafe();
    const b = cafe({ quantity_value: 250 });
    expect(classifyRelation(a, b).relation).toBe(classifyRelation(b, a).relation);
  });
});

describe("OUTRO TAMANHO", () => {
  it("mesma linha com quantidade diferente", () => {
    expect(classifyRelation(cafe(), cafe({ quantity_value: 250 }))).toEqual({
      relation: "other_size",
      reason: "quantity_differs",
      comparable: false,
    });
  });

  it("pack de 12 rolos e pack de 4 rolos (§4.4)", () => {
    const papel = (rolos: number): EquivalenceInput => ({
      name: "Papel Higiênico",
      brand: "Neve",
      variant: "Folha Dupla",
      package_type: "pack",
      quantity_value: rolos,
      quantity_unit: "un",
      category: "Higiene",
      gtin: null,
    });
    expect(classifyRelation(papel(12), papel(4)).relation).toBe("other_size");
  });

  it("reformulação silenciosa: mesmo GTIN, 1 L virou 900 ml (§4.5)", () => {
    // A quantidade vence o GTIN. Se o código mandasse, a comparação apresentaria 900 ml e
    // 1 L como o mesmo item exatamente onde o consumidor mais precisa dela.
    const oleo = (valor: number, unidade: "l" | "ml"): EquivalenceInput => ({
      name: "Óleo de Soja",
      brand: "Liza",
      variant: "Tradicional",
      package_type: "garrafa",
      quantity_value: valor,
      quantity_unit: unidade,
      category: "Mercearia",
      gtin: "7896036090015",
    });
    expect(classifyRelation(oleo(1, "l"), oleo(900, "ml"))).toEqual({
      relation: "other_size",
      reason: "reformulated_gtin",
      comparable: false,
    });
  });

  it("outro tamanho **não** é comparável na lista orgânica", () => {
    expect(classifyRelation(cafe(), cafe({ quantity_value: 250 })).comparable).toBe(false);
  });
});

describe("SIMILAR — as seis ambiguidades de D6", () => {
  it.each([
    ["marca própria de redes diferentes (§4.1)", { brand: "Marca da Rede B" }, "brand_differs"],
    ["variante que muda o produto (§4.2)", { variant: "Extraforte" }, "variant_differs"],
    ["embalagem diferente (§4.6)", { package_type: "sache" as const }, "package_differs"],
    ["nome diferente na mesma categoria", { name: "Chá" }, "name_differs"],
  ])("%s é SIMILAR", (_rotulo, override, motivo) => {
    expect(classifyRelation(cafe(), cafe(override))).toEqual({
      relation: "similar",
      reason: motivo,
      comparable: false,
    });
  });

  it("vidro, sachê e lata com o mesmo conteúdo não se comparam entre si", () => {
    const extrato = (embalagem: "vidro" | "sache" | "lata"): EquivalenceInput => ({
      name: "Extrato de Tomate",
      brand: "Elefante",
      variant: "Tradicional",
      package_type: embalagem,
      quantity_value: 340,
      quantity_unit: "g",
      category: "Mercearia",
      gtin: null,
    });
    for (const par of [
      ["vidro", "sache"],
      ["vidro", "lata"],
      ["sache", "lata"],
    ] as const) {
      const resultado = classifyRelation(extrato(par[0]), extrato(par[1]));
      expect(resultado.relation).toBe("similar");
      expect(resultado.comparable).toBe(false);
    }
  });

  it("pack e unidade não são exatos", () => {
    const resultado = classifyRelation(
      cafe({ package_type: "pack", quantity_value: 6, quantity_unit: "un" }),
      cafe({ package_type: "unidade", quantity_value: 6, quantity_unit: "un" }),
    );
    expect(resultado.relation).toBe("similar");
    expect(resultado.comparable).toBe(false);
  });

  it("similaridade textual não confirma igualdade", () => {
    // "Café Pilão Tradicional" e "Café Pilão Tradicional Torrado e Moído" se parecem, e
    // parecer não é ser.
    const resultado = classifyRelation(cafe(), cafe({ name: "Café Torrado e Moído" }));
    expect(resultado.relation).not.toBe("exact");
  });
});

describe("sem relação", () => {
  it("categoria diferente e identidade diferente não é nem similar", () => {
    expect(classifyRelation(cafe(), cafe({ brand: "Ypê", category: "Limpeza" }))).toEqual({
      relation: "unrelated",
      reason: "category_differs",
      comparable: false,
    });
  });

  it("categoria ausente nos dois lados não cria categoria comum", () => {
    const resultado = classifyRelation(
      cafe({ category: null }),
      cafe({ category: null, brand: "Melitta" }),
    );
    expect(resultado.relation).toBe("unrelated");
  });
});

describe("GTIN — conflito e discordância", () => {
  it("mesmo GTIN em itens de marcas diferentes é conflito, não identidade", () => {
    expect(
      classifyRelation(
        cafe({ gtin: "7896006711117" }),
        cafe({ gtin: "7896006711117", brand: "Melitta" }),
      ),
    ).toEqual({
      relation: "gtin_conflict",
      reason: "gtin_shared_by_different_items",
      comparable: false,
    });
  });

  it("tupla igual com GTINs diferentes não é unido automaticamente", () => {
    expect(
      classifyRelation(cafe({ gtin: "7896006711117" }), cafe({ gtin: "7898080640611" })),
    ).toEqual({
      relation: "undetermined",
      reason: "gtin_disagreement",
      comparable: false,
    });
  });

  it("GTIN inválido não é usado como prova de nada", () => {
    // Dois códigos reprovados no dígito verificador não fazem os itens serem o mesmo,
    // nem impedem que a tupla decida.
    const resultado = classifyRelation(
      cafe({ gtin: "7896089012345" }),
      cafe({ gtin: "7896089012345" }),
    );
    expect(resultado.relation).toBe("exact");
    expect(resultado.reason).toBe("same_identity");
  });

  it("13 e 14 dígitos do mesmo número são códigos diferentes", () => {
    const resultado = classifyRelation(
      cafe({ gtin: "7896006711117" }),
      cafe({ gtin: "07896006711117" }),
    );
    expect(resultado.relation).toBe("undetermined");
  });
});

describe("indeterminado — falta de dado estruturado", () => {
  it("produto sem quantidade estruturada não recebe veredito", () => {
    const legado = cafe({ package_type: null, quantity_value: null, quantity_unit: null });
    expect(classifyRelation(legado, cafe())).toEqual({
      relation: "undetermined",
      reason: "identity_incomplete",
      comparable: false,
    });
  });

  it("peso variável fica indeterminado, e é o comportamento certo (§4.3)", () => {
    const carne: EquivalenceInput = {
      name: "Alcatra",
      brand: null,
      variant: null,
      package_type: null,
      quantity_value: null,
      quantity_unit: null,
      category: "Açougue",
      gtin: null,
    };
    expect(classifyRelation(carne, carne).relation).toBe("undetermined");
  });
});

describe("keepExact — a regra vira uma linha chamável", () => {
  it("nenhum SIMILAR, OUTRO TAMANHO ou indeterminado sobrevive ao filtro", () => {
    const candidatos = [
      cafe(),
      cafe({ quantity_value: 250 }),
      cafe({ variant: "Extraforte" }),
      cafe({ package_type: "sache" }),
      cafe({ brand: "Ypê", category: "Limpeza" }),
      cafe({ quantity_value: null, quantity_unit: null }),
      cafe({ quantity_value: 0.5, quantity_unit: "kg" }),
    ];
    const exatos = keepExact(cafe(), candidatos);
    expect(exatos).toHaveLength(2);
    for (const exato of exatos) {
      expect(classifyRelation(cafe(), exato).relation).toBe("exact");
    }
  });

  it("lista vazia continua vazia", () => {
    expect(keepExact(cafe(), [])).toEqual([]);
  });

  it("é determinístico entre execuções", () => {
    const candidatos = [cafe(), cafe({ quantity_value: 250 }), cafe({ variant: "Extraforte" })];
    const primeira = JSON.stringify(keepExact(cafe(), candidatos));
    for (let i = 0; i < 5; i++) {
      expect(JSON.stringify(keepExact(cafe(), candidatos))).toBe(primeira);
    }
  });
});
