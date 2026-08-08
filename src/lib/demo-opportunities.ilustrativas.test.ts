import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";

/**
 * R3.3B §5 — a fronteira das ilustrações genéricas, medida.
 *
 * =============================================================================
 * A AUTORIZAÇÃO E A PROIBIÇÃO VIERAM NO MESMO PARÁGRAFO
 * =============================================================================
 *
 * O mandato liberou criar assets visuais "GENÉRICOS e claramente fictícios que representem
 * categorias de supermercado, sem copiar embalagem real, marca real, logotipo real ou trade
 * dress de terceiros" — e fechou com "não tratar imagem ilustrativa como correspondência real
 * de SKU".
 *
 * As duas frases juntas descrevem um risco preciso, e ele não é o de hoje: é o de amanhã, quando
 * existir foto de verdade e alguém precisar decidir o que pode ser publicado ao lado de um preço
 * de piloto. Uma ilustração de categoria colada num SKU real é exatamente a "imagem aproximada"
 * que o princípio 11 e o `IMAGE-POLICY.md` proíbem.
 *
 * Este arquivo transforma a proibição em portão. Ele não confia no comentário nem na intenção de
 * quem escreveu o fixture: interroga o dado.
 */
describe("ilustração genérica só existe em dado de demonstração", () => {
  const achados = buildDemoOpportunities();

  it("toda oferta com imagem ilustrativa é `is_demo`, nas três entidades", () => {
    const comIlustracao = achados.filter((a) => a.image?.ilustrativa === true);
    expect(comIlustracao.length).toBeGreaterThan(0);
    for (const achado of comIlustracao) {
      expect(achado.is_demo, achado.id).toBe(true);
      expect(achado.product.is_demo, achado.id).toBe(true);
      expect(achado.market.is_demo, achado.id).toBe(true);
    }
  });

  it("toda ilustração vive em `/img/demo/`, e o caminho diz o que ela é", () => {
    // A pasta é parte da garantia: um asset de produção não chega aqui por engano de import,
    // e uma revisão que veja `/img/demo/` num registro de piloto sabe na hora que está errado.
    for (const achado of achados) {
      if (achado.image === null || achado.image === undefined) continue;
      expect(achado.image.src, achado.id).toMatch(/^\/img\/demo\//);
    }
  });

  it("o texto alternativo declara que é ilustração, e não foto do produto", () => {
    // Quem usa leitor de tela é justamente quem não pode conferir olhando que aquilo é um
    // desenho. Chamar de "foto" seria a afirmação que o princípio 11 proíbe.
    for (const achado of achados) {
      const alt = achado.image?.alt ?? "";
      expect(alt, achado.id).toContain("Ilustração genérica");
      expect(alt, achado.id).toContain("não é a embalagem do produto");
      expect(alt.toLowerCase(), achado.id).not.toContain("foto");
    }
  });

  it("nenhuma marca real aparece no fixture", () => {
    // O assessment da North Star V2 já tinha rejeitado marcas reais nas telas. R3.3B fechou a
    // ponta do dado: um desenho genérico ao lado do nome de uma marca existente representa a
    // embalagem daquela marca, por mais genérico que seja o traço.
    const reais = ["Camil", "Pilão", "Italac", "Tio João", "Melitta", "3 Corações", "Ypê"];
    for (const achado of achados) {
      for (const marca of reais) {
        expect(achado.product.brand ?? "", `${achado.id} cita "${marca}"`).not.toContain(marca);
      }
    }
  });
});

describe("os arquivos das ilustrações", () => {
  const PASTA = join(process.cwd(), "public", "img", "demo");
  const arquivos = readdirSync(PASTA).filter((n) => n.endsWith(".svg"));

  it("existem, e todos são SVG versionado", () => {
    expect(arquivos.length).toBeGreaterThan(0);
    for (const achado of buildDemoOpportunities()) {
      const nome = achado.image?.src.replace("/img/demo/", "") ?? "";
      expect(arquivos, `${achado.id} aponta para um arquivo que não existe`).toContain(nome);
    }
  });

  it("cada um se declara ilustração genérica no próprio arquivo", () => {
    // O comentário no SVG não é decoração: quem abre o arquivo solto, fora do repositório,
    // precisa saber o que ele é e o que ele não é.
    for (const nome of arquivos) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      expect(svg, nome).toContain("ilustração GENÉRICA");
      expect(svg, nome).toContain("Não representa nenhuma embalagem, marca, logotipo");
    }
  });

  it("nenhum carrega texto — desenho não vira rótulo de embalagem", () => {
    // Um `<text>` dentro do SVG seria o começo de uma marca desenhada. Sem texto, o asset não
    // tem como afirmar nada sobre produto nenhum.
    for (const nome of arquivos) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      expect(svg, nome).not.toMatch(/<text[\s>]/);
    }
  });

  it("nenhum busca recurso de fora", () => {
    for (const nome of arquivos) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      expect(svg, nome).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(svg, nome).not.toContain("<script");
    }
  });
});
