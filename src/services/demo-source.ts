import { appMode, type AppMode } from "@/lib/app-mode";
import {
  DEMO_MARKETS,
  DEMO_PRODUCTS,
  construirOfertasDemo,
  grupoDoProduto,
  imagemDoProdutoDemo,
  observadaNoSnapshot,
  ordenarOfertas,
  ordenarPorCustoUnitario,
  umPrecoPorMercado,
} from "@/lib/demo-catalog";
import { normalizeSearchText } from "@/lib/normalize";
import type { UnitPriceBasis } from "@/lib/unit-price";
import type { ImagemDeProduto, OfertaCardV2 } from "@/lib/card-v2";
import type { Market, PriceWithMarket, Product, ProductComparison } from "@/types/domain";

/**
 * =============================================================================
 * A FONTE DE BUSCA E DE COMPARAÇÃO, RESOLVIDA PELO MODO DO AMBIENTE
 * =============================================================================
 *
 * - `demo`   — fonte ativa hoje: `@/lib/demo-catalog`, determinístico, sem rede.
 * - `piloto` — dormente: `@/services/catalog`, que fala com o Supabase e não mudou uma linha.
 *
 * O `import()` do catálogo é dinâmico de propósito: em modo DEMO o módulo que fala com o
 * Supabase não chega a ser avaliado — a demonstração não depende de rede na frente de ninguém.
 *
 * =============================================================================
 * O QUE MUDOU NA DEMO V2: A COMPARAÇÃO É DE UM GRUPO, E O GRUPO DECLARA O CRITÉRIO
 * =============================================================================
 *
 * Nos grupos de embalagem igual nada muda: um preço por mercado, do menor para o maior.
 * Nos grupos de **embalagens diferentes** (Elseve 400/200 ml, Dreamies 80/40 g, Sanol
 * 30/7 un), cada linha carrega o próprio SKU e a ordem é por **custo unitário** — a única
 * comparação que o princípio 1 permite entre tamanhos diferentes. `basePorUnidade` diz à
 * tela em que base o grupo compara, e a tela é obrigada a dizer isso ao leitor.
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
 * dele que roda aqui — o mesmo módulo, o mesmo teste de contrato. O catálogo tem doze
 * grupos e a pergunta é "o texto normalizado contém o termo normalizado".
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

/**
 * `ProductComparison` com o que a tela da demo precisa saber sobre o CRITÉRIO:
 *
 * - `basePorUnidade` — presente só no grupo de embalagens diferentes; é a base do custo
 *   unitário que ordenou a lista, e a tela usa isso para o selo "Melhor custo/kg" e para a
 *   frase que explica a ordem;
 * - `granel` — grupo de peso variável: as telas mostram o seletor de 250 g / 500 g / 1 kg.
 *
 * No caminho do piloto os dois ficam ausentes e nada muda.
 */
export interface ComparacaoV2 extends ProductComparison {
  basePorUnidade?: UnitPriceBasis;
  granel?: boolean;
}

/** Comparação de um produto: um preço válido por mercado, ordenado pelo critério do grupo. */
export async function carregarComparacao(
  productId: string,
  source: AppMode = appMode(),
  now: Date = new Date(),
): Promise<ComparacaoV2 | null> {
  if (source === "demo") return compararNoCatalogoDemo(productId, now);
  const { getProductComparison } = await import("@/services/catalog");
  return getProductComparison(productId);
}

export function compararNoCatalogoDemo(
  productId: string,
  now: Date = new Date(),
): ComparacaoV2 | null {
  const grupo = grupoDoProduto(productId);
  if (grupo === null) return null;

  const idsDoGrupo = new Set(grupo.sementes.map((s) => s.id));
  // Snapshot histórico (§18): entra o que foi OBSERVADO, não só o que ainda vige — a tela
  // diz "valeu até" quando a validade passou. O piloto continua no isValidPrice() dele.
  const observadas = construirOfertasDemo().filter(
    (o) => idsDoGrupo.has(o.id) && observadaNoSnapshot(o, now),
  );

  // Um preço por mercado primeiro; depois o critério do grupo decide a ordem.
  const porMercado = umPrecoPorMercado(observadas);
  const ordenadas =
    grupo.basePorUnidade === undefined
      ? ordenarOfertas(porMercado)
      : ordenarPorCustoUnitario(porMercado);

  const entries = ordenadas as unknown as PriceWithMarket[];

  return {
    product: grupo.produto,
    entries,
    lastUpdatedAt:
      entries.length === 0
        ? null
        : entries.reduce(
            (mais, e) => (Date.parse(e.observed_at) > Date.parse(mais) ? e.observed_at : mais),
            entries[0].observed_at,
          ),
    ...(grupo.basePorUnidade === undefined ? {} : { basePorUnidade: grupo.basePorUnidade }),
    ...(grupo.granel === true ? { granel: true } : {}),
  };
}

/** Mercados oferecidos no seletor de mercado habitual. */
export async function carregarMercados(source: AppMode = appMode()): Promise<Market[]> {
  if (source === "demo") return [...DEMO_MARKETS];
  const { getMarkets } = await import("@/services/catalog");
  return getMarkets();
}

/**
 * Uma oferta específica — a tela de DETALHE.
 *
 * `productId` aqui é o id do GRUPO (a rota vive sob `/produto/$productId/…`), e a oferta é
 * procurada dentro dele: nos grupos de embalagens diferentes o `product_id` da oferta é o
 * SKU, não o grupo, e exigir igualdade direta quebraria exatamente os grupos que a ficha
 * mais precisa explicar. Em modo piloto devolve `null` — falha fechada, sem prometer um
 * endpoint que o backend não tem.
 */
export function ofertaDemo(
  productId: string,
  priceId: string,
  now: Date = new Date(),
): OfertaCardV2 | null {
  if (appMode() !== "demo") return null;
  const grupo = grupoDoProduto(productId);
  if (grupo === null) return null;
  if (!grupo.sementes.some((s) => s.id === priceId)) return null;
  const oferta = construirOfertasDemo().find((o) => o.id === priceId);
  return oferta !== undefined && observadaNoSnapshot(oferta, now) ? oferta : null;
}

/** A embalagem do produto, para as telas que recebem `Product` sem a oferta junto. */
export function imagemDoProduto(productId: string): ImagemDeProduto | null {
  return appMode() === "demo" ? imagemDoProdutoDemo(productId) : null;
}

/** O que a tela de busca precisa por grupo: a imagem, a oferta vencedora e o critério. */
export interface ResumoDeBusca {
  readonly product: Product;
  readonly imagem: ImagemDeProduto | null;
  /** A oferta que abre a comparação — vencedora PELO CRITÉRIO DO GRUPO. `null` sem preço válido. */
  readonly melhor: OfertaCardV2 | null;
  /** Presente quando o grupo compara embalagens diferentes por custo unitário. */
  readonly basePorUnidade?: UnitPriceBasis;
  /** Grupo de peso variável — o card mostra o preço de "aprox. 500 g". */
  readonly granel?: boolean;
  readonly mercados: number;
}

/**
 * Resumo de busca dos produtos encontrados.
 *
 * A conta é a MESMA da comparação — reusa `carregarComparacao` em vez de reimplementar: é
 * assim que o vencedor do card de busca e o primeiro da comparação não podem discordar.
 * Nos grupos de embalagens diferentes o card NÃO diz "menor preço": diz o vencedor por
 * custo unitário, com a gramatura dele ao lado — "mais barato" sem qualificação é a
 * ambiguidade que o §5 proíbe.
 */
export async function resumirBusca(
  produtos: Product[],
  source: AppMode = appMode(),
  now: Date = new Date(),
): Promise<ResumoDeBusca[]> {
  const comparacoes = await Promise.all(produtos.map((p) => carregarComparacao(p.id, source, now)));

  return produtos.map((product, i) => {
    const comparacao = comparacoes[i];
    const entries = (comparacao?.entries ?? []) as unknown as OfertaCardV2[];
    const melhor = entries[0] ?? null;
    // A imagem do card é a do SKU VENCEDOR, não a do grupo: o card mostra o preço, a
    // gramatura e o mercado da vencedora, e a foto tem de ser da mesma oferta que o resto
    // do card descreve. (Nos grupos de embalagem igual as duas coisas coincidem.)
    const imagem =
      source !== "demo"
        ? null
        : ((melhor === null ? null : imagemDoProdutoDemo(melhor.product_id)) ??
          imagemDoProdutoDemo(product.id));
    return {
      product,
      imagem,
      melhor,
      ...(comparacao?.basePorUnidade === undefined
        ? {}
        : { basePorUnidade: comparacao.basePorUnidade }),
      ...(comparacao?.granel === true ? { granel: true } : {}),
      mercados: entries.length,
    };
  });
}
