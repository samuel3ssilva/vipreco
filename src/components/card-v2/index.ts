/**
 * R3.2 — o Card v2 de produto exato e os componentes que ele compõe.
 *
 * | Componente           | Inventário    | Responsabilidade                                   |
 * | -------------------- | ------------- | -------------------------------------------------- |
 * | `ProductCardV2`      | MVP-DESIGN-03 | a peça central — uma oferta observada de um SKU     |
 * | `ProductIdentity`    | MVP-DESIGN-03 | tornar o SKU reconhecível **antes** do preço       |
 * | `ProductImage`       | MVP-DESIGN-04 | imagem só com correspondência exata aprovada       |
 * | `MarketBadge`        | —             | identifica o mercado **sem** logotipo de terceiro   |
 * | `NeighborhoodLabel`  | —             | bairro como âncora de proximidade                   |
 * | `UnitPrice`          | MVP-E2-06     | preço unitário **condicional**                      |
 * | `PromotionCondition` | MVP-E2-07     | promoção **sempre** com a condição junto            |
 * | `ProvenanceBlock`    | MVP-E2-08     | o bloco inseparável: fonte, data, validade          |
 * | `ValidityLabel`      | MVP-E2-08     | validade legível, sem urgência fabricada            |
 * | `OfferStatus`        | MVP-E2-08     | estado da oferta em **texto**, não só cor           |
 *
 * `AchadoCard` continua exatamente como está e continua sendo o card da Home. O Card v2
 * vive isolado no laboratório até a R3.3, que é quando a Home muda — e ela só muda com
 * Gate próprio. Trocar os dois no mesmo PR misturaria "o card novo está certo?" com "a
 * Home continua certa?" num diff só.
 */
export { ProductCardV2, ProductCardV2Skeleton } from "./product-card-v2";
export { ProductIdentity, ProductImage } from "./identity";
export { MarketBadge, NeighborhoodLabel } from "./market";
export { PriceDisplay, PreviousPrice, PromotionCondition, UnitPrice } from "./price";
export { OfferStatus, ProvenanceBlock, ValidityLabel } from "./provenance";
