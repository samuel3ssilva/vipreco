/**
 * Cascata do CSS *gerado*, não do arquivo fonte.
 *
 * O Tailwind v4 reordena as utilities no build pelo conjunto de propriedades que cada uma
 * declara — a ordem em `src/styles.css` não sobrevive. Foi o que tirou a borda do botão de
 * compartilhar no staging: `.btn-quiet` saiu depois de `.border-border` no CSS de build e o
 * atalho `border: 1px solid transparent` apagou a cor.
 *
 * A correção não briga com essa ordem: `btn-quiet` lê `--btn-quiet-border` e quem quer a borda
 * visível define a variável. Duas propriedades diferentes nunca disputam a cascata. Este teste
 * compila o CSS de verdade e prova que a disputa deixou de existir.
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { compile } from "tailwindcss";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BOTAO_COMPARTILHAR = [
  "btn-base",
  "btn-quiet",
  "btn-quiet-bordered",
  "btn-sm",
  "btn-touch-48",
];

/** Resolve um `@import` como o Vite resolve: relativo ao arquivo, ou pacote em `node_modules`. */
function resolverFolha(id: string, base: string): string {
  if (id.startsWith(".")) return resolve(base, id);
  if (id === "tailwindcss") return resolve(ROOT, "node_modules/tailwindcss/index.css");

  const pacote = resolve(ROOT, "node_modules", id);
  if (statSync(pacote, { throwIfNoEntry: false })?.isDirectory()) {
    const manifesto = JSON.parse(readFileSync(resolve(pacote, "package.json"), "utf-8"));
    const entrada = manifesto.exports?.["."]?.style ?? manifesto.style ?? manifesto.main;
    return resolve(pacote, entrada);
  }
  return pacote;
}

async function compilarCss(candidatos: readonly string[]): Promise<string> {
  const compilador = await compile(readFileSync(resolve(ROOT, "src/styles.css"), "utf-8"), {
    base: resolve(ROOT, "src"),
    loadStylesheet: async (id: string, base: string) => {
      const caminho = resolverFolha(id, base);
      return { path: caminho, base: dirname(caminho), content: readFileSync(caminho, "utf-8") };
    },
  });
  return compactar(compilador.build([...candidatos]));
}

/** O compilador devolve CSS formatado; o navegador recebe minificado. Compara-se o conteúdo. */
function compactar(css: string): string {
  return css.replace(/\s+/g, " ").replace(/\s*([{};:,])\s*/g, "$1");
}

/** Posição de uma regra no CSS gerado. -1 quando a regra não existe. */
function posicao(css: string, seletor: string): number {
  return css.search(new RegExp(`\\${seletor}(?![\\w-])`));
}

let css = "";

beforeAll(async () => {
  // A lista inclui `border-border` de propósito: é a classe que perdia a disputa antiga.
  css = await compilarCss([...BOTAO_COMPARTILHAR, "border-border"]);
}, 30_000);

describe("borda do botão discreto", () => {
  it("a correção não depende da ordem entre `.btn-quiet` e `.border-border`", () => {
    // As duas continuam no CSS e podem sair em qualquer ordem — quem decide é o Tailwind, e a
    // ordem chega a mudar conforme o conjunto de classes compilado. O que mudou é que elas não
    // disputam mais a mesma propriedade neste botão.
    expect(posicao(css, ".btn-quiet")).toBeGreaterThan(-1);
    expect(posicao(css, ".border-border")).toBeGreaterThan(-1);
  });

  it("`btn-quiet` lê a cor da borda de uma variável, nunca de um valor fixo", () => {
    const regra = css.slice(posicao(css, ".btn-quiet"));
    expect(regra).toContain("border-color:var(--btn-quiet-border,");
  });

  it("não sobrou nenhum atalho `border:` em `btn-quiet` para apagar a cor", () => {
    const regra = css.slice(posicao(css, ".btn-quiet"), posicao(css, ".btn-quiet") + 400);
    expect(regra).not.toMatch(/[;{]border:/);
  });

  it("uma única regra em todo o CSS define `--btn-quiet-border` — não há disputa possível", () => {
    const definicoes = css.match(/--btn-quiet-border:/g) ?? [];
    expect(definicoes).toHaveLength(1);
    expect(css).toContain(".btn-quiet-bordered{--btn-quiet-border:var(--color-border);}");
  });

  it("sem a classe de borda, o botão discreto continua sem borda visível", async () => {
    const semBorda = await compilarCss(["btn-base", "btn-quiet", "btn-sm"]);
    expect(semBorda).not.toContain("--btn-quiet-border:");
    // Sem ninguém definindo a variável, vale o fallback declarado em `btn-quiet`.
    expect(semBorda).toContain("border-color:var(--btn-quiet-border,transparent)");
  }, 30_000);
});

describe("nenhum componente volta a depender da cascata perdida", () => {
  const COMPONENTES = ["ShareAchadoButton.tsx", "UsualMarketPicker.tsx"];

  it("quem usa `btn-quiet` e quer borda usa `btn-quiet-bordered`, nunca `border-border`", () => {
    for (const arquivo of COMPONENTES) {
      const fonte = readFileSync(resolve(ROOT, "src/components", arquivo), "utf-8");
      for (const classe of fonte.match(/className="[^"]*btn-quiet[^"]*"/g) ?? []) {
        expect(classe, `${arquivo}: ${classe}`).not.toContain("border-border");
      }
    }
  });

  it("o botão de compartilhar pede a borda pela classe que funciona", () => {
    const fonte = readFileSync(resolve(ROOT, "src/components/ShareAchadoButton.tsx"), "utf-8");
    expect(fonte).toContain("btn-quiet btn-quiet-bordered");
  });
});

describe("alvo de toque do mesmo botão", () => {
  it("`btn-touch-48` vence `btn-base` e `btn-sm` no CSS gerado", () => {
    // Aqui a garantia ainda é de ordem — as três declaram `min-height`. O teste prova a ordem
    // no artefato que o navegador recebe, que é onde ela importa.
    const touch48 = posicao(css, ".btn-touch-48");
    expect(touch48).toBeGreaterThan(posicao(css, ".btn-base"));
    expect(touch48).toBeGreaterThan(posicao(css, ".btn-sm"));
    expect(css.slice(touch48, touch48 + 60)).toContain("min-height:3rem");
  });
});
