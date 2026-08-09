import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_MARKETS, buildDemoOpportunities } from "./demo-opportunities";

/**
 * §19 — A IDENTIDADE EXATA NÃO PODE DIVERGIR ENTRE AS TELAS.
 *
 * =============================================================================
 * O DEFEITO QUE ESTE ARQUIVO EXISTE PARA IMPEDIR
 * =============================================================================
 *
 * A Home é servida por um fixture versionado (`demo-opportunities.ts`). A página do produto, a
 * busca e a comparação são servidas pelo BANCO. São duas fontes, e nada obrigava as duas a
 * descreverem o mesmo item.
 *
 * Não é hipótese: aconteceu. A Home dizia "Ouro do Campo" e a página do produto, aberta pelo
 * botão da própria Home, dizia a marca antiga — inclusive no título da aba do navegador. A
 * correção foi de dado, e ficou sem guarda. **Este arquivo é a guarda.**
 *
 * A referência versionada do banco é `supabase/seed.sql`: é dele que sai qualquer ambiente
 * reconstruído, e é contra ele que o drill de schema roda a cada CI. Se o fixture e o seed
 * discordarem, alguém mexeu em uma ponta só — e é exatamente isso que precisa ficar vermelho
 * antes de chegar na tela de quem está sendo entrevistado.
 *
 * O que este teste NÃO faz: consultar o banco remoto. Um teste que depende de rede não roda no
 * CI e não protege ninguém. O seed é a fonte da verdade versionada; manter o banco fiel a ele é
 * trabalho das operações de escrita controlada, que têm verificação própria.
 */

const SEED = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf-8");

interface IdentidadeDoSeed {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly variant: string;
  readonly size_text: string;
  readonly gtin: string | null;
}

/**
 * Lê as linhas de `products` do seed.
 *
 * Deliberadamente ingênuo e estrito: uma linha que não casar com a forma esperada não é
 * ignorada em silêncio — o teste seguinte reprova por contagem. Um parser tolerante devolveria
 * "zero produtos" para um seed reformatado, e zero comparações passam vacuamente.
 */
function produtosDoSeed(): IdentidadeDoSeed[] {
  const bloco = SEED.slice(
    SEED.indexOf("INSERT INTO public.products"),
    SEED.indexOf("ON CONFLICT", SEED.indexOf("INSERT INTO public.products")),
  );
  const linha =
    /\('([0-9a-f-]{36})',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*(NULL|'[^']*')/g;
  const produtos: IdentidadeDoSeed[] = [];
  for (const m of bloco.matchAll(linha)) {
    produtos.push({
      id: m[1],
      name: m[2],
      brand: m[3],
      variant: m[4],
      size_text: m[5],
      gtin: m[6] === "NULL" ? null : m[6].slice(1, -1),
    });
  }
  return produtos;
}

const SEED_PRODUTOS = produtosDoSeed();

describe("o seed de demonstração é legível, e tem o que dizemos que tem", () => {
  it("as sete linhas de products foram lidas", () => {
    // Sem esta asserção, um seed reformatado faria o parser devolver zero e TODAS as
    // comparações abaixo passariam sem comparar nada.
    expect(SEED_PRODUTOS).toHaveLength(7);
  });

  it("nenhum produto de demonstração tem GTIN", () => {
    // Um código de barras válido pertence a um produto real de um fabricante real. Pendurá-lo
    // numa identidade fictícia é uma afirmação falsa sobre um identificador global — e inventar
    // um é pior, porque ou colide com alguém ou reprova no dígito verificador.
    const comGtin = SEED_PRODUTOS.filter((p) => p.gtin !== null);
    expect(comGtin.map((p) => `${p.brand} ${p.name}`)).toEqual([]);
  });

  it("nenhuma marca real aparece no catálogo de demonstração", () => {
    // A lista cobre todas as que já estiveram no seed, e não só as da última limpeza: uma marca
    // que volta é tão defeito quanto uma que nunca saiu.
    const REAIS = [
      "Camil",
      "Pilão",
      "Italac",
      "Liza",
      "Ypê",
      "Neve",
      "Tio João",
      "Melitta",
      "3 Corações",
      "Qualy",
      "Piracanjuba",
      "Parmalat",
    ];
    const encontradas = SEED_PRODUTOS.filter((p) => REAIS.includes(p.brand)).map((p) => p.brand);
    expect(encontradas).toEqual([]);
  });

  it("nenhum mercado do seed tem nome de rede real", () => {
    // O bloco de markets é lido cru de propósito: o que importa aqui é que nenhuma string do
    // seed nomeie um supermercado que existe.
    for (const rede of ["Assaí", "Carrefour", "Pão de Açúcar", "Extra", "Atacadão", "Mix Mateus"]) {
      expect(SEED, `o seed cita a rede real ${rede}`).not.toContain(rede);
    }
  });
});

describe("a Home e o banco descrevem o MESMO produto", () => {
  const achados = buildDemoOpportunities(new Date("2026-08-08T12:00:00.000Z"));

  it("todo Achado da Home aponta para um produto que existe no seed", () => {
    expect(achados.length).toBeGreaterThan(0);
    for (const achado of achados) {
      const noSeed = SEED_PRODUTOS.find((p) => p.id === achado.product_id);
      expect(noSeed, `o produto ${achado.product_id} não existe no seed`).toBeDefined();
    }
  });

  it.each(["nome", "marca", "variante", "quantidade", "GTIN"])(
    "%s é idêntico entre o fixture da Home e o seed",
    (campo) => {
      for (const achado of achados) {
        const noSeed = SEED_PRODUTOS.find((p) => p.id === achado.product_id);
        if (!noSeed) throw new Error(`o produto ${achado.product_id} não existe no seed`);
        const daHome = achado.product;
        const par = {
          nome: [daHome.name, noSeed.name],
          marca: [daHome.brand, noSeed.brand],
          variante: [daHome.variant, noSeed.variant],
          quantidade: [daHome.size_text, noSeed.size_text],
          GTIN: [daHome.gtin, noSeed.gtin],
        }[campo]!;
        expect(par[0], `${campo} diverge no produto ${achado.product_id}`).toEqual(par[1]);
      }
    },
  );

  it("todo mercado da Home existe no seed, com o mesmo nome e bairro", () => {
    for (const mercado of DEMO_MARKETS) {
      expect(SEED, `o mercado ${mercado.id} não está no seed`).toContain(mercado.id);
      expect(SEED, `o nome de ${mercado.id} diverge`).toContain(`'${mercado.name}'`);
      expect(SEED, `o bairro de ${mercado.id} diverge`).toContain(`'${mercado.neighborhood}'`);
    }
  });

  it("o mercado citado em cada Achado é um dos mercados do seed", () => {
    const ids = new Set(DEMO_MARKETS.map((m) => m.id));
    for (const achado of achados) {
      expect(ids.has(achado.market_id), `mercado desconhecido em ${achado.id}`).toBe(true);
      expect(achado.market?.id).toBe(achado.market_id);
    }
  });
});

describe("os atalhos da busca não levam a lugar nenhum vazio", () => {
  /**
   * O atalho é o elemento mais clicável da primeira dobra. "Feijão" esteve aqui, o catálogo
   * nunca teve feijão, e o toque mais provável da demonstração levava a "nenhum produto
   * encontrado".
   *
   * A verificação é a MESMA que a busca faz: `search_text` normalizado contém o termo
   * normalizado. Ela é feita contra o seed, não contra o banco, pelo mesmo motivo de sempre —
   * teste que depende de rede não protege ninguém.
   */
  const ROTA = readFileSync(join(process.cwd(), "src/routes/index.tsx"), "utf-8");
  const atalhos = /const SHORTCUTS = \[([^\]]+)\]/
    .exec(ROTA)?.[1]
    .split(",")
    .map((s) => s.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);

  it("os atalhos foram lidos da rota", () => {
    expect(atalhos, "não consegui ler SHORTCUTS de index.tsx").toBeDefined();
    expect(atalhos!.length).toBeGreaterThanOrEqual(3);
  });

  it.each(atalhos ?? [])("o atalho %s tem pelo menos um produto no catálogo", (atalho) => {
    const normalizado = atalho.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const casam = SEED_PRODUTOS.filter((p) =>
      `${p.name} ${p.brand} ${p.variant} ${p.size_text} ${""}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .includes(normalizado),
    );
    expect(
      casam.length,
      `o atalho "${atalho}" da Home não corresponde a nenhum produto do seed — na demonstração ele leva a "nenhum produto encontrado"`,
    ).toBeGreaterThan(0);
  });
});
