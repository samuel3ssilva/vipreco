import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const seedSql = readFileSync(new URL("./seed.sql", import.meta.url), "utf-8");

// Verificação estática de que o seed nunca pode ser confundido com dado real: toda linha
// inserida nas três tabelas de negócio precisa terminar com `is_demo = true`. Um dado real
// nunca deve entrar por aqui — só pelo fluxo de produto (moderação, cadastro manual).
function valuesBlocksFor(table: string): string[] {
  const start = seedSql.indexOf(`INSERT INTO public.${table}`);
  expect(start, `bloco INSERT INTO public.${table} não encontrado em seed.sql`).toBeGreaterThan(-1);
  const valuesStart = seedSql.indexOf("VALUES", start);
  const terminator = seedSql.indexOf(";", valuesStart);
  const block = seedSql.slice(valuesStart, terminator);
  // separa por linhas que começam com "  (" (uma linha por tupla de valores)
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("("));
}

describe("supabase/seed.sql — nunca pode parecer dado real", () => {
  it("todo mercado fictício tem is_demo = true", () => {
    const rows = valuesBlocksFor("markets");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row, row).toMatch(/,\s*true\)?,?\s*$/);
    }
  });

  it("todo produto fictício tem is_demo = true", () => {
    const rows = valuesBlocksFor("products");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row, row).toMatch(/,\s*true\)?,?\s*$/);
    }
  });

  it("todo preço fictício tem is_demo = true (última coluna) mesmo quando is_active é false", () => {
    const rows = valuesBlocksFor("prices");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // is_demo é sempre a última coluna da tupla — precisa ser `true`, mesmo em linhas
      // com is_active=false (a linha "preço inativo" do seed testa esse caso).
      expect(row, row).toMatch(/,\s*true\)[,;]?\s*$/);
    }
  });

  it("cada linha de preço tem um id explícito (namespace 33333333-... — idempotência)", () => {
    const rows = valuesBlocksFor("prices");
    for (const row of rows) {
      expect(row, row).toMatch(/^\('33333333-3333-3333-3333-[0-9a-f]{12}'/);
    }
  });

  it("markets e products também têm id explícito (namespace 11111111.../22222222...)", () => {
    for (const row of valuesBlocksFor("markets")) {
      expect(row, row).toMatch(/^\('11111111-1111-1111-1111-[0-9a-f]{12}'/);
    }
    for (const row of valuesBlocksFor("products")) {
      expect(row, row).toMatch(/^\('22222222-2222-2222-2222-[0-9a-f]{12}'/);
    }
  });

  it("as três tabelas usam ON CONFLICT (id) DO NOTHING (idempotência)", () => {
    const occurrences = seedSql.match(/ON CONFLICT \(id\) DO NOTHING/g) ?? [];
    expect(occurrences.length).toBe(3);
  });
});

describe("supabase/seed.sql — GTIN fictício nunca pode ser inválido", () => {
  // Um GTIN inválido em dado de demonstração é uma bomba-relógio: hoje nada valida, e no
  // dia em que MVP-E1-05 puser a constraint no banco o próprio seed deixa de aplicar. E
  // trocar por um código válido seria pior — um GTIN válido pertence a algum produto real,
  // e estes produtos são fictícios. GTIN é opcional: ausente é o estado honesto.
  function gtinCheckDigit(body: string): number {
    let sum = 0;
    for (let i = 0; i < body.length; i++) {
      const digit = body.charCodeAt(body.length - 1 - i) - 48;
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    return (10 - (sum % 10)) % 10;
  }

  it("todo GTIN presente no seed passa no dígito verificador GS1", () => {
    const rows = valuesBlocksFor("products");
    expect(rows.length).toBeGreaterThan(0);

    const encontrados = seedSql.match(/'(\d{8,14})'/g) ?? [];
    for (const bruto of encontrados) {
      const valor = bruto.slice(1, -1);
      if (![8, 12, 13, 14].includes(valor.length)) continue;
      const esperado = gtinCheckDigit(valor.slice(0, -1));
      expect(Number(valor.slice(-1)), `GTIN ${valor} reprova no dígito verificador`).toBe(esperado);
    }
  });

  it("os dois códigos inválidos removidos não voltaram", () => {
    expect(seedSql).not.toContain("7896089012345");
    expect(seedSql).not.toContain("7896089054321");
  });
});
