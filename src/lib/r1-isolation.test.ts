/**
 * Regressão estática de isolamento do domínio de R1.
 *
 * Os módulos de identidade exata, leitura de `size_text`, equivalência e preço unitário
 * são fundação: nada de produto os consome ainda, e é assim que R1 fica aditivo. Este
 * arquivo transforma essa promessa em teste, porque uma promessa em texto de PR não
 * sobrevive ao terceiro commit de outra pessoa.
 *
 * Duas garantias, e cada uma protege um contrato diferente:
 *
 * 1. **`size-text` não é importado por nada que renderize.** O contrato de dados proíbe
 *    literalmente "inferência de quantidade a partir de texto em tempo de apresentação";
 * 2. **nenhum módulo de R1 entrou em componente, rota ou serviço.** Enquanto isso valer,
 *    busca, comparação e ranking continuam exatamente como estavam — e a prova é
 *    estrutural, não uma leitura otimista da suíte.
 *
 * No mesmo espírito de `index.demo-source.test.ts` e `produto.$productId.public-surfaces.test.ts`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

/** Módulos de domínio criados em R1, na forma como apareceriam num `import`. */
const R1_MODULES = [
  "lib/product-identity",
  "lib/quantity",
  "lib/gtin",
  "lib/size-text",
  "lib/equivalence",
  "lib/unit-price",
] as const;

/** Onde o produto de verdade vive. Nenhum destes pode consumir R1 ainda. */
const CONSUMER_DIRECTORIES = ["components", "routes", "services"] as const;

function collectSourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectSourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.test\.tsx?$/.test(entry)) continue;
    found.push(full);
  }
  return found;
}

const consumerFiles = CONSUMER_DIRECTORIES.flatMap((directory) =>
  collectSourceFiles(join(SRC, directory)),
);

describe("o domínio de R1 continua isolado", () => {
  it("encontrou arquivos para inspecionar (senão o teste passaria por vazio)", () => {
    expect(consumerFiles.length).toBeGreaterThan(20);
  });

  it.each(R1_MODULES)("nenhum componente, rota ou serviço importa %s", (modulo) => {
    const importadores = consumerFiles.filter((file) => {
      const source = readFileSync(file, "utf-8");
      return source.includes(`@/${modulo}"`) || source.includes(`@/${modulo}'`);
    });
    expect(importadores).toEqual([]);
  });

  it("`size_text` continua sendo lido só como texto de exibição", () => {
    // `formatProductName` concatena; ninguém interpreta.
    const format = readFileSync(join(SRC, "lib", "format.ts"), "utf-8");
    expect(format).toContain("product.size_text");
    expect(format).not.toContain("parseSizeText");
  });

  it("a comparação continua sem qualquer noção de equivalência ou unitário", () => {
    const comparison = readFileSync(join(SRC, "lib", "comparison.ts"), "utf-8");
    expect(comparison).not.toContain("equivalence");
    expect(comparison).not.toContain("unit-price");
    expect(comparison).not.toContain("classifyRelation");
    // A ordem orgânica continua sendo preço → observação → id, e só.
    expect(comparison).toContain("a.price - b.price");
  });

  it("o `select` do catálogo não pede campo que não existe no banco", () => {
    const catalog = readFileSync(join(SRC, "services", "catalog.ts"), "utf-8");
    for (const campo of ["package_type", "quantity_value", "quantity_unit", "units_per_package"]) {
      expect(catalog).not.toContain(campo);
    }
  });
});
