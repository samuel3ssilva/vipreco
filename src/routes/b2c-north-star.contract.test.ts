import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACOUGUE_MOTA,
  DEMO_MARKETS,
  DEMO_NATUREZA_DO_DADO,
  DEMO_PRODUCTS,
  PRODUTO_BUCHO,
  PRODUTO_DREAMIES,
  PRODUTO_ELSEVE,
  PRODUTO_FRANGO_INTEIRO,
  PRODUTO_SANOL,
  SAFRA,
  construirOfertasDemo,
  custoUnitarioDaOferta,
  grupoDoProduto,
  gruposDemo,
  imagemDoProdutoDemo,
} from "@/lib/demo-catalog";
import { buscarNoCatalogoDemo, compararNoCatalogoDemo } from "@/services/demo-source";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";
import { precoParaGramas } from "@/lib/peso-variavel";
import type { OfertaCardV2 } from "@/lib/card-v2";

/**
 * =============================================================================
 * O CONTRATO DA DEMO V2 — COMPARABLE PRODUCTS (mandato de 09/08/2026)
 * =============================================================================
 *
 * A instrução que continua valendo do mandato anterior: **"testar contrato, não pixel
 * específico."** Nada aqui afirma tamanho, cor ou classe. Cada asserção é uma promessa que
 * o produto faz — e as novas promessas do mandato v2 são numéricas: os preços de embalagem,
 * os normalizados e os preços de clube têm de ser exatamente os da planilha do Founder,
 * que é a fonte da verdade desta missão (§1: "Não inventar nenhum valor").
 */

const ROTAS = join(process.cwd(), "src/routes");

/** A fonte sem comentário — um teste que lê comentário mede o texto, não o programa. */
const semComentario = (fonte: string) =>
  fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("//"))
    .join("\n");

const ler = (arquivo: string) => semComentario(readFileSync(join(ROTAS, arquivo), "utf-8"));

const HOME = ler("index.tsx");
const BUSCA = ler("buscar.tsx");
const COMPARACAO = ler("produto.$productId.tsx");
const DETALHE = ler("produto_.$productId.oferta.$priceId.tsx");
const WHATSAPP = ler("whatsapp.tsx");
const SHELL = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf-8");

const TELAS = { HOME, BUSCA, COMPARACAO, DETALHE, WHATSAPP };

/** Dentro da janela real da coleta — ver `demo-opportunities.test.ts`. */
const AGORA = new Date("2026-08-09T18:00:00-03:00");

describe("as cinco telas existem, e são cinco", () => {
  it("cada uma é uma rota do produto", () => {
    for (const [nome, fonte] of Object.entries(TELAS)) {
      expect(fonte.length, `${nome} está vazia`).toBeGreaterThan(500);
    }
  });
});

describe("§10 antigo — duas abas, e a demo v2 não muda isso", () => {
  it("a navegação principal tem exatamente Achados e Buscar", () => {
    const rotas = [...SHELL.matchAll(/\{\s*to:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(rotas).toEqual(["/", "/buscar"]);
  });

  it("comparação, detalhe e WhatsApp NÃO viram aba", () => {
    const nav = SHELL.slice(SHELL.indexOf("const NAV"), SHELL.indexOf("] as const"));
    for (const proibida of ["Comparar", "Favoritos", "Mais", "WhatsApp"]) {
      expect(nav, `"${proibida}" virou aba`).not.toContain(proibida);
    }
  });
});

describe("nenhuma promessa que o piloto não sustenta", () => {
  const PROIBIDAS = [
    "melhor preço",
    "melhores preços",
    "melhores ofertas",
    "mais barato da cidade",
    "mais barato perto de você",
    "o melhor preço perto de você",
    "preços próximos",
    "mais perto",
    "ofertas reais",
    "tempo real",
    "estoque garantido",
    "cobertura total",
    "todos os dias",
    "todos os mercados",
    "parceiro oficial",
    "destaque garantido",
  ];

  it.each(Object.keys(TELAS))("%s não faz nenhuma promessa proibida", (nome) => {
    const fonte = TELAS[nome as keyof typeof TELAS].toLowerCase();
    for (const frase of PROIBIDAS) {
      expect(fonte, `${nome} contém "${frase}"`).not.toContain(frase);
    }
  });

  it('"mais barato" sem denominador não existe nas telas de comparação (§5)', () => {
    // Entre embalagens diferentes, "mais barato" sozinho é a ambiguidade que o mandato
    // proíbe: R$ 5,95 por 40 g é o menor desembolso E o pior custo do grupo Dreamies.
    // O que as telas podem dizer é "menor preço observado" (embalagem igual) e "melhor
    // custo/kg-L-un" (embalagens diferentes) — sempre nomeando a base.
    for (const [nome, fonte] of Object.entries({ BUSCA, COMPARACAO, DETALHE })) {
      expect(fonte.toLowerCase(), nome).not.toContain("mais barato");
    }
  });

  it("a tela de WhatsApp não promete frequência nenhuma", () => {
    for (const frase of ["por dia", "diariamente", "toda semana", "sempre que"]) {
      expect(WHATSAPP.toLowerCase(), `promete "${frase}"`).not.toContain(frase);
    }
  });
});

describe("§16 — localização mostrada só onde é validada", () => {
  it("Mota é de Artemis; Safra é loja única com endereço da planilha; redes não afirmam lugar", () => {
    expect(DEMO_MARKETS).toHaveLength(5);
    expect(ACOUGUE_MOTA.neighborhood).toBe("Artemis");
    expect(SAFRA.neighborhood).toBe("Mário Dedini");
    expect(SAFRA.address).toBe("Av. Luiz Ralf Benatti, 1001");
    for (const m of DEMO_MARKETS) {
      if (m.id === ACOUGUE_MOTA.id || m.id === SAFRA.id) continue;
      expect(m.neighborhood, m.name).toBeNull();
      expect(m.address, m.name).toBeNull();
    }
  });

  it("nenhuma tela fala em distância ou proximidade", () => {
    for (const [nome, fonte] of Object.entries(TELAS)) {
      for (const proibido of ["km de você", "a distância", "perto de você"]) {
        expect(fonte.toLowerCase(), `${nome} contém "${proibido}"`).not.toContain(proibido);
      }
    }
  });
});

describe("o dado da demonstração — planilha como fonte da verdade", () => {
  it("são 24 grupos comparáveis (todos os 'Igual/Alta' da planilha), GTIN nulo e `is_demo`", () => {
    // V3 §3: os 24 grupos que a planilha classifica como Tipo "Igual" com confiança Alta.
    // Os dois "Igual" que ficaram fora (sachês Dog Chow e Friskies) estão documentados no
    // cabeçalho do demo-catalog: gramatura do sachê não confirmada nos dois mercados.
    expect(DEMO_PRODUCTS).toHaveLength(24);
    for (const p of DEMO_PRODUCTS) {
      expect(p.gtin, `${p.name} tem GTIN`).toBeNull();
      expect(p.is_demo, `${p.name} não é demo`).toBe(true);
    }
  });

  /**
   * A REGRA DAS MARCAS VIROU DO AVESSO, POR ORDEM DO FOUNDER — E COM UMA CONDIÇÃO DURA.
   *
   * Até 09/08/2026 marca real era proibida: os preços eram inventados, e pendurar preço
   * inventado numa marca de verdade seria afirmação falsa sobre ela. Na demo v2 os preços
   * são os que os PRÓPRIOS mercados anunciaram nos encartes fornecidos — Liza a R$ 5,95 no
   * Savegnago é o que o encarte do Savegnago publicou. A condição que substitui a proibição:
   * **toda oferta declara a coleta de origem** (`source_reference`), e produto de marca só
   * carrega imagem recortada do material do mercado, nunca gerada
   * (`demo-opportunities.ilustrativas.test.ts`).
   */
  it("toda oferta de produto de marca declara a coleta de onde o preço veio", () => {
    let deMarca = 0;
    for (const o of construirOfertasDemo()) {
      if (o.product.brand === null) continue;
      deMarca += 1;
      expect(o.source_reference, `${o.id} sem coleta declarada`).toMatch(
        /Encarte|Tabloide|Foto|Painel|Cartaz/i,
      );
    }
    expect(deMarca).toBeGreaterThan(0);
  });

  it("toda oferta é demo nas três entidades, e nenhuma é 'exemplo ilustrativo'", () => {
    const ofertas = construirOfertasDemo();
    expect(ofertas).toHaveLength(49);
    for (const o of ofertas) {
      expect(o.is_demo && o.product.is_demo && o.market.is_demo, o.id).toBe(true);
      // O Mercado 2 morreu com a demo anterior: aqui TODO preço foi coletado de material
      // real, e uma linha de exemplo no meio deles diluiria exatamente essa afirmação.
      expect(o.exemplo_ilustrativo, o.id).toBeUndefined();
    }
  });

  it("o indicador de demonstração existe, é honesto e é o mesmo em todas as telas", () => {
    // §17/§18 do polish: a nota ficou curta ("Demonstração com preços observados em agosto
    // de 2026…") — moldura de snapshot, sem afirmar vigência, uma vez por tela.
    const nota = readFileSync(join(process.cwd(), "src/components/DemoNote.tsx"), "utf-8");
    expect(nota).toContain("DEMO_NATUREZA_DO_DADO");
    expect(DEMO_NATUREZA_DO_DADO).toContain("Demonstração");
    expect(DEMO_NATUREZA_DO_DADO).toContain("observados em agosto de 2026");
    for (const tela of [BUSCA, COMPARACAO, DETALHE, WHATSAPP]) {
      expect(tela).toContain("DemoNote");
    }
  });

  it("as validades são as reais dos encartes — nenhuma data sintética (§15)", () => {
    const validades = new Set(construirOfertasDemo().map((o) => o.valid_until));
    // null = balcão/foto (validade não anunciada); 09/08 = encartes Savegnago, Atacadão e
    // Pague Menos; 12/08 = tabloide Safra. Nada além destas três.
    expect(validades).toEqual(
      new Set([null, "2026-08-09T23:59:59-03:00", "2026-08-12T23:59:59-03:00"]),
    );
  });
});

describe("§0 — os números são os da planilha, sem inventar nem arredondar", () => {
  const porId = new Map(construirOfertasDemo().map((o) => [o.id, o]));
  const oferta = (id: string) => {
    const o = porId.get(id);
    expect(o, `oferta ${id} não existe`).toBeDefined();
    return o!;
  };

  it("preços de embalagem e por kg — coluna 'Preço cheio' do Detalhe por item", () => {
    const esperados: ReadonlyArray<[string, number]> = [
      ["demo-v2-frango-safra", 7.99],
      ["demo-v2-frango-mota", 9.99],
      ["demo-v2-bucho-mota", 24.99],
      ["demo-v2-bucho-safra", 25.99],
      ["demo-v2-bisteca-mota", 39.9],
      ["demo-v2-bisteca-safra", 39.99],
      ["demo-v2-cebola-savegnago", 4.45],
      ["demo-v2-cebola-mota", 5.99],
      ["demo-v2-oleo-savegnago", 5.95],
      ["demo-v2-oleo-safra", 6.99],
      ["demo-v2-farofa-savegnago", 4.75],
      ["demo-v2-farofa-safra", 4.99],
      ["demo-v2-dolce-atacadao", 16.99],
      ["demo-v2-dolce-savegnago", 18.9],
      ["demo-v2-lasanha-savegnago", 14.9],
      ["demo-v2-lasanha-safra", 16.99],
      ["demo-v2-tixan-savegnago", 18.7],
      ["demo-v2-tixan-paguemenos", 18.99],
      ["demo-v2-elseve-savegnago", 25.9],
      ["demo-v2-elseve-safra", 16.99],
      ["demo-v2-dreamies-atacadao", 7.9],
      ["demo-v2-dreamies-savegnago", 5.95],
      ["demo-v2-dreamies-paguemenos", 5.99],
      ["demo-v2-sanol-atacadao", 69.9],
      ["demo-v2-sanol-paguemenos", 22.99],
      // V3 — os 12 grupos novos, coluna 'Preço cheio' do Detalhe por item.
      ["demo-v3-linguica-savegnago", 16.9],
      ["demo-v3-linguica-safra", 17.99],
      ["demo-v3-abobora-safra", 2.79],
      ["demo-v3-abobora-savegnago", 2.95],
      ["demo-v3-chuchu-safra", 1.99],
      ["demo-v3-chuchu-savegnago", 2.95],
      ["demo-v3-melao-safra", 3.99],
      ["demo-v3-melao-savegnago", 4.98],
      ["demo-v3-corona-savegnago", 4.99],
      ["demo-v3-corona-atacadao", 6.35],
      ["demo-v3-heineken-atacadao", 6.19],
      ["demo-v3-heineken-savegnago", 6.39],
      ["demo-v3-original-safra", 3.79],
      ["demo-v3-original-savegnago", 47.88],
      ["demo-v3-semprelivre-savegnago", 29.95],
      ["demo-v3-semprelivre-paguemenos", 34.99],
      ["demo-v3-nivea-atacadao", 12.9],
      ["demo-v3-nivea-paguemenos", 14.99],
      ["demo-v3-rexona-safra", 14.99],
      ["demo-v3-rexona-atacadao", 18.9],
      ["demo-v3-sanolodor-atacadao", 11.9],
      ["demo-v3-sanolodor-paguemenos", 21.99],
      ["demo-v3-pedigree-atacadao", 74.9],
      ["demo-v3-pedigree-paguemenos", 99.99],
    ];
    expect(esperados).toHaveLength(49);
    for (const [id, preco] of esperados) {
      expect(oferta(id).price, id).toBe(preco);
    }
  });

  it("normalizados — os MESMOS valores que a planilha calculou, derivados e nunca armazenados", () => {
    // `custoUnitarioDaOferta` deriva de quantidade estruturada via `computeUnitPrice`; a
    // planilha normalizou à mão. Os dois têm de coincidir ao centavo — é a prova de que a
    // quantidade estruturada do fixture bate com a gramatura real de cada SKU.
    const esperados: ReadonlyArray<[string, number]> = [
      ["demo-v2-oleo-savegnago", 6.61],
      ["demo-v2-oleo-safra", 7.77],
      ["demo-v2-farofa-savegnago", 11.88],
      // ÚNICA DIVERGÊNCIA COM A PLANILHA, DE UM CENTAVO, E ELA É DO ARREDONDAMENTO DELA:
      // 4,99 ÷ 0,4 kg = 12,475 — um empate de meio centavo. O contrato do produto
      // (`unit-price.ts`, arredondamento comercial determinístico) dá 12,48; a planilha
      // mostrou 12,47 porque o ponto flutuante da célula caiu em 12,4749…. O preço cheio
      // (R$ 4,99) e a gramatura (400 g) são exatamente os da planilha — o que difere é só
      // a exibição do empate, e o produto não pode ter dois arredondamentos.
      ["demo-v2-farofa-safra", 12.48],
      ["demo-v2-dolce-atacadao", 1.7],
      ["demo-v2-dolce-savegnago", 1.89],
      ["demo-v2-lasanha-savegnago", 24.83],
      ["demo-v2-lasanha-safra", 28.32],
      ["demo-v2-tixan-savegnago", 8.5],
      ["demo-v2-tixan-paguemenos", 8.63],
      ["demo-v2-elseve-savegnago", 64.75],
      ["demo-v2-elseve-safra", 84.95],
      ["demo-v2-dreamies-atacadao", 98.75],
      ["demo-v2-dreamies-savegnago", 148.75],
      ["demo-v2-dreamies-paguemenos", 149.75],
      ["demo-v2-sanol-atacadao", 2.33],
      ["demo-v2-sanol-paguemenos", 3.28],
      // V3 — normalizados dos grupos novos, coluna 'Normalizado (cheio)' da planilha.
      ["demo-v3-corona-savegnago", 14.26],
      ["demo-v3-corona-atacadao", 18.14],
      ["demo-v3-heineken-atacadao", 18.76],
      ["demo-v3-heineken-savegnago", 19.36],
      ["demo-v3-original-safra", 10.83],
      ["demo-v3-original-savegnago", 11.4],
      ["demo-v3-semprelivre-savegnago", 0.94],
      ["demo-v3-semprelivre-paguemenos", 1.09],
      ["demo-v3-nivea-atacadao", 64.5],
      ["demo-v3-nivea-paguemenos", 74.95],
      ["demo-v3-rexona-safra", 99.93],
      ["demo-v3-rexona-atacadao", 126],
      ["demo-v3-sanolodor-atacadao", 5.95],
      // SEGUNDO EMPATE DE MEIO CENTAVO, mesmo caso da farofa: 21,99 ÷ 2 L = 10,995. O
      // arredondamento comercial determinístico do produto dá 11,00; a planilha exibiu
      // 10,99. Preço cheio (R$ 21,99) e volume (2 L) são exatamente os dela.
      ["demo-v3-sanolodor-paguemenos", 11],
      ["demo-v3-pedigree-atacadao", 7.42],
      ["demo-v3-pedigree-paguemenos", 9.9],
    ];
    for (const [id, unitario] of esperados) {
      expect(custoUnitarioDaOferta(oferta(id)), id).toBe(unitario);
    }
  });

  it("preços de clube — separados do cheio, com condição, nunca no lugar dele (§8)", () => {
    expect(oferta("demo-v2-cebola-savegnago").clube).toEqual({
      preco: 3.95,
      condicao: "no cartão Savegnago",
    });
    expect(oferta("demo-v2-lasanha-savegnago").clube).toEqual({
      preco: 13.9,
      condicao: "no cartão Savegnago",
    });
    expect(oferta("demo-v2-dolce-savegnago").clube).toEqual({
      preco: 15.9,
      condicao: "cada, levando 3 caixas",
    });
    // E os cheios continuam sendo os cheios: o clube não os substituiu.
    expect(oferta("demo-v2-cebola-savegnago").price).toBe(4.45);
    expect(oferta("demo-v2-lasanha-savegnago").price).toBe(14.9);
    expect(oferta("demo-v2-dolce-savegnago").price).toBe(18.9);
  });

  it("o cálculo de peso variável reproduz os exemplos literais do §3", () => {
    expect(precoParaGramas(7.99, 500)).toBe(4);
    expect(precoParaGramas(9.99, 500)).toBe(5);
    expect(precoParaGramas(24.99, 500)).toBe(12.5);
    expect(precoParaGramas(25.99, 500)).toBe(13);
    expect(precoParaGramas(24.99, 250)).toBe(6.25);
    expect(precoParaGramas(24.99, 1000)).toBe(24.99);
    // O caso que quebra sem aritmética de centavos: 39,90 × 0,25 = 9,975 → 9,98.
    expect(precoParaGramas(39.9, 250)).toBe(9.98);
  });
});

describe("as imagens — corretas ou ausentes, nunca aproximadas (§10)", () => {
  it("o mapa é a única fonte, e todo arquivo referenciado existe em disco", () => {
    const naPasta = new Set(readdirSync(join(process.cwd(), "public/img/demo/comparaveis")));
    let vistas = 0;
    for (const o of construirOfertasDemo()) {
      if (o.image == null) continue;
      vistas += 1;
      expect(o.image).toBe(imagemDoProdutoDemo(o.product_id));
      const arquivo = o.image.src.replace("/img/demo/comparaveis/", "");
      expect(naPasta, `${arquivo} não existe`).toContain(arquivo);
    }
    expect(vistas).toBeGreaterThan(0);
  });

  it("o produto-grupo de embalagens diferentes NÃO tem imagem própria", () => {
    // O grupo não tem uma embalagem; qualquer foto no título elegeria um dos tamanhos como
    // "o verdadeiro". As fotos vivem nas linhas, ao lado da gramatura de cada SKU.
    for (const grupo of [PRODUTO_ELSEVE, PRODUTO_DREAMIES, PRODUTO_SANOL]) {
      expect(imagemDoProdutoDemo(grupo.id), grupo.name).toBeNull();
    }
  });

  it("dentro de um grupo de embalagens diferentes, SKUs diferentes nunca dividem imagem", () => {
    for (const grupo of gruposDemo()) {
      if (grupo.basePorUnidade === undefined) continue;
      const porSku = new Map<string, string | null>();
      for (const s of grupo.sementes) {
        porSku.set(s.sku.id, imagemDoProdutoDemo(s.sku.id)?.src ?? null);
      }
      const comImagem = [...porSku.values()].filter((v) => v !== null);
      expect(new Set(comImagem).size, grupo.produto.name).toBe(comImagem.length);
    }
  });

  it("a Home mostra a MESMA imagem que a comparação", () => {
    for (const achado of buildDemoOpportunities(AGORA)) {
      const naComparacao = imagemDoProdutoDemo(achado.product_id);
      expect(achado.image?.src, `${achado.product.name} diverge entre Home e comparação`).toBe(
        naComparacao?.src,
      );
    }
  });
});

describe("§13 — golden flow A: bucho bovino, peso variável", () => {
  const comparacao = compararNoCatalogoDemo(PRODUTO_BUCHO.id, AGORA)!;
  const entries = comparacao.entries as unknown as OfertaCardV2[];

  it("dois mercados, Mota primeiro PORQUE tem o menor R$/kg — princípio 4", () => {
    expect(entries).toHaveLength(2);
    const menor = Math.min(...entries.map((e) => e.price));
    const doMota = entries.find((e) => e.market_id === ACOUGUE_MOTA.id)!;
    expect(doMota.price).toBe(menor);
    expect(entries[0].market_id).toBe(ACOUGUE_MOTA.id);
  });

  it("o grupo declara granel, e os 500 g calculados são os do mandato", () => {
    expect(comparacao.granel).toBe(true);
    expect(precoParaGramas(entries[0].price, 500)).toBe(12.5);
    expect(precoParaGramas(entries[1].price, 500)).toBe(13);
  });

  it("a ordem por R$/kg é a mesma para qualquer peso do seletor", () => {
    // O seletor muda o número exibido, nunca a posição: o denominador é o mesmo.
    for (const gramas of [250, 500, 1000]) {
      const calculados = entries.map((e) => precoParaGramas(e.price, gramas));
      expect([...calculados].sort((a, b) => a - b)).toEqual(calculados);
    }
  });
});

describe("§13 — golden flow B: Dreamies, embalagens diferentes", () => {
  const comparacao = compararNoCatalogoDemo(PRODUTO_DREAMIES.id, AGORA)!;
  const entries = comparacao.entries as unknown as OfertaCardV2[];

  it("três mercados, ordenados pelo custo/kg — e o grupo declara a base", () => {
    expect(comparacao.basePorUnidade).toBe("per_kg");
    expect(entries.map((e) => custoUnitarioDaOferta(e))).toEqual([98.75, 148.75, 149.75]);
    expect(entries.map((e) => e.market.name)).toEqual(["Atacadão", "Savegnago", "Pague Menos"]);
  });

  it("o primeiro NÃO é o menor desembolso — e é exatamente isso que o showcase prova (§6)", () => {
    expect(entries[0].price).toBe(7.9);
    const menorDesembolso = Math.min(...entries.map((e) => e.price));
    expect(menorDesembolso).toBe(5.95);
    expect(entries[0].price).not.toBe(menorDesembolso);
  });

  it("cada linha carrega o PRÓPRIO SKU, com a gramatura dele — princípio 1", () => {
    expect(entries.map((e) => e.product.size_text)).toEqual(["80 g", "40 g", "40 g"]);
    // E os dois de 40 g são o MESMO SKU: mesma embalagem, mercados diferentes.
    expect(entries[1].product_id).toBe(entries[2].product_id);
    expect(entries[0].product_id).not.toBe(entries[1].product_id);
  });

  it("§7 — Sanol Dog: melhor custo/un no Atacadão, sem afirmar menor desembolso", () => {
    const sanol = compararNoCatalogoDemo(PRODUTO_SANOL.id, AGORA)!;
    const linhas = sanol.entries as unknown as OfertaCardV2[];
    expect(sanol.basePorUnidade).toBe("per_un");
    expect(linhas.map((e) => custoUnitarioDaOferta(e))).toEqual([2.33, 3.28]);
    expect(linhas[0].price).toBe(69.9); // maior desembolso, melhor custo — as duas coisas na tela
  });
});

describe("o golden path continua navegável de ponta a ponta", () => {
  it("1. a Home abre pelo frango inteiro do Safra — o herói editorial da V3", () => {
    const [primeiro] = buildDemoOpportunities(AGORA);
    expect(primeiro.product_id).toBe(PRODUTO_FRANGO_INTEIRO.id);
    expect(primeiro.price).toBe(7.99);
    // O bucho revisado (V3 §5) continua na vitrine, pelo Mota — que segue sendo o menor
    // R$/kg do grupo dele.
    const bucho = buildDemoOpportunities(AGORA).find((o) => o.product_id === PRODUTO_BUCHO.id);
    expect(bucho!.market_id).toBe(ACOUGUE_MOTA.id);
  });

  it("2. buscar 'frango' devolve o frango inteiro, e nada de bovino", () => {
    const achados = buscarNoCatalogoDemo("frango");
    expect(achados.map((p) => p.name)).toEqual(["Frango inteiro"]);
  });

  it("3. em toda comparação, nenhum mercado aparece duas vezes", () => {
    for (const produto of DEMO_PRODUCTS) {
      const { entries } = compararNoCatalogoDemo(produto.id, AGORA)!;
      const mercados = entries.map((e) => e.market_id);
      expect(new Set(mercados).size, produto.name).toBe(mercados.length);
      expect(mercados.length, produto.name).toBeGreaterThanOrEqual(2);
    }
  });

  it("4. toda linha de toda comparação pertence ao grupo da rota, e a oferta existe", () => {
    const todas = new Set(construirOfertasDemo().map((o) => o.id));
    for (const produto of DEMO_PRODUCTS) {
      const grupo = grupoDoProduto(produto.id)!;
      const skusDoGrupo = new Set(grupo.sementes.map((s) => s.sku.id));
      for (const entry of compararNoCatalogoDemo(produto.id, AGORA)!.entries) {
        expect(skusDoGrupo.has(entry.product_id), `${entry.id} fora do grupo`).toBe(true);
        expect(todas, `a oferta ${entry.id} não existe no catálogo`).toContain(entry.id);
      }
    }
  });

  it("5. o detalhe oferece a saída para a tela de WhatsApp", () => {
    expect(DETALHE).toContain('to="/whatsapp"');
  });

  it("cada tela tem um caminho de volta", () => {
    for (const [nome, fonte] of Object.entries({ BUSCA, COMPARACAO, DETALHE, WHATSAPP })) {
      expect(fonte, `${nome} não tem seta de volta`).toContain("ArrowLeft");
    }
  });
});

describe("o detalhe não copia o que a referência não pode sustentar", () => {
  it("não existe preço riscado", () => {
    for (const proibido of ["line-through", "Preço anterior", "previous_price", "de R$"]) {
      expect(DETALHE, `o detalhe usa "${proibido}"`).not.toContain(proibido);
    }
  });

  it("não existe logotipo de mercado", () => {
    for (const proibido of ["logo", "market_logo", "brandmark"]) {
      expect(DETALHE.toLowerCase(), `o detalhe usa "${proibido}"`).not.toContain(proibido);
    }
  });

  it("a hierarquia do §14 está na ordem do DOM", () => {
    const ancoras = [
      "<h1",
      "observado neste mercado",
      'aria-label="Mercado"',
      // V4.2 §4: o prefixo "Condição desta oferta." saiu da copy; o bloco continua no
      // mesmo lugar da hierarquia e a âncora passa a ser o próprio campo renderizado.
      "oferta.special_condition",
      "Receber achados no WhatsApp",
      "Confiança da informação",
    ];
    const ordem = ancoras.map((a) => DETALHE.indexOf(a));
    for (const [i, pos] of ordem.entries()) {
      expect(pos, `âncora ausente: ${ancoras[i]}`).toBeGreaterThan(-1);
    }
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });
});

describe("a comparação não inventa a contagem nem a ordem", () => {
  it("o número de mercados vem do tamanho da lista, nunca de um literal", () => {
    expect(COMPARACAO).toContain("`Comparação em ${entries.length} mercados`");
    expect(COMPARACAO).not.toMatch(/Comparação em \d+ mercados/);
  });

  it("nada reordena a lista além do critério declarado do grupo", () => {
    for (const proibido of ["is_featured", "patrocinado", "parceiro", "boost"]) {
      expect(COMPARACAO, `a comparação usa "${proibido}"`).not.toContain(proibido);
    }
    // O preço de clube existe na tela e NÃO pode ordenar: a ordem é pelo preço cheio de
    // prateleira (princípio 4) ou pelo custo unitário derivado dele — nunca pelo efetivo.
    expect(COMPARACAO).not.toContain("clube.preco");
  });
});
