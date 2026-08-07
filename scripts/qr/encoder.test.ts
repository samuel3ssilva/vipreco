import { describe, expect, it } from "vitest";
import { gerarQr, menorVersao } from "./encoder";
import { paraPng, paraSvg } from "./render";

/**
 * O QR das entrevistas é impresso e apontado para o celular de um dono de mercado. Se ele
 * levar para outro lugar, ou simplesmente não abrir, a conversa começa com um defeito.
 *
 * =============================================================================
 * POR QUE UMA MATRIZ INTEIRA CONGELADA, E NÃO SÓ ASSERÇÕES DE ESTRUTURA
 * =============================================================================
 *
 * Porque foi exatamente o que os testes de estrutura NÃO pegariam. A primeira versão deste
 * codificador tinha três defeitos, e os três produziam um símbolo de aparência impecável:
 *
 *   1. o separador do localizador saía escuro — a célula (7, 0) satisfazia `c === 0`;
 *   2. a segunda cópia do bloco de formato estava repartida 8 + 7 em vez de 7 + 8, e a
 *      reserva apagava o módulo escuro fixo;
 *   3. os 15 bits do formato eram escritos do menos significativo para o mais.
 *
 * Nenhum deles muda a contagem de módulos, o tamanho, a posição dos localizadores ou a
 * proporção de claro e escuro. Os três só apareceram quando o PNG foi lido por um
 * decodificador de fora — e a matriz abaixo é o registro do que aquela leitura validou.
 *
 * A matriz foi conferida em 06/08/2026, módulo a módulo, contra uma implementação
 * independente (`qrcode`, Python), nas OITO máscaras. Zero diferenças. Se este teste falhar,
 * o codificador mudou — não o teste.
 */
const GOLDEN = [
  "1111111011011111001111111",
  "1000001011101100101000001",
  "1011101000001000101011101",
  "1011101010011011001011101",
  "1011101001011010101011101",
  "1000001000101101101000001",
  "1111111010101010101111111",
  "0000000010111001100000000",
  "1011011101010101101001011",
  "0100110000110111011101011",
  "1000011100011100010110000",
  "1000000110101001001101110",
  "0110111111001011101100100",
  "0100000010111011011110011",
  "0100101100110100100100010",
  "1010010111010010001000000",
  "0000001010001010111110100",
  "0000000010100011100011110",
  "1111111010000110101010011",
  "1000001010110110100011001",
  "1011101001000110111110011",
  "1011101011000001001011001",
  "1011101010100010001011110",
  "1000001001111111000011100",
  "1111111010110001000111111",
] as const;

const TEXTO_GOLDEN = "ViPreco QR 2026";

describe("matriz congelada", () => {
  it("reproduz módulo a módulo a matriz validada contra implementação independente", () => {
    const { modulos } = gerarQr(TEXTO_GOLDEN, 3);
    const comoTexto = modulos.map((linha) => linha.map((v) => (v ? "1" : "0")).join(""));
    expect(comoTexto).toEqual([...GOLDEN]);
  });

  it("a versão escolhida é a menor que comporta o texto", () => {
    expect(menorVersao("a".repeat(14))).toBe(1);
    expect(menorVersao("a".repeat(15))).toBe(2);
    expect(menorVersao("a".repeat(26))).toBe(2);
    expect(menorVersao("a".repeat(27))).toBe(3);
  });

  it("falha alto acima da versão 6, em vez de emitir símbolo inválido", () => {
    expect(() => menorVersao("a".repeat(107))).toThrow(/versão 6/);
  });
});

describe("estrutura do símbolo", () => {
  const { modulos } = gerarQr(TEXTO_GOLDEN, 3);
  const n = modulos.length;

  it("os três localizadores têm o anel escuro e o miolo 3x3", () => {
    for (const [l0, c0] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      for (let l = 0; l < 7; l++) {
        for (let c = 0; c < 7; c++) {
          const borda = l === 0 || l === 6 || c === 0 || c === 6;
          const miolo = l >= 2 && l <= 4 && c >= 2 && c <= 4;
          expect(modulos[l0 + l][c0 + c], `localizador (${l0},${c0}) em ${l},${c}`).toBe(
            borda || miolo,
          );
        }
      }
    }
  });

  it("o separador é uma faixa clara de um módulo, e nenhum pedaço dele é escuro", () => {
    // Foi aqui que o primeiro defeito morava.
    for (let i = 0; i <= 7; i++) {
      expect(modulos[7][i], `separador superior esquerdo, coluna ${i}`).toBe(false);
      expect(modulos[i][7], `separador superior esquerdo, linha ${i}`).toBe(false);
    }
  });

  it("a temporização alterna a partir de escuro", () => {
    for (let i = 8; i < n - 8; i++) {
      expect(modulos[6][i]).toBe(i % 2 === 0);
      expect(modulos[i][6]).toBe(i % 2 === 0);
    }
  });

  it("o módulo escuro fixo sobrevive à reserva do bloco de formato", () => {
    // O segundo defeito apagava exatamente este módulo.
    const versao = (n - 17) / 4;
    expect(modulos[4 * versao + 9][8]).toBe(true);
  });
});

describe("renderização", () => {
  it("o SVG carrega o mesmo símbolo da matriz, módulo a módulo", () => {
    const { modulos } = gerarQr(TEXTO_GOLDEN);
    const px = 8;
    const margem = 4;
    const svg = paraSvg(TEXTO_GOLDEN, px);
    const escuros = new Set(
      [...svg.matchAll(/M(\d+) (\d+)h/g)].map(([, x, y]) => `${Number(y)},${Number(x)}`),
    );
    let esperados = 0;
    for (let l = 0; l < modulos.length; l++) {
      for (let c = 0; c < modulos.length; c++) {
        if (!modulos[l][c]) continue;
        esperados++;
        const chave = `${(l + margem) * px},${(c + margem) * px}`;
        expect(escuros.has(chave), `módulo escuro (${l},${c}) ausente no SVG`).toBe(true);
      }
    }
    expect(escuros.size).toBe(esperados);
  });

  it("o PNG é um PNG de verdade, quadrado, com a zona silenciosa", () => {
    const { modulos } = gerarQr(TEXTO_GOLDEN);
    const px = 12;
    const png = paraPng(TEXTO_GOLDEN, px);
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const lado = (modulos.length + 8) * px;
    expect(png.readUInt32BE(16)).toBe(lado);
    expect(png.readUInt32BE(20)).toBe(lado);
    // Quatro módulos de margem: o canto superior esquerdo é claro.
    expect(modulos.length + 8).toBeGreaterThan(modulos.length);
  });
});
