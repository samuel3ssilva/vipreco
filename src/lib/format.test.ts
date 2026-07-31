import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatPrice,
  formatPriceParts,
  formatProductName,
  formatRelativeDay,
  spokenPrice,
} from "@/lib/format";

describe("formatDate", () => {
  // O Worker roda em UTC e o navegador do visitante normalmente em America/Sao_Paulo (UTC-3).
  // Com a data renderizada no servidor, os dois lados precisam produzir a mesma string — senão a
  // hidratação diverge e o visitante vê um dia que não é o do mercado.
  it("usa o fuso do piloto, não o fuso do dispositivo", () => {
    // 01:00 UTC do dia 31 ainda é dia 30 em São Paulo.
    expect(formatDate("2026-07-31T01:00:00.000Z")).toBe("30/07/2026");
    expect(formatDate("2026-07-31T12:00:00.000Z")).toBe("31/07/2026");
  });

  it("é estável para o mesmo instante, independente de quantas vezes é chamado", () => {
    const instante = "2026-07-31T02:59:59.000Z";
    expect(formatDate(instante)).toBe(formatDate(new Date(instante)));
  });
});

describe("formatRelativeDay", () => {
  const agora = new Date("2026-07-31T02:30:00.000Z");

  it("conta dias corridos a partir da referência recebida", () => {
    expect(formatRelativeDay(new Date(agora.getTime()), agora)).toBe("hoje");
    expect(formatRelativeDay(new Date(agora.getTime() - 86_400_000), agora)).toBe("ontem");
    expect(formatRelativeDay(new Date(agora.getTime() - 3 * 86_400_000), agora)).toBe("há 3 dias");
  });
});

describe("formatPrice e formatProductName", () => {
  it("formata preço em reais", () => {
    // O separador entre "R$" e o número é um espaço não separável — a asserção não depende dele.
    expect(formatPrice(26.49)).toMatch(/^R\$\s26,49$/);
  });

  it("junta nome, marca, variante e tamanho", () => {
    expect(
      formatProductName({ name: "Arroz", brand: "Camil", variant: "Tipo 1", size_text: "5 kg" }),
    ).toBe("Arroz Camil Tipo 1 5 kg");
  });
});

describe("formatPriceParts (tipografia do card oficial)", () => {
  it("separa o símbolo do valor, sem perder nada do preço", () => {
    expect(formatPriceParts(26.49)).toEqual({ currency: "R$", amount: "26,49" });
    expect(formatPriceParts(5.29)).toEqual({ currency: "R$", amount: "5,29" });
  });

  it("mantém os centavos mesmo quando são zero", () => {
    expect(formatPriceParts(7).amount).toBe("7,00");
  });

  it("recompõe exatamente o mesmo texto de formatPrice", () => {
    for (const valor of [0.99, 5.29, 17.49, 26.49, 1234.5]) {
      const { currency, amount } = formatPriceParts(valor);
      expect(`${currency} ${amount}`.replace(/\s/g, "")).toBe(
        formatPrice(valor).replace(/\s/g, ""),
      );
    }
  });
});

describe("spokenPrice (preço para leitor de tela)", () => {
  it("diz reais e centavos por extenso", () => {
    expect(spokenPrice(26.49)).toBe("26 reais e 49 centavos");
    expect(spokenPrice(5.29)).toBe("5 reais e 29 centavos");
  });

  it("omite os centavos quando são zero", () => {
    expect(spokenPrice(7)).toBe("7 reais");
  });

  it("usa o singular onde cabe", () => {
    expect(spokenPrice(1)).toBe("1 real");
    expect(spokenPrice(2.01)).toBe("2 reais e 1 centavo");
  });
});
