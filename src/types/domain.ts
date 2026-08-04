export type SourceType =
  "receipt" | "store_list" | "weekly_audit" | "shelf_photo" | "community" | "social_media";

export type SubmissionSourceType = Extract<
  SourceType,
  "receipt" | "shelf_photo" | "community" | "social_media"
>;

export type HelpfulnessAnswer = "yes" | "not_yet" | "no";

export type DecisionType =
  | "confirmed_usual_market"
  | "considered_other_market"
  | "found_opportunity"
  | "avoided_trip"
  | "waited_or_anticipated";

export interface Market {
  id: string;
  name: string;
  neighborhood: string | null;
  address: string | null;
  maps_url: string | null;
  is_active: boolean;
  is_demo: boolean;
}

/**
 * Tipos de embalagem que participam da **identidade** do SKU.
 *
 * Vidro, sachê e lata com o mesmo conteúdo não são o mesmo item de prateleira: preço,
 * conservação e uso diferem (`docs/product/CANONICAL-PRODUCT-SPEC.md` §4.6). Valores
 * diferentes produzem SKUs diferentes, e SKUs diferentes não se comparam diretamente.
 */
export type PackageType =
  "unidade" | "pack" | "kit" | "garrafa" | "lata" | "vidro" | "sache" | "caixa";

/**
 * As **cinco** unidades declaradas aceitas pelo MVP, e nada além
 * (`docs/data/MVP-DATA-CONTRACT.md` §2). Unidade fora desta lista não vira quantidade
 * estruturada: vira estado explícito de "não suportada".
 */
export type QuantityUnit = "g" | "kg" | "ml" | "l" | "un";

/** As **três** grandezas para as quais as unidades declaradas convergem. */
export type NormalizedUnit = "g" | "ml" | "un";

/** Quantidade como está impressa na embalagem: `900 ml`, `1 L`, `12 un`. */
export interface DeclaredQuantity {
  value: number;
  unit: QuantityUnit;
}

/** Quantidade convertida para a grandeza base: `900 ml`, `1000 ml`, `12 un`. */
export interface NormalizedQuantity {
  value: number;
  unit: NormalizedUnit;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  variant: string | null;
  size_text: string | null;
  gtin: string | null;
  category: string | null;
  is_active: boolean;
  is_demo: boolean;

  // ---------------------------------------------------------------------------------
  // E1 — identidade exata. Campos **opcionais de propósito**: nenhuma coluna existe no
  // banco de hoje, o `select` de `services/catalog.ts` não os pede e o fixture não os
  // traz. Marcá-los obrigatórios quebraria as duas fontes de dado no mesmo commit por um
  // schema que ainda não foi decidido — persistir é trabalho de R2, com gate humano.
  //
  // `size_text` permanece **texto de exibição** e nunca volta a ser fonte de cálculo.
  // ---------------------------------------------------------------------------------

  /** Campo de identidade. Ausente enquanto o dado não for estruturado. */
  package_type?: PackageType | null;
  /** Quantidade declarada na embalagem. Sempre > 0 quando presente. */
  quantity_value?: number | null;
  /** Unidade declarada na embalagem. */
  quantity_unit?: QuantityUnit | null;
  /**
   * Itens contáveis dentro de um pack — as seis latas de um "6 × 350 ml". Permite as duas
   * bases de preço unitário ao mesmo tempo (por litro e por lata), que é o que a gôndola
   * exige (`docs/data/MVP-DATA-CONTRACT.md` §2).
   */
  units_per_package?: number | null;
}

export interface Price {
  id: string;
  product_id: string;
  market_id: string;
  price: number;
  source_type: SourceType;
  observed_at: string;
  valid_until: string | null;
  special_condition: string | null;
  source_reference: string | null;
  is_featured: boolean;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface PriceWithMarket extends Price {
  market: Market;
}

export interface Opportunity extends PriceWithMarket {
  product: Product;
}

export interface ProductComparison {
  product: Product;
  entries: PriceWithMarket[];
  lastUpdatedAt: string | null;
}

export interface PriceSubmissionInput {
  productId: string;
  marketId: string;
  submittedPrice: number;
  sourceType: SubmissionSourceType;
  comment?: string | null;
}

export interface DecisionFeedbackInput {
  productId: string;
  helpfulness: HelpfulnessAnswer;
  decisionType?: DecisionType | null;
}
