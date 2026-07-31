import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";

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
