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
 * | `AchadoCompacto`     | MVP-DESIGN-05 | a linha de lista, derivada da mesma visão (R3.3B)   |
 *
 * Em R3.2 este módulo vivia isolado no laboratório, e o `AchadoCard` era o card da Home. R3.3
 * levou o Card v2 para o destaque da Home; R3.3B levou a mesma visão para a lista, e o
 * `AchadoCard` deixou de existir. **Há uma anatomia só**, com duas composições: o destaque, que
 * domina, e a linha, que cabe no polegar. As regras de exibir/não exibir continuam todas em
 * `montarVisaoDoCard`, e as duas composições as consomem — nenhuma delas decide nada sozinha.
 */
export { ProductCardV2, ProductCardV2Skeleton } from "./product-card-v2";
export { AchadoCompacto } from "./compact";
export { ProductIdentity, ProductImage } from "./identity";
export { MarketBadge, NeighborhoodLabel } from "./market";
export { PriceDisplay, PromotionCondition, UnitPrice } from "./price";
export { OfferStatus, ProvenanceBlock, ValidityLabel } from "./provenance";
