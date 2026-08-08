/**
 * As duas telas sem Achados — e por que elas são duas (R3.3A, item 5 da remediação).
 *
 * =============================================================================
 * "NÃO TEM NADA" E "O QUE TINHA VENCEU" NÃO SÃO O MESMO ESTADO
 * =============================================================================
 *
 * Até R3.3 os dois caíam na mesma mensagem: *"Estamos começando a mapear preços na sua região."*
 * O painel de estados do Gate registrou a divergência antes de ela ser corrigida, e a razão é
 * simples: a frase é **verdadeira** quando nada foi conferido ainda, e **falsa** quando houve
 * mapeamento e o que aconteceu foi o preço envelhecer. Dizer "estamos começando" a quem viu
 * ofertas ontem descreve um produto que não é este, e esconde a única informação útil do
 * momento — que a validade passou e vale voltar depois.
 *
 * A distinção é dado, não heurística. A fonte entrega uma lista; `isValidPrice` filtra. Lista de
 * origem vazia é vazio real. Lista de origem com itens e nenhum válido é oferta vencida. Não há
 * terceira leitura, e nenhuma das duas depende de adivinhar intenção.
 *
 * As duas copies moram aqui, e não em cada tela que precisa delas, porque a Home e o laboratório
 * de estados do Gate mostram a MESMA mensagem por definição: uma evidência que exibe copy que o
 * produto não tem é pior do que evidência nenhuma.
 */

export type ChaveEstadoSemAchados = "vazio" | "vencidas";

export interface EstadoSemAchados {
  chave: ChaveEstadoSemAchados;
  title: string;
  description: string;
  /** Rótulo da saída oferecida, quando existir uma. */
  acao?: string;
}

/** Nada foi conferido ainda. A mensagem não inventa oferta e não promete prazo. */
export const VAZIO_REAL: EstadoSemAchados = {
  chave: "vazio",
  title: "Estamos começando a mapear preços na sua região.",
  description:
    "Os primeiros Achados aparecem aqui assim que forem conferidos. Por enquanto, use a busca para comparar um produto específico.",
};

/** Havia ofertas; todas venceram. A saída é explícita, porque aqui existe uma. */
export const SEM_OFERTAS_VIGENTES: EstadoSemAchados = {
  chave: "vencidas",
  title: "Nenhuma oferta vigente no momento",
  description:
    "As ofertas que tínhamos já venceram. Você pode buscar um produto específico ou voltar mais tarde.",
  acao: "Buscar produto",
};

/**
 * Qual das duas telas mostrar, a partir de quantos Achados a fonte entregou **antes** do filtro
 * de validade. Só é chamada quando nenhum Achado válido sobrou.
 */
export function estadoSemAchados(totalNaFonte: number): EstadoSemAchados {
  return totalNaFonte > 0 ? SEM_OFERTAS_VIGENTES : VAZIO_REAL;
}
