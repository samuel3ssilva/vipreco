import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";
import { construirOfertasDemo } from "@/lib/demo-catalog";

const NOW = new Date("2026-08-09T18:00:00-03:00");

/**
 * A fronteira das imagens da demonstração, medida — versão da demo v2 (mandato §10).
 *
 * =============================================================================
 * DUAS ORIGENS DE IMAGEM, DUAS REGRAS, E A LINHA ENTRE ELAS É TESTADA
 * =============================================================================
 *
 * **IA ilustrativa** — só para item de balcão SEM MARCA (frango, bucho, cebola). O `alt`
 * declara as duas coisas que um leitor de tela não tem como conferir: que a imagem é
 * ilustrativa e que foi gerada por IA.
 *
 * **Recorte de encarte** — só para produto DE MARCA, e só da arte que o próprio mercado
 * publicou no material fornecido pelo Founder. O `alt` declara a origem.
 *
 * O cruzamento proibido é o que o §10 escreve com todas as letras: **"NÃO gerar embalagem
 * falsa imitando marca."** Uma imagem gerada por IA num produto com `brand` preenchida
 * seria exatamente isso — e é o caso que este arquivo reprova, para sempre, não importa
 * quem edite o fixture.
 */
describe("as duas origens de imagem, e a linha entre elas", () => {
  const ofertas = construirOfertasDemo();

  it("imagem gerada por IA nunca aparece em produto de marca", () => {
    let iaVistas = 0;
    for (const oferta of ofertas) {
      if (oferta.image?.ilustrativa !== true) continue;
      iaVistas += 1;
      expect(
        oferta.product.brand,
        `${oferta.product.name}: embalagem gerada por IA em produto de marca é embalagem falsa (§10)`,
      ).toBeNull();
    }
    expect(
      iaVistas,
      "nenhuma imagem IA no catálogo; a fronteira não foi exercitada",
    ).toBeGreaterThan(0);
  });

  it("o alt da imagem IA declara o que ela é, e o que ela não é", () => {
    for (const oferta of ofertas) {
      if (oferta.image?.ilustrativa !== true) continue;
      expect(oferta.image.alt, oferta.id).toContain("ilustrativa");
      expect(oferta.image.alt, oferta.id).toContain("gerada por IA");
      expect(oferta.image.alt, oferta.id).toContain("não é a peça vendida");
    }
  });

  it("a imagem de produto de marca declara a origem: encarte do mercado ou foto do produto", () => {
    // Não é arte nossa, não é estúdio nosso: ou é a arte que o mercado publicou, ou é a
    // fotografia da embalagem real fornecida como asset (V4.1 §A). Dizer a origem é o que
    // separa "usamos material legítimo" de "fabricamos uma embalagem".
    let recortes = 0;
    let fotos = 0;
    for (const oferta of ofertas) {
      if (oferta.image == null || oferta.image.ilustrativa === true) continue;
      if (oferta.image.alt.includes("encarte do mercado")) {
        recortes += 1;
      } else {
        expect(oferta.image.alt, oferta.id).toContain("foto do produto");
        fotos += 1;
      }
    }
    expect(recortes).toBeGreaterThan(0);
    // As três fotos fornecidas na V4.1: Elseve 200 ml, Sanol 7 unidades, Original lata.
    expect(fotos).toBe(3);
  });

  it("toda oferta com imagem ilustrativa é `is_demo`, nas três entidades", () => {
    const comIlustracao = ofertas.filter((a) => a.image?.ilustrativa === true);
    expect(comIlustracao.length).toBeGreaterThan(0);
    for (const achado of comIlustracao) {
      expect(achado.is_demo, achado.id).toBe(true);
      expect(achado.product.is_demo, achado.id).toBe(true);
      expect(achado.market.is_demo, achado.id).toBe(true);
    }
  });

  it("toda imagem vive em `/img/demo/`, e o caminho diz o que ela é", () => {
    for (const achado of ofertas) {
      if (achado.image == null) continue;
      expect(achado.image.src, achado.id).toMatch(/^\/img\/demo\//);
    }
  });

  it("nenhuma oferta fica sem imagem — 28/28 SKUs com asset legítimo (V4.1)", () => {
    // A lista de placeholders deliberados chegou a zero em 10/08/2026, quando o Founder
    // forneceu as fotos dos três últimos SKUs (Elseve 200 ml, Sanol 7 unidades, Original
    // lata). O teste continua sendo a mesma guarda de sempre, no estado final: se um SKU
    // novo entrar sem asset, ele DEVE aparecer aqui como decisão consciente — nunca ser
    // "completado" com a imagem de outro tamanho, que é a aproximação que o princípio 11
    // proíbe.
    const semImagem = ofertas
      .filter((o) => o.image == null)
      .map((o) => `${o.product.brand ?? ""} ${o.product.size_text ?? ""}`.trim());
    expect(new Set(semImagem)).toEqual(new Set());
  });
});

describe("os arquivos das imagens", () => {
  const PASTA = join(process.cwd(), "public", "img", "demo");

  it("as imagens do catálogo B2C existem em disco, na pasta da demo v2", () => {
    const daPasta = readdirSync(join(PASTA, "comparaveis"));
    let conferidas = 0;
    for (const achado of buildDemoOpportunities(NOW)) {
      // A bisteca fica com o placeholder por decisão (§10) — os demais precisam apontar
      // para um arquivo que exista de verdade na pasta da demo v2.
      if (achado.image == null) continue;
      const src = achado.image.src;
      expect(src, achado.id).toMatch(/^\/img\/demo\/comparaveis\//);
      const nome = src.replace("/img/demo/comparaveis/", "");
      expect(daPasta, `${achado.id} aponta para um arquivo que não existe`).toContain(nome);
      conferidas += 1;
    }
    // Anti-vacuidade: uma Home que devolvesse zero imagens não teria conferido nada.
    expect(conferidas).toBeGreaterThan(4);
  });

  it("nenhum arquivo referenciado pelo catálogo ficou órfão em disco", () => {
    // O inverso do teste acima: asset em disco que nenhuma oferta referencia é peso morto
    // no deploy — e, pior, um convite a ser "aproveitado" para um SKU que não corresponde.
    const referenciados = new Set(
      construirOfertasDemo()
        .map((o) => o.image?.src.replace("/img/demo/comparaveis/", ""))
        .filter((s): s is string => s !== undefined),
    );
    for (const arquivo of readdirSync(join(PASTA, "comparaveis"))) {
      expect(referenciados.has(arquivo), `${arquivo} não é usado por nenhuma oferta`).toBe(true);
    }
  });

  /**
   * O legado SVG (`cafe.svg` e as embalagens de mercearia do laboratório) continua no
   * repositório: `/para-mercados` está CONGELADO e o laboratório visual ainda os exercita.
   * As garantias que valem para qualquer asset continuam medidas sobre eles.
   */
  const todosSvg = readdirSync(PASTA).filter((n) => n.endsWith(".svg"));

  it("nenhum texto desenhado nos SVGs legados nomeia marca real", () => {
    const REAIS = [
      "Camil",
      "Pilão",
      "Pilao",
      "Italac",
      "Liza",
      "Ypê",
      "Ype",
      "Neve",
      "Tio João",
      "Melitta",
      "Corações",
      "Qualy",
      "Piracanjuba",
      "Parmalat",
      "Omo",
      "Minerva",
      "Prato Fino",
    ];
    let textosLidos = 0;
    for (const nome of todosSvg) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      for (const m of svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) {
        textosLidos += 1;
        for (const marca of REAIS) {
          expect(m[1], `${nome} desenha a marca real "${marca}"`).not.toContain(marca);
        }
      }
    }
    expect(textosLidos, "nenhum texto foi lido; a verificação não comparou nada").toBeGreaterThan(
      10,
    );
  });

  it("nenhum SVG busca recurso de fora", () => {
    for (const nome of todosSvg) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      expect(svg, nome).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(svg, nome).not.toContain("<script");
    }
  });
});
