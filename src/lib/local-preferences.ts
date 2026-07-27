const USUAL_MARKET_KEY = "preco-artemis:usual-market";
const WATCH_KEY = "preco-artemis:watched-products";
const FEEDBACK_KEY = "preco-artemis:feedback-products";

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível: a escolha simplesmente não é lembrada */
  }
}

/** Mercado habitual: guardado somente no dispositivo, nunca enviado ao banco. */
export function getUsualMarketId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(USUAL_MARKET_KEY);
  } catch {
    return null;
  }
}

export function setUsualMarketId(marketId: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (marketId) window.localStorage.setItem(USUAL_MARKET_KEY, marketId);
    else window.localStorage.removeItem(USUAL_MARKET_KEY);
  } catch {
    /* ignorado */
  }
}

export function hasWatched(productId: string) {
  return readList(WATCH_KEY).includes(productId);
}

export function markWatched(productId: string) {
  const list = readList(WATCH_KEY);
  if (!list.includes(productId)) writeList(WATCH_KEY, [...list, productId]);
}

export function hasAnsweredFeedback(productId: string) {
  return readList(FEEDBACK_KEY).includes(productId);
}

export function markFeedbackAnswered(productId: string) {
  const list = readList(FEEDBACK_KEY);
  if (!list.includes(productId)) writeList(FEEDBACK_KEY, [...list, productId]);
}
