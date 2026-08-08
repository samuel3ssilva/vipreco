/**
 * Quem está no comando do CTA de WhatsApp neste momento: o do fluxo da página ou o fixo do
 * mobile (North Star v1.2.2, seção F do mandato da Parte 2).
 *
 * A regra "nunca dois CTAs idênticos competindo" tem duas metades. A primeira é visual e já
 * estava resolvida: o fixo só aparece quando nenhum equivalente está na tela. A segunda é de
 * acessibilidade e não estava — teclado e leitor de tela não enxergam "fora da tela". Com o
 * botão fixo no ar, tabular pela página ainda encontrava o CTA da primeira dobra, invisível,
 * lá em cima: duas ações idênticas na mesma travessia.
 *
 * O estado mora aqui, fora dos dois componentes, porque nenhum deles é ancestral do outro. O
 * CTA fixo escreve; o CTA do fluxo lê e se apaga enquanto durar a duplicação.
 *
 * Cada convite tem a **sua** loja. O convite do morador e o convite do dono de mercado vivem em
 * rotas diferentes, dizem coisas diferentes e não podem se silenciar: uma variável só faria a
 * segunda rota herdar a medição da primeira.
 */

export interface StickyCtaStore {
  /** Chamado pelo CTA fixo a cada medição, e no desmonte para devolver o comando ao do fluxo. */
  set(visivel: boolean): void;
  subscribe(ouvinte: () => void): () => void;
  get(): boolean;
  /**
   * No servidor não há tela para medir, e o CTA fixo só existe depois da hidratação. O HTML
   * inicial sempre sai com o CTA do fluxo inteiro e ativo.
   */
  getOnServer(): boolean;
}

export function createStickyCtaStore(): StickyCtaStore {
  let stickyVisivel = false;
  const ouvintes = new Set<() => void>();

  return {
    set(visivel) {
      if (visivel === stickyVisivel) return;
      stickyVisivel = visivel;
      for (const ouvinte of ouvintes) ouvinte();
    },
    subscribe(ouvinte) {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
    get: () => stickyVisivel,
    getOnServer: () => false,
  };
}

/**
 * O convite do dono de mercado, em `/para-mercados` — hoje a **única** rota com CTA fixo.
 *
 * A loja do morador existia ao lado desta até R3.3A, quando o CTA fixo saiu da Home: o convite
 * de lá passou a ser um só, inline, depois dos Achados, e uma duplicação que não existe mais não
 * precisa de um mecanismo para resolvê-la. A instância por rota continua sendo a forma certa —
 * uma variável só faria a segunda rota herdar a medição da primeira —, e é isso que
 * `createStickyCtaStore()` garante para a próxima que precisar.
 */
export const marketCtaStore = createStickyCtaStore();

/**
 * Atributos que tiram o CTA duplicado da ordem de tabulação e da árvore acessível.
 *
 * `inert` faz as duas coisas de uma vez e é o mecanismo principal. `aria-hidden` acompanha por
 * ser explícito para quem lê o DOM. O `tabIndex={-1}` no link é a rede de segurança para motores
 * sem `inert`: sem ela sobraria um link tabulável marcado com `aria-hidden`, que é justamente o
 * que a WAI-ARIA proíbe. Com ela, o pior caso é um elemento fora da tela que só o mouse
 * alcançaria — e ele está fora da tela exatamente porque o CTA fixo está no ar.
 */
export function hiddenCtaAttributes(duplicado: boolean): {
  container: { inert?: boolean; "aria-hidden"?: "true" };
  link: { tabIndex?: -1 };
} {
  if (!duplicado) return { container: {}, link: {} };
  return { container: { inert: true, "aria-hidden": "true" }, link: { tabIndex: -1 } };
}
