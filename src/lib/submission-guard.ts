const SUBMISSION_COUNT_KEY = "preco-artemis:submission-count";

/** Limite suave por sessão do navegador. Deterrente client-side; anti-spam real é server-side (pós-piloto). */
export const MAX_SUBMISSIONS_PER_SESSION = 5;

function readCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(SUBMISSION_COUNT_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

export function hasReachedSubmissionLimit(): boolean {
  return readCount() >= MAX_SUBMISSIONS_PER_SESSION;
}

export function recordSubmission(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SUBMISSION_COUNT_KEY, String(readCount() + 1));
  } catch {
    /* armazenamento indisponível: limite simplesmente não é aplicado */
  }
}
