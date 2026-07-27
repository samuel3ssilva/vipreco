export type SourceType =
  | "receipt"
  | "store_list"
  | "weekly_audit"
  | "shelf_photo"
  | "community"
  | "social_media";

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
