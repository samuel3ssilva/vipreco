import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  dimensoesWebp,
  nomeDeFotoValido,
  problemasDoSvgIlustrativo,
  validarPasta,
  LIMITES,
} from "./validar-imagens";

/**
 * IMAGE-0 — os testes do validador.
 *
 * O que eles precisam provar não é que o validador aprova coisa boa: é que ele **reprova coisa
 * ruim**. Um validador que só foi exercitado contra o caso feliz é um validador que ninguém sabe
 * se funciona — e foi assim que o guarda de escopo de R3.2 passou por vacuidade por uma onda
 * inteira.
 */

const temporarios: string[] = [];
afterEach(() => {
  for (const caminho of temporarios.splice(0)) rmSync(caminho, { recursive: true, force: true });
});

function pastaTemporaria(): string {
  const dir = mkdtempSync(join(tmpdir(), "vipreco-img0-"));
  temporarios.push(dir);
  return dir;
}

/** Um WebP `VP8 ` mínimo e sintético, só com o cabeçalho que o validador lê. */
function webpLossy(largura: number, altura: number, recheio = 0): Buffer {
  const b = Buffer.alloc(30 + recheio);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WEBP", 8, "ascii");
  b.write("VP8 ", 12, "ascii");
  b.writeUInt16LE(largura & 0x3fff, 26);
  b.writeUInt16LE(altura & 0x3fff, 28);
  return b;
}

describe("dimensões do WebP", () => {
  it("lê um bloco VP8 com perdas", () => {
    expect(dimensoesWebp(webpLossy(512, 512))).toEqual({ largura: 512, altura: 512 });
  });

  it("lê um bloco VP8L sem perdas", () => {
    const b = Buffer.alloc(30);
    b.write("RIFF", 0, "ascii");
    b.write("WEBP", 8, "ascii");
    b.write("VP8L", 12, "ascii");
    // 14 bits de (largura-1) e 14 de (altura-1), a partir do byte 21.
    b.writeUInt32LE((511 & 0x3fff) | ((255 & 0x3fff) << 14), 21);
    expect(dimensoesWebp(b)).toEqual({ largura: 512, altura: 256 });
  });

  it("lê um bloco VP8X estendido", () => {
    const b = Buffer.alloc(31);
    b.write("RIFF", 0, "ascii");
    b.write("WEBP", 8, "ascii");
    b.write("VP8X", 12, "ascii");
    const escrever24 = (valor: number, pos: number) => {
      const v = valor - 1;
      b[pos] = v & 0xff;
      b[pos + 1] = (v >> 8) & 0xff;
      b[pos + 2] = (v >> 16) & 0xff;
    };
    escrever24(512, 24);
    escrever24(512, 27);
    expect(dimensoesWebp(b)).toEqual({ largura: 512, altura: 512 });
  });

  it("devolve null para o que não é WebP, em vez de adivinhar", () => {
    expect(dimensoesWebp(Buffer.from("não sou uma imagem"))).toBeNull();
    expect(dimensoesWebp(Buffer.alloc(4))).toBeNull();
    const png = Buffer.alloc(40);
    png.write("\x89PNG", 0, "binary");
    expect(dimensoesWebp(png)).toBeNull();
  });
});

describe("a convenção de nome carrega a gramatura", () => {
  it.each([
    "cafe-serra-alta-tradicional-500g.webp",
    "arroz-ouro-do-campo-tipo1-5kg.webp",
    "leite-boa-serra-integral-1l.webp",
    "refri-marca-x-zero-2,5l.webp",
    "ovo-granja-y-branco-12un.webp",
  ])("aceita %s", (nome) => {
    expect(nomeDeFotoValido(nome)).toBe(true);
  });

  it.each([
    ["cafe-serra-alta-tradicional.webp", "sem gramatura — é o erro que o nome existe para pegar"],
    ["Cafe-Serra-Alta-500g.webp", "maiúscula"],
    ["cafe serra alta 500g.webp", "espaço"],
    ["cafe-serra-alta-500g.png", "não é WebP"],
    ["cafe_serra_alta_500g.webp", "sublinhado em vez de hífen"],
  ])("reprova %s (%s)", (nome) => {
    expect(nomeDeFotoValido(nome)).toBe(false);
  });
});

describe("as regras do SVG de demonstração", () => {
  const valido = `<!-- ilustração GENÉRICA de categoria --><svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`;

  it("aprova um SVG que declara o que é e não busca nada", () => {
    expect(problemasDoSvgIlustrativo(valido)).toEqual([]);
  });

  it("reprova <text> — um rótulo desenhado é o começo de uma marca desenhada", () => {
    const comTexto = valido.replace("<rect/>", '<text x="0">Café</text>');
    expect(problemasDoSvgIlustrativo(comTexto).join(" ")).toContain("<text>");
  });

  it("reprova recurso externo", () => {
    const comExterno = valido.replace("<rect/>", '<image href="https://exemplo.com/a.png"/>');
    const problemas = problemasDoSvgIlustrativo(comExterno).join(" ");
    expect(problemas).toContain("recurso externo");
    expect(problemas).toContain("<image>");
  });

  it("reprova a ausência da declaração dentro do arquivo", () => {
    const semDeclaracao = `<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`;
    expect(problemasDoSvgIlustrativo(semDeclaracao).join(" ")).toContain("ilustração genérica");
  });
});

describe("validação de pasta — o validador precisa REPROVAR quando deve", () => {
  function montar(arquivos: Record<string, Buffer | string>): string {
    const raiz = pastaTemporaria();
    for (const [relativo, conteudo] of Object.entries(arquivos)) {
      const destino = join(raiz, relativo);
      mkdirSync(join(destino, ".."), { recursive: true });
      writeFileSync(destino, conteudo);
    }
    return raiz;
  }

  it("aprova uma foto bem formada", () => {
    const raiz = montar({
      "img/produto/cafe-serra-alta-tradicional-500g.webp": webpLossy(512, 512),
    });
    expect(validarPasta(raiz)).toEqual([]);
  });

  it("reprova foto retangular — o card reserva um quadrado", () => {
    const raiz = montar({ "img/produto/cafe-x-tradicional-500g.webp": webpLossy(512, 256) });
    expect(validarPasta(raiz)[0].problema).toContain("não é quadrada");
  });

  it("reprova foto acima do lado máximo", () => {
    const raiz = montar({ "img/produto/cafe-x-tradicional-500g.webp": webpLossy(1024, 1024) });
    expect(validarPasta(raiz)[0].problema).toContain("acima do teto");
  });

  it("reprova foto acima do peso alvo", () => {
    const raiz = montar({
      "img/produto/cafe-x-tradicional-500g.webp": webpLossy(512, 512, LIMITES.bytesMaximos),
    });
    expect(validarPasta(raiz).some((a) => a.problema.includes("KB"))).toBe(true);
  });

  it("reprova arquivo numa pasta que ninguém declarou", () => {
    const raiz = montar({ "img/aleatorio/foto.webp": webpLossy(512, 512) });
    expect(validarPasta(raiz)[0].problema).toContain("fora de");
  });

  it("reprova PNG em `img/produto/`", () => {
    const raiz = montar({ "img/produto/cafe-x-tradicional-500g.png": Buffer.alloc(10) });
    expect(validarPasta(raiz)[0].problema).toContain("precisa ser WebP");
  });

  it("reprova um WebP ilegível, em vez de deixar passar", () => {
    const raiz = montar({
      "img/produto/cafe-x-tradicional-500g.webp": Buffer.from("isto não é um webp"),
    });
    expect(validarPasta(raiz)[0].problema).toContain("não é um WebP legível");
  });

  it("aplica as regras de SVG à pasta de demonstração", () => {
    const raiz = montar({
      "img/demo/cafe.svg": `<!-- ilustração GENÉRICA --><svg><text>Pilão</text></svg>`,
    });
    expect(validarPasta(raiz)[0].problema).toContain("<text>");
  });

  it("pasta vazia não é falha — hoje o produto tem zero fotografia, e é o estado correto", () => {
    const raiz = pastaTemporaria();
    mkdirSync(join(raiz, "img/produto"), { recursive: true });
    expect(validarPasta(raiz)).toEqual([]);
  });
});
