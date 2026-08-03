// Duas coisas são provadas aqui: que o detector de colisões encontra o que precisa
// encontrar, e que os dados fictícios versionados do projeto **não** colidem sob o
// contrato novo — ou seja, que a migration `20260803000000_normalization_contract.sql`
// pode ser aplicada num ambiente que só tenha o seed, sem nenhuma decisão humana.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  encontrarColisoes,
  formatarRelatorio,
  normalizarAntigo,
  normalizarNovo,
  type ProdutoIdentidade,
} from "./normalization-collisions";

const seedSql = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf-8");

/** Lê as tuplas de `INSERT INTO public.products` do seed fictício versionado. */
function produtosDoSeed(): ProdutoIdentidade[] {
  const inicio = seedSql.indexOf("INSERT INTO public.products");
  expect(inicio, "bloco de produtos não encontrado em seed.sql").toBeGreaterThan(-1);
  const valuesInicio = seedSql.indexOf("VALUES", inicio);
  const fim = seedSql.indexOf("ON CONFLICT", valuesInicio);
  const bloco = seedSql.slice(valuesInicio, fim);

  return bloco
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha.startsWith("("))
    .map((linha) => {
      const campos = [...linha.matchAll(/'((?:[^']|'')*)'/g)].map((achado) =>
        achado[1].replaceAll("''", "'"),
      );
      // ordem das colunas no seed: id, name, brand, variant, size_text, gtin, category
      const [id, name, brand, variant, size_text] = campos;
      return { id, name, brand, variant, size_text };
    });
}

describe("detector de colisões", () => {
  it("acusa duas grafias que só diferem no espaçamento", () => {
    const colisoes = encontrarColisoes([
      { id: "1", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500 g" },
      { id: "2", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500  g" },
    ]);

    expect(colisoes).toHaveLength(1);
    expect(colisoes[0].produtos.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("acusa espaço nas pontas", () => {
    const colisoes = encontrarColisoes([
      { id: "1", name: "Arroz", brand: "Camil", variant: "Tipo 1", size_text: "5 kg" },
      { id: "2", name: " Arroz ", brand: "Camil", variant: "Tipo 1", size_text: "5 kg" },
    ]);

    expect(colisoes).toHaveLength(1);
  });

  it("não acusa '500g' contra '500 g' — o contrato não interpreta texto", () => {
    // Esses dois SÃO produtos distintos para o contrato. A resposta certa é quantidade
    // estruturada (E1), não colapsar a string.
    const colisoes = encontrarColisoes([
      { id: "1", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500 g" },
      { id: "2", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500g" },
    ]);

    expect(colisoes).toEqual([]);
  });

  it("não acusa produtos genuinamente diferentes", () => {
    const colisoes = encontrarColisoes([
      { id: "1", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500 g" },
      { id: "2", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "250 g" },
      { id: "3", name: "Café", brand: "Melitta", variant: "Tradicional", size_text: "500 g" },
    ]);

    expect(colisoes).toEqual([]);
  });

  it("trata marca, variante e tamanho ausentes sem quebrar", () => {
    const colisoes = encontrarColisoes([
      { id: "1", name: "Sal", brand: null, variant: null, size_text: null },
      { id: "2", name: "Sal ", brand: null, variant: undefined, size_text: null },
    ]);

    expect(colisoes).toHaveLength(1);
  });

  it("agrupa mais de dois produtos na mesma colisão", () => {
    const colisoes = encontrarColisoes([
      { id: "1", name: "Leite", brand: "Italac", variant: "Integral", size_text: "1 L" },
      { id: "2", name: "Leite", brand: "Italac", variant: "Integral", size_text: "1  L" },
      { id: "3", name: "Leite", brand: "Italac", variant: "Integral", size_text: " 1 L " },
    ]);

    expect(colisoes).toHaveLength(1);
    expect(colisoes[0].produtos).toHaveLength(3);
  });
});

describe("as duas normalizações", () => {
  it("a antiga não toca em espaço — é o que abre a brecha", () => {
    expect(normalizarAntigo("500  g")).toBe("500  g");
    expect(normalizarAntigo("  Café  ")).toBe("  cafe  ");
  });

  it("a nova colapsa e apara", () => {
    expect(normalizarNovo("500  g")).toBe("500 g");
    expect(normalizarNovo("  Café  ")).toBe("cafe");
  });
});

describe("relatório", () => {
  it("relatório vazio libera a aplicação", () => {
    expect(formatarRelatorio([], 7)).toContain("Nenhuma colisão em 7 produto(s)");
  });

  it("relatório com colisão pede ação humana e não sugere unir nada", () => {
    const texto = formatarRelatorio(
      encontrarColisoes([
        { id: "1", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500 g" },
        { id: "2", name: "Café", brand: "Pilão", variant: "Tradicional", size_text: "500  g" },
      ]),
      2,
    );

    expect(texto).toContain("HUMAN ACTION REQUIRED");
    expect(texto).toContain("decisão do Founder/PMO");
    expect(texto).toContain("Este script não altera nada");
  });
});

describe("impacto sobre os dados fictícios versionados", () => {
  const produtos = produtosDoSeed();

  it("o seed tem os sete produtos esperados", () => {
    expect(produtos).toHaveLength(7);
    expect(produtos.map((p) => p.name)).toContain("Café");
  });

  it("nenhum produto do seed colide sob o contrato novo", () => {
    // Este é o relatório de impacto. Enquanto ele passar, aplicar a migration num
    // ambiente que só tenha o seed fictício não exige nenhuma decisão humana.
    const colisoes = encontrarColisoes(produtos);
    expect(formatarRelatorio(colisoes, produtos.length)).toContain("Nenhuma colisão");
  });

  it("os dois tamanhos do mesmo café continuam sendo produtos distintos", () => {
    // O seed tem Café Pilão Tradicional em 500 g e em 250 g de propósito. Nenhuma
    // mudança de normalização pode transformá-los no mesmo registro.
    const cafes = produtos.filter((p) => p.name === "Café");
    expect(cafes).toHaveLength(2);
    expect(encontrarColisoes(cafes)).toEqual([]);
  });
});
