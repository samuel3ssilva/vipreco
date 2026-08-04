import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE_TYPES } from "@/lib/product-identity";
import { QUANTITY_UNITS, UNIT_CONVERSIONS, normalizeQuantity } from "@/lib/quantity";

/**
 * A migration de R2-A e o domínio de R1 descrevem a mesma regra em duas linguagens. Este
 * teste existe para que uma divergir da outra quebre `bun run test`, e não só o drill de
 * schema — que roda em CI e depende de Docker.
 *
 * O drill prova que o SQL funciona contra banco vivo. Este arquivo prova que o SQL diz a
 * mesma coisa que o TypeScript. São perguntas diferentes, e as duas importam: um CHECK
 * que aceita `kilo` e um `isQuantityUnit()` que recusa produzem um registro que entra no
 * banco e some da comparação.
 */
const migration = readFileSync(
  new URL("./migrations/20260803010000_product_identity_quantity.sql", import.meta.url),
  "utf-8",
);

/**
 * As colunas que a migration acrescenta, com a definição completa de cada uma.
 *
 * A definição vai até o FIM DA LINHA, e não até a primeira vírgula: parar na vírgula
 * lê `quantity_value numeric(12,4)` como `numeric(12`, e aí a única coluna que tem
 * vírgula dentro do próprio tipo é justamente a que nenhuma guarda consegue inspecionar.
 */
function colunasAdicionadas(sql: string): { nome: string; definicao: string }[] {
  return [...sql.matchAll(/ADD COLUMN IF NOT EXISTS (\w+) ([^\n]+)/g)].map((m) => ({
    nome: m[1],
    definicao: m[2].replace(/[,;]\s*$/, ""),
  }));
}

describe("migration R2-A — acordo com o contrato de domínio", () => {
  it("o CHECK de package_type lista exatamente os oito valores do tipo", () => {
    const check = /package_type IN\s*\(([^)]*)\)/.exec(migration);
    expect(check, "CHECK de package_type não encontrado na migration").not.toBeNull();

    const naMigration = [...(check?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect([...naMigration].sort()).toEqual([...PACKAGE_TYPES].sort());
  });

  it("o CHECK de quantity_unit lista exatamente as cinco unidades do tipo", () => {
    const check = /quantity_unit IN\s*\(([^)]*)\)/.exec(migration);
    expect(check, "CHECK de quantity_unit não encontrado na migration").not.toBeNull();

    const naMigration = [...(check?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect([...naMigration].sort()).toEqual([...QUANTITY_UNITS].sort());
  });

  it("o fator de conversão do índice é o mesmo de UNIT_CONVERSIONS", () => {
    // A expressão do índice converte para a grandeza base. Se ela e `normalizeQuantity()`
    // discordarem, dois registros que o domínio considera o mesmo SKU entram como dois.
    const expressao =
      /quantity_value \* CASE quantity_unit((?: WHEN '[a-z]+' THEN \d+)+) ELSE (\d+) END/.exec(
        migration,
      );
    expect(expressao, "expressão de conversão não encontrada no índice").not.toBeNull();

    const explicitos = new Map(
      [...(expressao?.[1] ?? "").matchAll(/WHEN '([a-z]+)' THEN (\d+)/g)].map((m) => [
        m[1],
        Number(m[2]),
      ]),
    );
    const padrao = Number(expressao?.[2]);

    for (const unidade of QUANTITY_UNITS) {
      const naMigration = explicitos.get(unidade) ?? padrao;
      expect(naMigration, `fator de ${unidade} diverge entre SQL e domínio`).toBe(
        UNIT_CONVERSIONS[unidade].factor,
      );
    }
  });

  it("o mapa de grandeza do índice é o mesmo de UNIT_CONVERSIONS", () => {
    const expressao =
      /CASE quantity_unit((?: WHEN '[a-z]+' THEN '[a-z]+')+) ELSE quantity_unit END/.exec(
        migration,
      );
    expect(expressao, "expressão de grandeza não encontrada no índice").not.toBeNull();

    const explicitos = new Map(
      [...(expressao?.[1] ?? "").matchAll(/WHEN '([a-z]+)' THEN '([a-z]+)'/g)].map((m) => [
        m[1],
        m[2],
      ]),
    );

    for (const unidade of QUANTITY_UNITS) {
      // `ELSE quantity_unit` significa "a unidade já é a grandeza base".
      const naMigration = explicitos.get(unidade) ?? unidade;
      expect(naMigration, `grandeza de ${unidade} diverge entre SQL e domínio`).toBe(
        UNIT_CONVERSIONS[unidade].normalizedUnit,
      );
    }
  });

  it("500 g e 0,5 kg convergem nos dois lados — é o ganho sobre o índice textual", () => {
    const emGramas = normalizeQuantity({ value: 500, unit: "g" });
    const emQuilos = normalizeQuantity({ value: 0.5, unit: "kg" });
    expect(emGramas).toEqual(emQuilos);
    // E o SQL faz a mesma conta: 0.5 * 1000 = 500, com grandeza 'g'.
    expect(0.5 * UNIT_CONVERSIONS.kg.factor).toBe(500);
    expect(UNIT_CONVERSIONS.kg.normalizedUnit).toBe(UNIT_CONVERSIONS.g.normalizedUnit);
  });

  it("a precisão declarada é a mesma que o domínio arredonda", () => {
    expect(migration).toContain("numeric(12,4)");
  });
});

describe("migration R2-A — é aditiva, e isso é verificável no texto", () => {
  it("não remove, não renomeia e não reescreve nada", () => {
    // A lista é a de proibições do mandato. Cada uma destas palavras num arquivo de
    // migration de R2 significa que ela deixou de ser reversível sem perda.
    const proibidos = [
      /\bDROP\s+TABLE\b/i,
      /\bDROP\s+COLUMN\b/i,
      /\bRENAME\b/i,
      /\bTRUNCATE\b/i,
      /\bALTER\s+POLICY\b/i,
      /\bDROP\s+POLICY\b/i,
      /\bCREATE\s+POLICY\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /\bSECURITY\s+DEFINER\b/i,
    ];
    // Comentário não é comando: o bloco de rollback documenta os DROPs de propósito.
    const executavel = migration
      .split("\n")
      .filter((linha) => !linha.trimStart().startsWith("--"))
      .join("\n");

    for (const proibido of proibidos) {
      expect(executavel, `migration contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("não escreve em linha nenhuma", () => {
    const executavel = migration
      .split("\n")
      .filter((linha) => !linha.trimStart().startsWith("--"))
      .join("\n");

    for (const escrita of [/\bUPDATE\s+public\./i, /\bINSERT\s+INTO\b/i, /\bDELETE\s+FROM\b/i]) {
      expect(executavel, "migration executa escrita de dado — backfill é R2-C/E1-08").not.toMatch(
        escrita,
      );
    }
  });

  it("toda coluna nova nasce sem NOT NULL e sem DEFAULT", () => {
    // As duas coisas pelo mesmo motivo: NOT NULL quebraria toda linha existente, e um
    // DEFAULT inventaria valor para produto que ninguém conferiu.
    const adds = colunasAdicionadas(migration);
    expect(adds.length).toBe(4);
    for (const { nome, definicao } of adds) {
      expect(definicao, `${nome} nasceu NOT NULL`).not.toMatch(/NOT NULL/i);
      expect(definicao, `${nome} nasceu com DEFAULT`).not.toMatch(/DEFAULT/i);
    }
  });

  it("e o guarda acima enxerga além da vírgula de numeric(12,4)", () => {
    // Controle positivo. A leitura anterior parava na primeira vírgula, então
    // `quantity_value numeric(12,4)` chegava como `numeric(12` — e a única coluna com
    // vírgula dentro do próprio tipo era exatamente a que o guarda não conseguia
    // inspecionar. Um teste que nunca reprova não prova nada; este exige que ele reprove.
    const hostil = migration.replace(
      "quantity_value numeric(12,4)",
      "quantity_value numeric(12,4) NOT NULL DEFAULT 1",
    );
    expect(hostil, "a substituição do controle não encontrou a coluna").not.toBe(migration);

    const alvo = colunasAdicionadas(hostil).find((c) => c.nome === "quantity_value");
    expect(alvo?.definicao).toMatch(/NOT NULL/i);
    expect(alvo?.definicao).toMatch(/DEFAULT/i);
  });

  it("preserva o índice textual e o próprio size_text", () => {
    const executavel = migration
      .split("\n")
      .filter((linha) => !linha.trimStart().startsWith("--"))
      .join("\n");
    // Nenhum DROP nem ALTER de índice: o índice textual é a única proteção contra
    // duplicata enquanto houver linha sem campo estruturado — ou seja, todas elas.
    // Mencionar o nome num COMMENT é outra coisa, e é justamente o que documenta a
    // convivência entre os dois.
    expect(executavel).not.toMatch(/DROP\s+INDEX/i);
    expect(executavel).not.toMatch(/ALTER\s+INDEX/i);
    expect(executavel).not.toMatch(/(?:DROP|ALTER)[^;]*products_canonical_identity_idx/i);
  });

  it("o índice novo é único e parcial", () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS products_exact_identity_idx/);
    // O WHERE é o que diz "linha sem campo estruturado não tem identidade exata". Sem ele
    // o índice até funcionaria, mas por um detalhe de NULL, e não por intenção escrita.
    expect(migration).toMatch(/WHERE package_type IS NOT NULL/);
  });

  it("documenta o rollback de cada objeto que cria", () => {
    // Rollback que não menciona um objeto criado é rollback incompleto, e a hora de
    // descobrir isso não é durante a reversão.
    for (const constraint of [
      "products_package_type_check",
      "products_quantity_unit_check",
      "products_quantity_value_positive",
      "products_units_per_package_positive",
      "products_quantity_pair_complete",
    ]) {
      expect(migration).toContain(`ADD CONSTRAINT ${constraint}`);
      expect(migration, `${constraint} não aparece no rollback`).toContain(
        `DROP CONSTRAINT IF EXISTS ${constraint}`,
      );
    }

    for (const coluna of ["package_type", "quantity_value", "quantity_unit", "units_per_package"]) {
      expect(migration, `${coluna} não aparece no rollback`).toContain(
        `DROP COLUMN IF EXISTS ${coluna}`,
      );
    }

    expect(migration).toContain("DROP INDEX IF EXISTS public.products_exact_identity_idx");
  });
});
