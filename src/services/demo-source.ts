import { appMode, type AppMode } from "@/lib/app-mode";
import {
  DEMO_MARKETS,
  DEMO_PRODUCTS,
  construirOfertasDemo,
  imagemDoProdutoDemo,
  umPrecoPorMercado,
} from "@/lib/demo-catalog";
import { isValidPrice } from "@/lib/comparison";
import { normalizeSearchText } from "@/lib/normalize";
import type { ImagemDeProduto, OfertaCardV2 } from "@/lib/card-v2";
import type { Market, PriceWithMarket, Product, ProductComparison } from "@/types/domain";

/**
 * =============================================================================
 * A FONTE DE BUSCA E DE COMPARAÇÃO, RESOLVIDA PELO MODO DO AMBIENTE
 * =============================================================================
 *
 * Mesmo padrão que `home-opportunities.ts` já usava para a Home, agora estendido às outras três
 * telas — porque o §8 pede que as quatro descrevam o mesmo produto, e não dava para pedir isso
 * enquanto uma lia fixture e três liam banco.
 *
 * - `demo`   — fonte ativa hoje: `@/lib/demo-catalog`, determinístico, sem rede.
 * - `piloto` — dormente: `@/services/catalog`, que fala com o Supabase e não mudou uma linha.
 *
 * O `import()` do catálogo é dinâmico de propósito: em modo DEMO o módulo que fala com o
 * Supabase não chega a ser avaliado. É isso que torna a separação do §27 verificável em vez de
 * declarada — e é o que impede a demonstração de depender de rede na frente de outra pessoa.
 */

/** Busca por nome, marca, variante, tamanho ou categoria — a mesma normalização do banco. */
export async function buscarProdutos(
  termo: string,
  source: AppMode = appMode(),
): Promise<Product[]> {
  if (source === "demo") return buscarNoCatalogoDemo(termo);
  const { searchProducts } = await import("@/services/catalog");
  return searchProducts(termo);
}

/**
 * O contrato de busca é `pa_normalize_text()` no banco, e `normalizeSearchText` é a metade
 * dele que roda aqui — o mesmo módulo, o mesmo teste de contrato. Nada de motor de busca: o
 * catálogo tem nove produtos e a pergunta é "o texto normalizado contém o termo normalizado".
 */
export function buscarNoCatalogoDemo(termo: string): Product[] {
  const alvo = normalizeSearchText(termo);
  if (alvo.length === 0) return [];
  return DEMO_PRODUCTS.filter((p) =>
    normalizeSearchText(
      [p.name, p.brand, p.variant, p.size_text, p.category].filter(Boolean).join(" "),
    ).includes(alvo),
  ).slice(0, 12);
}

/** Comparação de um produto: um preço válido por mercado, do menor para o maior. */
export async function carregarComparacao(
  productId: string,
  source: AppMode = appMode(),
  now: Date = new Date(),
): Promise<ProductComparison | null> {
  if (source === "demo") return compararNoCatalogoDemo(productId, now);
  const { getProductComparison } = await import("@/services/catalog");
  return getProductComparison(productId);
}

export function compararNoCatalogoDemo(
  productId: string,
  now: Date = new Date(),
): ProductComparison | null {
  const product = DEMO_PRODUCTS.find((p) => p.id === productId);
  if (product === undefined) return null;

  const validas = construirOfertasDemo(now).filter(
    (o) => o.product_id === productId && isValidPrice(o, now),
  );
  const entries = umPrecoPorMercado(validas) as unknown as PriceWithMarket[];

  return {
    product,
    entries,
    lastUpdatedAt:
      entries.length === 0
        ? null
        : entries.reduce(
            (mais, e) => (Date.parse(e.observed_at) > Date.parse(mais) ? e.observed_at : mais),
            entries[0].observed_at,
          ),
  };
}

/** Mercados oferecidos no seletor de mercado habitual. */
export async function carregarMercados(source: AppMode = appMode()): Promise<Market[]> {
  if (source === "demo") return [...DEMO_MARKETS];
  const { getMarkets } = await import("@/services/catalog");
  return getMarkets();
}

/**
 * Uma oferta específica — a tela de DETALHE (§5 do mandato).
 *
 * Ela não existe no caminho do piloto ainda, e isso é deliberado: a rota de detalhe é uma
 * experiência de DEMONSTRAÇÃO (§2, "DEMO UI IMPLEMENTATION"), e inventar aqui uma consulta que
 * o backend não tem seria exatamente a antecipação que o §27 proíbe. Em modo piloto ela devolve
 * `null`, e a rota responde "oferta não encontrada" — falha fechada, sem prometer nada.
 */
export function ofertaDemo(
  productId: string,
  priceId: string,
  now: Date = new Date(),
): OfertaCardV2 | null {
  if (appMode() !== "demo") return null;
  const oferta = construirOfertasDemo(now).find(
    (o) => o.id === priceId && o.product_id === productId,
  );
  return oferta !== undefined && isValidPrice(oferta, now) ? oferta : null;
}

/** A embalagem do produto, para as telas que recebem `Product` sem a oferta junto. */
export function imagemDoProduto(productId: string): ImagemDeProduto | null {
  return appMode() === "demo" ? imagemDoProdutoDemo(productId) : null;
}

/** O que a tela de busca precisa por produto: a embalagem, o menor preço e onde. */
export interface ResumoDeBusca {
  readonly product: Product;
  readonly imagem: ImagemDeProduto | null;
  /** `null` quando o produto existe mas não tem preço válido em nenhum mercado. */
  readonly menorPreco: number | null;
  /** Unidade em que o menor preço foi cobrado, quando a oferta declara uma. */
  readonly unidadeDePreco: OfertaCardV2["price_unit"];
  readonly mercado: Market | null;
  readonly mercados: number;
}

/**
 * Resumo de busca dos produtos encontrados.
 *
 * A conta é a MESMA da comparação — um preço válido por mercado, do menor para o maior —, e é
 * por isso que ela é feita reusando `carregarComparacao` em vez de reimplementada aqui: duas
 * implementações da mesma regra é como o "menor preço" da busca e o primeiro da comparação
 * passam a discordar sem ninguém perceber.
 */
export async function resumirBusca(
  produtos: Product[],
  source: AppMode = appMode(),
  now: Date = new Date(),
): Promise<ResumoDeBusca[]> {
  const comparacoes = await Promise.all(produtos.map((p) => carregarComparacao(p.id, source, now)));

  return produtos.map((product, i) => {
    const entries = comparacoes[i]?.entries ?? [];
    const melhor = entries[0];
    return {
      product,
      imagem: source === "demo" ? imagemDoProdutoDemo(product.id) : null,
      menorPreco: melhor?.price ?? null,
      unidadeDePreco: melhor?.price_unit,
      mercado: melhor?.market ?? null,
      mercados: entries.length,
    };
  });
}
