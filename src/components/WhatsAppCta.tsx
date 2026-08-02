import { useSyncExternalStore } from "react";
import { consumerWhatsappLink } from "@/lib/whatsapp";
import { consumerCtaStore, hiddenCtaAttributes } from "@/lib/cta-visibility";

/**
 * CTA único de entrada no WhatsApp (North Star v1.2.2, Assets §4 e §6).
 *
 * Verde oficial da ação — a variante "verde WhatsApp" segue exploratória e não aprovada.
 *
 * Sem destino configurado, nada é renderizado: um botão que abre um link quebrado, ou pior, uma
 * conversa com um número errado, é pior do que a ausência do botão. A Home continua completa sem
 * ele. Ver `docs/mvp/WHATSAPP-ENTRY.md`.
 */

/** Rótulo do CTA, compartilhado com a versão fixa do mobile — as duas dizem a mesma coisa. */
export const WHATSAPP_CTA_LABEL = "Receber os Achados no WhatsApp";

/**
 * Marca todo CTA equivalente que vive no fluxo da página. O CTA fixo observa estes elementos
 * para nunca aparecer ao lado de um igual.
 */
export const WHATSAPP_CTA_MARKER = "data-whatsapp-cta";

export function WhatsAppGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.5-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.6.8 1.9.8 2 .1.1.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.5.1.3.6 1 1.3 1.7.9.8 1.7 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.7.8c.2.1.4.2.5.3.1.2.1.7-.1 1.2Z" />
    </svg>
  );
}

export function WhatsAppCta() {
  const href = consumerWhatsappLink();
  // Enquanto o CTA fixo estiver no ar, este aqui está fora da tela e não pode continuar sendo
  // uma segunda ação idêntica para o teclado e para o leitor de tela. O bloco inteiro sai —
  // botão e microcopy —, porque anunciar a explicação de um botão que não existe é pior.
  const duplicado = useSyncExternalStore(
    consumerCtaStore.subscribe,
    consumerCtaStore.get,
    consumerCtaStore.getOnServer,
  );
  if (!href) return null;

  const { container, link } = hiddenCtaAttributes(duplicado);

  return (
    <div className="space-y-1.5" {...container}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...{ [WHATSAPP_CTA_MARKER]: "" }}
        {...link}
        className="btn-base btn-primary btn-touch-48 w-full rounded-full sm:w-auto"
      >
        <WhatsAppGlyph />
        {WHATSAPP_CTA_LABEL}
      </a>
      <p className="meta-text">Só achados de Artemis, com preço e mercado. Sair quando quiser.</p>
    </div>
  );
}
