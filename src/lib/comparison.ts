import type { Price, PriceWithMarket } from "@/types/domain";

/** Um preço é válido quando está ativo, já foi observado e ainda não venceu. */
export function isValidPrice(
  price: Pick<Price, "is_active" | "observed_at" | "valid_until">,
  now: Date = new Date(),
) {
  if (!price.is_active) return false;
  if (new Date(price.observed_at).getTime() > now.getTime()) return false;
  if (price.valid_until && new Date(price.valid_until).getTime() < now.getTime()) return false;
  return true;
}

/**
 * Compara dois preços por recência: `observed_at` → `created_at` → `id`.
 * Retorna positivo quando `a` é mais recente que `b`.
 */
function compareRecency(a: Pick<Price, "observed_at" | "created_at" | "id">, b: typeof a): number {
  const observedDiff = new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime();
  if (observedDiff !== 0) return observedDiff;
  const createdDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (createdDiff !== 0) return createdDiff;
  return a.id.localeCompare(b.id);
}

/**
 * Mantém apenas o preço válido mais recente de cada mercado
 * e ordena do menor para o maior preço.
 */
export function latestValidPricePerMarket(
  prices: PriceWithMarket[],
  now: Date = new Date(),
): PriceWithMarket[] {
  const byMarket = new Map<string, PriceWithMarket>();

  for (const price of prices) {
    if (!isValidPrice(price, now)) continue;
    if (!price.market?.is_active) continue;
    const current = byMarket.get(price.market_id);
    if (!current || compareRecency(price, current) > 0) {
      byMarket.set(price.market_id, price);
    }
  }

  return [...byMarket.values()].sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    const recencia = new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime();
    if (recencia !== 0) return recencia;
    // Terceiro critério, e ele não é opcional. Sem `id`, dois mercados com o mesmo preço e a
    // mesma observação ficavam na ordem em que entraram no `Map` — que é a ordem em que o banco
    // devolveu as linhas. A mesma consulta podia produzir duas listas diferentes, e a primeira
    // posição é justamente a que o produto chama de "menor preço".
    //
    // `id` é uuid, único por linha e estável entre requisições. É o mesmo desempate que
    // `compareRecency` já usa para escolher o preço vencedor **dentro** de um mercado; agora a
    // ordem **entre** mercados tem a mesma garantia.
    return a.id.localeCompare(b.id);
  });
}

export type UsualMarketComparison =
  | { kind: "no-usual-market" }
  | { kind: "no-price" }
  | { kind: "cheapest"; usual: PriceWithMarket }
  | { kind: "difference"; usual: PriceWithMarket; best: PriceWithMarket; difference: number };

/**
 * Compara o menor preço encontrado com o preço do mercado habitual do visitante.
 * `difference` é positivo quando o menor preço é mais barato que o habitual.
 */
export function compareWithUsualMarket(
  entries: PriceWithMarket[],
  usualMarketId: string | null,
): UsualMarketComparison {
  if (!usualMarketId) return { kind: "no-usual-market" };
  const usual = entries.find((entry) => entry.market_id === usualMarketId);
  if (!usual) return { kind: "no-price" };
  const best = entries[0];
  if (!best || best.market_id === usual.market_id) return { kind: "cheapest", usual };
  return {
    kind: "difference",
    usual,
    best,
    difference: Number((usual.price - best.price).toFixed(2)),
  };
}

/** Data da observação mais recente entre os preços válidos. */
export function lastUpdatedAt(entries: PriceWithMarket[]): string | null {
  if (entries.length === 0) return null;
  return entries
    .map((entry) => entry.observed_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}
