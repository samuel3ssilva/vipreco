/**
 * Preço unitário — calculado, nunca armazenado, e nunca exibido em dúvida (R1).
 *
 * Contrato normativo: `docs/data/MVP-DATA-CONTRACT.md` §2.
 *
 * | grandeza | base     | fórmula                              |
 * | -------- | -------- | ------------------------------------ |
 * | `g`      | `per_kg` | `price ÷ normalized_quantity × 1000` |
 * | `ml`     | `per_l`  | `price ÷ normalized_quantity × 1000` |
 * | `un`     | `per_un` | `price ÷ normalized_quantity`        |
 *
 * QUATRO REGRAS QUE ESTE MÓDULO SUSTENTA
 *
 * 1. **Nunca armazenado.** Preço unitário guardado envelhece em relação ao preço, e um
 *    unitário desatualizado é pior do que nenhum. Por isso aqui só existe função.
 * 2. **Nunca exibido fora de `ok`.** `ambiguous` e `unavailable` significam ausência na
 *    interface, e ausência é estado normal.
 * 3. **Nunca compara grandezas diferentes.** `per_kg` só contra `per_kg`. A base vem
 *    junto do número justamente para tornar a comparação errada impossível de escrever
 *    por descuido.
 * 4. **Nunca reordena a lista orgânica.** O unitário é secundário: a ordem entre produtos
 *    EXATOS continua sendo por preço absoluto (princípio 3 do `CLAUDE.md`). Este módulo
 *    não sabe o que é ordenação e não é chamado por nada que ordene.
 *
 * Erro não vira `0` nem `NaN` público: vira estado.
 */
import { normalizeQuantity } from "@/lib/quantity";
import type { QuantityProvenance } from "@/lib/size-text";
import type { DeclaredQuantity } from "@/types/domain";

/** Em que base o número está expresso. Vai sempre junto do valor. */
export type UnitPriceBasis = "per_kg" | "per_l" | "per_un";

/** Os três estados de `calculation_status` do contrato de dados. */
export type CalculationStatus = "ok" | "ambiguous" | "unavailable";

export type UnitPriceAmbiguity =
  /** a quantidade existe, mas ninguém a aprovou — leitura de texto não basta */
  | "quantity_not_approved"
  /** o texto de origem admitia mais de uma leitura */
  | "quantity_ambiguous"
  /** pack sem conteúdo interno declarado: dá para calcular por litro, não por item */
  | "package_content_unknown";

export type UnitPriceUnavailability =
  /** não há quantidade estruturada — peso variável, granel, dado ainda não migrado */
  | "quantity_unavailable"
  /** a quantidade existe e não sobrevive à conversão (zero, negativa, não finita) */
  | "quantity_invalid"
  /** preço ausente, zero, negativo ou não finito */
  | "price_invalid";

export type UnitPriceResult =
  | {
      status: "ok";
      basis: UnitPriceBasis;
      /** Precisão cheia. O cálculo interno não arredonda. */
      value: number;
      /** Duas casas, arredondamento comercial — é isto que a interface mostra. */
      display: number;
      /**
       * Preço por item dentro do pack, quando o conteúdo é declarado. Refrigerante em
       * pack se compara por litro entre marcas e por lata na gôndola, e as duas leituras
       * são úteis.
       */
      perPackageUnit: { value: number; display: number } | null;
    }
  | { status: "ambiguous"; ambiguity: UnitPriceAmbiguity }
  | { status: "unavailable"; unavailability: UnitPriceUnavailability };

export interface UnitPriceInput {
  /** Preço de prateleira observado. Nunca é alterado por este módulo. */
  price: number;
  /** Quantidade declarada na embalagem, ou `null` quando não existe. */
  quantity: DeclaredQuantity | null;
  /**
   * De onde veio a quantidade. Só `confirmed` libera cálculo — o contrato exige
   * "estruturadas **e aprovadas**", e uma leitura de `size_text` ainda não é aprovação.
   */
  provenance: QuantityProvenance;
  /** Itens contáveis dentro do pack, quando declarados. */
  unitsPerPackage?: number | null;
}

const BASIS_BY_UNIT = Object.freeze({
  g: { basis: "per_kg", factor: 1000 },
  ml: { basis: "per_l", factor: 1000 },
  un: { basis: "per_un", factor: 1 },
} as const);

const CENTS = 100;

/**
 * Arredondamento comercial de exibição, em duas casas.
 *
 * `Math.round(1.005 * 100)` devolve 100, porque 1.005 em binário é 1.00499999…. Passar
 * pela representação decimal antes de arredondar corrige o caso e continua determinístico
 * — e determinismo aqui não é preciosismo: dois arredondamentos diferentes do mesmo preço
 * apareceriam como dois números na mesma tela.
 */
function roundToCents(value: number): number {
  const text = value.toString();
  if (text.includes("e") || text.includes("E")) return Math.round(value * CENTS) / CENTS;
  return Math.round(Number(`${text}e2`)) / CENTS;
}

/**
 * Calcula o preço unitário, ou explica por que não calculou.
 *
 * O preço original nunca é tocado: a entrada é lida, não mutada, e o resultado é sempre
 * um objeto novo.
 */
export function computeUnitPrice(input: UnitPriceInput): UnitPriceResult {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { status: "unavailable", unavailability: "price_invalid" };
  }

  switch (input.provenance) {
    case "missing":
    case "unsupported":
      return { status: "unavailable", unavailability: "quantity_unavailable" };
    case "ambiguous":
      return { status: "ambiguous", ambiguity: "quantity_ambiguous" };
    case "parsed":
      // Lida de `size_text` e ainda sem revisão. Há quantidade; falta aprovação.
      return { status: "ambiguous", ambiguity: "quantity_not_approved" };
    case "confirmed":
      break;
  }

  if (input.quantity === null) {
    return { status: "unavailable", unavailability: "quantity_unavailable" };
  }

  const normalized = normalizeQuantity(input.quantity);
  if (normalized.status !== "ok") {
    return { status: "unavailable", unavailability: "quantity_invalid" };
  }

  const { basis, factor } = BASIS_BY_UNIT[normalized.quantity.unit];
  const value = (input.price / normalized.quantity.value) * factor;

  const units = input.unitsPerPackage;
  const perPackageUnit =
    typeof units === "number" && Number.isInteger(units) && units > 0 && basis !== "per_un"
      ? { value: input.price / units, display: roundToCents(input.price / units) }
      : null;

  return { status: "ok", basis, value, display: roundToCents(value), perPackageUnit };
}

/**
 * Dois preços unitários são comparáveis entre si?
 *
 * Só quando estão na mesma base. É a regra 2 do contrato transformada em guarda: sem ela,
 * comparar `per_kg` com `per_l` é uma subtração que o compilador aceita.
 */
export function comparableUnitPrices(a: UnitPriceResult, b: UnitPriceResult): boolean {
  return a.status === "ok" && b.status === "ok" && a.basis === b.basis;
}
