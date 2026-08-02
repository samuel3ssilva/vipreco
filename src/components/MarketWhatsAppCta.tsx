import type { ReactNode } from "react";
import { WhatsAppGlyph } from "@/components/WhatsAppCta";
import { marketWhatsappLink } from "@/lib/whatsapp";

/**
 * Convite de conversa para quem tem um mercado (Parte 3, seções A e H do mandato).
 *
 * É o mesmo mecanismo do CTA do consumidor: um link `wa.me` para conversa individual, com a
 * mensagem já escrita. Nenhum formulário, nenhum cadastro, nenhuma automação, nenhum grupo — a
 * pessoa só aperta enviar, e quem responde é uma pessoa.
 *
 * Sem destino configurado, o bloco inteiro some — botão e microcopy juntos. Anunciar a explicação
 * de um botão que não existe é pior do que não ter o botão; e um link quebrado, ou uma conversa
 * com o número errado, é pior ainda. Ver `docs/mvp/WHATSAPP-ENTRY.md`.
 */

/** Rótulo do convite, o mesmo na primeira dobra e no fechamento da página. */
export const MARKET_CTA_LABEL = "Quero conhecer o piloto";

interface MarketWhatsAppCtaProps {
  /** Explicação curta abaixo do botão — sempre presente, sempre honesta sobre o que acontece. */
  microcopy: ReactNode;
  /**
   * Destino já resolvido. Existe para o teste renderizar o CTA sem depender da configuração do
   * ambiente; em produção o padrão é sempre a configuração.
   */
  href?: string | null;
}

export function MarketWhatsAppCta({
  microcopy,
  href = marketWhatsappLink(),
}: MarketWhatsAppCtaProps) {
  if (!href) return null;

  return (
    <div className="space-y-1.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-base btn-primary btn-touch-48 w-full rounded-full sm:w-auto"
      >
        <WhatsAppGlyph />
        {MARKET_CTA_LABEL}
        <span className="sr-only"> (abre o WhatsApp)</span>
      </a>
      <p className="meta-text">{microcopy}</p>
    </div>
  );
}
