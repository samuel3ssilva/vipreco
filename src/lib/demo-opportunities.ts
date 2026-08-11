import {
  DEMO_FIXTURE_REFERENCE,
  DEMO_MARKETS,
  PRODUTO_BISTECA,
  PRODUTO_BUCHO,
  PRODUTO_CEBOLA,
  PRODUTO_CORONA,
  PRODUTO_DREAMIES,
  PRODUTO_FRANGO_INTEIRO,
  PRODUTO_LASANHA_SADIA,
  PRODUTO_NIVEA,
  PRODUTO_OLEO_LIZA,
  PRODUTO_TIXAN,
  construirOfertasDemo,
  grupoDoProduto,
  observadaNoSnapshot,
  ordenarOfertas,
  ordenarPorCustoUnitario,
  umPrecoPorMercado,
} from "@/lib/demo-catalog";
import type { OfertaCardV2 } from "@/lib/card-v2";

/**
 * Os Achados da Home — o herói e a vitrine, escolhidos do catálogo único da demonstração.
 *
 * =============================================================================
 * A ORDEM É CURADORIA DECLARADA, E O HERÓI DA V3 É O FRANGO INTEIRO
 * =============================================================================
 *
 * A decisão editorial do herói (mandato V3 §4) foi julgada por quatro critérios, e o
 * frango inteiro venceu em três:
 *
 * - **universalidade** — é a proteína mais comum da mesa; bucho é corte de nicho e
 *   bisteca a R$ 39,90/kg é compra de ocasião;
 * - **a comparação tem história** — R$ 7,99 × R$ 9,99 por kg é uma diferença de 25%,
 *   visível e honesta; a da bisteca é de nove centavos, e herói com comparação irrisória
 *   ensina que comparar não vale a pena;
 * - **imagem** — a foto do frango (IA do Founder) é clara a 96 px;
 * - **representa o produto** — peso variável + seletor de quantidade é o caso que mais
 *   diferencia o ViPreço de uma lista de encarte.
 *
 * O bucho foi revisado (§5) e CONTINUA na vitrine com a foto correta — só não abre mais a
 * primeira impressão. A vitrine cobre 8 das 9 categorias do catálogo, porque "sensação de
 * catálogo" é o §6 pedindo variedade, não repetição de açougue.
 *
 * **O que a curadoria não pode fazer**: escolher QUAL mercado representa cada grupo. O
 * card de cada Achado mostra a oferta vencedora PELO CRITÉRIO DO GRUPO — menor preço de
 * prateleira na embalagem igual, melhor custo unitário nas embalagens diferentes. O frango
 * abre a Home mostrando o Safra porque o Safra tem o menor R$/kg do grupo, e há teste para
 * o dia em que deixar de ser.
 *
 * NÃO são os 24 na Home: vitrine é convite, não inventário. O catálogo completo vive em
 * /buscar, que a Home aponta logo abaixo da vitrine.
 */
export { DEMO_FIXTURE_REFERENCE, DEMO_MARKETS };

export type DemoOpportunity = OfertaCardV2;

/** Quantos Achados a Home pede à fonte — o herói mais nove. */
export const HOME_OPPORTUNITY_COUNT = 10;

/** Os grupos da Home, em ordem editorial: herói primeiro, categorias variadas depois. */
const GRUPOS_DA_HOME = [
  PRODUTO_FRANGO_INTEIRO,
  PRODUTO_BISTECA,
  PRODUTO_BUCHO,
  PRODUTO_CEBOLA,
  PRODUTO_CORONA,
  PRODUTO_LASANHA_SADIA,
  PRODUTO_OLEO_LIZA,
  PRODUTO_NIVEA,
  PRODUTO_DREAMIES,
  PRODUTO_TIXAN,
] as const;

/**
 * A oferta que representa um grupo na vitrine: a vencedora pelo critério do grupo,
 * considerando o SNAPSHOT observado (§18) — a mesma conta da tela de comparação, para que
 * o card da Home e o topo da comparação nunca discordem.
 */
function vencedoraDoGrupo(productId: string, now: Date): OfertaCardV2 | null {
  const grupo = grupoDoProduto(productId);
  if (grupo === null) {
    throw new Error(`Achado da Home aponta para grupo inexistente: ${productId}`);
  }
  const ids = new Set(grupo.sementes.map((s) => s.id));
  const observadas = umPrecoPorMercado(
    construirOfertasDemo().filter((o) => ids.has(o.id) && observadaNoSnapshot(o, now)),
  );
  const ordenadas =
    grupo.basePorUnidade === undefined
      ? ordenarOfertas(observadas)
      : ordenarPorCustoUnitario(observadas);
  const vencedora = ordenadas[0];
  if (vencedora === undefined) return null;
  return {
    ...vencedora,
    // O CTA diz "Comparar em N mercados" com a contagem MEDIDA do grupo, nunca escrita.
    // O `product` continua sendo o SKU — é ele que carrega a gramatura que o card precisa
    // dizer ("80 g"); o link do card abre a comparação do grupo porque `grupoDoProduto`
    // também resolve por id de SKU.
    markets_with_valid_price: ordenadas.length,
  };
}

export function buildDemoOpportunities(now: Date = new Date()): DemoOpportunity[] {
  return GRUPOS_DA_HOME.map((produto) => vencedoraDoGrupo(produto.id, now)).filter(
    (o): o is DemoOpportunity => o !== null,
  );
}
