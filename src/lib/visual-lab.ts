/**
 * R3.1 — quem pode ver o laboratório visual.
 *
 * O laboratório existe para provar tokens e primitivas, e para produzir os screenshots do
 * Gate do Founder. Ele **não é uma página do produto**: não tem conteúdo para visitante,
 * não aparece na navegação, não entra no `sitemap.xml`.
 *
 * =============================================================================
 * POR QUE UM PORTÃO EM VEZ DE SÓ `noindex`
 * =============================================================================
 *
 * `noindex` é um pedido a buscadores, e um pedido não é um controle. A rota continuaria
 * respondendo 200 para qualquer um que digitasse a URL — e o que ela mostra é uma página
 * de desenvolvimento, com nomes de token e amostras de cor, num produto cuja proposta é
 * ser um comparador sério de preços. Não é vazamento de dado; é ruído com aparência de
 * erro.
 *
 * Então são as duas coisas: o portão decide se a rota **existe**, e o `noindex` cobre o
 * caso de ela existir num ambiente onde alguém aponte um rastreador.
 *
 * O padrão é FECHADO. Um build sem a variável não tem laboratório — que é o
 * comportamento certo para produção e para qualquer ambiente que ninguém configurou de
 * propósito. É o mesmo raciocínio de `app-mode.ts`: o caminho aberto exige decisão
 * explícita de quem faz o build, e o silêncio nunca abre nada.
 */

export function resolveVisualLab(configured: string | undefined, dev: boolean): boolean {
  if (dev) return true;
  return configured === "1" || configured === "true";
}

function configuredFlag(): string | undefined {
  const value = import.meta.env.VITE_VISUAL_LAB;
  return typeof value === "string" ? value : undefined;
}

/** O laboratório está habilitado neste build? */
export function isVisualLabEnabled(): boolean {
  return resolveVisualLab(configuredFlag(), import.meta.env.DEV === true);
}
