import { describe, expect, it } from "vitest";
import { parseSizeText, provenanceOf } from "@/lib/size-text";
import { normalizeQuantity } from "@/lib/quantity";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";

function lido(texto: string) {
  const resultado = parseSizeText(texto);
  if (resultado.status !== "parsed") {
    throw new Error(`esperava leitura para ${JSON.stringify(texto)}, veio ${resultado.status}`);
  }
  return resultado;
}

describe("parseSizeText — massa e volume", () => {
  it.each([
    ["500 g", 500, "g"],
    ["500  g", 500, "g"],
    ["500g", 500, "g"],
    [" 500 g ", 500, "g"],
    ["500 G", 500, "g"],
    ["500 gramas", 500, "g"],
    ["5 kg", 5, "kg"],
    ["1,5 kg", 1.5, "kg"],
    ["1.5 kg", 1.5, "kg"],
    ["1 L", 1, "l"],
    ["1L", 1, "l"],
    ["1 litro", 1, "l"],
    ["900 ml", 900, "ml"],
    ["900ML", 900, "ml"],
  ] as const)("lê %s", (texto, valor, unidade) => {
    const resultado = lido(texto);
    expect(resultado.quantity).toEqual({ value: valor, unit: unidade });
    expect(resultado.method).toBe("value_unit");
    expect(resultado.raw).toBe(texto);
  });

  it("preserva sempre o texto original, mesmo com espaço e caixa", () => {
    expect(lido("  1,5 KG ").raw).toBe("  1,5 KG ");
  });

  it("`500 g` e `500g` convergem depois da conversão — que é o ponto de E1", () => {
    // O contrato de normalização de texto não colapsa o espaço entre número e unidade de
    // propósito (PRODUCT-IDENTIFIERS §2). A convergência acontece aqui, por estrutura.
    const comEspaco = normalizeQuantity(lido("500 g").quantity);
    const semEspaco = normalizeQuantity(lido("500g").quantity);
    expect(comEspaco).toEqual(semEspaco);
  });
});

describe("parseSizeText — contagem", () => {
  it.each([
    ["12 rolos", 12, "pack", 12],
    ["10 cápsulas", 10, "pack", 10],
    ["10 capsulas", 10, "pack", 10],
    ["4 sachês", 4, "pack", 4],
  ] as const)("%s vira contagem com sugestão de pack", (texto, valor, hint, itens) => {
    const resultado = lido(texto);
    expect(resultado.quantity).toEqual({ value: valor, unit: "un" });
    expect(resultado.packageHint).toBe(hint);
    expect(resultado.unitsPerPackage).toBe(itens);
    expect(resultado.method).toBe("count_word");
  });

  it("`6 unidades` conta, mas não sugere embalagem", () => {
    // "unidade" não diz nada sobre a embalagem, e embalagem é campo de identidade.
    const resultado = lido("6 unidades");
    expect(resultado.quantity).toEqual({ value: 6, unit: "un" });
    expect(resultado.packageHint).toBeNull();
  });

  it("um item só não vira pack", () => {
    expect(lido("1 rolo").packageHint).toBeNull();
  });

  it.each(["1 dúzia", "1 duzia", "dúzia"])("%s vira doze unidades", (texto) => {
    const resultado = lido(texto);
    expect(resultado.quantity).toEqual({ value: 12, unit: "un" });
    expect(resultado.method).toBe("dozen");
    expect(resultado.unitsPerPackage).toBe(12);
  });

  it("duas dúzias são vinte e quatro", () => {
    expect(lido("2 dúzias").quantity).toEqual({ value: 24, unit: "un" });
  });
});

describe("parseSizeText — pack multiplicado", () => {
  it.each(["6 x 350 ml", "6x350ml", "6 × 350 ml"])("%s vira 2100 ml com 6 itens", (texto) => {
    const resultado = lido(texto);
    expect(resultado.quantity).toEqual({ value: 2100, unit: "ml" });
    expect(resultado.unitsPerPackage).toBe(6);
    expect(resultado.packageHint).toBe("pack");
    expect(resultado.method).toBe("multiplied_pack");
  });

  it("multiplicação com palavra contável também fecha", () => {
    const resultado = lido("2 x 6 unidades");
    expect(resultado.quantity).toEqual({ value: 12, unit: "un" });
    expect(resultado.unitsPerPackage).toBe(12);
  });
});

describe("parseSizeText — ambiguidade preservada", () => {
  it.each([
    ["peso variável", "variable_weight"],
    ["Peso Variavel", "variable_weight"],
    ["a granel", "variable_weight"],
    ["aprox. 1 kg", "variable_weight"],
    ["cerca de 500 g", "variable_weight"],
    ["1 kg a 1,2 kg", "variable_weight"],
    ["500 a 600 g", "variable_weight"],
    ["1-2 kg", "variable_weight"],
    ["500 g e 200 ml", "multiple_readings"],
    ["500 g 12 un", "multiple_readings"],
    ["12", "unit_missing"],
  ] as const)("%s fica ambíguo (%s)", (texto, motivo) => {
    const resultado = parseSizeText(texto);
    expect(resultado.status).toBe("ambiguous");
    if (resultado.status === "ambiguous") expect(resultado.ambiguity).toBe(motivo);
  });

  it("peso variável nunca vira peso fixo, mesmo com número e unidade no texto", () => {
    const resultado = parseSizeText("aprox. 1 kg");
    expect(resultado.status).not.toBe("parsed");
  });
});

describe("parseSizeText — texto que não sustenta quantidade", () => {
  it.each([
    ["caixa", "no_quantity"],
    ["unidade", "no_quantity"],
    ["tamanho único", "no_quantity"],
    ["embalagem econômica", "no_quantity"],
    ["1 conjunto", "unknown_unit"],
    ["3 pedaços", "unknown_unit"],
  ] as const)("%s não é suportado (%s)", (texto, motivo) => {
    const resultado = parseSizeText(texto);
    expect(resultado.status).toBe("unsupported");
    if (resultado.status === "unsupported") expect(resultado.unsupported).toBe(motivo);
  });

  it("unidade fora das cinco não é convertida por analogia", () => {
    // "oz", "lb" e "cm3" existem no mundo e não existem no contrato. Inventar fator de
    // conversão aqui seria decidir escopo de produto dentro de um parser.
    for (const texto of ["16 oz", "2 lb"]) {
      const resultado = parseSizeText(texto);
      expect(resultado.status).toBe("unsupported");
      if (resultado.status === "unsupported") expect(resultado.unsupported).toBe("unknown_unit");
    }
    // "500 cm3" cai como ambíguo em vez de não suportado, porque o "3" colado conta como
    // um segundo número. O motivo muda; o que não muda é o que importa: nenhuma leitura
    // é produzida, e ninguém precisa confiar em qual das duas rejeições saiu.
    expect(parseSizeText("500 cm3").status).not.toBe("parsed");
  });
});

describe("parseSizeText — ausência", () => {
  it.each([null, undefined, "", "   "])("%s é ausência, não erro", (texto) => {
    expect(parseSizeText(texto)).toEqual({ status: "missing" });
  });
});

describe("parseSizeText — invariantes", () => {
  it("nunca devolve `confirmed`: aprovação é humana, não aritmética", () => {
    const textos = ["500 g", "12 rolos", "1 dúzia", "6 x 350 ml", "peso variável", "caixa", ""];
    for (const texto of textos) {
      expect(provenanceOf(parseSizeText(texto))).not.toBe("confirmed");
    }
  });

  it("é determinístico: a mesma entrada dá a mesma saída", () => {
    const textos = ["500 g", "12 rolos", "6 x 350 ml", "500 g e 200 ml", "1 conjunto"];
    for (const texto of textos) {
      const primeira = JSON.stringify(parseSizeText(texto));
      for (let i = 0; i < 5; i++) {
        expect(JSON.stringify(parseSizeText(texto))).toBe(primeira);
      }
    }
  });

  it("toda leitura bem-sucedida sobrevive à normalização de quantidade", () => {
    const textos = ["500 g", "5 kg", "1 L", "900 ml", "12 rolos", "1 dúzia", "6 x 350 ml"];
    for (const texto of textos) {
      expect(normalizeQuantity(lido(texto).quantity).status).toBe("ok");
    }
  });
});

describe("parseSizeText — os sete produtos do seed fictício", () => {
  it.each([
    ["5 kg", 5000, "g"],
    ["500 g", 500, "g"],
    ["1 L", 1000, "ml"],
    ["900 ml", 900, "ml"],
    ["500 ml", 500, "ml"],
    ["12 rolos", 12, "un"],
    ["250 g", 250, "g"],
  ] as const)("%s → %s %s normalizado", (texto, valor, unidade) => {
    const normalizado = normalizeQuantity(lido(texto).quantity);
    expect(normalizado).toEqual({ status: "ok", quantity: { value: valor, unit: unidade } });
  });

  it("o fixture demo é legível de ponta a ponta, e continua sem virar identidade", () => {
    for (const achado of buildDemoOpportunities(new Date("2026-08-03T12:00:00Z"))) {
      expect(parseSizeText(achado.product.size_text).status).toBe("parsed");
      // A leitura não escreve em lugar nenhum: o produto continua sem campo estruturado.
      expect(achado.product.quantity_value).toBeUndefined();
      expect(achado.product.package_type).toBeUndefined();
    }
  });
});
