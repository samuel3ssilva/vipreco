import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * R3.1A — a tipografia de marca é servida pelo próprio build.
 *
 * O QUE ESTE ARQUIVO PROTEGE
 *
 * 1. QUE NÃO VOLTE A EXISTIR CHAMADA EXTERNA PARA FONTE. Enquanto as três famílias vinham
 *    de fonts.googleapis.com, três coisas dependiam de rede: a primeira pintura de
 *    qualquer visitante, o screenshot de revisão e qualquer teste que quisesse afirmar
 *    algo sobre o que a página desenha. Um `<link>` reintroduzido desfaz as três de uma
 *    vez, e desfaz em silêncio — a página continua parecendo certa em quem tem cache.
 *
 * 2. QUE O CONJUNTO DE PESOS NÃO MUDE POR DESCUIDO. Este é o ponto delicado. A Home
 *    escreve `.font-data` em peso 400 e em 700, e nenhum dos dois existe entre as faces
 *    importadas (500 e 600). Hoje o 400 cai na 500 e o 700 cai na 600 — verificado no
 *    navegador por impressão digital de canvas: 400 e 500 pintam pixels idênticos, 500 e
 *    700 diferem em 2669 pixels.
 *
 *    Isso quer dizer que IMPORTAR UM PESO A MAIS MUDA A HOME. Adicionar a face 400 faria
 *    o preço afinar; adicionar a 700 faria engrossar. Nenhuma das duas é uma decisão de
 *    infraestrutura — são decisões de design, e §0 do mandato mantém a Home intocada.
 *    O teste falha no acréscimo, não só na remoção.
 *
 * 3. QUE A FAMÍLIA VARIÁVEL VENHA ANTES DA ESTÁTICA NO TOKEN. Os pacotes
 *    @fontsource-variable declaram nomes próprios ("Public Sans Variable"), e um nome que
 *    não casa não é fallback elegante: é a página perdendo a face sem avisar. Também não
 *    é detalhe estético — o Google servia a variável, e só a variável reproduz o desenho
 *    anterior. Trocada pela estática, a impressão digital de Public Sans 400 mudava de
 *    `435060b3` para `ed5f9f78`. Medido, não suposto.
 */

const STYLES = readFileSync(new URL("../styles.css", import.meta.url), "utf-8");
const ROOT = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf-8");
const CSP = readFileSync(new URL("../lib/security-headers.ts", import.meta.url), "utf-8");
const PACKAGE = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf-8"));

/** Exatamente o conjunto que a URL antiga do Google pedia. Nem um a mais. */
const IMPORTS_ESPERADOS = [
  "@fontsource-variable/bricolage-grotesque/opsz.css",
  "@fontsource-variable/public-sans/index.css",
  "@fontsource/ibm-plex-mono/latin-500.css",
  "@fontsource/ibm-plex-mono/latin-600.css",
] as const;

/**
 * Remove comentário antes de procurar o host.
 *
 * Sem isto, o teste reprovava o comentário que EXPLICA a remoção — e o único jeito de
 * ficar verde seria apagar a explicação, deixando um `<link rel="stylesheet">` mudo onde
 * antes havia um motivo. É o mesmo raciocínio do teste de anticircularidade de R2.4, que
 * remove literal de texto antes de comparar identificador: a guarda tem que olhar o que
 * o arquivo FAZ, não o que ele conta sobre si.
 */
function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

describe("a fonte de marca não depende de rede", () => {
  it("nenhum arquivo do app aponta para o Google Fonts", () => {
    for (const [nome, bruto] of [
      ["styles.css", STYLES],
      ["__root.tsx", ROOT],
    ] as const) {
      const conteudo = semComentario(bruto);
      expect(conteudo, `${nome} ainda menciona fonts.googleapis.com`).not.toContain(
        "fonts.googleapis.com",
      );
      expect(conteudo, `${nome} ainda menciona fonts.gstatic.com`).not.toContain(
        "fonts.gstatic.com",
      );
    }
  });

  it("o CSP não permite mais origem externa de fonte nem de estilo", () => {
    expect(CSP).toContain(`"font-src 'self'"`);
    expect(CSP).toContain(`"style-src 'self' 'unsafe-inline'"`);
    expect(CSP).not.toContain("fonts.gstatic.com'");
  });

  it("os arquivos .woff2 estão instalados no disco, e não são baixados no build", () => {
    // Sem os bytes presentes, `bun run build` precisaria de rede — que é exatamente a
    // dependência que este pacote existe para remover.
    const woff2 = new URL(
      "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      import.meta.url,
    );
    expect(existsSync(woff2)).toBe(true);
  });
});

describe("o conjunto de pesos é o mesmo de antes — mudá-lo mudaria a Home", () => {
  it("importa exatamente as quatro folhas esperadas", () => {
    const importados = [...STYLES.matchAll(/@import "(@fontsource[^"]+)"/g)].map((m) => m[1]);
    expect([...importados].sort()).toEqual([...IMPORTS_ESPERADOS].sort());
  });

  it.each([
    ["latin-400", "afinaria o preço da Home"],
    ["latin-700", "engrossaria o preço da Home"],
    ["latin-300", "não é usado por nada"],
  ])("não importa IBM Plex Mono %s — %s", (peso) => {
    expect(STYLES).not.toContain(`@fontsource/ibm-plex-mono/${peso}`);
  });

  it("as dependências de fonte estão com versão fixada, sem intervalo", () => {
    const fontes = Object.entries(PACKAGE.dependencies as Record<string, string>).filter(([n]) =>
      n.startsWith("@fontsource"),
    );
    expect(fontes.length).toBe(3);
    for (const [nome, versao] of fontes) {
      expect(versao, `${nome} não está fixado`).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("os tokens apontam para as famílias que os pacotes realmente declaram", () => {
  it.each([
    ["--vp-font-display", "Bricolage Grotesque Variable", "Bricolage Grotesque"],
    ["--vp-font-body", "Public Sans Variable", "Public Sans"],
  ])("%s tem a variável antes da estática", (token, variavel, estatica) => {
    const bloco = STYLES.match(new RegExp(`${token}:([^;]*);`))?.[1];
    expect(bloco, `${token} não encontrado`).toBeDefined();
    const posVariavel = bloco!.indexOf(variavel);
    const posEstatica = bloco!.indexOf(`"${estatica}"`);
    expect(posVariavel).toBeGreaterThanOrEqual(0);
    expect(posEstatica).toBeGreaterThan(posVariavel);
  });

  it("a IBM Plex Mono não ganhou sufixo Variable — esse pacote não existe", () => {
    // Checado no registro: só há @fontsource/ibm-plex-mono estático. Escrever
    // "IBM Plex Mono Variable" no token deixaria o preço sem face nenhuma.
    expect(STYLES).not.toContain("IBM Plex Mono Variable");
  });
});
