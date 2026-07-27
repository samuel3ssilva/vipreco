/**
 * Normalização de texto para busca: minúsculas, sem acentos e sem espaços extras.
 * Espelha a função `pa_normalize_text` usada no banco de dados.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Divide o termo digitado em palavras normalizadas (para busca em AND). */
export function buildSearchTerms(input: string): string[] {
  return normalizeSearchText(input).split(" ").filter(Boolean);
}

/** Verifica se o termo digitado parece um código de barras (GTIN). */
export function looksLikeGtin(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length >= 8 && digits.length === input.trim().length;
}
