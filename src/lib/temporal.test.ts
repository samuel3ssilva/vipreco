import { describe, expect, it } from "vitest";
import { TEMPORAL_STYLE, temporalState } from "@/lib/temporal";

const AGORA = new Date("2026-07-31T12:00:00.000Z");
const DIA = 86_400_000;

function emDias(dias: number): string {
  return new Date(AGORA.getTime() + dias * DIA).toISOString();
}

describe("estado temporal do preço", () => {
  it("com validade distante, o preço está vigente", () => {
    expect(temporalState({ observed_at: emDias(-1), valid_until: emDias(10) }, AGORA)).toBe(
      "vigente",
    );
  });

  it("com validade em até 3 dias, avisa que termina em breve", () => {
    expect(temporalState({ observed_at: emDias(-1), valid_until: emDias(2) }, AGORA)).toBe(
      "termina-em-breve",
    );
    expect(temporalState({ observed_at: emDias(-1), valid_until: emDias(3) }, AGORA)).toBe(
      "termina-em-breve",
    );
  });

  it("com validade vencida, o preço está expirado", () => {
    expect(temporalState({ observed_at: emDias(-9), valid_until: emDias(-1) }, AGORA)).toBe(
      "expirado",
    );
  });

  it("sem validade informada, decide apenas pela data de observação", () => {
    expect(temporalState({ observed_at: emDias(-2), valid_until: null }, AGORA)).toBe("vigente");
    expect(temporalState({ observed_at: emDias(-8), valid_until: null }, AGORA)).toBe(
      "sem-validade-antigo",
    );
  });

  it("nunca inventa validade: ausência de valid_until jamais vira 'termina em breve'", () => {
    for (let dias = 0; dias <= 30; dias += 1) {
      const estado = temporalState({ observed_at: emDias(-dias), valid_until: null }, AGORA);
      expect(estado).not.toBe("termina-em-breve");
      expect(estado).not.toBe("expirado");
    }
  });

  it("todo estado tem cor e espessura, sempre vindas de tokens Visto v2", () => {
    for (const estado of Object.values(TEMPORAL_STYLE)) {
      expect(estado.color).toMatch(/^var\(--vp-time-/);
      expect(estado.height).toMatch(/^var\(--vp-time-bar-/);
    }
  });

  it("não usa o amarelo de marca em nenhum estado", () => {
    const tokens = Object.values(TEMPORAL_STYLE).map((estado) => estado.color);
    expect(tokens.join(" ")).not.toContain("yellow");
    expect(tokens.join(" ")).not.toContain("contribute");
  });
});
