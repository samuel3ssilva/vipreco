import { describe, expect, it } from "vitest";
import { appMode, isDemoMode, resolveAppMode } from "@/lib/app-mode";

describe("modo do ambiente", () => {
  it("DEMO é o padrão seguro — inclusive sem variável configurada", () => {
    expect(resolveAppMode(undefined)).toBe("demo");
    expect(resolveAppMode("")).toBe("demo");
    expect(resolveAppMode("qualquer-coisa")).toBe("demo");
    expect(resolveAppMode("PILOTO")).toBe("demo"); // exige o valor exato, em minúsculas
  });

  it("só entra em PILOTO com opt-in explícito", () => {
    expect(resolveAppMode("piloto")).toBe("piloto");
  });

  it("o build atual é demonstração — nenhum ambiente está configurado como piloto", () => {
    expect(appMode()).toBe("demo");
    expect(isDemoMode()).toBe(true);
  });
});
