/**
 * Codificador de QR Code, modo byte, nível de correção M.
 *
 * =============================================================================
 * POR QUE ESCREVER, E NÃO INSTALAR
 * =============================================================================
 *
 * O QR gerado aqui vai impresso na mão de um dono de mercado, numa entrevista. Ele aponta para
 * um ambiente de teste e não pode apontar para outra coisa. Uma dependência nova para produzir
 * UM artefato — com o que ela arrasta de transitivas, e com a política de dependências de
 * `docs/pmo/DEPENDENCY-POLICY.md` — custa mais revisão do que este arquivo, que é fechado,
 * determinístico e testado contra os vetores da própria especificação.
 *
 * ESCOPO DELIBERADAMENTE PEQUENO: modo byte, nível M, versões 1 a 6. Isso cobre até 106 bytes,
 * e a URL de staging tem 73. Acima da versão 6 o símbolo passa a carregar um bloco de
 * informação de versão que este arquivo não escreve — então ele **falha alto** em vez de
 * produzir um símbolo silenciosamente inválido.
 *
 * Referência: ISO/IEC 18004. As tabelas abaixo são as da norma, não estimativas.
 */

/** Bytes de dado que cabem em cada versão, nível M. Índice = versão. */
const CAPACIDADE_BYTES = [0, 14, 26, 42, 62, 84, 106] as const;

/** Por versão: [codewords de EC por bloco, blocos do grupo 1, dados por bloco do grupo 1]. */
const BLOCOS: Record<number, { ec: number; blocos: number[] }> = {
  1: { ec: 10, blocos: [16] },
  2: { ec: 16, blocos: [28] },
  3: { ec: 26, blocos: [44] },
  4: { ec: 18, blocos: [32, 32] },
  5: { ec: 24, blocos: [43, 43] },
  6: { ec: 16, blocos: [27, 27, 27, 27] },
};

/** Centros dos padrões de alinhamento, por versão. */
const ALINHAMENTO: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

// ---------------------------------------------------------------------------
// GF(256) — aritmética do Reed-Solomon, polinômio primitivo 0x11D.
// ---------------------------------------------------------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** Polinômio gerador de grau `grau`. */
function gerador(grau: number): Uint8Array {
  let g = new Uint8Array([1]);
  for (let i = 0; i < grau; i++) {
    const proximo = new Uint8Array(g.length + 1);
    for (let j = 0; j < g.length; j++) {
      proximo[j] ^= g[j];
      proximo[j + 1] ^= mul(g[j], EXP[i]);
    }
    g = proximo;
  }
  return g;
}

/** Os `grau` codewords de correção de um bloco de dados. */
function corrigir(dados: Uint8Array, grau: number): Uint8Array {
  const g = gerador(grau);
  const resto = new Uint8Array(dados.length + grau);
  resto.set(dados);
  for (let i = 0; i < dados.length; i++) {
    const fator = resto[i];
    if (fator === 0) continue;
    for (let j = 0; j < g.length; j++) resto[i + j] ^= mul(g[j], fator);
  }
  return resto.slice(dados.length);
}

// ---------------------------------------------------------------------------
// Bitstream
// ---------------------------------------------------------------------------
class Bits {
  private readonly bits: number[] = [];
  push(valor: number, quantos: number) {
    for (let i = quantos - 1; i >= 0; i--) this.bits.push((valor >>> i) & 1);
  }
  get comprimento() {
    return this.bits.length;
  }
  paraBytes(total: number): Uint8Array {
    const saida = new Uint8Array(total);
    for (let i = 0; i < this.bits.length; i++) {
      if (this.bits[i]) saida[i >>> 3] |= 0x80 >>> (i % 8);
    }
    return saida;
  }
}

/** A menor versão que comporta o texto. Falha alto acima da 6. */
export function menorVersao(texto: string): number {
  const bytes = new TextEncoder().encode(texto).length;
  for (let v = 1; v <= 6; v++) if (bytes <= CAPACIDADE_BYTES[v]) return v;
  throw new Error(
    `${bytes} bytes não cabem em QR versão 6 nível M (máximo ${CAPACIDADE_BYTES[6]}). ` +
      `Este codificador não escreve o bloco de informação de versão exigido a partir da 7.`,
  );
}

/** Codewords finais, já com EC e já intercalados. */
function codewords(texto: string, versao: number): Uint8Array {
  const dados = new TextEncoder().encode(texto);
  const { ec, blocos } = BLOCOS[versao];
  const totalDados = blocos.reduce((a, b) => a + b, 0);

  const bits = new Bits();
  bits.push(0b0100, 4); // modo byte
  bits.push(dados.length, 8); // contagem — 8 bits nas versões 1 a 9
  for (const b of dados) bits.push(b, 8);

  const capacidadeBits = totalDados * 8;
  if (bits.comprimento > capacidadeBits) throw new Error("dados excedem a versão escolhida");
  bits.push(0, Math.min(4, capacidadeBits - bits.comprimento)); // terminador

  const bruto = bits.paraBytes(totalDados);
  // Preenchimento alternado, como manda a norma.
  const usados = Math.ceil(bits.comprimento / 8);
  for (let i = usados; i < totalDados; i++) bruto[i] = (i - usados) % 2 === 0 ? 0xec : 0x11;

  // Um bloco de dados e um de EC por bloco declarado.
  const blocosDados: Uint8Array[] = [];
  const blocosEc: Uint8Array[] = [];
  let cursor = 0;
  for (const tamanho of blocos) {
    const bloco = bruto.slice(cursor, cursor + tamanho);
    cursor += tamanho;
    blocosDados.push(bloco);
    blocosEc.push(corrigir(bloco, ec));
  }

  // Intercalação: coluna a coluna entre os blocos.
  const saida: number[] = [];
  const maiorDado = Math.max(...blocos);
  for (let i = 0; i < maiorDado; i++) {
    for (const bloco of blocosDados) if (i < bloco.length) saida.push(bloco[i]);
  }
  for (let i = 0; i < ec; i++) for (const bloco of blocosEc) saida.push(bloco[i]);
  return new Uint8Array(saida);
}

// ---------------------------------------------------------------------------
// Matriz
// ---------------------------------------------------------------------------
type Matriz = { tamanho: number; modulo: Int8Array; reservado: Uint8Array };

const idx = (m: Matriz, linha: number, coluna: number) => linha * m.tamanho + coluna;

function marcar(m: Matriz, linha: number, coluna: number, escuro: boolean, reserva = true) {
  m.modulo[idx(m, linha, coluna)] = escuro ? 1 : 0;
  if (reserva) m.reservado[idx(m, linha, coluna)] = 1;
}

function padroesFixos(m: Matriz, versao: number) {
  const n = m.tamanho;
  // Localizadores e separadores.
  for (const [l0, c0] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    for (let l = -1; l <= 7; l++) {
      for (let c = -1; c <= 7; c++) {
        const L = l0 + l;
        const C = c0 + c;
        if (L < 0 || C < 0 || L >= n || C >= n) continue;
        // O laço varre de -1 a 7 porque o SEPARADOR faz parte do desenho: ele é o anel claro
        // de um módulo em volta do localizador. `dentro` é o que separa as duas coisas — sem
        // ele, a célula (7, 0) satisfaz `c === 0` e sai escura, colando o separador no
        // localizador. Nenhum leitor acha o símbolo depois disso.
        const dentro = l >= 0 && l <= 6 && c >= 0 && c <= 6;
        const borda = dentro && (l === 0 || l === 6 || c === 0 || c === 6);
        const centro = dentro && l >= 2 && l <= 4 && c >= 2 && c <= 4;
        marcar(m, L, C, borda || centro);
      }
    }
  }
  // Temporização.
  for (let i = 8; i < n - 8; i++) {
    marcar(m, 6, i, i % 2 === 0);
    marcar(m, i, 6, i % 2 === 0);
  }
  // Alinhamento — nunca sobre um localizador.
  const centros = ALINHAMENTO[versao];
  for (const lc of centros) {
    for (const cc of centros) {
      const sobreLocalizador =
        (lc <= 8 && cc <= 8) || (lc <= 8 && cc >= n - 9) || (lc >= n - 9 && cc <= 8);
      if (sobreLocalizador) continue;
      for (let l = -2; l <= 2; l++) {
        for (let c = -2; c <= 2; c++) {
          const anel = Math.max(Math.abs(l), Math.abs(c));
          marcar(m, lc + l, cc + c, anel !== 1);
        }
      }
    }
  }
  // Áreas de formato, reservadas agora e escritas depois.
  for (let i = 0; i < 9; i++) {
    if (i !== 6) marcar(m, 8, i, false);
    if (i !== 6) marcar(m, i, 8, false);
  }
  // A segunda cópia é repartida 7 + 8: SETE módulos descendo em coluna 8, e OITO correndo em
  // linha 8. A tira vertical vai até `n - 7`, e não até `n - 8`, porque `n - 8` é o módulo
  // escuro fixo. Reservar oito aqui apagava esse módulo — e um símbolo sem ele não decodifica.
  for (let i = 0; i < 8; i++) marcar(m, 8, n - 1 - i, false);
  for (let i = 0; i < 7; i++) marcar(m, n - 1 - i, 8, false);
  // Módulo escuro fixo, escrito por último para não depender da ordem acima.
  marcar(m, 4 * versao + 9, 8, true);
}

/** Zigue-zague de duas colunas, de baixo para cima, pulando a coluna 6. */
function colocarDados(m: Matriz, dados: Uint8Array) {
  const n = m.tamanho;
  let bit = 0;
  let subindo = true;
  for (let colunaDireita = n - 1; colunaDireita > 0; colunaDireita -= 2) {
    if (colunaDireita === 6) colunaDireita = 5;
    for (let passo = 0; passo < n; passo++) {
      const linha = subindo ? n - 1 - passo : passo;
      for (const coluna of [colunaDireita, colunaDireita - 1]) {
        if (m.reservado[idx(m, linha, coluna)]) continue;
        const valor = bit < dados.length * 8 ? (dados[bit >>> 3] >>> (7 - (bit % 8))) & 1 : 0;
        m.modulo[idx(m, linha, coluna)] = valor;
        bit++;
      }
    }
    subindo = !subindo;
  }
}

const MASCARAS: ((l: number, c: number) => boolean)[] = [
  (l, c) => (l + c) % 2 === 0,
  (l) => l % 2 === 0,
  (_, c) => c % 3 === 0,
  (l, c) => (l + c) % 3 === 0,
  (l, c) => (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0,
  (l, c) => ((l * c) % 2) + ((l * c) % 3) === 0,
  (l, c) => (((l * c) % 2) + ((l * c) % 3)) % 2 === 0,
  (l, c) => (((l + c) % 2) + ((l * c) % 3)) % 2 === 0,
];

/** BCH(15,5) do bloco de formato, nível M (`00`) com a máscara. */
function formato(mascara: number): number {
  const dado = (0b00 << 3) | mascara;
  let resto = dado << 10;
  for (let i = 14; i >= 10; i--) if ((resto >>> i) & 1) resto ^= 0b10100110111 << (i - 10);
  return ((dado << 10) | resto) ^ 0b101010000010010;
}

function escreverFormato(m: Matriz, mascara: number) {
  const n = m.tamanho;
  const f = formato(mascara);
  for (let i = 0; i < 15; i++) {
    // A ordem canônica de colocação percorre o bloco do BIT MAIS SIGNIFICATIVO para o menos.
    // Escrever `f >>> i` produz a sequência espelhada: o valor de 15 bits está certo, e o
    // símbolo continua ilegível. É um erro que nenhuma inspeção visual pega.
    const bit = ((f >>> (14 - i)) & 1) === 1;
    // Cópia junto do localizador superior esquerdo.
    if (i < 6) marcar(m, 8, i, bit);
    else if (i === 6) marcar(m, 8, 7, bit);
    else if (i === 7) marcar(m, 8, 8, bit);
    else if (i === 8) marcar(m, 7, 8, bit);
    else marcar(m, 14 - i, 8, bit);
    // Cópia repartida entre os outros dois localizadores. A repartição é 7 + 8, e não 8 + 7:
    // os bits 0 a 6 descem em coluna 8 abaixo do localizador inferior esquerdo, e os bits 7 a
    // 14 correm em linha 8 à direita do superior direito. Trocar as duas metades produz um
    // símbolo que parece perfeito e que nenhum leitor decodifica — foi o primeiro defeito
    // deste arquivo, e só apareceu porque o QR foi lido de verdade, com decodificador de fora.
    if (i < 7) marcar(m, n - 1 - i, 8, bit);
    else marcar(m, 8, n - 15 + i, bit);
  }
}

/** As quatro regras de penalidade da norma. Menor é melhor. */
function penalidade(m: Matriz): number {
  const n = m.tamanho;
  const em = (l: number, c: number) => m.modulo[idx(m, l, c)] === 1;
  let total = 0;

  // 1 — sequências de 5 ou mais na mesma cor.
  for (let i = 0; i < n; i++) {
    for (const porLinha of [true, false]) {
      let corrida = 1;
      for (let j = 1; j < n; j++) {
        const a = porLinha ? em(i, j) : em(j, i);
        const b = porLinha ? em(i, j - 1) : em(j - 1, i);
        if (a === b) corrida++;
        else {
          if (corrida >= 5) total += corrida - 2;
          corrida = 1;
        }
      }
      if (corrida >= 5) total += corrida - 2;
    }
  }

  // 2 — blocos 2x2 de uma cor só.
  for (let l = 0; l < n - 1; l++) {
    for (let c = 0; c < n - 1; c++) {
      const v = em(l, c);
      if (v === em(l, c + 1) && v === em(l + 1, c) && v === em(l + 1, c + 1)) total += 3;
    }
  }

  // 3 — o padrão 1:1:3:1:1 que imita um localizador.
  const alvo = [true, false, true, true, true, false, true];
  const quatroClaros = [false, false, false, false];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= n - 7; j++) {
      for (const porLinha of [true, false]) {
        const janela = Array.from({ length: 7 }, (_, k) =>
          porLinha ? em(i, j + k) : em(j + k, i),
        );
        if (janela.every((v, k) => v === alvo[k])) {
          const antes = Array.from({ length: 4 }, (_, k) =>
            porLinha ? j - 4 + k >= 0 && em(i, j - 4 + k) : j - 4 + k >= 0 && em(j - 4 + k, i),
          );
          const depois = Array.from({ length: 4 }, (_, k) =>
            porLinha ? j + 7 + k < n && em(i, j + 7 + k) : j + 7 + k < n && em(j + 7 + k, i),
          );
          const claroAntes = j >= 4 && antes.every((v, k) => v === quatroClaros[k]);
          const claroDepois = j + 10 < n && depois.every((v, k) => v === quatroClaros[k]);
          if (claroAntes || claroDepois) total += 40;
        }
      }
    }
  }

  // 4 — desequilíbrio entre claro e escuro.
  let escuros = 0;
  for (let i = 0; i < n * n; i++) if (m.modulo[i] === 1) escuros++;
  const proporcao = (escuros * 100) / (n * n);
  total += Math.floor(Math.abs(proporcao - 50) / 5) * 10;
  return total;
}

/** A matriz final: `true` é módulo escuro. */
export function gerarQr(
  texto: string,
  mascaraForcada?: number,
): { versao: number; mascara: number; modulos: boolean[][] } {
  const versao = menorVersao(texto);
  const tamanho = versao * 4 + 17;
  const dados = codewords(texto, versao);

  const candidatas = mascaraForcada === undefined ? [0, 1, 2, 3, 4, 5, 6, 7] : [mascaraForcada];
  let melhor: { pontos: number; m: Matriz; mascara: number } | null = null;
  for (const mascara of candidatas) {
    const m: Matriz = {
      tamanho,
      modulo: new Int8Array(tamanho * tamanho),
      reservado: new Uint8Array(tamanho * tamanho),
    };
    padroesFixos(m, versao);
    colocarDados(m, dados);
    // A máscara só toca o que NÃO é padrão fixo.
    for (let l = 0; l < tamanho; l++) {
      for (let c = 0; c < tamanho; c++) {
        if (m.reservado[idx(m, l, c)]) continue;
        if (MASCARAS[mascara](l, c)) m.modulo[idx(m, l, c)] ^= 1;
      }
    }
    escreverFormato(m, mascara);
    const pontos = penalidade(m);
    if (melhor === null || pontos < melhor.pontos) melhor = { pontos, m, mascara };
  }

  const { m, mascara } = melhor!;
  const modulos = Array.from({ length: tamanho }, (_, l) =>
    Array.from({ length: tamanho }, (_, c) => m.modulo[idx(m, l, c)] === 1),
  );
  return { versao, mascara, modulos };
}
