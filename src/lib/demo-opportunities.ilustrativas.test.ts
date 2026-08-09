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
      // "Ilustração" continua obrigatório; o que mudou foi o resto da frase, junto com o
      // desenho. Antes o alt dizia "não é a embalagem do produto" porque o desenho era um
      // pictograma de categoria. Agora ele É uma embalagem — fictícia —, e a afirmação que
      // precisa continuar sendo feita é a outra: não é FOTO. É essa a que o princípio 11
      // protege, e é a única que um leitor de tela não tem como conferir olhando.
      expect(alt, achado.id).toContain("Ilustração");
      expect(alt, achado.id).toContain("não é foto do produto");
      expect(alt, achado.id).toContain("fictícia");
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
  const todos = readdirSync(PASTA).filter((n) => n.endsWith(".svg"));

  /**
   * `cafe.svg` é o pictograma antigo, e ele continua no repositório por uma razão de escopo:
   * `/para-mercados` o referencia, e o Founder CONGELOU a experiência B2B nesta rodada. Apagá-lo
   * teria sido "aproveitar a rodada para alinhar o B2B", que o §19 proíbe com todas as letras.
   *
   * Ele fica fora das asserções de EMBALAGEM — que descrevem a coleção nova do B2C — e continua
   * dentro das asserções que valem para qualquer asset: nada de marca real, nada de recurso
   * externo. É a fronteira certa: o que muda é a direção visual do B2C, não a política.
   */
  const LEGADO_B2B = new Set(["cafe.svg"]);
  const arquivos = todos.filter((n) => !LEGADO_B2B.has(n));

  it("existem, e todos são SVG versionado", () => {
    expect(arquivos.length).toBeGreaterThan(0);
    for (const achado of buildDemoOpportunities()) {
      const nome = achado.image?.src.replace("/img/demo/", "") ?? "";
      expect(arquivos, `${achado.id} aponta para um arquivo que não existe`).toContain(nome);
    }
  });

  it("cada um se declara embalagem fictícia no próprio arquivo", () => {
    // O comentário no SVG não é decoração: quem abre o arquivo solto, fora do repositório,
    // precisa saber o que ele é e o que ele não é.
    for (const nome of arquivos) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      expect(svg, nome).toContain("FICTÍCIA");
      expect(svg, nome).toMatch(/sem logotipo, sem trade dress|sem logotipo, sem trade dress/);
    }
  });

  /**
   * =============================================================================
   * A REGRA MUDOU, E O QUE ELA PROTEGE NÃO MUDOU
   * =============================================================================
   *
   * Até 08/08/2026 esta asserção era **"nenhum SVG carrega `<text>`"**, com a justificativa de
   * que "sem texto, o asset não tem como afirmar nada sobre produto nenhum". Era uma boa
   * aproximação enquanto os desenhos eram pictogramas de categoria.
   *
   * O Founder reprovou aqueles desenhos e mandou o contrário: embalagem fictícia com rótulo,
   * qualidade de catálogo, "sem logo real, sem trade dress copiado". Uma embalagem sem rótulo
   * não é uma embalagem — é um pictograma —, então a proibição de `<text>` passou a proibir a
   * própria coisa pedida.
   *
   * **Proibir texto nunca foi o objetivo; proibir MARCA REAL era.** A asserção agora mede
   * isso diretamente: lê cada string desenhada e exige que nenhuma nomeie uma marca que
   * existe. É uma verificação mais forte que a anterior, porque a anterior nem sequer olhava
   * para o conteúdo — um SVG com o logotipo da Pilão em `<path>` passava por ela.
   */
  it("nenhum texto desenhado nomeia marca real", () => {
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
    for (const nome of todos) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      // só o conteúdo desenhado; o comentário de cabeçalho cita marca nenhuma, mas o que
      // importa aqui é o que aparece NA TELA.
      for (const m of svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)) {
        textosLidos += 1;
        for (const marca of REAIS) {
          expect(m[1], `${nome} desenha a marca real "${marca}"`).not.toContain(marca);
        }
      }
    }
    // Anti-vacuidade: sem isto, um SVG sem `<text>` nenhum faria o laço não rodar e o teste
    // passar sem ter comparado coisa alguma — que é exatamente o defeito da regra anterior.
    expect(textosLidos, "nenhum texto foi lido; a verificação não comparou nada").toBeGreaterThan(
      10,
    );
  });

  it("nenhum busca recurso de fora", () => {
    for (const nome of todos) {
      const svg = readFileSync(join(PASTA, nome), "utf-8");
      expect(svg, nome).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(svg, nome).not.toContain("<script");
    }
  });
});
