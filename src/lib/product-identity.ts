/**
 * Identidade exata do produto — a tupla que define um SKU (R1 / MVP-E1-01, MVP-E1-02).
 *
 * Contrato normativo: `docs/product/CANONICAL-PRODUCT-SPEC.md` §2.
 *
 *     (name, brand, variant, package_type, quantity_value, quantity_unit)
 *
 * normalizada pelo contrato único de `docs/data/PRODUCT-IDENTIFIERS.md` §2 — o mesmo
 * `normalizeSearchText()` que `pa_normalize_text()` espelha no banco. Uma normalização
 * só, nos dois lados: é o que impede `"500 g"` e `"500  g"` de virarem dois produtos.
 *
 * O QUE MUDA EM RELAÇÃO AO ÍNDICE DE HOJE
 *
 * `products_canonical_identity_idx` chaveia por `(name, brand, variant, size_text)`
 * normalizados. `size_text` é texto livre, então `"500 g"`, `"0,5 kg"` e `"500g"` são
 * três identidades para a mesma prateleira. A tupla deste módulo troca o texto por
 * `package_type` mais quantidade **estruturada e normalizada**, e aí as três convergem
 * por conversão em vez de por coincidência de string.
 *
 * ESTE MÓDULO NÃO PERSISTE NADA. Nenhuma coluna existe ainda; criar o schema é R2, com
 * gate humano. O que existe aqui é o domínio que R2 vai persistir — e o adaptador que
 * diz, sem chutar, quando o dado de hoje ainda não sustenta uma identidade exata.
 */
import { normalizeSearchText } from "@/lib/normalize";
import type { QuantityRejection } from "@/lib/quantity";
import { isQuantityUnit, normalizeQuantity, sameNormalizedQuantity } from "@/lib/quantity";
import type { NormalizedQuantity, PackageType, Product } from "@/types/domain";

/**
 * Os oito tipos de embalagem do contrato, como `Record` fechado sobre `PackageType`.
 *
 * A forma importa: um array literal aceitaria sete valores em silêncio, enquanto o
 * `Record` cobra os oito do compilador. É a mesma construção de `UNIT_CONVERSIONS`, e pelo
 * mesmo motivo — acrescentar o nono passa a exigir uma decisão explícita.
 */
const PACKAGE_TYPE_SET: Readonly<Record<PackageType, true>> = Object.freeze({
  unidade: true,
  pack: true,
  kit: true,
  garrafa: true,
  lata: true,
  vidro: true,
  sache: true,
  caixa: true,
});

/** Os oito tipos, em ordem estável. Espelha o CHECK de `products.package_type`. */
export const PACKAGE_TYPES = Object.freeze(
  Object.keys(PACKAGE_TYPE_SET) as PackageType[],
) as readonly PackageType[];

/**
 * A embalagem informada é um dos oito? Guarda de tipo, para dado que vem de fora.
 *
 * `Object.hasOwn` e não `in`, pelo mesmo motivo de `isQuantityUnit`: `in` percorre a
 * cadeia de protótipos e deixaria `"toString"` passar como tipo de embalagem.
 */
export function isPackageType(value: unknown): value is PackageType {
  return typeof value === "string" && Object.hasOwn(PACKAGE_TYPE_SET, value);
}

/**
 * A tupla resolvida. Todos os campos de texto já vêm normalizados; `brand` e `variant`
 * ausentes viram string vazia — ausência é um valor de identidade legítimo, não um furo.
 */
export interface ExactProductIdentity {
  name: string;
  brand: string;
  variant: string;
  packageType: PackageType;
  quantity: NormalizedQuantity;
}

/** O que falta para o registro sustentar uma identidade exata. */
export type IdentityGap =
  | "name_missing"
  | "package_type_missing"
  | "quantity_value_missing"
  | "quantity_unit_missing"
  /** embalagem preenchida, mas fora dos oito do contrato — dado sujo, não ausência */
  | "package_type_invalid"
  /** unidade preenchida, mas fora das cinco do contrato — dado sujo, não ausência */
  | "quantity_unit_invalid"
  | "quantity_not_finite"
  | "quantity_not_positive";

/**
 * Cada motivo de rejeição da aritmética vira uma lacuna de identidade. Mapa explícito, e
 * não ternário: com um `Record` fechado sobre `QuantityRejection`, acrescentar um sexto
 * motivo lá quebra a compilação aqui, em vez de cair silenciosamente no ramo `else`.
 */
const GAP_BY_REJECTION: Readonly<Record<QuantityRejection, IdentityGap>> = Object.freeze({
  not_finite: "quantity_not_finite",
  not_positive: "quantity_not_positive",
  unknown_unit: "quantity_unit_invalid",
});

export type IdentityResolution =
  | { status: "resolved"; identity: ExactProductIdentity }
  | { status: "incomplete"; gaps: readonly IdentityGap[] };

/** Só os campos que a identidade lê. Aceita `Product` inteiro e também linha parcial. */
export type IdentityInput = Pick<
  Product,
  "name" | "brand" | "variant" | "package_type" | "quantity_value" | "quantity_unit"
>;

/**
 * Resolve a identidade exata a partir dos campos **estruturados**.
 *
 * Deliberadamente não olha para `size_text`. Um registro do modelo de hoje — que só tem
 * o texto — volta como `incomplete`, e essa é a resposta certa: dizer "identidade
 * resolvida" a partir de texto livre é a inferência que o princípio 3 proíbe. Quem quiser
 * derivar quantidade de texto usa o adaptador dedicado de `size_text`, que é curadoria
 * assistida e devolve o resultado rotulado como proposta — nunca como confirmação.
 */
export function resolveExactIdentity(product: IdentityInput): IdentityResolution {
  const gaps: IdentityGap[] = [];

  const name = normalizeSearchText(product.name);
  if (name.length === 0) gaps.push("name_missing");

  // Mesma guarda de `quantity_unit`, e pelo mesmo motivo: o tipo é uma promessa sobre a
  // origem do dado, não uma garantia de runtime. O CHECK de `products.package_type` diz o
  // mesmo em SQL, e os dois precisam concordar.
  const packageType = isPackageType(product.package_type) ? product.package_type : null;
  if (product.package_type === null || product.package_type === undefined) {
    gaps.push("package_type_missing");
  } else if (packageType === null) {
    gaps.push("package_type_invalid");
  }

  const value = product.quantity_value ?? null;
  // `quantity_unit` chega tipada, mas o tipo é uma promessa sobre a origem do dado, não uma
  // garantia de runtime: uma linha vinda do banco, de um fixture antigo ou de JSON pode
  // trazer `"kilo"`. Sem esta guarda, indexar a tabela devolve `undefined` e a leitura de
  // `.factor` estoura — falha por exceção, não por estado.
  const unit = isQuantityUnit(product.quantity_unit) ? product.quantity_unit : null;
  if (value === null) gaps.push("quantity_value_missing");
  if (product.quantity_unit === null || product.quantity_unit === undefined) {
    gaps.push("quantity_unit_missing");
  } else if (unit === null) {
    gaps.push("quantity_unit_invalid");
  }

  let quantity: NormalizedQuantity | null = null;
  if (value !== null && unit !== null) {
    const normalized = normalizeQuantity({ value, unit });
    if (normalized.status === "ok") {
      quantity = normalized.quantity;
    } else {
      gaps.push(GAP_BY_REJECTION[normalized.rejection]);
    }
  }

  if (gaps.length > 0 || packageType === null || quantity === null) {
    return { status: "incomplete", gaps };
  }

  return {
    status: "resolved",
    identity: {
      name,
      brand: normalizeSearchText(product.brand),
      variant: normalizeSearchText(product.variant),
      packageType,
      quantity,
    },
  };
}

/**
 * Separador de campo na chave textual. NUL nunca aparece em nome, marca ou variante, então
 * juntar por ele não cria colisão artificial entre campos vizinhos — `("ab", "c")` e
 * `("a", "bc")` continuam sendo chaves diferentes. Mesmo raciocínio de
 * `scripts/normalization-collisions.ts` — inclusive o motivo de estar escrito como
 * escape e não como byte literal: um NUL cru faz o Git classificar o arquivo como
 * binário, e um módulo que ninguém consegue revisar no diff não serve.
 */
const FIELD_SEPARATOR = "\u0000";

/**
 * Chave textual estável da identidade, para agrupar em `Map`/`Set`.
 *
 * A ordem dos campos é fixa e a serialização é total: dois registros com os mesmos
 * valores produzem a mesma chave independentemente da ordem em que as propriedades foram
 * escritas no objeto.
 */
export function identityKey(identity: ExactProductIdentity): string {
  return [
    identity.name,
    identity.brand,
    identity.variant,
    identity.packageType,
    identity.quantity.unit,
    String(identity.quantity.value),
  ].join(FIELD_SEPARATOR);
}

/** Duas identidades resolvidas são a mesma? Campo a campo, sem tolerância. */
export function sameExactIdentity(a: ExactProductIdentity, b: ExactProductIdentity): boolean {
  return (
    a.name === b.name &&
    a.brand === b.brand &&
    a.variant === b.variant &&
    a.packageType === b.packageType &&
    sameNormalizedQuantity(a.quantity, b.quantity)
  );
}

/**
 * Mesma "linha de produto" — nome, marca, variante e embalagem iguais; quantidade livre.
 *
 * É a base de OUTRO TAMANHO (`CANONICAL-PRODUCT-SPEC.md` §3) e vive aqui, e não no módulo
 * de equivalência, porque é uma pergunta sobre a tupla e não sobre a relação comercial
 * entre dois itens.
 */
export function sameProductLine(a: ExactProductIdentity, b: ExactProductIdentity): boolean {
  return (
    a.name === b.name &&
    a.brand === b.brand &&
    a.variant === b.variant &&
    a.packageType === b.packageType
  );
}
