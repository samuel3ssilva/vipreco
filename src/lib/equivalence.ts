/**
 * As três relações entre dois SKUs — e a que só uma delas entra na comparação (R1 /
 * MVP-E1-03).
 *
 * Contrato normativo: `docs/product/CANONICAL-PRODUCT-SPEC.md` §3–4.
 *
 *     EXATO         mesma tupla de identidade. Único conjunto que entra na lista orgânica.
 *     OUTRO TAMANHO mesma linha de produto, quantidade normalizada diferente.
 *     SIMILAR       marca, variante ou embalagem diferentes, dentro da mesma categoria.
 *
 * **SIMILAR nunca entra na comparação exata, em nenhuma fase.** É proibição, não
 * adiamento (princípio 1). Por isso o resultado carrega `comparable`, e `comparable` é
 * verdadeiro **somente** em `exact`: quem consumir esta função não precisa lembrar da
 * regra, e não consegue burlá-la por engano.
 *
 * O QUE ESTA FUNÇÃO NÃO É
 *
 * Não é o caminho da comparação em produção. A comparação chaveia num único `product_id`
 * e continua chaveando (`CANONICAL-PRODUCT-SPEC.md` §1); nada aqui reordena lista, agrupa
 * produto ou altera ranking. Isto é ferramenta de **curadoria**: responde "estes dois
 * registros são o mesmo item de prateleira?" para quem cadastra e revisa catálogo.
 */
import { assessGtin, sameGtin } from "@/lib/gtin";
import { normalizeSearchText } from "@/lib/normalize";
import {
  resolveExactIdentity,
  sameExactIdentity,
  sameProductLine,
  type IdentityInput,
} from "@/lib/product-identity";
import type { Product } from "@/types/domain";

export type ProductRelation =
  /** mesma tupla — o único conjunto comparável */
  | "exact"
  /** mesma linha de produto, quantidade diferente — comparável só por preço unitário */
  | "other_size"
  /** mesma categoria, identidade diferente — nunca comparado numericamente */
  | "similar"
  /** nem a mesma categoria: dois produtos que não se falam */
  | "unrelated"
  /** o mesmo GTIN em dois itens que não são o mesmo item — dado a corrigir */
  | "gtin_conflict"
  /** falta dado, ou os sinais se contradizem: decisão humana */
  | "undetermined";

export type RelationReason =
  | "same_identity"
  | "quantity_differs"
  /** mesmo GTIN com quantidades diferentes: reformulação silenciosa (§4.5) */
  | "reformulated_gtin"
  | "brand_differs"
  | "variant_differs"
  | "package_differs"
  | "name_differs"
  | "category_differs"
  /** GTIN igual em itens com marca, variante, nome ou embalagem diferentes */
  | "gtin_shared_by_different_items"
  /** tupla igual, GTINs bem formados e diferentes — não unir automaticamente */
  | "gtin_disagreement"
  /** um dos lados não tem identidade estruturada */
  | "identity_incomplete";

export interface RelationResult {
  relation: ProductRelation;
  reason: RelationReason;
  /**
   * Este par pode aparecer junto na lista orgânica de comparação?
   *
   * Verdadeiro **somente** em `exact`. Nenhuma outra relação libera comparação numérica
   * direta — nem `other_size`, que só admite comparação por preço unitário, em seção
   * própria e rotulada.
   */
  comparable: boolean;
}

/** Os campos que a classificação lê. `category` não é identidade; só delimita SIMILAR. */
export type EquivalenceInput = IdentityInput & Pick<Product, "category" | "gtin">;

function result(relation: ProductRelation, reason: RelationReason): RelationResult {
  return { relation, reason, comparable: relation === "exact" };
}

/** SIMILAR exige mesma categoria. Categoria ausente não conta como categoria comum. */
function sameCategory(a: EquivalenceInput, b: EquivalenceInput): boolean {
  const left = normalizeSearchText(a.category);
  const right = normalizeSearchText(b.category);
  return left.length > 0 && left === right;
}

/** Qual campo de identidade divergiu primeiro — para o relatório dizer o motivo. */
function firstDifference(a: EquivalenceInput, b: EquivalenceInput): RelationReason {
  if (normalizeSearchText(a.name) !== normalizeSearchText(b.name)) return "name_differs";
  if (normalizeSearchText(a.brand) !== normalizeSearchText(b.brand)) return "brand_differs";
  if (normalizeSearchText(a.variant) !== normalizeSearchText(b.variant)) return "variant_differs";
  return "package_differs";
}

/**
 * Classifica a relação entre dois registros de produto.
 *
 * A ordem das perguntas importa e está escrita para o caso perigoso vir primeiro: dois
 * itens com o mesmo código de barras que **não** são o mesmo item precisam ser vistos
 * antes de qualquer outra conclusão.
 */
export function classifyRelation(a: EquivalenceInput, b: EquivalenceInput): RelationResult {
  const left = resolveExactIdentity(a);
  const right = resolveExactIdentity(b);

  // Sem identidade estruturada dos dois lados não há resposta honesta. Peso variável cai
  // aqui, e é o comportamento certo: §4.3 o tira do escopo comparável do MVP.
  if (left.status !== "resolved" || right.status !== "resolved") {
    return result("undetermined", "identity_incomplete");
  }

  const identical = sameExactIdentity(left.identity, right.identity);
  const sameLine = sameProductLine(left.identity, right.identity);

  if (sameGtin(a.gtin, b.gtin)) {
    // §4.5 — reformulação silenciosa: o mesmo código passa a designar outra quantidade.
    // A quantidade vence o GTIN, senão a comparação apresentaria 900 ml e 1 L como o
    // mesmo item exatamente onde o consumidor mais precisa dela.
    if (identical) return result("exact", "same_identity");
    if (sameLine) return result("other_size", "reformulated_gtin");
    return result("gtin_conflict", "gtin_shared_by_different_items");
  }

  if (identical) {
    // Tupla igual, códigos bem formados e diferentes. Pode ser erro de digitação, pode
    // ser marca própria de duas redes — e unir automaticamente é decisão que o CTO não
    // toma. Fica explícito e fora da lista orgânica.
    const gtinsBemFormados =
      assessGtin(a.gtin).state === "unverified" && assessGtin(b.gtin).state === "unverified";
    if (gtinsBemFormados) return result("undetermined", "gtin_disagreement");
    return result("exact", "same_identity");
  }

  if (sameLine) return result("other_size", "quantity_differs");
  if (sameCategory(a, b)) return result("similar", firstDifference(a, b));
  return result("unrelated", "category_differs");
}

/**
 * Filtra candidatos deixando só os EXATOS em relação à referência.
 *
 * Existe para que "só exato entra" seja uma linha de código chamável, e não uma regra que
 * cada consumidor reimplementa — e reimplementa um pouco diferente.
 */
export function keepExact<T extends EquivalenceInput>(
  reference: EquivalenceInput,
  candidates: readonly T[],
): T[] {
  return candidates.filter((candidate) => classifyRelation(reference, candidate).comparable);
}
