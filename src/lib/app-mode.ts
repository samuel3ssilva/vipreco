/**
 * Modo do ambiente — a única chave que separa a **demonstração** do futuro **piloto**.
 *
 * - `demo`   — modo ativo hoje. Todo dado exibido é fictício e vem de fixture versionado.
 *              A faixa de ambiente e o selo de dados fictícios são obrigatórios.
 * - `piloto` — dormente. Só existe com opt-in explícito no build (`VITE_APP_MODE=piloto`).
 *              Nenhum ambiente está configurado para ativá-lo.
 *
 * DEMO é o padrão seguro: um ambiente sem a variável — que é o caso de staging hoje — nunca
 * apresenta a si mesmo como piloto nem busca dado real por acidente. O caminho contrário exige
 * uma decisão explícita de quem faz o build.
 *
 * Por ser resolvido a partir de `import.meta.env` (fixado no build), servidor e navegador chegam
 * sempre ao mesmo valor — não há como a hidratação divergir do HTML inicial.
 */
export type AppMode = "demo" | "piloto";

export function resolveAppMode(configured: string | undefined): AppMode {
  return configured === "piloto" ? "piloto" : "demo";
}

function configuredMode(): string | undefined {
  const value = import.meta.env.VITE_APP_MODE;
  return typeof value === "string" ? value : undefined;
}

/** Modo do ambiente atual. */
export function appMode(): AppMode {
  return resolveAppMode(configuredMode());
}

/** Atalho de leitura: estamos na demonstração? */
export function isDemoMode(): boolean {
  return appMode() === "demo";
}
