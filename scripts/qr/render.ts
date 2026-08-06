/**
 * Renderiza um QR em SVG e em PNG, a partir de `encoder.ts`.
 *
 * O PNG é escrito à mão — cabeçalho, IDAT deflacionado por `node:zlib`, CRC32 — para não
 * arrastar uma dependência de imagem por causa de um arquivo. São dois blocos de bytes e uma
 * tabela de CRC; o resto é o `deflate` da biblioteca padrão.
 *
 * ZONA SILENCIOSA: quatro módulos de margem, como manda a norma. Sem ela, leitor encostado num
 * fundo escuro simplesmente não acha o símbolo — e o teste de leitura passaria na tela e
 * falharia no papel, que é onde este QR vai viver.
 */
import { deflateSync } from "node:zlib";
import { gerarQr } from "./encoder";

const ZONA_SILENCIOSA = 4;

export function paraSvg(texto: string, moduloPx = 8): string {
  const { modulos } = gerarQr(texto);
  const n = modulos.length;
  const lado = (n + ZONA_SILENCIOSA * 2) * moduloPx;
  const caminho: string[] = [];
  for (let l = 0; l < n; l++) {
    for (let c = 0; c < n; c++) {
      if (!modulos[l][c]) continue;
      const x = (c + ZONA_SILENCIOSA) * moduloPx;
      const y = (l + ZONA_SILENCIOSA) * moduloPx;
      caminho.push(`M${x} ${y}h${moduloPx}v${moduloPx}h-${moduloPx}z`);
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" ` +
    `viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="QR Code da demonstração do ViPreço em ambiente de teste">` +
    `<rect width="${lado}" height="${lado}" fill="#ffffff"/>` +
    `<path fill="#000000" d="${caminho.join("")}"/>` +
    `</svg>\n`
  );
}

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = TABELA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloco(tipo: string, dados: Uint8Array): Buffer {
  const nome = Buffer.from(tipo, "ascii");
  const corpo = Buffer.concat([nome, Buffer.from(dados)]);
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo));
  return Buffer.concat([tamanho, corpo, crc]);
}

export function paraPng(texto: string, moduloPx = 12): Buffer {
  const { modulos } = gerarQr(texto);
  const n = modulos.length;
  const lado = (n + ZONA_SILENCIOSA * 2) * moduloPx;

  // Escala de cinza, 8 bits, um byte de filtro (0) por linha.
  const bruto = Buffer.alloc(lado * (lado + 1));
  for (let y = 0; y < lado; y++) {
    const inicio = y * (lado + 1);
    bruto[inicio] = 0;
    const linhaModulo = Math.floor(y / moduloPx) - ZONA_SILENCIOSA;
    for (let x = 0; x < lado; x++) {
      const colunaModulo = Math.floor(x / moduloPx) - ZONA_SILENCIOSA;
      const escuro =
        linhaModulo >= 0 &&
        linhaModulo < n &&
        colunaModulo >= 0 &&
        colunaModulo < n &&
        modulos[linhaModulo][colunaModulo];
      bruto[inicio + 1 + x] = escuro ? 0x00 : 0xff;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por amostra
  ihdr[9] = 0; // escala de cinza
  ihdr[10] = 0; // compressão deflate
  ihdr[11] = 0; // filtro padrão
  ihdr[12] = 0; // sem entrelaçamento

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco("IHDR", ihdr),
    bloco("IDAT", deflateSync(bruto, { level: 9 })),
    bloco("IEND", new Uint8Array(0)),
  ]);
}
