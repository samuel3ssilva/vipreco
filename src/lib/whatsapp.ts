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
 * Mensagem de quem tem um mercado (Parte 3, seções A e H do mandato). Mesmo destino, mesma
 * mecânica — só o texto muda, para que a conversa já comece dizendo de onde a pessoa veio.
 * Não alterar sem decisão do PMO.
 */
export const WHATSAPP_MARKET_MESSAGE =
  "Tenho um mercado e quero conhecer o piloto do ViPreço em Artemis";

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

/** O número configurado no ambiente, quando existe — a única origem do destino em todo o produto. */
function configuredNumber(): string | undefined {
  return typeof import.meta.env.VITE_WHATSAPP_NUMBER === "string"
    ? import.meta.env.VITE_WHATSAPP_NUMBER
    : undefined;
}

/** O destino único do CTA do consumidor, lido da configuração do ambiente. */
export function consumerWhatsappLink(
  configured: string | undefined = configuredNumber(),
): string | null {
  return whatsappLink(configured);
}

/**
 * O mesmo destino, com a mensagem de quem tem um mercado. Um número só no produto inteiro: quem
 * responde é a mesma pessoa, e o texto pré-preenchido é o que diz de onde a conversa veio.
 */
export function marketWhatsappLink(
  configured: string | undefined = configuredNumber(),
): string | null {
  return whatsappLink(configured, WHATSAPP_MARKET_MESSAGE);
}
