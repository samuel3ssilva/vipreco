import { describe, expect, it } from "vitest";
import { assessGtin, gtinCheckDigit, isGtinWellFormed, sameGtin } from "@/lib/gtin";

describe("gtinCheckDigit", () => {
  it("calcula o dígito verificador GS1 de um EAN-13", () => {
    // 7896006711117 -> corpo 789600671111, verificador 7
    expect(gtinCheckDigit("789600671111")).toBe(7);
  });

  it("usa o mesmo algoritmo em 8, 12 e 14 dígitos", () => {
    expect(gtinCheckDigit("4006381")).toBe(2);
    expect(assessGtin("40063812").state).toBe("unverified");
    expect(assessGtin("614141000036").state).toBe("unverified");
    expect(assessGtin("07896006711117").state).toBe("unverified");
  });
});

describe("assessGtin — ausência", () => {
  it("null e undefined são `absent`, não erro", () => {
    expect(assessGtin(null)).toEqual({ state: "absent" });
    expect(assessGtin(undefined)).toEqual({ state: "absent" });
  });

  it("string vazia é `absent`; string só com espaço é `invalid`", () => {
    // A diferença importa: a segunda é dado sujo que alguém precisa ver.
    expect(assessGtin("")).toEqual({ state: "absent" });
    expect(assessGtin("   ")).toEqual({ state: "invalid", raw: "   ", rejection: "empty" });
  });
});

describe("assessGtin — zeros à esquerda", () => {
  it("preserva o zero à esquerda no valor devolvido", () => {
    const resultado = assessGtin("07896006711117");
    expect(resultado).toEqual({ state: "unverified", value: "07896006711117", length: 14 });
  });

  it("um GTIN só de zeros continua sendo texto, não vira 0", () => {
    const resultado = assessGtin("0000000000000");
    expect(resultado.state).toBe("unverified");
    if (resultado.state === "unverified") {
      expect(resultado.value).toBe("0000000000000");
      expect(typeof resultado.value).toBe("string");
    }
  });

  it("nunca converte para número em ponto nenhum do caminho", () => {
    const resultado = assessGtin("00000000");
    if (resultado.state === "unverified") {
      // Se em algum momento houvesse `Number(...)`, "00000000" viraria 0 e depois "0".
      expect(resultado.value).toHaveLength(8);
    } else {
      throw new Error("esperava um GTIN-8 bem formado");
    }
  });
});

describe("assessGtin — rejeições", () => {
  it("rejeita caractere que não é dígito", () => {
    expect(assessGtin("789600671111X")).toMatchObject({ rejection: "non_digit" });
    expect(assessGtin("7896-0067-1111-7")).toMatchObject({ rejection: "non_digit" });
    expect(assessGtin("789 600 671 111 7")).toMatchObject({ rejection: "non_digit" });
  });

  it("rejeita dígito não-ASCII que `parseInt` aceitaria", () => {
    // Dígitos árabe-índicos. `Number("١٢٣")` é 123 em JavaScript.
    expect(assessGtin("١٢٣٤٥٦٧٨").state).toBe("invalid");
  });

  it("rejeita comprimento fora de {8, 12, 13, 14}", () => {
    expect(assessGtin("1234567")).toMatchObject({ rejection: "unsupported_length" });
    expect(assessGtin("1234567890")).toMatchObject({ rejection: "unsupported_length" });
    expect(assessGtin("123456789012345")).toMatchObject({ rejection: "unsupported_length" });
  });

  it("rejeita dígito verificador errado", () => {
    expect(assessGtin("7896006711118")).toMatchObject({ rejection: "check_digit" });
  });

  it("aceita espaço nas pontas, porque colar código traz espaço junto", () => {
    expect(assessGtin("  7896006711117 ")).toMatchObject({
      state: "unverified",
      value: "7896006711117",
    });
  });
});

describe("assessGtin — checksum válido não é identidade confirmada", () => {
  it("o melhor estado alcançável por função pura é `unverified`", () => {
    // `verified` depende de alguém ter olhado a embalagem. Nenhuma entrada de texto,
    // por mais bem formada que seja, produz esse estado — é a tradução em tipo da regra
    // "checksum válido não comprova sozinho identidade" (PRODUCT-IDENTIFIERS §3).
    const bemFormados = ["7896006711117", "07896006711117", "40063812", "614141000036"];
    for (const codigo of bemFormados) {
      expect(assessGtin(codigo).state).toBe("unverified");
      expect(assessGtin(codigo).state).not.toBe("verified");
    }
  });
});

describe("isGtinWellFormed e sameGtin", () => {
  it("isGtinWellFormed responde só sobre a forma", () => {
    expect(isGtinWellFormed("7896006711117")).toBe(true);
    expect(isGtinWellFormed("7896006711118")).toBe(false);
    expect(isGtinWellFormed(null)).toBe(false);
  });

  it("sameGtin compara texto: 13 e 14 dígitos são códigos diferentes", () => {
    expect(sameGtin("7896006711117", "7896006711117")).toBe(true);
    expect(sameGtin(" 7896006711117", "7896006711117 ")).toBe(true);
    // Ambos bem formados, e ainda assim códigos distintos.
    expect(isGtinWellFormed("07896006711117")).toBe(true);
    expect(sameGtin("07896006711117", "7896006711117")).toBe(false);
  });

  it("dois GTINs ausentes não são o mesmo GTIN", () => {
    // Ausência não é igualdade. Se fosse, todo produto sem código de barras seria o
    // mesmo produto.
    expect(sameGtin(null, null)).toBe(false);
    expect(sameGtin("", "")).toBe(false);
  });

  it("GTIN inválido nunca é igual a nada, nem a si mesmo", () => {
    expect(sameGtin("7896006711118", "7896006711118")).toBe(false);
  });
});
