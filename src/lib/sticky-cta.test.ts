import { describe, expect, it } from "vitest";
import { shouldShowStickyCta } from "@/lib/sticky-cta";

describe("CTA fixo do mobile", () => {
  it("aparece quando nenhum CTA equivalente está na tela", () => {
    expect(shouldShowStickyCta([{ isIntersecting: false }])).toBe(true);
    expect(shouldShowStickyCta([{ isIntersecting: false }, { isIntersecting: false }])).toBe(true);
  });

  it("some quando o CTA da primeira dobra aparece", () => {
    expect(shouldShowStickyCta([{ isIntersecting: true }])).toBe(false);
  });

  it("some quando qualquer CTA equivalente aparece, não só o primeiro", () => {
    expect(shouldShowStickyCta([{ isIntersecting: false }, { isIntersecting: true }])).toBe(false);
    expect(shouldShowStickyCta([{ isIntersecting: true }, { isIntersecting: false }])).toBe(false);
  });

  it("nunca deixa dois CTAs idênticos na mesma tela", () => {
    // Exaustivo em três CTAs: basta um visível para o fixo sumir.
    for (const a of [false, true]) {
      for (const b of [false, true]) {
        for (const c of [false, true]) {
          const entradas = [a, b, c].map((isIntersecting) => ({ isIntersecting }));
          expect(shouldShowStickyCta(entradas)).toBe(!(a || b || c));
        }
      }
    }
  });

  it("sem nenhum CTA no fluxo, o fixo é a única entrada e fica visível", () => {
    expect(shouldShowStickyCta([])).toBe(true);
  });
});
