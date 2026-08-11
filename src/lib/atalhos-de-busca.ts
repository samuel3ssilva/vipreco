/**
 * Os atalhos de busca — os mesmos na Home e na página de resultados.
 *
 * A única regra que eles têm: **todo atalho precisa devolver resultado**. "Feijão" já
 * esteve na Home sem existir no catálogo — o elemento mais clicável da primeira dobra
 * levava a "nenhum produto encontrado". `demo-identity.test.ts` afirma que cada um destes
 * devolve pelo menos um produto do catálogo da demo.
 *
 * Estes cinco cobrem a largura do catálogo da V3: as duas seções de balcão ("Carnes",
 * "Hortifruti"), a busca por produto que devolve VOLUME ("Cerveja", três grupos), e as
 * duas pontas de mercearia seca que mostram embalagem e normalização ("Higiene", "Pet").
 */
export const SHORTCUTS = ["Carnes", "Hortifruti", "Cerveja", "Higiene", "Pet"];
