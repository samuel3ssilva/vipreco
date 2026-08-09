import { DEMO_FIXTURE_REFERENCE, DEMO_MARKETS, construirOfertasDemo } from "@/lib/demo-catalog";
import type { OfertaCardV2 } from "@/lib/card-v2";

/**
 * Os Achados da Home — TRÊS ofertas escolhidas do catálogo único da demonstração.
 *
 * =============================================================================
 * ESTE ARQUIVO DEIXOU DE SER UMA SEGUNDA VERDADE (§8)
 * =============================================================================
 *
 * Ele carregava os seus próprios produtos, mercados e imagens. Descreviam o mesmo item que o
 * banco — `demo-identity.test.ts` garantia campo a campo —, mas eram outra lista, e "outra lista
 * que por enquanto concorda" é a definição de divergência esperando acontecer. Foi assim que a
 * Home mostrou "Ouro do Campo" enquanto a página do produto mostrava a marca antiga.
 *
 * Agora ele SELECIONA do `@/lib/demo-catalog`, que é a coleção que a busca, a comparação e o
 * detalhe também leem. A Home não pode mais discordar delas: não há de onde discordar.
 *
 * A ORDEM É O GOLDEN PATH. O filé de peito é o primeiro — logo, o destaque —, porque é por ele
 * que a demonstração começa. Nenhum critério editorial escolhe destaque; o que existe é uma
 * ordem fixa de fixture, e ela está escrita aqui, à vista.
 *
 * **Só entram ofertas observadas.** As cinco linhas do Mercado 2 existem no catálogo para a
 * tela de comparação mostrar como a comparação vai funcionar; colocá-las entre os Achados da
 * Home seria anunciar como achado um preço que ninguém foi ver.
 */
export { DEMO_FIXTURE_REFERENCE, DEMO_MARKETS };

export type DemoOpportunity = OfertaCardV2;

/** Quantos Achados a Home pede à fonte — o destaque mais quatro. */
export const HOME_OPPORTUNITY_COUNT = 5;

/** Os cinco Achados da Home, na ordem em que aparecem. */
const ACHADOS_DA_HOME = [
  "demo-price-mota-file-de-peito",
  "demo-price-mota-linguica-caseira",
  "demo-price-mota-coxa-sobrecoxa",
  "demo-price-mota-patinho",
  "demo-price-mota-acem",
] as const;

export function buildDemoOpportunities(now: Date = new Date()): DemoOpportunity[] {
  const todas = construirOfertasDemo(now);
  return ACHADOS_DA_HOME.map((oferta) => {
    const encontrada = todas.find((o) => o.id === oferta);
    if (encontrada === undefined) {
      // Falha ALTA e cedo. Um Achado da Home apontando para uma oferta que não existe mais no
      // catálogo é o defeito que este arquivo inteiro existe para impedir; devolver a lista
      // menor em silêncio esconderia exatamente isso.
      throw new Error(`Achado da Home aponta para oferta inexistente: ${oferta}`);
    }
    return encontrada;
  });
}
