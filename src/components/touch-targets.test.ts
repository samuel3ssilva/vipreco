// Alvo de toque de 48 px nos elementos interativos introduzidos ou alterados pela North Star
// v1.2.2 (checkpoint do PMO). Regressão estática, no mesmo espírito de
// `index.demo-source.test.ts`: o valor mora em duas camadas (a classe no componente e a
// definição em `styles.css`) e este teste amarra as duas, para que ninguém baixe o alvo mexendo
// só num lado.
//
// Elementos **pré-existentes** continuam no mínimo histórico de 44 px de `btn-base`/`btn-sm` —
// só sobem para 48 px quando forem tocados, no PR que os tocar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src", "styles.css"), "utf-8");
const appShell = readFileSync(join(process.cwd(), "src", "components", "AppShell.tsx"), "utf-8");

describe("alvo de toque de 48 px", () => {
  it("a utilitária btn-touch-48 vale 48 px (3rem)", () => {
    expect(styles).toMatch(/@utility btn-touch-48 \{\s*min-height: 3rem;\s*\}/);
  });

  it("btn-touch-48 é declarada depois de btn-base e btn-sm, para vencer o min-height delas", () => {
    const base = styles.indexOf("@utility btn-base");
    const sm = styles.indexOf("@utility btn-sm");
    const touch = styles.indexOf("@utility btn-touch-48");
    expect(base).toBeGreaterThan(-1);
    expect(sm).toBeGreaterThan(-1);
    expect(touch).toBeGreaterThan(sm);
    expect(touch).toBeGreaterThan(base);
  });

  it("os links da navegação do header têm 48 px de altura mínima", () => {
    expect(appShell).toContain("flex min-h-12 items-center rounded-md px-3 py-2");
    expect(appShell).not.toContain("min-h-11");
  });

  it('a pill "Tenho um mercado" tem 48 px de altura mínima', () => {
    const pill = appShell.slice(appShell.indexOf('to="/para-mercados"'));
    expect(pill.slice(0, 400)).toContain("btn-touch-48");
  });

  it("a barra inferior de navegação mantém 56 px", () => {
    expect(appShell).toContain("flex min-h-14 flex-col items-center");
  });
});
