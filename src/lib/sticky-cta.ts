/**
 * Decisão de exibir o CTA fixo do mobile.
 *
 * A regra da North Star v1.2.2 é simples de enunciar e fácil de errar: **nunca dois CTAs
 * idênticos competindo na mesma tela**. O fixo só aparece quando nenhum CTA equivalente está
 * visível — o da primeira dobra, o da última, qualquer um que venha a existir.
 *
 * A decisão fica aqui, fora do componente, para ser exercida em teste sem navegador. O
 * `IntersectionObserver` só alimenta esta função com quem está e quem não está na tela.
 */
export function shouldShowStickyCta(entries: readonly { isIntersecting: boolean }[]): boolean {
  return entries.every((entry) => !entry.isIntersecting);
}
