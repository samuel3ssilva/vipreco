/**
 * GTIN — validação determinística e estados explícitos (R1 / MVP-E1-05).
 *
 * Contrato normativo: `docs/data/PRODUCT-IDENTIFIERS.md` §3.
 *
 * TRÊS REGRAS QUE ESTE MÓDULO EXISTE PARA SUSTENTAR
 *
 * 1. **GTIN é texto, sempre.** Nenhuma função aqui converte para `number`. Zero à
 *    esquerda é parte do código: `"07896006711117"` e `"7896006711117"` são dois códigos
 *    diferentes, e um `parseInt` os tornaria o mesmo em silêncio.
 * 2. **GTIN é opcional.** Produto sem GTIN é produto normal, não produto incompleto.
 * 3. **GTIN não é a chave de produto.** A chave é `product_id`. Dígito verificador
 *    correto prova que o número é bem formado — não prova que ele é *deste* item.
 *
 * A terceira regra é a razão de `verified` não ser alcançável por função pura: ver
 * `GtinState` abaixo.
 */

/**
 * Estado do GTIN **de um registro**. Quatro valores, e só três são deriváveis de texto.
 *
 * | estado        | significa                                                        |
 * | ------------- | ---------------------------------------------------------------- |
 * | `absent`      | não informado — estado normal, não é erro                        |
 * | `invalid`     | informado e reprovado no formato ou no dígito verificador        |
 * | `unverified`  | bem formado, mas **ninguém confirmou que é deste SKU**           |
 * | `verified`    | confirmado por curadoria contra o item físico                    |
 *
 * `verified` **não pode ser produzido por código puro**, e isso é a tradução direta de
 * "checksum válido não comprova sozinho identidade". Ele depende de alguém ter olhado a
 * embalagem. Por isso `assessGtin()` devolve `GtinAssessment`, que não inclui `verified`:
 * o compilador passa a impedir o atalho que a especificação proíbe em prosa.
 */
export type GtinState = "absent" | "invalid" | "unverified" | "verified";

/** Comprimentos aceitos pelo padrão GS1. */
export type GtinLength = 8 | 12 | 13 | 14;

/** Por que um GTIN informado foi reprovado. Um motivo, nunca uma lista. */
export type GtinRejection =
  /** só espaço em branco entre aspas — informado, mas vazio */
  | "empty"
  /** contém algo que não é dígito ASCII */
  | "non_digit"
  /** só dígitos, mas o comprimento não é 8, 12, 13 nem 14 */
  | "unsupported_length"
  /** formato correto, dígito verificador errado */
  | "check_digit";

/**
 * O que uma função **pura** consegue afirmar sobre um GTIN. Note a ausência de
 * `verified` — é intencional e é o ponto do módulo.
 */
export type GtinAssessment =
  | { state: "absent" }
  | { state: "invalid"; raw: string; rejection: GtinRejection }
  | { state: "unverified"; value: string; length: GtinLength };

const SUPPORTED_LENGTHS: readonly number[] = [8, 12, 13, 14];

/** Apenas dígitos ASCII. `\d` do JavaScript já é ASCII-only, mas ser explícito não custa. */
const ONLY_ASCII_DIGITS = /^[0-9]+$/;

/**
 * Dígito verificador GS1.
 *
 * Do dígito mais à direita do corpo para a esquerda, alterna peso 3 e 1; soma; o
 * verificador é o que falta para o próximo múltiplo de dez. Vale igual para GTIN-8, 12,
 * 13 e 14 — é o mesmo algoritmo, só muda o comprimento do corpo.
 *
 * `body` precisa conter apenas dígitos e representa o código **sem** o verificador.
 */
export function gtinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    // i = 0 é o dígito mais à direita do corpo, e ele pesa 3.
    const digit = body.charCodeAt(body.length - 1 - i) - 48;
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Classifica um GTIN sem nunca alterá-lo.
 *
 * A única transformação aplicada é remover espaço em branco das **pontas** — colar ou
 * digitar um código costuma trazer espaço junto, e espaço nas pontas não é parte de
 * nenhum código de barras. Nada mais é tocado: sem `replace` de zeros, sem `Number()`,
 * sem remover hífen (um GTIN com hífen simplesmente não é um GTIN).
 */
export function assessGtin(raw: string | null | undefined): GtinAssessment {
  if (raw === null || raw === undefined) return { state: "absent" };

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    // Diferencia "não informado" de "informado como string vazia". Os dois viram estados
    // distintos de propósito: o segundo é um dado sujo que alguém precisa ver.
    return raw.length === 0 ? { state: "absent" } : { state: "invalid", raw, rejection: "empty" };
  }

  if (!ONLY_ASCII_DIGITS.test(trimmed)) {
    return { state: "invalid", raw, rejection: "non_digit" };
  }

  if (!SUPPORTED_LENGTHS.includes(trimmed.length)) {
    return { state: "invalid", raw, rejection: "unsupported_length" };
  }

  const body = trimmed.slice(0, -1);
  const declared = trimmed.charCodeAt(trimmed.length - 1) - 48;
  if (gtinCheckDigit(body) !== declared) {
    return { state: "invalid", raw, rejection: "check_digit" };
  }

  // Bem formado. Ainda assim `unverified`: o número passou na aritmética, e a aritmética
  // não sabe o que está dentro da embalagem.
  return { state: "unverified", value: trimmed, length: trimmed.length as GtinLength };
}

/** Atalho de leitura: o GTIN informado passa no formato e no dígito verificador? */
export function isGtinWellFormed(raw: string | null | undefined): boolean {
  return assessGtin(raw).state === "unverified";
}

/**
 * Os dois GTINs designam o mesmo código?
 *
 * Comparação **textual**, depois de tirar espaço das pontas. `"07896006711117"` não é
 * igual a `"7896006711117"`: são códigos diferentes, e tratá-los como iguais é
 * exatamente o erro que a regra "GTIN é texto" existe para evitar.
 */
export function sameGtin(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = assessGtin(a);
  const right = assessGtin(b);
  if (left.state !== "unverified" || right.state !== "unverified") return false;
  return left.value === right.value;
}
