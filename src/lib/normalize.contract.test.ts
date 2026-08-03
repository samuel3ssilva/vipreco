// Contrato único de normalização (R0.5 / TD-001).
//
// Existiam duas normalizações e elas divergiam: a do TypeScript colapsava espaço e
// removia as pontas, a do Postgres não. O efeito não era um bug visível — era pior:
// `products_canonical_identity_idx` aceitava '500 g', '500  g' e '500g' como três
// produtos distintos, e a comparação se partia em três sem nenhum erro na tela.
//
// Este arquivo prova as duas metades do contrato:
//
//   1. `normalizeSearchText()` obedece a todos os vetores versionados;
//   2. o bloco de vetores dentro de `scripts/db-drill/90-assertions.sql` — que roda
//      contra um Postgres vivo no drill de schema — lista **exatamente** os mesmos
//      vetores. Acrescentar um de um lado sem acrescentar do outro quebra o CI.
//
// A verificação (2) é o que torna o contrato real sem precisar de banco no CI de teste.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/lib/normalize";

interface Vetor {
  entrada: string;
  saida: string;
  porque: string;
}

const contrato = JSON.parse(
  readFileSync(new URL("../../supabase/normalization-vectors.json", import.meta.url), "utf-8"),
) as { vetores: Vetor[] };

const assertionsSql = readFileSync(
  new URL("../../scripts/db-drill/90-assertions.sql", import.meta.url),
  "utf-8",
);

/**
 * Extrai os pares `('entrada', 'saida')` da tabela `VALUES` do bloco de normalização.
 *
 * O recorte é feito por índice, não por expressão regular sobre o arquivo inteiro: o
 * arquivo tem outros blocos `DO $$` e outras listas, e casar em cima de tudo pegaria
 * texto que não é vetor.
 */
function vetoresDoSql(): Array<{ entrada: string; saida: string }> {
  const marcador = "AS v(entrada, saida)";
  const fim = assertionsSql.indexOf(marcador);
  expect(
    fim,
    "bloco de vetores de normalização não encontrado em 90-assertions.sql",
  ).toBeGreaterThan(-1);
  const inicio = assertionsSql.lastIndexOf("SELECT * FROM (VALUES", fim);
  expect(inicio, "abertura da tabela de vetores não encontrada").toBeGreaterThan(-1);

  const bloco = assertionsSql.slice(inicio, fim);
  const pares: Array<{ entrada: string; saida: string }> = [];
  const linha = /\('((?:[^']|'')*)',\s*'((?:[^']|'')*)'\)/g;
  for (const achado of bloco.matchAll(linha)) {
    // `''` é como o SQL escreve uma aspa simples dentro de literal.
    pares.push({
      entrada: achado[1].replaceAll("''", "'"),
      saida: achado[2].replaceAll("''", "'"),
    });
  }
  return pares;
}

describe("contrato de normalização — lado TypeScript", () => {
  it("tem vetores versionados", () => {
    expect(contrato.vetores.length).toBeGreaterThanOrEqual(10);
  });

  it.each(contrato.vetores)("$porque: $entrada", ({ entrada, saida }) => {
    expect(normalizeSearchText(entrada)).toBe(saida);
  });

  it("trata nulo e indefinido como string vazia", () => {
    expect(normalizeSearchText(null)).toBe("");
    expect(normalizeSearchText(undefined)).toBe("");
  });

  it("trata tabulação e quebra de linha como espaço em branco", () => {
    // Fora da lista compartilhada porque exige literal com escape do lado SQL; lá o caso
    // tem uma asserção própria, ao lado da tabela de vetores.
    expect(normalizeSearchText("\t\ncafé\t")).toBe("cafe");
    expect(normalizeSearchText("arroz\tcamil")).toBe("arroz camil");
  });
});

describe("contrato de normalização — o SQL não pode divergir", () => {
  it("o drill de schema verifica exatamente os mesmos vetores", () => {
    const doSql = vetoresDoSql();
    const doJson = contrato.vetores.map(({ entrada, saida }) => ({ entrada, saida }));

    // Compara conjunto e ordem: manter a mesma ordem nos dois lados torna a diferença
    // legível no diff quando alguém acrescenta um vetor.
    expect(doSql).toEqual(doJson);
  });

  it("o bloco SQL exige que a função continue IMMUTABLE", () => {
    // Sem isso o Postgres recusa o índice funcional de identidade canônica — e a
    // proteção contra duplicata sumiria junto.
    expect(assertionsSql).toContain("provolatile = 'i'");
  });
});

describe("fronteira declarada do contrato", () => {
  it("cobre os diacríticos do português", () => {
    for (const [entrada, saida] of [
      ["ãâáàä", "aaaaa"],
      ["éêèë", "eeee"],
      ["íîìï", "iiii"],
      ["õôóòö", "ooooo"],
      ["úûùü", "uuuu"],
      ["çñ", "cn"],
    ]) {
      expect(normalizeSearchText(entrada), entrada).toBe(saida);
    }
  });

  it("caracteres fora do português são fronteira conhecida, não contrato", () => {
    // O lado SQL usa uma tabela fixa de `translate` com os diacríticos do português; o
    // lado TypeScript usa decomposição Unicode, que alcança mais. Para o catálogo de
    // Artemis os dois coincidem, e é isso que os vetores garantem. Fora dessa faixa o
    // comportamento não é contrato — está registrado aqui para ninguém descobrir por
    // acidente e achar que é regressão.
    expect(normalizeSearchText("Ångström")).toBe("angstrom");
  });

  it("não remove o espaço entre número e unidade", () => {
    // A resposta certa para '500g' × '500 g' é quantidade estruturada (E1), não um
    // truque de string. Interpretar texto aqui é exatamente o que o princípio 3 proíbe.
    expect(normalizeSearchText("500g")).not.toBe(normalizeSearchText("500 g"));
  });

  it("não toca em pontuação nem em hífen", () => {
    // Marcas têm hífen, e removê-lo mudaria a identidade do produto.
    expect(normalizeSearchText("Coca-Cola")).toBe("coca-cola");
    expect(normalizeSearchText("Nescau 2.0")).toBe("nescau 2.0");
  });
});
