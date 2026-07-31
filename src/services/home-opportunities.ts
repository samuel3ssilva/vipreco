/**
 * Fonte dos Achados iniciais da Home, resolvida no servidor (loader da rota).
 *
 * A fonte segue o modo do ambiente (`@/lib/app-mode`):
 * - `demo`   — **fonte ativa hoje**: fixture versionado (`@/lib/demo-opportunities`). Não faz
 *              nenhuma consulta ao Supabase; o módulo do catálogo nem chega a ser carregado.
 * - `piloto` — **dormente**: preparada, sem nenhum ambiente configurado para ativá-la.
 *
 * O `import()` dinâmico do catálogo é deliberado: garante que, no modo DEMO, o caminho que
 * fala com o Supabase não é sequer avaliado — é o que torna a garantia testável.
 */
import { appMode, type AppMode } from "@/lib/app-mode";
import { HOME_OPPORTUNITY_COUNT, buildDemoOpportunities } from "@/lib/demo-opportunities";
import type { Opportunity } from "@/types/domain";

export interface HomeOpportunities {
  source: AppMode;
  opportunities: Opportunity[];
  /**
   * Instante em que o servidor resolveu os Achados. A Home usa este valor — e não o relógio do
   * dispositivo — como referência de "ontem"/"há 2 dias", para que o texto renderizado no
   * servidor e o texto reidratado no navegador sejam sempre o mesmo.
   */
  generatedAt: string;
}

export async function loadHomeOpportunities(
  source: AppMode = appMode(),
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
