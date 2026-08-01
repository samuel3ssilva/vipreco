import { StickyCta } from "@/components/StickyCta";
import { WHATSAPP_CTA_LABEL, WHATSAPP_CTA_MARKER, WhatsAppGlyph } from "@/components/WhatsAppCta";
import { consumerWhatsappLink } from "@/lib/whatsapp";
import { consumerCtaStore } from "@/lib/cta-visibility";

/**
 * O CTA fixo do morador, na Home. O mecanismo inteiro — medição, faixa do mobile, espaçador,
 * saída do CTA do fluxo da ordem de foco — vive em `StickyCta`. Aqui ficam as três coisas que são
 * deste convite: o destino, o rótulo e a loja de visibilidade da Home.
 */
export function StickyWhatsAppCta() {
  return (
    <StickyCta href={consumerWhatsappLink()} marcador={WHATSAPP_CTA_MARKER} loja={consumerCtaStore}>
      <WhatsAppGlyph />
      {WHATSAPP_CTA_LABEL}
    </StickyCta>
  );
}
