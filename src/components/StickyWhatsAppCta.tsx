import { useEffect, useState } from "react";
import { WHATSAPP_CTA_LABEL, WHATSAPP_CTA_MARKER, WhatsAppGlyph } from "@/components/WhatsAppCta";
import { consumerWhatsappLink } from "@/lib/whatsapp";
import { shouldShowStickyCta } from "@/lib/sticky-cta";

/**
 * CTA fixo do mobile (North Star v1.2.2, seção F do mandato da Parte 2).
 *
 * Some assim que um CTA equivalente entra na tela — o da primeira dobra, o da última, qualquer
 * um marcado com `data-whatsapp-cta`. Nunca dois botões idênticos disputando a mesma tela.
 *
 * Fica **acima** da barra de navegação do mobile, nunca por cima dela: a barra é o caminho para
 * as outras rotas e não pode ser encoberta. O respiro final da página é reservado pelo espaçador
 * que este componente renderiza no fluxo.
 *
 * Só existe no cliente. No servidor não há como saber o que está na tela, e renderizar o botão
 * para escondê-lo logo depois produziria um pisca. Sem animação de entrada, em nenhum caso.
 */

/** Altura reservada no fim da página para o botão não cobrir o último conteúdo. */
const RESERVA_INFERIOR = "5.5rem";

/** O elemento está, neste instante, dentro da janela? Mesma pergunta que o observer responde. */
function naTela(elemento: Element): boolean {
  const rect = elemento.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export function StickyWhatsAppCta() {
  const href = consumerWhatsappLink();
  const [visivel, setVisivel] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    if (!href) return;

    const equivalentes = Array.from(document.querySelectorAll(`[${WHATSAPP_CTA_MARKER}]`));
    if (equivalentes.length === 0) {
      // Sem CTA no fluxo (por exemplo, uma rota que não tem a primeira dobra), o fixo é a
      // única entrada — e aí ele fica.
      setVisivel(true);
      return;
    }

    // Uma fonte de verdade só: a medida de cada CTA equivalente contra a janela. O
    // `IntersectionObserver` é o gatilho barato e preciso; rolagem e redimensionamento são a
    // garantia. Descobri na verificação que o observer pode não entregar nem a notificação
    // inicial nem as mudanças em alguns motores — sem a rede de segurança, o botão fixo
    // apareceria ao lado do CTA da primeira dobra, que é exatamente o que não pode acontecer.
    const medir = () =>
      setVisivel(shouldShowStickyCta(equivalentes.map((el) => ({ isIntersecting: naTela(el) }))));

    medir();

    const observer = new IntersectionObserver(medir, { threshold: 0 });
    for (const el of equivalentes) observer.observe(el);
    // `medir` direto, sem `requestAnimationFrame` no meio: são no máximo dois
    // `getBoundingClientRect` por evento, e uma rede de segurança que depende de quadros de
    // animação deixa de existir exatamente onde ela seria necessária.
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, [href]);

  if (!href || !montado) return null;

  return (
    <>
      {/* Espaçador no fluxo: garante que o último conteúdo da página possa ser rolado acima do
          botão, em vez de ficar embaixo dele. */}
      <div aria-hidden="true" style={{ height: RESERVA_INFERIOR }} className="sm:hidden" />

      <div
        className="fixed inset-x-0 z-40 px-4 sm:hidden"
        // A barra de navegação do mobile mede 56 px e encosta na borda inferior; o CTA fica
        // acima dela, ainda respeitando a área segura do aparelho.
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
        hidden={!visivel}
      >
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-base btn-primary btn-touch-48 w-full rounded-full shadow-raised"
        >
          <WhatsAppGlyph />
          {WHATSAPP_CTA_LABEL}
        </a>
      </div>
    </>
  );
}
