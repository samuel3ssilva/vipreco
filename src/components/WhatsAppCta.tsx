import { consumerWhatsappLink } from "@/lib/whatsapp";

/**
 * CTA único de entrada no WhatsApp (North Star v1.2.2, Assets §4 e §6).
 *
 * Verde oficial da ação — a variante "verde WhatsApp" segue exploratória e não aprovada.
 *
 * Sem destino configurado, nada é renderizado: um botão que abre um link quebrado, ou pior, uma
 * conversa com um número errado, é pior do que a ausência do botão. A Home continua completa sem
 * ele. Ver `docs/mvp/WHATSAPP-ENTRY.md`.
 */
export function WhatsAppCta() {
  const href = consumerWhatsappLink();
  if (!href) return null;

  return (
    <div className="space-y-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-base btn-primary btn-touch-48 w-full rounded-full sm:w-auto"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="size-5">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.6.8 1.9.8 2 .1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.7.9.8 1.7 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.7.8c.2.1.4.2.5.3.1.2.1.7-.1 1.2Z" />
        </svg>
        Receber os Achados no WhatsApp
      </a>
      <p className="meta-text">Só achados de Artemis, com preço e mercado. Sair quando quiser.</p>
    </div>
  );
}
