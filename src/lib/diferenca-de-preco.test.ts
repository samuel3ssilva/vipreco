import { describe, expect, it } from "vitest";
import { diferencaParaOSegundo } from "./diferenca-de-preco";
import type { OfertaCardV2 } from "./card-v2";

/**
 * §12 do mandato de polish — a microinformação de diferença só existe quando é um FATO:
 * mesmo produto, mesma quantidade, aritmética determinística de centavos, nenhuma palavra
 * promocional. Estes testes fixam as quatro saídas nulas e as duas frases possíveis.
 */

const oferta = (price: number): OfertaCardV2 => ({ price }) as OfertaCardV2;

const EMBALADO = { embalagensDiferentes: false, granel: false, gramas: 500 };
const GRANEL = { embalagensDiferentes: false, granel: true, gramas: 500 };

describe("diferencaParaOSegundo", () => {
  it("embalagem igual: a diferença é entre os preços de prateleira", () => {
    expect(diferencaParaOSegundo([oferta(14.9), oferta(15.9)], EMBALADO)).toBe(
      "R$ 1,00 a menos que o 2º mercado",
    );
  });

  it("granel: a diferença acompanha a quantidade do seletor, com a conta de centavos", () => {
    // Bucho da planilha: 24,99/kg × 25,99/kg. Em 500 g: 12,50 × 13,00.
    expect(diferencaParaOSegundo([oferta(24.99), oferta(25.99)], GRANEL)).toBe(
      "R$ 0,50 a menos que o 2º mercado em 500 g",
    );
    // Em 250 g o arredondamento monetário muda os dois lados: 6,25 × 6,50.
    expect(diferencaParaOSegundo([oferta(24.99), oferta(25.99)], { ...GRANEL, gramas: 250 })).toBe(
      "R$ 0,25 a menos que o 2º mercado em 250 g",
    );
  });

  it("nunca em grupos de embalagens diferentes — quantidades diferentes não têm 'diferença de preço'", () => {
    expect(
      diferencaParaOSegundo([oferta(7.9), oferta(5.95)], {
        embalagensDiferentes: true,
        granel: false,
        gramas: 500,
      }),
    ).toBeNull();
  });

  it("nunca com menos de dois mercados, e nunca no empate", () => {
    expect(diferencaParaOSegundo([oferta(14.9)], EMBALADO)).toBeNull();
    expect(diferencaParaOSegundo([], EMBALADO)).toBeNull();
    expect(diferencaParaOSegundo([oferta(14.9), oferta(14.9)], EMBALADO)).toBeNull();
  });

  it("nenhuma palavra promocional — a frase é fato, não apelo", () => {
    const frase = diferencaParaOSegundo([oferta(10), oferta(12)], EMBALADO)!;
    for (const proibida of ["economize", "melhor oferta", "imperdível", "mais barato"]) {
      expect(frase.toLowerCase()).not.toContain(proibida);
    }
  });
});
