/**
 * Quantidade estruturada — unidades, conversão e normalização (R1 / MVP-E1-01).
 *
 * Contrato normativo: `docs/data/MVP-DATA-CONTRACT.md` §2.
 *
 * Este módulo é **só a aritmética**. Ele não lê texto, não adivinha unidade e não decide
 * identidade. Interpretar `size_text` é outro módulo, de propósito: misturar as duas
 * coisas é como nasce o erro silencioso de converter `"1 caixa"` em `1 un` sem que
 * ninguém tenha decidido isso.
 *
 * Nada aqui é chamado em tempo de apresentação. O contrato é explícito: "nenhuma
 * inferência de quantidade a partir de texto em tempo de apresentação".
 */
import type {
  DeclaredQuantity,
  NormalizedQuantity,
  NormalizedUnit,
  QuantityUnit,
} from "@/types/domain";

export interface UnitConversion {
  /** Grandeza para a qual a unidade converge. */
  normalizedUnit: NormalizedUnit;
  /** Multiplicador da unidade declarada para a grandeza base. */
  factor: number;
}

/**
 * Cinco unidades, três grandezas. Nada além disso entra no MVP — e a tabela ser um
 * `Record` fechado sobre `QuantityUnit` é o que faz o compilador cobrar uma decisão
 * explícita se alguém quiser acrescentar a sexta.
 */
export const UNIT_CONVERSIONS: Readonly<Record<QuantityUnit, UnitConversion>> = Object.freeze({
  g: { normalizedUnit: "g", factor: 1 },
  kg: { normalizedUnit: "g", factor: 1000 },
  ml: { normalizedUnit: "ml", factor: 1 },
  l: { normalizedUnit: "ml", factor: 1000 },
  un: { normalizedUnit: "un", factor: 1 },
});

/** As cinco unidades declaradas, em ordem estável. Útil em validação e em teste. */
export const QUANTITY_UNITS = Object.freeze(
  Object.keys(UNIT_CONVERSIONS) as QuantityUnit[],
) as readonly QuantityUnit[];

/**
 * A unidade informada é uma das cinco? Guarda de tipo, para dado que vem de fora.
 *
 * `Object.hasOwn` e não `in`: `in` percorre a cadeia de protótipos, então `"toString" in
 * UNIT_CONVERSIONS` é `true` e a guarda deixaria passar `toString`, `constructor` e
 * `valueOf` como se fossem unidades. `UNIT_CONVERSIONS["toString"]` é uma função, `.factor`
 * é `undefined`, e a conversão devolveria `NaN` com `status: "ok"` — exatamente o valor
 * inválido silencioso que o contrato proíbe.
 */
export function isQuantityUnit(value: unknown): value is QuantityUnit {
  return typeof value === "string" && Object.hasOwn(UNIT_CONVERSIONS, value);
}

/** Por que uma quantidade declarada não pôde ser normalizada. */
export type QuantityRejection =
  /** `NaN`, `Infinity` — resultado típico de um parse malfeito lá atrás */
  | "not_finite"
  /** zero ou negativo: embalagem não tem quantidade nula */
  | "not_positive"
  /** a unidade declarada não é uma das cinco do contrato */
  | "unknown_unit";

export type QuantityNormalization =
  | { status: "ok"; quantity: NormalizedQuantity }
  | { status: "rejected"; rejection: QuantityRejection };

/**
 * `numeric(12,4)` é a precisão declarada no contrato de dados. Arredondar aqui, e sempre
 * da mesma forma, é o que faz `1.5 kg` virar exatamente `1500` em vez de `1500.0000001`
 * — e é o que impede duas execuções da mesma conversão de produzirem chaves de
 * identidade diferentes.
 */
const DECIMAL_PLACES = 4;
const SCALE = 10 ** DECIMAL_PLACES;

function roundToScale(value: number): number {
  return Math.round(value * SCALE) / SCALE;
}

/**
 * Converte a quantidade declarada para a grandeza base.
 *
 * ```
 * normalized_quantity = quantity_value × fator(quantity_unit)
 * normalized_unit     = grandeza(quantity_unit)
 * ```
 *
 * As três guardas cobrem as três formas de a conversão dar errado, e a ordem importa:
 * unidade desconhecida antes de indexar a tabela (senão a leitura estoura em `undefined`),
 * entrada não finita antes de multiplicar, e **resultado** não finito depois. A última é a
 * que não é redundante: `1e308` é um valor de entrada finito, e `1e308 kg` transborda para
 * `Infinity` só depois do fator 1000. Validar a entrada não valida a saída.
 */
export function normalizeQuantity(declared: DeclaredQuantity): QuantityNormalization {
  if (!isQuantityUnit(declared.unit)) return { status: "rejected", rejection: "unknown_unit" };
  if (!Number.isFinite(declared.value)) return { status: "rejected", rejection: "not_finite" };
  if (declared.value <= 0) return { status: "rejected", rejection: "not_positive" };

  const conversion = UNIT_CONVERSIONS[declared.unit];
  const value = roundToScale(declared.value * conversion.factor);
  if (!Number.isFinite(value)) return { status: "rejected", rejection: "not_finite" };

  return { status: "ok", quantity: { value, unit: conversion.normalizedUnit } };
}

/**
 * Duas quantidades normalizadas são a mesma?
 *
 * Compara **grandeza e valor**, nesta ordem. `500 g` nunca é igual a `500 ml`: são
 * grandezas diferentes, e compará-las por número seria a comparação falsa que o produto
 * inteiro existe para não fazer.
 */
export function sameNormalizedQuantity(a: NormalizedQuantity, b: NormalizedQuantity): boolean {
  return a.unit === b.unit && roundToScale(a.value) === roundToScale(b.value);
}

/**
 * `units_per_package` válido? Inteiro maior que zero — meia lata dentro de um pack não
 * existe, e `1.0` vindo de um parse frouxo não deve virar um pack de uma unidade.
 */
export function isValidUnitsPerPackage(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
