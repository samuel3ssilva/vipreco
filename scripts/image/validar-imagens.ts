/**
 * IMAGE-0 — o validador de assets de imagem.
 *
 * =============================================================================
 * O QUE ELE MEDE, E O QUE ELE NÃO CONSEGUE MEDIR
 * =============================================================================
 *
 * Ele reprova o que é conferível por máquina: formato, dimensão, proporção, peso, nome fora da
 * convenção, SVG de demonstração com texto dentro ou com recurso externo.
 *
 * Ele **não** sabe se a foto é do produto certo, se a gramatura confere, se a embalagem é a que
 * está na gôndola hoje, nem se existe direito de uso. Essas quatro são humanas e vivem no checklist
 * de `docs/data/image-0/OPERACAO-FOTO.md`.
 *
 * Dizer isso alto é parte do trabalho: um validador que desse "verde" sem essas quatro seria pior
 * do que nenhum, porque pareceria garantia. **Verde aqui significa "o arquivo está bem formado",
 * nunca "a imagem está certa".**
 *
 * Uso:
 *   bun scripts/image/validar-imagens.ts            # valida `public/img/`
 *   bun scripts/image/validar-imagens.ts <pasta>    # valida outra pasta
 *
 * Sai com código 1 se houver qualquer reprovação.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

/** Os limites vêm de `docs/data/image-0/ARQUITETURA-R6.md` §6, e a razão de cada um está lá. */
export const LIMITES = {
  /** O maior uso real é 128 px no destaque a `sm`; 512 cobre 2× com folga. */
  ladoMaximo: 512,
  /** O card reserva um quadrado. Outra proporção causa recorte ou salto de layout. */
  proporcao: 1,
  /** Tolerância de proporção: 1 px de diferença num lado de 512 não é desalinhamento. */
  toleranciaProporcao: 0.01,
  /** Quatro imagens numa Home dão ~160 KB. Aceitável em 4G de bairro. */
  bytesMaximos: 40 * 1024,
} as const;

export interface Achado {
  arquivo: string;
  problema: string;
}

/**
 * A convenção de nome, e ela carrega a gramatura de propósito.
 *
 * `<categoria>-<marca>-<variante>-<quantidade>.webp`
 *
 * Um arquivo terminado em `-500g.webp` vinculado a um produto de 1 kg é um erro que se lê no diff
 * do PR, antes de chegar a qualquer tela. Sem a gramatura no nome, esse erro só apareceria para o
 * morador.
 */
const NOME_DE_FOTO = /^[a-z0-9]+(?:-[a-z0-9]+)*-\d+(?:[.,]\d+)?(?:g|kg|ml|l|un)\.webp$/;

export function nomeDeFotoValido(nome: string): boolean {
  return NOME_DE_FOTO.test(nome);
}

/**
 * Largura e altura de um WebP, lidas do cabeçalho.
 *
 * Três formatos de bloco, e o validador precisa dos três: um arquivo produzido por `cwebp -q 82`
 * sai como `VP8 `, um sem perdas sai como `VP8L`, e um com transparência ou metadado sai como
 * `VP8X`. Aceitar só o primeiro faria o validador passar por omissão nos outros dois.
 *
 * Devolve `null` quando o arquivo não é um WebP — quem chama trata isso como reprovação, e não
 * como ausência de opinião.
 */
export function dimensoesWebp(dados: Buffer): { largura: number; altura: number } | null {
  if (dados.length < 30) return null;
  if (dados.toString("ascii", 0, 4) !== "RIFF") return null;
  if (dados.toString("ascii", 8, 12) !== "WEBP") return null;

  const bloco = dados.toString("ascii", 12, 16);

  if (bloco === "VP8 ") {
    // Os 14 bits baixos de cada campo de 16; os 2 altos são escala.
    return {
      largura: dados.readUInt16LE(26) & 0x3fff,
      altura: dados.readUInt16LE(28) & 0x3fff,
    };
  }

  if (bloco === "VP8L") {
    // 14 bits de largura e 14 de altura, empacotados a partir do byte 21, menos um.
    const bits = dados.readUInt32LE(21);
    return {
      largura: (bits & 0x3fff) + 1,
      altura: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (bloco === "VP8X") {
    // Canvas em 24 bits little-endian, menos um.
    const ler24 = (deslocamento: number) =>
      dados[deslocamento] + (dados[deslocamento + 1] << 8) + (dados[deslocamento + 2] << 16) + 1;
    return { largura: ler24(24), altura: ler24(27) };
  }

  return null;
}

/**
 * As regras do SVG de demonstração.
 *
 * Elas são as mesmas que `demo-opportunities.ilustrativas.test.ts` já afirma pelo lado do dado;
 * aqui elas são afirmadas pelo lado do ARQUIVO, que é onde alguém acrescentaria um quarto desenho
 * sem passar pelo fixture.
 */
export function problemasDoSvgIlustrativo(conteudo: string): string[] {
  const problemas: string[] = [];

  if (/<text\b/i.test(conteudo)) {
    problemas.push("tem <text> — um rótulo desenhado é o começo de uma marca desenhada");
  }
  if (/(?:href|src|url)\s*=?\s*["'(]?\s*https?:\/\//i.test(conteudo)) {
    problemas.push("busca recurso externo — o CSP proíbe, e o asset precisa ser autossuficiente");
  }
  if (!/ilustração\s+GENÉRICA/i.test(conteudo)) {
    problemas.push(
      "não declara, dentro do arquivo, que é ilustração genérica — a declaração é o que separa o desenho de uma cópia de embalagem",
    );
  }
  if (/<image\b/i.test(conteudo)) {
    problemas.push("embute <image> — um raster dentro do SVG escapa de toda esta validação");
  }

  return problemas;
}

/** Percorre uma pasta e devolve os arquivos, em ordem estável. */
function arquivosDe(pasta: string): string[] {
  const encontrados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir).sort()) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else encontrados.push(caminho);
    }
  };
  percorrer(pasta);
  return encontrados;
}

/**
 * Valida uma pasta inteira.
 *
 * A pasta decide a regra: `img/produto/` é fotografia e responde aos limites de dimensão, peso e
 * nome; `img/demo/` é ilustração e responde às regras de SVG. Um arquivo fora das duas é reprovado
 * por estar num lugar que ninguém declarou — que é exatamente o que um allowlist precisa pegar.
 */
export function validarPasta(raiz: string): Achado[] {
  const achados: Achado[] = [];

  for (const caminho of arquivosDe(raiz)) {
    const nome = caminho.split("/").pop() ?? "";
    const relativo = relative(process.cwd(), caminho);
    const ehFoto = caminho.includes("/img/produto/");
    const ehDemo = caminho.includes("/img/demo/");

    if (!ehFoto && !ehDemo) {
      achados.push({
        arquivo: relativo,
        problema:
          "está fora de `img/produto/` e de `img/demo/` — nenhuma regra declarada cobre ele",
      });
      continue;
    }

    if (ehDemo) {
      if (extname(nome) !== ".svg") {
        achados.push({ arquivo: relativo, problema: "ilustração de demonstração precisa ser SVG" });
        continue;
      }
      for (const problema of problemasDoSvgIlustrativo(readFileSync(caminho, "utf8"))) {
        achados.push({ arquivo: relativo, problema });
      }
      continue;
    }

    // A partir daqui é fotografia de produto.
    if (extname(nome) !== ".webp") {
      achados.push({ arquivo: relativo, problema: "fotografia de produto precisa ser WebP" });
      continue;
    }
    if (!nomeDeFotoValido(nome)) {
      achados.push({
        arquivo: relativo,
        problema:
          "nome fora da convenção `<categoria>-<marca>-<variante>-<quantidade>.webp` — a gramatura precisa estar no nome",
      });
    }

    const dados = readFileSync(caminho);
    if (dados.length > LIMITES.bytesMaximos) {
      achados.push({
        arquivo: relativo,
        problema: `${Math.round(dados.length / 1024)} KB, acima do teto de ${LIMITES.bytesMaximos / 1024} KB`,
      });
    }

    const dimensoes = dimensoesWebp(dados);
    if (dimensoes === null) {
      achados.push({ arquivo: relativo, problema: "não é um WebP legível" });
      continue;
    }
    const maior = Math.max(dimensoes.largura, dimensoes.altura);
    if (maior > LIMITES.ladoMaximo) {
      achados.push({
        arquivo: relativo,
        problema: `lado maior de ${maior} px, acima do teto de ${LIMITES.ladoMaximo} px`,
      });
    }
    const razao = dimensoes.largura / dimensoes.altura;
    if (Math.abs(razao - LIMITES.proporcao) > LIMITES.toleranciaProporcao) {
      achados.push({
        arquivo: relativo,
        problema: `${dimensoes.largura}x${dimensoes.altura} não é quadrada — o card reserva um quadrado`,
      });
    }
  }

  return achados;
}

/** O aviso que acompanha todo verde. Ele não é decoração: é o escopo do que foi medido. */
export const AVISO_DO_VERDE = [
  "VERDE AQUI SIGNIFICA 'os arquivos estão bem formados'. NÃO significa 'as imagens estão certas'.",
  "Quatro coisas continuam sem validação automática, e são as que mais importam:",
  "  1. a foto é do produto certo?",
  "  2. a gramatura da foto confere com o registro?",
  "  3. a embalagem é a que está na gôndola hoje?",
  "  4. existe direito de uso?",
  "Elas estão em docs/data/image-0/OPERACAO-FOTO.md §4, e são humanas.",
].join("\n");

if (import.meta.main) {
  const raiz = process.argv[2] ?? join(process.cwd(), "public/img");
  let achados: Achado[];
  try {
    achados = validarPasta(raiz);
  } catch {
    // Pasta inexistente não é falha: hoje o produto tem zero fotografia, e esse é o estado correto.
    console.log(`nenhuma pasta de imagem em ${relative(process.cwd(), raiz)} — nada a validar.`);
    console.log(`\n${AVISO_DO_VERDE}`);
    process.exit(0);
  }

  if (achados.length === 0) {
    console.log(`ok — nenhum problema de forma em ${relative(process.cwd(), raiz)}.`);
    console.log(`\n${AVISO_DO_VERDE}`);
    process.exit(0);
  }

  console.error(`${achados.length} problema(s):\n`);
  for (const { arquivo, problema } of achados) console.error(`  ${arquivo}\n    ${problema}`);
  process.exit(1);
}
