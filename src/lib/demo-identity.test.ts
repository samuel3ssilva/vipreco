import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_MARKETS, buildDemoOpportunities } from "./demo-opportunities";
import { DEMO_PRODUCTS, imagemDoProdutoDemo } from "./demo-catalog";

/**
 * A IDENTIDADE EXATA NÃO PODE DIVERGIR ENTRE AS TELAS — E A PERGUNTA MUDOU DUAS VEZES.
 *
 * =============================================================================
 * O DEFEITO ORIGINAL, E POR QUE ELE NÃO EXISTE MAIS
 * =============================================================================
 *
 * A Home era servida por um fixture versionado; busca, comparação e detalhe eram servidas pelo
 * BANCO. Duas fontes no MESMO modo, e nada obrigava as duas a descreverem o mesmo item. Não é
 * hipótese: a Home dizia "Ouro do Campo" e a página aberta pelo botão da própria Home dizia a
 * marca antiga, inclusive no título da aba.
 *
 * Este arquivo comparava fixture e seed campo a campo para pegar isso. Em 08/08/2026 a causa foi
 * removida na raiz: existe **uma coleção só** por modo, e as quatro telas leem dela. Duas fontes
 * no mesmo modo deixaram de ser possíveis, e uma comparação campo a campo entre elas deixou de
 * ter o que comparar.
 *
 * =============================================================================
 * O QUE ESTE ARQUIVO PERGUNTA HOJE (09/08/2026)
 * =============================================================================
 *
 * Os dois universos passaram a ser **deliberadamente diferentes**: o modo demo mostra o Açougue
 * Mota, e o seed continua sendo a mercearia fictícia do piloto. Exigir que coincidam agora
 * obrigaria a escrever "Açougue Mota" dentro de `supabase/seed.sql` — o oposto do que se quer.
 *
 * Então ficam três perguntas vivas, e nenhuma delas é vacuamente verdadeira:
 *
 * 1. **higiene do seed** — sem GTIN, sem marca real, sem nome de rede real. Intocada: ela guarda
 *    a referência versionada do banco, e o banco não mudou de ramo;
 * 2. **a demonstração lê uma coleção só** — todo Achado da Home vem de `demo-catalog`, com o
 *    produto, o mercado e a imagem que estão lá, e não de uma segunda lista;
 * 3. **os dois universos não se contaminam** — nome real de loja não entra no seed, e id de
 *    demonstração não colide com id do seed.
 *
 * O que este teste NÃO faz: consultar o banco remoto. Um teste que depende de rede não roda no
 * CI e não protege ninguém.
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
  it("as nove linhas de products foram lidas", () => {
    // Sem esta asserção, um seed reformatado faria o parser devolver zero e TODAS as
    // comparações abaixo passariam sem comparar nada.
    expect(SEED_PRODUTOS).toHaveLength(9);
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

describe("a demonstração inteira lê uma coleção só", () => {
  const achados = buildDemoOpportunities(new Date("2026-08-08T12:00:00.000Z"));

  it("todo Achado da Home aponta para um produto do catálogo, e não para uma segunda lista", () => {
    expect(achados.length).toBeGreaterThan(0);
    const doCatalogo = new Map(DEMO_PRODUCTS.map((p) => [p.id, p]));
    for (const achado of achados) {
      const noCatalogo = doCatalogo.get(achado.product_id);
      expect(noCatalogo, `${achado.product_id} não está no catálogo`).toBeDefined();
      // Identidade **por referência**, não campo a campo. Comparar campo a campo só faz sentido
      // entre duas listas; aqui a exigência é mais forte — tem de ser o mesmo objeto, porque só
      // existe um lugar de onde ele pode vir.
      expect(achado.product).toBe(noCatalogo);
    }
  });

  it("todo mercado citado é um mercado do catálogo, e o objeto é o mesmo", () => {
    const doCatalogo = new Map(DEMO_MARKETS.map((m) => [m.id, m]));
    for (const achado of achados) {
      expect(doCatalogo.has(achado.market_id), `mercado desconhecido em ${achado.id}`).toBe(true);
      expect(achado.market).toBe(doCatalogo.get(achado.market_id));
    }
  });

  it("a imagem de cada Achado é a do mapa do catálogo, e não uma escolhida na Home", () => {
    // É isto que torna impossível a embalagem mudar entre Home, busca, comparação e detalhe:
    // não existe um segundo lugar onde escolher outra.
    for (const achado of achados) {
      expect(achado.image).toBe(imagemDoProdutoDemo(achado.product_id));
      expect(achado.image, `${achado.product.name} sem imagem`).not.toBeNull();
    }
  });

  it("nenhum Achado da Home é exemplo ilustrativo", () => {
    // A Home anuncia observação. Um preço de exemplo entre os Achados seria anunciar como achado
    // um número que ninguém foi ver — que é a única mentira que esta demonstração pode contar.
    for (const achado of achados) {
      expect(achado.exemplo_ilustrativo, `${achado.id}`).toBeUndefined();
    }
  });
});

describe("os dois universos não se contaminam", () => {
  /**
   * O modo demo carrega o nome de um negócio REAL, por decisão do Founder em 09/08/2026: a
   * demonstração é feita para o dono do Açougue Mota ver a própria loja na tela.
   *
   * O seed é outra coisa. Ele reconstrói qualquer ambiente do piloto e roda no drill de schema a
   * cada CI; `CLAUDE.md` diz que ele nunca carrega nome real de mercado. A regra continua de pé —
   * o que mudou foi só onde o nome real pode aparecer.
   */
  it("o nome do açougue não entra no seed", () => {
    for (const termo of ["Açougue Mota", "Acougue Mota", "Mota"]) {
      expect(SEED, `o seed cita ${termo}`).not.toContain(termo);
    }
  });

  it("nenhum id da demonstração colide com id do seed", () => {
    // Ids iguais fariam uma linha de demonstração se passar por linha de banco em qualquer
    // consulta que cruzasse as duas — e a colisão só apareceria no dia do cruzamento.
    const idsDoSeed = new Set(SEED_PRODUTOS.map((p) => p.id));
    for (const produto of DEMO_PRODUCTS) {
      expect(idsDoSeed.has(produto.id), `${produto.id} colide com o seed`).toBe(false);
    }
    for (const mercado of DEMO_MARKETS) {
      expect(SEED, `o mercado ${mercado.id} colide com o seed`).not.toContain(mercado.id);
    }
  });
});

describe("os atalhos da busca não levam a lugar nenhum vazio", () => {
  /**
   * O atalho é o elemento mais clicável da primeira dobra. "Feijão" esteve aqui, o catálogo
   * nunca teve feijão, e o toque mais provável da demonstração levava a "nenhum produto
   * encontrado".
   *
   * A verificação é a MESMA que a busca faz: texto normalizado contém o termo normalizado.
   *
   * ELA MUDOU DE FONTE EM 09/08/2026, E A ANTIGA ESTAVA CONFERINDO O LUGAR ERRADO. Os atalhos
   * eram verificados contra `supabase/seed.sql` — mas staging roda em **modo demo**, onde a busca
   * lê `demo-catalog.ts` e não toca no banco. Ou seja: o teste aprovava o atalho num universo que
   * a demonstração não usa. Enquanto os dois universos eram cópias um do outro isso não aparecia;
   * agora que são ramos diferentes, o furo ficaria visível na primeira demonstração.
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
    const achatar = (v: string) =>
      v
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase();
    const normalizado = achatar(atalho);
    const casam = DEMO_PRODUCTS.filter((p) =>
      achatar([p.name, p.brand, p.variant, p.size_text].filter(Boolean).join(" ")).includes(
        normalizado,
      ),
    );
    expect(
      casam.length,
      `o atalho "${atalho}" da Home não corresponde a nenhum produto do catálogo de demonstração — na demonstração ele leva a "nenhum produto encontrado"`,
    ).toBeGreaterThan(0);
  });
});
