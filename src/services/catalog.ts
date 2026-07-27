import { supabase } from "@/integrations/supabase/client";
import { buildSearchTerms, looksLikeGtin, normalizeSearchText } from "@/lib/normalize";
import { lastUpdatedAt, latestValidPricePerMarket } from "@/lib/comparison";
import type {
  DecisionFeedbackInput,
  Market,
  Opportunity,
  PriceSubmissionInput,
  PriceWithMarket,
  Product,
  ProductComparison,
} from "@/types/domain";

const PRODUCT_FIELDS = "id,name,brand,variant,size_text,gtin,category,is_active,is_demo";
const MARKET_FIELDS = "id,name,neighborhood,address,maps_url,is_active,is_demo";
const PRICE_FIELDS =
  "id,product_id,market_id,price,source_type,observed_at,valid_until,special_condition,source_reference,is_featured,is_active,is_demo";

class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

function fail(message: string, error: unknown): never {
  console.error(message, error);
  throw new ServiceError(message);
}

/** Busca produtos por nome, marca, variante, tamanho ou GTIN (sem acentos, sem caixa). */
export async function searchProducts(term: string, limit = 12): Promise<Product[]> {
  const normalized = normalizeSearchText(term);
  if (normalized.length < 2) return [];

  let query = supabase.from("products").select(PRODUCT_FIELDS).eq("is_active", true).limit(limit);

  if (looksLikeGtin(term)) {
    query = query.ilike("search_text", `%${normalized}%`);
  } else {
    for (const word of buildSearchTerms(term)) {
      query = query.ilike("search_text", `%${word}%`);
    }
  }

  const { data, error } = await query.order("name").order("brand").order("size_text");
  if (error) fail("Não foi possível buscar os produtos agora.", error);
  return (data ?? []) as Product[];
}

export async function getMarkets(): Promise<Market[]> {
  const { data, error } = await supabase
    .from("markets")
    .select(MARKET_FIELDS)
    .eq("is_active", true)
    .order("name");
  if (error) fail("Não foi possível carregar os mercados agora.", error);
  return (data ?? []) as Market[];
}

/** Comparação de um produto: apenas o preço válido mais recente de cada mercado. */
export async function getProductComparison(productId: string): Promise<ProductComparison | null> {
  const [productResult, pricesResult] = await Promise.all([
    supabase.from("products").select(PRODUCT_FIELDS).eq("id", productId).eq("is_active", true).maybeSingle(),
    supabase
      .from("prices")
      .select(`${PRICE_FIELDS},market:markets(${MARKET_FIELDS})`)
      .eq("product_id", productId)
      .order("observed_at", { ascending: false }),
  ]);

  if (productResult.error) fail("Não foi possível carregar o produto agora.", productResult.error);
  if (pricesResult.error) fail("Não foi possível carregar os preços agora.", pricesResult.error);
  if (!productResult.data) return null;

  const rows = (pricesResult.data ?? []) as unknown as PriceWithMarket[];
  const entries = latestValidPricePerMarket(rows.filter((row) => row.market));

  return {
    product: productResult.data as Product,
    entries,
    lastUpdatedAt: lastUpdatedAt(entries),
  };
}

/** Oportunidades destacadas manualmente (is_featured) e ainda válidas. */
export async function getWeeklyOpportunities(limit = 6): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from("prices")
    .select(`${PRICE_FIELDS},market:markets(${MARKET_FIELDS}),product:products(${PRODUCT_FIELDS})`)
    .eq("is_featured", true)
    .order("observed_at", { ascending: false })
    .limit(limit * 3);

  if (error) fail("Não foi possível carregar as oportunidades agora.", error);

  const rows = (data ?? []) as unknown as Opportunity[];
  return rows.filter((row) => row.market?.is_active && row.product?.is_active).slice(0, limit);
}

/** Produtos que receberam preços recentes. */
export async function getRecentlyUpdatedProducts(limit = 6): Promise<
  Array<{ product: Product; observedAt: string }>
> {
  const { data, error } = await supabase
    .from("prices")
    .select(`observed_at,product:products(${PRODUCT_FIELDS})`)
    .order("observed_at", { ascending: false })
    .limit(60);

  if (error) fail("Não foi possível carregar os produtos atualizados agora.", error);

  const seen = new Map<string, { product: Product; observedAt: string }>();
  for (const row of (data ?? []) as unknown as Array<{ observed_at: string; product: Product | null }>) {
    if (!row.product?.is_active) continue;
    if (seen.has(row.product.id)) continue;
    seen.set(row.product.id, { product: row.product, observedAt: row.observed_at });
    if (seen.size >= limit) break;
  }
  return [...seen.values()];
}

/** Envia uma sugestão da comunidade. Sempre entra como pendente. */
export async function submitPriceUpdate(input: PriceSubmissionInput): Promise<void> {
  const { error } = await supabase.from("price_submissions").insert({
    product_id: input.productId,
    market_id: input.marketId,
    submitted_price: input.submittedPrice,
    source_type: input.sourceType,
    comment: input.comment?.trim() ? input.comment.trim() : null,
    status: "pending",
  });
  if (error) fail("Não foi possível enviar a sua informação agora.", error);
}

export async function registerWatchRequest(productId: string): Promise<void> {
  const { error } = await supabase.from("product_watch_requests").insert({ product_id: productId });
  if (error) fail("Não foi possível registrar o seu interesse agora.", error);
}

export async function submitDecisionFeedback(input: DecisionFeedbackInput): Promise<void> {
  const { error } = await supabase.from("decision_feedback").insert({
    product_id: input.productId,
    helpfulness: input.helpfulness,
    decision_type: input.decisionType ?? null,
  });
  if (error) fail("Não foi possível registrar a sua resposta agora.", error);
}
