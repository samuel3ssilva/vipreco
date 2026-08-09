import type { Market, Product } from "@/types/domain";
import type { ImagemDeProduto, OfertaCardV2 } from "@/lib/card-v2";

/**
 * =============================================================================
 * O CATÁLOGO DA DEMONSTRAÇÃO — UMA COLEÇÃO, QUATRO TELAS
 * =============================================================================
 *
 * O mandato §8 é uma frase só, e ela é a razão deste arquivo existir:
 *
 *   HOME = BUSCA = COMPARAÇÃO = DETALHE
 *
 * para identidade, quantidade, imagem e oferta. Antes disto a Home lia um fixture versionado
 * e as outras três liam o banco. Os dois **descreviam** o mesmo produto — `demo-identity.test.ts`
 * garante isso campo a campo —, mas só um deles tinha imagem. Na prática, a pessoa tocava numa
 * embalagem de café na Home e chegava numa página com um retângulo cinza no lugar dela.
 *
 * Agora existe uma coleção só. As quatro telas leem daqui em modo `demo`, e o caminho do banco
 * continua inteiro e intocado para o piloto — ver `@/services/demo-source`.
 *
 * =============================================================================
 * O QUE ISTO NÃO É
 * =============================================================================
 *
 * **Não é antecipação de backend** (§27). Não há motor de busca, ranking aprendido, nem
 * pipeline: há uma lista literal e duas funções puras que a filtram e a ordenam pela MESMA
 * regra que o produto usa no banco — preço crescente, observação mais recente, `id`. Quando o
 * piloto ligar, este módulo sai do caminho sem levar nada junto.
 *
 * **Não é uma segunda verdade.** `supabase/seed.sql` continua sendo a referência versionada do
 * banco, e `demo-identity.test.ts` compara os dois campo a campo. Se divergirem, o CI reprova.
 *
 * =============================================================================
 * AS REGRAS DO DADO (§16)
 * =============================================================================
 *
 * Todo produto daqui: marca fictícia, imagem fictícia, **GTIN nulo**, `is_demo` verdadeiro.
 * Nenhuma marca real, nenhum GTIN real, nenhuma geografia antiga — Artemis, e só.
 */

export const DEMO_FIXTURE_REFERENCE = "Dado fictício de demonstração (fixture versionado)";

/** Todo preço da demonstração carrega o mesmo carimbo de origem. */
function ilustracao(arquivo: string, descricao: string): ImagemDeProduto {
  return {
    src: `/img/demo/${arquivo}`,
    // O `alt` diz o que a imagem É. Chamá-la de "foto" seria a afirmação que o princípio 11
    // proíbe — e quem usa leitor de tela é justamente quem não pode conferir olhando.
    alt: `Ilustração: ${descricao} — desenho próprio, não é foto do produto`,
    review_status: "approved",
    variant_match: "exact",
    ilustrativa: true,
  };
}

// =============================================================================
// MERCADOS
// =============================================================================
//
// Quatro, fictícios, todos em Artemis. Os nomes NÃO imitam rede nenhuma, e os bairros são os
// mesmos do seed — é por eles que `demo-identity.test.ts` casa as duas pontas.

const MARKET_PRINCIPAL: Market = {
  id: "11111111-1111-1111-1111-000000000001",
  name: "Mercado principal",
  neighborhood: "Centro",
  address: "Rua Exemplo, 100 - Artemis",
  maps_url: "https://maps.google.com/?q=-22.5,-47.5",
  is_active: true,
  is_demo: true,
};

const MARKET_LOCAL_2: Market = {
  id: "11111111-1111-1111-1111-000000000002",
  name: "Mercado local 2",
  neighborhood: "Jardim Novo",
  address: "Rua Exemplo, 200 - Artemis",
  maps_url: "https://maps.google.com/?q=-22.51,-47.51",
  is_active: true,
  is_demo: true,
};

const MARKET_LOCAL_3: Market = {
  id: "11111111-1111-1111-1111-000000000003",
  name: "Mercado local 3",
  neighborhood: "Vila Antiga",
  address: "Rua Exemplo, 300 - Artemis",
  maps_url: null,
  is_active: true,
  is_demo: true,
};

const MARKET_LOCAL_4: Market = {
  id: "11111111-1111-1111-1111-000000000004",
  name: "Mercado local 4",
  neighborhood: "Beira Rio",
  address: "Rua Exemplo, 400 - Artemis",
  maps_url: "https://maps.google.com/?q=-22.52,-47.52",
  is_active: true,
  is_demo: true,
};

/**
 * Na ordem alfabética que `getMarkets()` devolveria — assim a escolha de mercado habitual feita
 * na demonstração continua válida se o ambiente trocar de fonte.
 */
export const DEMO_MARKETS: readonly Market[] = [
  MARKET_LOCAL_2,
  MARKET_LOCAL_3,
  MARKET_LOCAL_4,
  MARKET_PRINCIPAL,
];

// =============================================================================
// PRODUTOS
// =============================================================================
//
// TRÊS CAFÉS DE 500 g, e a razão é a tese inteira do produto: eles são marcas DIFERENTES, logo
// produtos diferentes, logo comparações diferentes. Buscar "café" devolve três resultados; cada
// um abre a sua própria comparação. Nada os mistura, em nenhum momento — princípio 1.
//
// O café de 250 g existe pelo motivo oposto: mesma marca, mesma variante, **gramatura
// diferente**. Ele nunca entra na comparação do de 500 g, e a embalagem dele é visivelmente
// menor. É o exemplo que faz a regra ser vista em vez de explicada.

function produto(
  id: string,
  name: string,
  brand: string,
  variant: string,
  size_text: string,
  category: string,
): Product {
  return {
    id,
    name,
    brand,
    variant,
    size_text,
    // GTIN SEMPRE NULO (§16). Um código de barras válido pertence a um produto real de um
    // fabricante real; pendurá-lo numa identidade fictícia é uma afirmação falsa sobre um
    // identificador global, e inventar um é pior — ou colide com alguém, ou reprova no dígito
    // verificador. Ausente é o estado honesto.
    gtin: null,
    category,
    is_active: true,
    is_demo: true,
  };
}

export const PRODUTO_CAFE_SERRA_ALTA = produto(
  "22222222-2222-2222-2222-000000000002",
  "Café",
  "Serra Alta",
  "Tradicional",
  "500 g",
  "Mercearia",
);

export const PRODUTO_CAFE_MONTANHA_CLARA = produto(
  "22222222-2222-2222-2222-000000000008",
  "Café",
  "Montanha Clara",
  "Tradicional",
  "500 g",
  "Mercearia",
);

export const PRODUTO_CAFE_VALE_VERDE = produto(
  "22222222-2222-2222-2222-000000000009",
  "Café",
  "Vale Verde",
  "Tradicional",
  "500 g",
  "Mercearia",
);

export const PRODUTO_CAFE_SERRA_ALTA_250 = produto(
  "22222222-2222-2222-2222-000000000007",
  "Café",
  "Serra Alta",
  "Tradicional",
  "250 g",
  "Mercearia",
);

export const PRODUTO_ARROZ = produto(
  "22222222-2222-2222-2222-000000000001",
  "Arroz",
  "Ouro do Campo",
  "Tipo 1",
  "5 kg",
  "Mercearia",
);

export const PRODUTO_LEITE = produto(
  "22222222-2222-2222-2222-000000000003",
  "Leite",
  "Boa Serra",
  "Integral",
  "1 L",
  "Laticínios",
);

export const PRODUTO_OLEO = produto(
  "22222222-2222-2222-2222-000000000004",
  "Óleo de Soja",
  "Vale Dourado",
  "Tradicional",
  "900 ml",
  "Mercearia",
);

export const PRODUTO_DETERGENTE = produto(
  "22222222-2222-2222-2222-000000000005",
  "Detergente",
  "Brilho Claro",
  "Neutro",
  "500 ml",
  "Limpeza",
);

export const PRODUTO_PAPEL = produto(
  "22222222-2222-2222-2222-000000000006",
  "Papel Higiênico",
  "Flor Macia",
  "Folha Dupla",
  "12 rolos",
  "Higiene",
);

/**
 * A EMBALAGEM É DO PRODUTO, NÃO DA TELA (§8).
 *
 * Um mapa único, consultado por toda tela que desenha um produto. É isto que torna impossível
 * a embalagem mudar entre Home, busca, comparação e detalhe: não existe um segundo lugar onde
 * escolher outra.
 */
const IMAGEM_POR_PRODUTO: Readonly<Record<string, ImagemDeProduto>> = {
  [PRODUTO_CAFE_SERRA_ALTA.id]: ilustracao(
    "cafe-serra-alta.svg",
    "embalagem fictícia de café Serra Alta Tradicional, 500 g",
  ),
  [PRODUTO_CAFE_SERRA_ALTA_250.id]: ilustracao(
    "cafe-serra-alta-250.svg",
    "embalagem fictícia de café Serra Alta Tradicional, 250 g",
  ),
  [PRODUTO_CAFE_MONTANHA_CLARA.id]: ilustracao(
    "cafe-montanha-clara.svg",
    "embalagem fictícia de café Montanha Clara Tradicional, 500 g",
  ),
  [PRODUTO_CAFE_VALE_VERDE.id]: ilustracao(
    "cafe-vale-verde.svg",
    "embalagem fictícia de café Vale Verde Tradicional, 500 g",
  ),
  [PRODUTO_ARROZ.id]: ilustracao(
    "arroz-ouro-do-campo.svg",
    "embalagem fictícia de arroz Ouro do Campo, 5 kg",
  ),
  [PRODUTO_LEITE.id]: ilustracao(
    "leite-boa-serra.svg",
    "embalagem fictícia de leite Boa Serra Integral, 1 L",
  ),
  [PRODUTO_OLEO.id]: ilustracao(
    "oleo-vale-dourado.svg",
    "embalagem fictícia de óleo de soja Vale Dourado, 900 ml",
  ),
  [PRODUTO_DETERGENTE.id]: ilustracao(
    "detergente-brilho-claro.svg",
    "embalagem fictícia de detergente Brilho Claro Neutro, 500 ml",
  ),
  [PRODUTO_PAPEL.id]: ilustracao(
    "papel-flor-macia.svg",
    "embalagem fictícia de papel higiênico Flor Macia Folha Dupla, 12 rolos",
  ),
};

export function imagemDoProdutoDemo(productId: string): ImagemDeProduto | null {
  return IMAGEM_POR_PRODUTO[productId] ?? null;
}

export const DEMO_PRODUCTS: readonly Product[] = [
  PRODUTO_CAFE_SERRA_ALTA,
  PRODUTO_CAFE_MONTANHA_CLARA,
  PRODUTO_CAFE_VALE_VERDE,
  PRODUTO_CAFE_SERRA_ALTA_250,
  PRODUTO_ARROZ,
  PRODUTO_LEITE,
  PRODUTO_OLEO,
  PRODUTO_DETERGENTE,
  PRODUTO_PAPEL,
];

// =============================================================================
// OFERTAS
// =============================================================================

const DIA = 86_400_000;

/** Múltiplo exato de 24 h: é assim que `formatRelativeDay` conta. */
function dias(now: Date, offset: number): string {
  return new Date(now.getTime() + offset * DIA).toISOString();
}

interface Semente {
  readonly id: string;
  readonly produto: Product;
  readonly mercado: Market;
  readonly price: number;
  readonly source_type: OfertaCardV2["source_type"];
  readonly observadoHa: number;
  readonly valePor: number | null;
  readonly condicao: string | null;
}

/**
 * As ofertas da demonstração.
 *
 * Números escolhidos para que a comparação do café Serra Alta 500 g tenha **três** mercados —
 * que é o que o rótulo "Comparação em 3 mercados" vai dizer, e ele só pode dizer 3 porque são
 * 3 (§4 do mandato: "não inventar").
 */
const SEMENTES: readonly Semente[] = [
  // Café Serra Alta 500 g — o produto do golden path, em três mercados.
  {
    id: "demo-price-cafe-serra-alta-m2",
    produto: PRODUTO_CAFE_SERRA_ALTA,
    mercado: MARKET_LOCAL_2,
    price: 17.49,
    source_type: "store_list",
    observadoHa: -1,
    valePor: 4,
    condicao: "Oferta válida enquanto durar o estoque",
  },
  {
    id: "demo-price-cafe-serra-alta-m1",
    produto: PRODUTO_CAFE_SERRA_ALTA,
    mercado: MARKET_PRINCIPAL,
    price: 18.29,
    source_type: "weekly_audit",
    observadoHa: -2,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-cafe-serra-alta-m4",
    produto: PRODUTO_CAFE_SERRA_ALTA,
    mercado: MARKET_LOCAL_4,
    price: 19.9,
    source_type: "shelf_photo",
    observadoHa: -3,
    valePor: 2,
    condicao: "Limite de 2 unidades por cliente",
  },

  // Os outros dois cafés de 500 g: marcas diferentes, comparações próprias.
  {
    id: "demo-price-cafe-montanha-clara-m3",
    produto: PRODUTO_CAFE_MONTANHA_CLARA,
    mercado: MARKET_LOCAL_3,
    price: 18.9,
    source_type: "store_list",
    observadoHa: -1,
    valePor: 5,
    condicao: null,
  },
  {
    id: "demo-price-cafe-montanha-clara-m1",
    produto: PRODUTO_CAFE_MONTANHA_CLARA,
    mercado: MARKET_PRINCIPAL,
    price: 19.49,
    source_type: "weekly_audit",
    observadoHa: -2,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-cafe-vale-verde-m4",
    produto: PRODUTO_CAFE_VALE_VERDE,
    mercado: MARKET_LOCAL_4,
    price: 21.9,
    source_type: "shelf_photo",
    observadoHa: -2,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-cafe-vale-verde-m2",
    produto: PRODUTO_CAFE_VALE_VERDE,
    mercado: MARKET_LOCAL_2,
    price: 22.4,
    source_type: "store_list",
    observadoHa: -3,
    valePor: 3,
    condicao: null,
  },

  // Mesma marca, OUTRA gramatura. Nunca entra na comparação do de 500 g.
  {
    id: "demo-price-cafe-serra-alta-250-m3",
    produto: PRODUTO_CAFE_SERRA_ALTA_250,
    mercado: MARKET_LOCAL_3,
    price: 9.79,
    source_type: "store_list",
    observadoHa: -1,
    valePor: 4,
    condicao: null,
  },

  // Arroz — o segundo Achado da Home.
  {
    id: "demo-price-arroz-m3",
    produto: PRODUTO_ARROZ,
    mercado: MARKET_LOCAL_3,
    price: 26.49,
    source_type: "store_list",
    observadoHa: -1,
    valePor: 5,
    condicao: "Limite de 2 unidades por cliente",
  },
  {
    id: "demo-price-arroz-m1",
    produto: PRODUTO_ARROZ,
    mercado: MARKET_PRINCIPAL,
    price: 27.9,
    source_type: "weekly_audit",
    observadoHa: -2,
    valePor: null,
    condicao: null,
  },

  // Leite — o terceiro Achado da Home.
  {
    id: "demo-price-leite-m1",
    produto: PRODUTO_LEITE,
    mercado: MARKET_PRINCIPAL,
    price: 5.29,
    source_type: "weekly_audit",
    observadoHa: -2,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-leite-m2",
    produto: PRODUTO_LEITE,
    mercado: MARKET_LOCAL_2,
    price: 5.69,
    source_type: "store_list",
    observadoHa: -1,
    valePor: 3,
    condicao: null,
  },

  // O resto do catálogo, para que a busca não devolva vazio em nenhuma categoria da Home.
  {
    id: "demo-price-oleo-m2",
    produto: PRODUTO_OLEO,
    mercado: MARKET_LOCAL_2,
    price: 7.49,
    source_type: "store_list",
    observadoHa: -2,
    valePor: 4,
    condicao: null,
  },
  {
    id: "demo-price-oleo-m3",
    produto: PRODUTO_OLEO,
    mercado: MARKET_LOCAL_3,
    price: 7.99,
    source_type: "shelf_photo",
    observadoHa: -3,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-detergente-m4",
    produto: PRODUTO_DETERGENTE,
    mercado: MARKET_LOCAL_4,
    price: 2.49,
    source_type: "receipt",
    observadoHa: -2,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-detergente-m1",
    produto: PRODUTO_DETERGENTE,
    mercado: MARKET_PRINCIPAL,
    price: 2.79,
    source_type: "shelf_photo",
    observadoHa: -1,
    valePor: null,
    condicao: null,
  },
  {
    id: "demo-price-papel-m3",
    produto: PRODUTO_PAPEL,
    mercado: MARKET_LOCAL_3,
    price: 24.9,
    source_type: "store_list",
    observadoHa: -2,
    valePor: 6,
    condicao: "Preço válido para pagamento à vista",
  },
  {
    id: "demo-price-papel-m4",
    produto: PRODUTO_PAPEL,
    mercado: MARKET_LOCAL_4,
    price: 26.9,
    source_type: "weekly_audit",
    observadoHa: -4,
    valePor: null,
    condicao: null,
  },
];

/** Todas as ofertas da demonstração, com produto, mercado e imagem já resolvidos. */
export function construirOfertasDemo(now: Date = new Date()): OfertaCardV2[] {
  return SEMENTES.map((s) => ({
    id: s.id,
    product_id: s.produto.id,
    market_id: s.mercado.id,
    price: s.price,
    source_type: s.source_type,
    observed_at: dias(now, s.observadoHa),
    valid_until: s.valePor === null ? null : dias(now, s.valePor),
    special_condition: s.condicao,
    source_reference: DEMO_FIXTURE_REFERENCE,
    is_featured: true,
    is_active: true,
    is_demo: true,
    created_at: dias(now, s.observadoHa),
    market: s.mercado,
    product: s.produto,
    image: imagemDoProdutoDemo(s.produto.id),
  }));
}

/**
 * Ordem canônica de comparação, a MESMA do banco e de `CLAUDE.md` princípio 3:
 * **preço crescente → observação mais recente → `id`**.
 *
 * O terceiro critério não é enfeite: sem ele, dois preços iguais no mesmo instante trocam de
 * lugar entre renderizações, e a mesma consulta produz listas diferentes.
 */
export function ordenarOfertas(ofertas: OfertaCardV2[]): OfertaCardV2[] {
  return [...ofertas].sort(
    (a, b) =>
      a.price - b.price ||
      Date.parse(b.observed_at) - Date.parse(a.observed_at) ||
      a.id.localeCompare(b.id),
  );
}

/** Um preço por mercado — o válido mais recente —, como a policy de RLS faria. */
export function umPrecoPorMercado(ofertas: OfertaCardV2[]): OfertaCardV2[] {
  const porMercado = new Map<string, OfertaCardV2>();
  for (const oferta of ordenarOfertas(ofertas)) {
    const atual = porMercado.get(oferta.market_id);
    if (atual === undefined || Date.parse(oferta.observed_at) > Date.parse(atual.observed_at)) {
      porMercado.set(oferta.market_id, oferta);
    }
  }
  return ordenarOfertas([...porMercado.values()]);
}
