/**
 * Estado visível da busca de produto.
 *
 * A regra que este módulo existe para tornar provável: **nada de carregamento antes de uma ação
 * explícita**. Enquanto o visitante não digitou o suficiente para valer uma consulta (`enabled`
 * é falso), o estado é `inicial` — nem esqueleto, nem "Buscando…", nem vazio. É o que garante
 * que a Home chegue ao navegador sem nenhum carregamento visível.
 *
 * A precedência também é decidida aqui, e não espalhada em ternários no JSX:
 * erro > carregando > vazio > resultado.
 */
export type SearchState = "inicial" | "carregando" | "erro" | "vazio" | "resultado";

export interface SearchStateInput {
  /** A consulta pode rodar? Falso antes da ação explícita do visitante. */
  enabled: boolean;
  isFetching: boolean;
  isError: boolean;
  /** Quantidade de resultados já conhecidos. */
  count: number;
}

export function searchState({
  enabled,
  isFetching,
  isError,
  count,
}: SearchStateInput): SearchState {
  if (!enabled) return "inicial";
  if (isError) return "erro";
  if (isFetching) return "carregando";
  return count === 0 ? "vazio" : "resultado";
}
