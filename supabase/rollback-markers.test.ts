import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * O drill executa o rollback DOCUMENTADO das migrations de R2 — extraído do próprio
 * arquivo, entre `ROLLBACK-SQL-BEGIN` e `ROLLBACK-SQL-END`, e nunca copiado.
 *
 * Este teste guarda os dois lados dessa extração:
 *
 * 1. os marcadores existem, na ordem certa, e o bloco entre eles não está vazio — sem
 *    isso o drill extrairia nada e passaria em silêncio, provando coisa nenhuma;
 * 2. o rollback menciona TODO objeto que a migration cria. Rollback que esquece um objeto
 *    é rollback incompleto, e a hora de descobrir isso não é durante a reversão.
 *
 * O drill prova que o bloco EXECUTA e que o schema volta; este arquivo prova que o bloco
 * está lá e cobre tudo. São perguntas diferentes, e as duas importam.
 */
const MIGRATIONS = {
  "R2-A": "./migrations/20260803010000_product_identity_quantity.sql",
  "R2-B": "./migrations/20260803020000_gtin_integrity.sql",
} as const;

function ler(caminho: string): string {
  return readFileSync(new URL(caminho, import.meta.url), "utf-8");
}

/** Reproduz exatamente o que `scripts/db-drill/95-rollback-reapply.sh` extrai. */
function extrairRollback(sql: string): string {
  const inicio = sql.indexOf("-- ROLLBACK-SQL-BEGIN");
  const fim = sql.indexOf("-- ROLLBACK-SQL-END");
  if (inicio === -1 || fim === -1 || fim < inicio) return "";
  return sql
    .slice(inicio, fim)
    .split("\n")
    .slice(1)
    .map((linha) => linha.replace(/^-- {0,3}/, ""))
    .join("\n")
    .trim();
}

/** Todo objeto que a migration cria: colunas, constraints, índices e funções. */
function objetosCriados(sql: string): string[] {
  return [
    ...[...sql.matchAll(/ADD COLUMN IF NOT EXISTS (\w+)/g)].map((m) => m[1]),
    ...[...sql.matchAll(/ADD CONSTRAINT (\w+)/g)].map((m) => m[1]),
    ...[...sql.matchAll(/CREATE UNIQUE INDEX IF NOT EXISTS (\w+)/g)].map((m) => m[1]),
    ...[...sql.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/g)].map((m) => m[1]),
  ];
}

/** Os que a migration cria e o rollback não desfaz. Vazio é a única resposta aceitável. */
function objetosNaoCobertos(sql: string, rollback: string): string[] {
  return [...new Set(objetosCriados(sql))].filter((objeto) => !rollback.includes(objeto));
}

describe.each(Object.entries(MIGRATIONS))("%s — bloco de rollback extraível", (_nome, caminho) => {
  const sql = ler(caminho);
  const rollback = extrairRollback(sql);

  it("tem os dois marcadores, na ordem certa", () => {
    expect(sql).toContain("-- ROLLBACK-SQL-BEGIN");
    expect(sql).toContain("-- ROLLBACK-SQL-END");
    expect(sql.indexOf("-- ROLLBACK-SQL-BEGIN")).toBeLessThan(sql.indexOf("-- ROLLBACK-SQL-END"));
  });

  it("o bloco extraído não está vazio e é SQL, não comentário", () => {
    expect(rollback.length).toBeGreaterThan(0);
    for (const linha of rollback.split("\n")) {
      expect(linha, `sobrou prefixo de comentário: ${linha}`).not.toMatch(/^--/);
    }
    expect(rollback).toMatch(/^(DROP|ALTER)\b/);
  });

  it("só derruba — nunca cria nem escreve em linha", () => {
    for (const proibido of [/\bINSERT\b/i, /\bUPDATE\b/i, /\bDELETE\b/i, /\bCREATE\b/i]) {
      expect(rollback, `o rollback contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("menciona todo objeto que a migration cria", () => {
    expect(objetosCriados(sql).length).toBeGreaterThan(0);
    expect(objetosNaoCobertos(sql, rollback)).toEqual([]);
  });
});

describe("o guarda de cobertura realmente reprova", () => {
  it("um objeto que some do rollback é apontado pelo nome", () => {
    // Controle positivo: sem ele, "todo objeto está coberto" e "a verificação não funciona"
    // produzem exatamente o mesmo verde.
    //
    // O objeto escolhido é o índice, e não uma coluna, de propósito: `units_per_package`
    // aparece DUAS vezes no rollback (na constraint `products_units_per_package_positive`
    // e na própria coluna), então apagar só uma das ocorrências não tornaria o objeto
    // ausente — e o controle passaria sem provar nada.
    const sql = ler(MIGRATIONS["R2-A"]);
    const mutilado = extrairRollback(sql).replace(/^.*products_exact_identity_idx.*$/m, "");

    expect(objetosNaoCobertos(sql, mutilado)).toEqual(["products_exact_identity_idx"]);
  });
});
