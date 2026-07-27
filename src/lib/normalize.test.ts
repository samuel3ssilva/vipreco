import { describe, expect, it } from "vitest";
import { buildSearchTerms, looksLikeGtin, normalizeSearchText } from "@/lib/normalize";
import { formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";

describe("normalizeSearchText", () => {
  it("remove acentos e caixa alta", () => {
    expect(normalizeSearchText("Café Torrado AÇÚCAR")).toBe("cafe torrado acucar");
  });

  it("colapsa espaços extras", () => {
    expect(normalizeSearchText("  arroz   branco ")).toBe("arroz branco");
  });
});

describe("buildSearchTerms", () => {
  it("separa palavras relevantes", () => {
    expect(buildSearchTerms("Arroz Tio 5 kg")).toContain("arroz");
  });
});

describe("looksLikeGtin", () => {
  it("reconhece código de barras", () => {
    expect(looksLikeGtin("7891234567895")).toBe(true);
  });

  it("não confunde texto com código", () => {
    expect(looksLikeGtin("café 500 g")).toBe(false);
  });
});

describe("formatação", () => {
  it("formata preço em reais", () => {
    expect(formatPrice(12.9).replace(/\u00a0/g, " ")).toBe("R$ 12,90");
  });

  it("monta nome completo do produto", () => {
    expect(
      formatProductName({
        name: "Café",
        brand: "Bom Dia",
        variant: "Tradicional",
        size_text: "500 g",
      }),
    ).toBe("Café Bom Dia Tradicional 500 g");
  });

  it("descreve datas de forma simples", () => {
    const now = new Date("2026-07-27T12:00:00Z");
    expect(formatRelativeDay("2026-07-27T09:00:00Z", now)).toBe("hoje");
    expect(formatRelativeDay("2026-07-26T09:00:00Z", now)).toBe("ontem");
    expect(formatRelativeDay("2026-07-20T09:00:00Z", now)).toBe("há 7 dias");
  });
});
