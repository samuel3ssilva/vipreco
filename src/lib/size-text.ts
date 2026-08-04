/**
 * `size_text` → quantidade estruturada: leitura assistida, nunca automática (R1).
 *
 * Contratos normativos: `docs/data/MVP-DATA-CONTRACT.md` §2 e
 * `docs/product/CANONICAL-PRODUCT-SPEC.md` §4.3.
 *
 * PARA QUE ESTE MÓDULO EXISTE, E PARA QUE NÃO
 *
 * `size_text` é texto livre. Sete produtos do seed já mostram sete formas de escrever a
 * mesma ideia — `"5 kg"`, `"500 g"`, `"1 L"`, `"900 ml"`, `"12 rolos"`. Alguém vai
 * precisar converter isso em `quantity_value` + `quantity_unit`, e fazer essa conversão
 * à mão, linha a linha, é como se erra em silêncio.
 *
 * Então este módulo **propõe** a leitura e **rotula** o quanto ela é confiável. Ele é
 * ferramenta de curadoria assistida, para o backfill de MVP-E1-08, com revisão humana
 * por cima. Ele **não é**:
 *
 * - fonte de identidade — identidade vem de campo estruturado e aprovado;
 * - chamado em tempo de apresentação — o contrato proíbe explicitamente ("nenhuma
 *   inferência de quantidade a partir de texto em tempo de apresentação");
 * - autorizado a adivinhar. Na dúvida ele devolve `ambiguous` ou `unsupported`, e a
 *   dúvida é preservada em vez de virar número.
 *
 * A regra mais importante do módulo é a que ele **não** faz: em nenhum caminho ele
 * devolve `confirmed`. Ver `QuantityProvenance`.
 */
import { normalizeSearchText } from "@/lib/normalize";
import type { DeclaredQuantity, PackageType, QuantityUnit } from "@/types/domain";

/**
 * De onde vem a quantidade de um registro.
 *
 * | valor         | significa                                                       |
 * | ------------- | --------------------------------------------------------------- |
 * | `confirmed`   | estruturada e **aprovada por revisão humana**                   |
 * | `parsed`      | lida deste texto, ainda sem revisão                             |
 * | `ambiguous`   | há quantidade, mas mais de uma leitura é defensável             |
 * | `unsupported` | o texto não sustenta quantidade nas cinco unidades do MVP       |
 * | `missing`     | não há texto                                                    |
 *
 * `confirmed` **não é produzível por este módulo**, pelo mesmo motivo que `verified` não
 * é produzível por `assessGtin()`: ele depende de alguém ter conferido. `parseSizeText()`
 * devolve `SizeTextParse`, que não inclui esse estado.
 *
 * Só `confirmed` libera preço unitário (`MVP-DATA-CONTRACT.md` §2, `calculation_status`).
 */
export type QuantityProvenance = "confirmed" | "parsed" | "ambiguous" | "unsupported" | "missing";

/** Como a leitura foi obtida. Vai junto do resultado para a revisão saber o que conferir. */
export type SizeTextMethod =
  /** número seguido de unidade: `"500 g"`, `"1L"`, `"1,5 kg"` */
  | "value_unit"
  /** número seguido de palavra contável: `"12 rolos"`, `"10 cápsulas"` */
  | "count_word"
  /** dúzia, com ou sem número na frente */
  | "dozen"
  /** pack multiplicado: `"6 x 350 ml"` vira 2100 ml com 6 itens */
  | "multiplied_pack";

/** Por que a leitura ficou ambígua — há quantidade, e mesmo assim não dá para afirmar. */
export type SizeTextAmbiguity =
  /** mais de uma quantidade no texto: `"500 g e 200 ml"` */
  | "multiple_readings"
  /** número sem unidade: `"12"` pode ser 12 g, 12 ml ou 12 unidades */
  | "unit_missing"
  /** peso variável, granel, aproximação ou faixa — fora do escopo comparável do MVP */
  | "variable_weight";

/** Por que o texto não sustenta quantidade nenhuma. */
export type SizeTextUnsupported =
  /** nenhum número e nenhuma palavra de contagem: `"caixa"`, `"tamanho único"` */
  | "no_quantity"
  /** número seguido de palavra que não é unidade nem contável: `"1 conjunto"` */
  | "unknown_unit";

export type SizeTextParse =
  | {
      status: "parsed";
      raw: string;
      quantity: DeclaredQuantity;
      /**
       * Sugestão de `package_type`, **nunca** decisão. Só assume `"pack"`, e só quando o
       * texto conta itens repetidos. O módulo de propósito não tenta inferir `vidro`,
       * `lata` ou `garrafa`: embalagem é campo de identidade, e identidade lida de texto
       * livre é o que o princípio 3 proíbe.
       */
      packageHint: PackageType | null;
      /** Itens dentro do pack, quando o texto os declara. */
      unitsPerPackage: number | null;
      method: SizeTextMethod;
    }
  | { status: "ambiguous"; raw: string; ambiguity: SizeTextAmbiguity }
  | { status: "unsupported"; raw: string; unsupported: SizeTextUnsupported }
  | { status: "missing" };

/**
 * Palavras que denotam uma das cinco unidades declaradas. Já normalizadas (minúsculas,
 * sem acento) — a chave de busca passa pelo mesmo `normalizeSearchText()` do resto do
 * projeto.
 */
const UNIT_WORDS: Readonly<Record<string, QuantityUnit>> = Object.freeze({
  g: "g",
  gr: "g",
  grama: "g",
  gramas: "g",
  kg: "kg",
  kgs: "kg",
  quilo: "kg",
  quilos: "kg",
  ml: "ml",
  mls: "ml",
  mililitro: "ml",
  mililitros: "ml",
  l: "l",
  lt: "l",
  lts: "l",
  litro: "l",
  litros: "l",
});

/**
 * Palavras que contam itens. Todas convergem para `un` — o que muda é se o texto está
 * falando de vários itens iguais dentro de uma embalagem.
 */
const COUNT_WORDS: Readonly<Record<string, { pack: boolean }>> = Object.freeze({
  un: { pack: false },
  und: { pack: false },
  unid: { pack: false },
  unidade: { pack: false },
  unidades: { pack: false },
  rolo: { pack: true },
  rolos: { pack: true },
  capsula: { pack: true },
  capsulas: { pack: true },
  sache: { pack: true },
  saches: { pack: true },
});

/** Marcadores de peso variável, granel e aproximação. Nenhum deles vira número. */
const VARIABLE_WEIGHT_MARKERS: readonly string[] = [
  "peso variavel",
  "peso var",
  "variavel",
  "granel",
  "aprox",
  "aproximado",
  "aproximadamente",
  "media de",
  "a partir de",
  "cerca de",
];

const DOZEN_WORDS: readonly string[] = ["duzia", "duzias"];

/**
 * Consulta às duas tabelas de palavras.
 *
 * `Object.hasOwn` antes de indexar, e nunca `TABELA[palavra] !== undefined`: a leitura
 * direta percorre a cadeia de protótipos, então `UNIT_WORDS["constructor"]` devolve uma
 * função em vez de `undefined` e `"5 constructor"` sairia daqui como uma leitura válida
 * com uma função no lugar da unidade. `COUNT_WORDS["toString"]` tem o mesmo efeito, e
 * `"12 toString"` viraria doze unidades.
 */
function unitWordOf(word: string): QuantityUnit | undefined {
  return Object.hasOwn(UNIT_WORDS, word) ? UNIT_WORDS[word] : undefined;
}

function countWordOf(word: string): { pack: boolean } | undefined {
  return Object.hasOwn(COUNT_WORDS, word) ? COUNT_WORDS[word] : undefined;
}

/** `"1,5"` e `"1.5"` são o mesmo número em texto de embalagem brasileiro. */
function toNumber(raw: string): number {
  return Number(raw.replace(",", "."));
}

/**
 * `numeric(12,4)` do contrato de dados, aplicado já na proposta. `3 × 0,35 l` em ponto
 * flutuante é `1.0499999999999998`, e uma proposta de curadoria com essa cara é uma
 * proposta que ninguém aprova sem desconfiar do resto.
 */
function roundToScale(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

/** `"6 x 350 ml"` / `"6x350ml"` / `"6 × 350 ml"`. */
const MULTIPLIED_PACK = /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-z]+)/;

/** Quantos números o texto contém, independentemente de virem acompanhados de unidade. */
function countNumbers(text: string): number {
  return text.match(/\d+(?:[.,]\d+)?/g)?.length ?? 0;
}

/**
 * Número seguido, opcionalmente, da palavra colada ou separada por espaço. Construída a
 * cada chamada de propósito: uma regex `/g` no escopo do módulo guarda `lastIndex` entre
 * chamadas, e esse é um bug que só aparece na segunda vez.
 */
function valueWordPattern(): RegExp {
  return /(\d+(?:[.,]\d+)?)\s*([a-z]+)?/g;
}

/**
 * Lê `size_text` e devolve uma quantidade **rotulada**.
 *
 * O texto original volta em `raw` em todos os estados: ele continua sendo o texto de
 * exibição, e nada aqui o substitui.
 */
export function parseSizeText(input: string | null | undefined): SizeTextParse {
  if (input === null || input === undefined) return { status: "missing" };
  const raw = input;
  const text = normalizeSearchText(input);
  if (text.length === 0) return { status: "missing" };

  // 1. Peso variável antes de tudo. Um texto como "aprox. 1 kg" tem número e unidade, e
  //    tratá-lo como 1 kg fixo é exatamente o erro que §4.3 manda não cometer.
  if (VARIABLE_WEIGHT_MARKERS.some((marker) => text.includes(marker))) {
    return { status: "ambiguous", raw, ambiguity: "variable_weight" };
  }
  // Faixa declarada: "1 kg a 1,2 kg", "500 a 600 g", "1-1,2 kg". Um intervalo não é uma
  // quantidade: escolher a ponta de baixo barateia o produto e a de cima encarece.
  if (/\d[\sa-z,.]*\s(?:a|ate)\s[\sa-z,.]*\d/.test(text) || /\d\s*-\s*\d/.test(text)) {
    return { status: "ambiguous", raw, ambiguity: "variable_weight" };
  }

  // 2. Pack multiplicado. Precisa vir antes da leitura genérica, senão o "6" e o "350"
  //    viram duas leituras e o texto é rejeitado como ambíguo.
  const multiplied = MULTIPLIED_PACK.exec(text);
  if (multiplied) {
    // O casamento consome exatamente dois números. Qualquer número sobrando é texto que a
    // leitura ignoraria em silêncio — `"500 g 6 x 350 ml"` e `"6 x 350 ml e 2 x 100 g"`
    // devolviam o primeiro pack e descartavam o resto. Descartar em silêncio é a forma
    // mais cara de errar aqui, porque o resultado parece confiável.
    if (countNumbers(text) > 2) {
      return { status: "ambiguous", raw, ambiguity: "multiple_readings" };
    }

    const unit = unitWordOf(multiplied[3]);
    const count = Number(multiplied[1]);
    const each = toNumber(multiplied[2]);
    if (unit === undefined) {
      const countable = countWordOf(multiplied[3]);
      if (countable === undefined)
        return { status: "unsupported", raw, unsupported: "unknown_unit" };
      // "2 x 6 unidades" — doze unidades, e o pack tem doze itens.
      const total = roundToScale(count * each);
      return {
        status: "parsed",
        raw,
        quantity: { value: total, unit: "un" },
        packageHint: "pack",
        unitsPerPackage: total,
        method: "multiplied_pack",
      };
    }
    return {
      status: "parsed",
      raw,
      quantity: { value: roundToScale(each * count), unit },
      packageHint: "pack",
      unitsPerPackage: count,
      method: "multiplied_pack",
    };
  }

  // 3. Leitura genérica: todos os pares (número, palavra) do texto.
  const pairs: Array<{ value: number; word: string | undefined }> = [];
  const pattern = valueWordPattern();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    pairs.push({ value: toNumber(match[1]), word: match[2] });
  }

  if (pairs.length === 0) {
    // Sem número. "dúzia" sozinha ainda é doze; qualquer outra coisa não é quantidade.
    if (DOZEN_WORDS.some((word) => text.split(" ").includes(word))) {
      return {
        status: "parsed",
        raw,
        quantity: { value: 12, unit: "un" },
        packageHint: "pack",
        unitsPerPackage: 12,
        method: "dozen",
      };
    }
    return { status: "unsupported", raw, unsupported: "no_quantity" };
  }

  // Mais de um número no texto é motivo suficiente para devolver a decisão a um humano:
  // "500 g 12 un" pode ser um pack de doze sachês de 500 g, ou um erro de digitação, e
  // escolher uma das duas em silêncio é o erro caro.
  if (pairs.length > 1) {
    return { status: "ambiguous", raw, ambiguity: "multiple_readings" };
  }

  const { value, word } = pairs[0];
  if (word === undefined) {
    return { status: "ambiguous", raw, ambiguity: "unit_missing" };
  }

  const unit = unitWordOf(word);
  if (unit !== undefined) {
    return {
      status: "parsed",
      raw,
      quantity: { value: roundToScale(value), unit },
      packageHint: null,
      unitsPerPackage: null,
      method: "value_unit",
    };
  }

  if (DOZEN_WORDS.includes(word)) {
    const total = roundToScale(value * 12);
    return {
      status: "parsed",
      raw,
      quantity: { value: total, unit: "un" },
      packageHint: "pack",
      unitsPerPackage: total,
      method: "dozen",
    };
  }

  const countable = countWordOf(word);
  if (countable !== undefined) {
    const pack = countable.pack && value > 1;
    return {
      status: "parsed",
      raw,
      quantity: { value, unit: "un" },
      packageHint: pack ? "pack" : null,
      unitsPerPackage: pack ? value : null,
      method: "count_word",
    };
  }

  return { status: "unsupported", raw, unsupported: "unknown_unit" };
}

/** O estado de proveniência correspondente a uma leitura. Nunca devolve `confirmed`. */
export function provenanceOf(parse: SizeTextParse): Exclude<QuantityProvenance, "confirmed"> {
  return parse.status;
}
