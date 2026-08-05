import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARES_DE_CONTRASTE,
  TOKENS,
  contraste,
  hexParaRgb,
  luminancia,
  resolverValor,
  tokensDoGrupo,
} from "./tokens";

/**
 * R3.1 — os tokens só valem alguma coisa se o catálogo e o CSS não puderem divergir.
 *
 * O risco concreto é chato e silencioso: alguém ajusta um hex em `styles.css`, ninguém
 * ajusta `tokens.ts`, e a partir daí o laboratório visual mostra uma paleta que o produto
 * não usa. O Founder aprova um screenshot de uma cor que não existe.
 *
 * Este arquivo amarra os dois lados e mede o contraste sobre os valores reais.
 */
const STYLES = readFileSync(join(process.cwd(), "src", "styles.css"), "utf-8");

/** Lê `--nome: valor;` de `styles.css`. Devolve `null` quando o token não está declarado. */
function declaradoNoCss(nome: string): string | null {
  // O `[^;]*` para no `;` e o `m` prende a busca a uma linha, então um token cujo nome é
  // prefixo de outro (`--vp-sp-1` e `--vp-sp-16`) não casa com o vizinho: o `\s*:` logo
  // depois do nome exige que o nome termine ali.
  const casado = new RegExp(`^\\s*${nome}\\s*:\\s*([^;]*);`, "m").exec(STYLES);
  return casado === null ? null : casado[1]!.trim();
}

describe("o catálogo de tokens não pode divergir de styles.css", () => {
  it.each(TOKENS.map((t) => [t.nome, t.valor] as const))(
    "%s está declarado no CSS com o valor do catálogo",
    (nome, valor) => {
      const noCss = declaradoNoCss(nome);
      expect(noCss, `${nome} não está declarado em src/styles.css`).not.toBeNull();
      expect(noCss).toBe(valor);
    },
  );

  it("e a leitura do CSS realmente reprova quando o valor muda", () => {
    // Controle positivo. Um teste que só passa não distingue "está tudo alinhado" de "a
    // leitura não funciona", e as duas coisas parecem iguais no log do CI.
    expect(declaradoNoCss("--vp-green")).toBe("#0e5c3c");
    expect(declaradoNoCss("--vp-token-que-nao-existe")).toBeNull();
  });

  it("nenhum token aparece duas vezes no catálogo", () => {
    const nomes = TOKENS.map((t) => t.nome);
    expect(new Set(nomes).size).toBe(nomes.length);
  });

  it("todo token do catálogo é um `--vp-*`", () => {
    // A camada de compatibilidade do shadcn (`--primary`, `--card`…) aponta para estes, e
    // não o contrário. Catalogar os dois lados criaria duas fontes para a mesma cor.
    for (const t of TOKENS) expect(t.nome).toMatch(/^--vp-/);
  });
});

describe("resolverValor segue a referência até o valor literal", () => {
  it("resolve token que aponta para outro", () => {
    expect(resolverValor("--vp-bg-page")).toBe("#fbf7ec");
    expect(resolverValor("--vp-action")).toBe("#0e5c3c");
    // Duas saltos: --vp-text-strong → --vp-ink → literal.
    expect(resolverValor("--vp-text-strong")).toBe("#10231c");
  });

  it("devolve o literal direto quando não há referência", () => {
    expect(resolverValor("--vp-text-muted")).toBe("#5b6b63");
  });

  it("devolve null para token desconhecido", () => {
    expect(resolverValor("--vp-inexistente")).toBeNull();
  });
});

describe("contraste — a aritmética do WCAG", () => {
  it("preto sobre branco é 21:1", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("a mesma cor contra si mesma é 1:1", () => {
    expect(contraste("#0e5c3c", "#0e5c3c")).toBeCloseTo(1, 5);
  });

  it("é simétrico", () => {
    expect(contraste("#10231c", "#fbf7ec")).toBeCloseTo(contraste("#fbf7ec", "#10231c")!, 10);
  });

  it("recusa o que não for hex de 6 dígitos, em vez de inventar um número", () => {
    expect(hexParaRgb("var(--vp-cream)")).toBeNull();
    expect(hexParaRgb("#fff")).toBeNull();
    expect(contraste("#000000", "rgb(0 0 0)")).toBeNull();
  });

  it("luminância cresce do preto ao branco", () => {
    expect(luminancia([0, 0, 0])).toBeCloseTo(0, 5);
    expect(luminancia([255, 255, 255])).toBeCloseTo(1, 5);
  });
});

describe("todo par de contraste da fundação atinge o mínimo do WCAG 2.2", () => {
  it.each(PARES_DE_CONTRASTE.map((p) => [p.onde, p] as const))("%s", (_onde, par) => {
    const frente = resolverValor(par.frente);
    const fundo = resolverValor(par.fundo);
    expect(frente, `${par.frente} não resolve para literal`).not.toBeNull();
    expect(fundo, `${par.fundo} não resolve para literal`).not.toBeNull();

    const razao = contraste(frente!, fundo!);
    expect(razao, `${par.frente} sobre ${par.fundo} não é calculável`).not.toBeNull();
    expect(
      razao!,
      `${par.onde}: ${par.frente} sobre ${par.fundo} mede ${razao!.toFixed(2)}:1, mínimo ${par.minimo}:1`,
    ).toBeGreaterThanOrEqual(par.minimo);
  });

  it("e a verificação reprova de verdade quando um par é ruim", () => {
    // Controle positivo: sem ele, um erro que fizesse `contraste` devolver sempre um
    // número grande passaria a suíte inteira em silêncio.
    expect(contraste("#7a8880", "#fbf7ec")!).toBeLessThan(4.5);
  });
});

describe("o amarelo de marca continua restrito", () => {
  it("o catálogo carrega a restrição junto do token, e não num documento à parte", () => {
    const amarelo = TOKENS.find((t) => t.nome === "--vp-yellow");
    expect(amarelo?.nota).toMatch(/RESTRITO/);
  });

  it("`--vp-yellow` não é usado como fundo ou borda em componente nenhum", () => {
    // Princípio 4 do contrato visual: amarelo abundante vira alarme, e alarme falso é o
    // começo da desconfiança. A checagem é sobre uso, não sobre existência.
    const componentes = readFileSync(join(process.cwd(), "src", "styles.css"), "utf-8");
    const usos = [...componentes.matchAll(/var\(--vp-yellow\)/g)];
    // Só a definição de `--vp-contribute` pode referenciá-lo.
    expect(usos.length).toBeLessThanOrEqual(1);
  });
});

describe("cobertura de grupos — a fundação não pode ter buraco", () => {
  it.each([
    "cor-base",
    "cor-texto",
    "cor-superficie",
    "cor-acao",
    "cor-estado",
    "tipografia-familia",
    "tipografia-tamanho",
    "tipografia-peso",
    "espaco",
    "raio",
    "sombra",
    "medida",
    "movimento",
    "icone",
  ] as const)("o grupo %s tem pelo menos um token", (grupo) => {
    expect(tokensDoGrupo(grupo).length).toBeGreaterThan(0);
  });

  it("a escala de espaço é monotônica em px", () => {
    const px = tokensDoGrupo("espaco").map((t) => Number.parseInt(t.valor, 10));
    for (let i = 1; i < px.length; i += 1) {
      expect(px[i]!, `escala fora de ordem em ${i}`).toBeGreaterThan(px[i - 1]!);
    }
  });

  it("o alvo de toque mínimo é 48 px, e não 44", () => {
    // O mínimo histórico de 44 px vale para os controles que já existiam. Tudo que a
    // fundação visual introduz nasce em 48.
    expect(resolverValor("--vp-tap-min")).toBe("48px");
  });
});
