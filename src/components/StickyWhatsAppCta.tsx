import { useEffect, useState, useSyncExternalStore } from "react";
import { WHATSAPP_CTA_LABEL, WHATSAPP_CTA_MARKER, WhatsAppGlyph } from "@/components/WhatsAppCta";
import { consumerWhatsappLink } from "@/lib/whatsapp";
import {
  getStickyCtaVisible,
  getStickyCtaVisibleOnServer,
  setStickyCtaVisible,
  subscribeStickyCta,
} from "@/lib/cta-visibility";
import { shouldShowStickyCta } from "@/lib/sticky-cta";

/**
 * CTA fixo do mobile (North Star v1.2.2, seção F do mandato da Parte 2).
 *
 * Some assim que um CTA equivalente entra na tela — o da primeira dobra, o da última, qualquer
 * um marcado com `data-whatsapp-cta`. Nunca dois botões idênticos disputando a mesma tela. E
 * enquanto ele está no ar, o CTA equivalente sai da ordem de foco e da árvore acessível: fora
 * da tela não é o mesmo que fora do caminho de quem navega por teclado ou leitor de tela.
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

/**
 * A faixa em que o CTA fixo existe: abaixo de `sm` (640 px), o mesmo recorte do `sm:hidden`.
 *
 * A medição precisa conhecer esse limite, não só o CSS. Sem ele, no desktop o estado
 * compartilhado diria "o fixo está no ar" enquanto o botão está oculto por `display: none` — e
 * o CTA da página sairia da ordem de foco sem nada para substituí-lo.
 */
const FAIXA_DO_CTA_FIXO = "(max-width: 639.98px)";

/** O elemento está, neste instante, dentro da janela? Mesma pergunta que o observer responde. */
function naTela(elemento: Element): boolean {
  const rect = elemento.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export function StickyWhatsAppCta() {
  const href = consumerWhatsappLink();
  // A visibilidade é estado compartilhado, não estado deste componente: o CTA da página precisa
  // saber quando sair da ordem de foco. Ver `@/lib/cta-visibility`.
  const visivel = useSyncExternalStore(
    subscribeStickyCta,
    getStickyCtaVisible,
    getStickyCtaVisibleOnServer,
  );
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    if (!href) return;

    // Sem nenhum CTA no fluxo (uma rota que não tem a primeira dobra, por exemplo), a lista
    // fica vazia e `shouldShowStickyCta` responde "aparece" — o fixo passa a ser a única
    // entrada. Nenhum caminho especial é preciso para isso.
    const equivalentes = Array.from(document.querySelectorAll(`[${WHATSAPP_CTA_MARKER}]`));
    const faixa = window.matchMedia(FAIXA_DO_CTA_FIXO);

    // Uma fonte de verdade só: a medida de cada CTA equivalente contra a janela. O
    // `IntersectionObserver` é o gatilho barato e preciso; rolagem e redimensionamento são a
    // garantia. Descobri na verificação que o observer pode não entregar nem a notificação
    // inicial nem as mudanças em alguns motores — sem a rede de segurança, o botão fixo
    // apareceria ao lado do CTA da primeira dobra, que é exatamente o que não pode acontecer.
    const medir = () =>
      setStickyCtaVisible(
        faixa.matches &&
          shouldShowStickyCta(equivalentes.map((el) => ({ isIntersecting: naTela(el) }))),
      );

    medir();

    const observer = new IntersectionObserver(medir, { threshold: 0 });
    for (const el of equivalentes) observer.observe(el);
    // `medir` direto, sem `requestAnimationFrame` no meio: são no máximo dois
    // `getBoundingClientRect` por evento, e uma rede de segurança que depende de quadros de
    // animação deixa de existir exatamente onde ela seria necessária.
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    // Girar o aparelho muda as duas coisas que a medida usa: a faixa e a altura da janela. Nem
    // todo motor dispara `resize` a tempo aí, então o evento próprio da rotação entra junto.
    window.addEventListener("orientationchange", medir);
    faixa.addEventListener("change", medir);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", medir);
      faixa.removeEventListener("change", medir);
      // Sair da página devolve o comando ao CTA do fluxo. Sem isto, uma rota seguinte herdaria
      // um CTA silenciado por um botão fixo que não existe mais.
      setStickyCtaVisible(false);
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
