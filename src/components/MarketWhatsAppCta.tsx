import { useSyncExternalStore, type ReactNode } from "react";
import { WhatsAppGlyph } from "@/components/WhatsAppCta";
import { marketWhatsappLink } from "@/lib/whatsapp";
import { hiddenCtaAttributes, marketCtaStore } from "@/lib/cta-visibility";

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
 *
 * Enquanto o CTA fixo do mobile estiver no ar, este aqui está fora da tela e se apaga por
 * inteiro: nunca duas ações idênticas na mesma travessia de teclado ou de leitor de tela.
 */

/** Rótulo do convite, o mesmo na primeira dobra, no fechamento da página e na versão fixa. */
export const MARKET_CTA_LABEL = "Quero conversar sobre o piloto";

/**
 * Marca todo convite equivalente que vive no fluxo da página. O CTA fixo observa estes elementos
 * para nunca aparecer ao lado de um igual. Marcador próprio: o fixo desta rota não pode observar
 * o CTA do morador, nem o contrário.
 */
export const MARKET_CTA_MARKER = "data-market-cta";

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
  const duplicado = useSyncExternalStore(
    marketCtaStore.subscribe,
    marketCtaStore.get,
    marketCtaStore.getOnServer,
  );
  if (!href) return null;

  const { container, link } = hiddenCtaAttributes(duplicado);

  return (
    <div className="space-y-1.5" {...container}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...{ [MARKET_CTA_MARKER]: "" }}
        {...link}
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
