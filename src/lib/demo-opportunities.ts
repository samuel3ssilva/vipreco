import {
  DEMO_FIXTURE_REFERENCE,
  DEMO_MARKETS,
  PRODUTO_BISTECA,
  PRODUTO_BUCHO,
  PRODUTO_DREAMIES,
  PRODUTO_FAROFA_YOKI,
  PRODUTO_LASANHA_SADIA,
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
 * A ORDEM É A DO MANDATO §9, E ELA É CURADORIA DECLARADA
 * =============================================================================
 *
 * O card principal é o **Bucho bovino do Açougue Mota** e a vitrine traz seis dos doze
 * grupos — Bisteca, Óleo Liza, Lasanha Sadia, Dreamies, Tixan e Farofa Yoki. Foi o Founder
 * quem escolheu, e a escolha está ESCRITA AQUI, à vista, como toda curadoria precisa estar:
 * os Achados são a seção de descoberta — rotulada, separada —, e curadoria nela não toca a
 * comparação orgânica, que continua ordenada só por preço (`CLAUDE.md`, princípio 4).
 *
 * **O que a curadoria não pode fazer**: escolher QUAL mercado representa cada grupo. O
 * card de cada Achado mostra a oferta vencedora PELO CRITÉRIO DO GRUPO — menor preço de
 * prateleira na embalagem igual, melhor custo unitário nas embalagens diferentes. O bucho
 * abre a Home mostrando o Mota porque o Mota é o mais barato do grupo, e há teste para o
 * dia em que deixar de ser.
 *
 * NÃO são os doze na Home (§9, "Não colocar os 12 na Home"): vitrine é convite, não
 * inventário. Os outros seis continuam alcançáveis pela busca.
 */
export { DEMO_FIXTURE_REFERENCE, DEMO_MARKETS };

export type DemoOpportunity = OfertaCardV2;

/** Quantos Achados a Home pede à fonte — o herói mais seis. */
export const HOME_OPPORTUNITY_COUNT = 7;

/** Os grupos da Home, na ordem do §9 do mandato: herói primeiro. */
const GRUPOS_DA_HOME = [
  PRODUTO_BUCHO,
  PRODUTO_BISTECA,
  PRODUTO_OLEO_LIZA,
  PRODUTO_LASANHA_SADIA,
  PRODUTO_DREAMIES,
  PRODUTO_TIXAN,
  PRODUTO_FAROFA_YOKI,
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
