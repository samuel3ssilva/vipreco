/**
 * Entrada no WhatsApp — conversa individual via `wa.me` (decisão do PMO registrada em
 * 30/07/2026, horário de Brasília; North Star v1.2.2, Assets §6, variante B).
 *
 * Escopo deliberadamente mínimo:
 * - **Um único destino operacional.** Nada de Canal do WhatsApp nesta fase.
 * - **Nenhum SDK, nenhuma automação de mensagens.** É um link; o morador só aperta enviar.
 * - **Nenhum número no código.** O destino vive em configuração (`VITE_WHATSAPP_NUMBER`).
 *   Sem configuração, o CTA simplesmente não é renderizado — nunca um link quebrado, nunca
 *   uma mensagem para um número errado.
 */

/** Mensagem pré-preenchida, exatamente como aprovada. Não alterar sem decisão do PMO. */
export const WHATSAPP_CONSUMER_MESSAGE = "Quero receber os Achados de Artemis";

/**
 * Reduz o número a dígitos e valida como E.164 sem o "+": DDI + assinante, 10 a 15 dígitos,
 * nunca começando em zero. Devolve `null` para qualquer coisa que não sirva — configuração
 * malformada não vira link.
 */
export function normalizeWhatsappNumber(raw: string | undefined | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Só dígitos, espaços e a pontuação usual de telefone. Letras significam configuração errada.
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  if (digits.startsWith("0")) return null;

  return digits;
}

/** Link `wa.me` com a mensagem pré-preenchida, ou `null` se o destino não estiver configurado. */
export function whatsappLink(
  rawNumber: string | undefined | null,
  message: string = WHATSAPP_CONSUMER_MESSAGE,
): string | null {
  const number = normalizeWhatsappNumber(rawNumber);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** O destino único do CTA do consumidor, lido da configuração do ambiente. */
export function consumerWhatsappLink(
  configured: string | undefined = typeof import.meta.env.VITE_WHATSAPP_NUMBER === "string"
    ? import.meta.env.VITE_WHATSAPP_NUMBER
    : undefined,
): string | null {
  return whatsappLink(configured);
}
