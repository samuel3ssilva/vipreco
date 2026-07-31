/**
 * Estado temporal de um preço — o que a tarja superior do card comunica.
 *
 * Regras que este módulo respeita (North Star v1.2.2, seção C do mandato da Parte 2):
 *
 * - **Nunca inventa validade.** Sem `valid_until`, o estado é decidido só pela data de
 *   observação; o card não escreve "válido até" nenhum.
 * - **Sem urgência artificial.** Não existe contagem regressiva, "faltam X minutos" nem
 *   "publicado agora". O estado mais tenso possível é "termina em breve", e só quando o
 *   mercado de fato informou uma validade próxima.
 * - **Cor nunca é o único canal.** A tarja é decorativa (`aria-hidden`); tudo o que ela
 *   sugere está escrito, em texto, na linha de procedência do card.
 */
import type { Price } from "@/types/domain";

export type TemporalState = "vigente" | "termina-em-breve" | "sem-validade-antigo" | "expirado";

/** Tokens Visto v2 de cor e espessura da tarja. Nenhum token novo foi criado. */
export const TEMPORAL_STYLE: Record<TemporalState, { color: string; height: string }> = {
  vigente: { color: "var(--vp-time-now)", height: "var(--vp-time-bar-now)" },
  "termina-em-breve": { color: "var(--vp-time-soon)", height: "var(--vp-time-bar-soon)" },
  "sem-validade-antigo": {
    color: "var(--vp-time-expired)",
    height: "var(--vp-time-bar-expired)",
  },
  expirado: { color: "var(--vp-time-critical)", height: "var(--vp-time-bar-critical)" },
};

const DAY_IN_MS = 86_400_000;

/** Validade a até 3 dias conta como "termina em breve". */
const ENDING_SOON_DAYS = 3;

/** Sem validade informada, uma observação com mais de 7 dias deixa de ser recente. */
const STALE_OBSERVATION_DAYS = 7;

type TemporalInput = Pick<Price, "observed_at" | "valid_until">;

export function temporalState(entry: TemporalInput, now: Date = new Date()): TemporalState {
  const reference = now.getTime();

  if (entry.valid_until) {
    const validUntil = new Date(entry.valid_until).getTime();
    if (validUntil < reference) return "expirado";
    return validUntil - reference <= ENDING_SOON_DAYS * DAY_IN_MS ? "termina-em-breve" : "vigente";
  }

  const observedAt = new Date(entry.observed_at).getTime();
  return reference - observedAt > STALE_OBSERVATION_DAYS * DAY_IN_MS
    ? "sem-validade-antigo"
    : "vigente";
}
