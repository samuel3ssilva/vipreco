/**
 * Os atalhos de busca — os mesmos na Home e na página de resultados.
 *
 * A única regra que eles têm: **todo atalho precisa devolver resultado**. "Feijão" já
 * esteve na Home sem existir no catálogo — o elemento mais clicável da primeira dobra
 * levava a "nenhum produto encontrado". `demo-identity.test.ts` afirma que cada um destes
 * devolve pelo menos um produto do catálogo da demo.
 *
 * Estes quatro cobrem os cantos do catálogo v2: o corte da demo ("Frango"), a seção de
 * açougue inteira ("Carnes"), e as duas categorias que mostram embalagem e normalização
 * ("Limpeza", "Pet").
 */
export const SHORTCUTS = ["Frango", "Carnes", "Limpeza", "Pet"];
