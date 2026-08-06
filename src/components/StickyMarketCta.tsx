import { MARKET_CTA_LABEL, MARKET_CTA_MARKER } from "@/components/MarketWhatsAppCta";
import { StickyCta } from "@/components/StickyCta";
import { WhatsAppGlyph } from "@/components/WhatsAppCta";
import { marketWhatsappLink } from "@/lib/whatsapp";
import { marketCtaStore } from "@/lib/cta-visibility";

/**
 * O CTA fixo do dono de mercado, em `/para-mercados` (revisão do Founder, item 1).
 *
 * A página é longa e o convite fica nas duas pontas. No mobile, quem está no meio dela não tem
 * nenhuma ação à mão — este botão resolve isso sem nunca duplicar o convite: ele aparece só
 * quando nenhum dos dois CTAs do fluxo está na tela, e enquanto está no ar são eles que saem da
 * ordem de foco.
 *
 * Mesmo mecanismo do CTA fixo da Home (`StickyCta`), mesmo link e mesma mensagem dos convites
 * desta página. Marcador e loja de visibilidade são próprios: as duas rotas compartilham a regra,
 * não o estado.
 */
export function StickyMarketCta() {
  return (
    <StickyCta
      href={marketWhatsappLink()}
      marcador={MARKET_CTA_MARKER}
      loja={marketCtaStore}
      // `MarketShell` não tem barra inferior: a rota B2B não é uma aba do app do consumidor.
      // Sem isto o botão flutuaria 56 px acima de nada.
      alturaDaBarra="0rem"
    >
      <WhatsAppGlyph />
      {MARKET_CTA_LABEL}
      <span className="sr-only"> (abre o WhatsApp)</span>
    </StickyCta>
  );
}
