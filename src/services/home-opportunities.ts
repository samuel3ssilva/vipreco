/**
 * Fonte dos Achados iniciais da Home, resolvida no servidor (loader da rota).
 *
 * Duas fontes possíveis, uma ativa:
 * - `demo`   — **fonte ativa hoje**: fixture versionado (`@/lib/demo-opportunities`). Não faz
 *              nenhuma consulta ao Supabase; o módulo do catálogo nem chega a ser carregado.
 * - `piloto` — **dormente**: preparada, sem nenhum ambiente configurado para ativá-la. Só é
 *              escolhida com `VITE_HOME_OPPORTUNITY_SOURCE=piloto` explícito no build.
 *
 * O `import()` dinâmico do catálogo é deliberado: garante que, no modo DEMO, o caminho que
 * fala com o Supabase não é sequer avaliado — é o que torna a garantia testável.
 */
import { HOME_OPPORTUNITY_COUNT, buildDemoOpportunities } from "@/lib/demo-opportunities";
import type { Opportunity } from "@/types/domain";

export type HomeOpportunitySource = "demo" | "piloto";

export interface HomeOpportunities {
  source: HomeOpportunitySource;
  opportunities: Opportunity[];
  /**
   * Instante em que o servidor resolveu os Achados. A Home usa este valor — e não o relógio do
   * dispositivo — como referência de "ontem"/"há 2 dias", para que o texto renderizado no
   * servidor e o texto reidratado no navegador sejam sempre o mesmo.
   */
  generatedAt: string;
}

/**
 * DEMO é o padrão seguro: só sai dele com opt-in explícito no build. Um ambiente sem a
 * variável — que é o caso de staging hoje — nunca busca dado real por acidente.
 */
export function resolveHomeOpportunitySource(
  configured: string | undefined = typeof import.meta.env.VITE_HOME_OPPORTUNITY_SOURCE === "string"
    ? import.meta.env.VITE_HOME_OPPORTUNITY_SOURCE
    : undefined,
): HomeOpportunitySource {
  return configured === "piloto" ? "piloto" : "demo";
}

export async function loadHomeOpportunities(
  source: HomeOpportunitySource = resolveHomeOpportunitySource(),
  now: Date = new Date(),
): Promise<HomeOpportunities> {
  const generatedAt = now.toISOString();

  if (source === "demo") {
    return { source, generatedAt, opportunities: buildDemoOpportunities(now) };
  }

  const { getWeeklyOpportunities } = await import("@/services/catalog");
  return {
    source,
    generatedAt,
    opportunities: await getWeeklyOpportunities(HOME_OPPORTUNITY_COUNT),
  };
}
