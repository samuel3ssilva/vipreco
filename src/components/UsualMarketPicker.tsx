import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMarkets } from "@/services/catalog";
import { getUsualMarketId, setUsualMarketId } from "@/lib/local-preferences";

export function UsualMarketPicker({ onChange }: { onChange?: (marketId: string | null) => void }) {
  const selectId = useId();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(getUsualMarketId());
  }, []);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["markets"],
    queryFn: getMarkets,
    staleTime: 5 * 60_000,
  });

  function update(value: string | null) {
    setSelected(value);
    setUsualMarketId(value);
    onChange?.(value);
  }

  return (
    <section className="card-base" aria-labelledby="mercado-habitual-titulo">
      <h2 id="mercado-habitual-titulo" className="text-lg">
        Seu mercado habitual
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha onde você costuma comprar para ver as diferenças de preço com mais contexto. Essa escolha
        fica salva apenas neste aparelho.
      </p>

      {isError ? (
        <div role="alert" className="mt-3 text-sm">
          <p>Não conseguimos carregar a lista de mercados.</p>
          <button type="button" className="btn-base btn-secondary mt-2" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <label htmlFor={selectId} className="mb-1 block text-sm font-semibold">
            Mercado
          </label>
          <select
            id={selectId}
            className="field-base"
            value={selected ?? ""}
            disabled={isPending}
            onChange={(event) => update(event.target.value || null)}
          >
            <option value="">{isPending ? "Carregando mercados…" : "Não informar"}</option>
            {(data ?? []).map((market) => (
              <option key={market.id} value={market.id}>
                {market.name}
                {market.neighborhood ? ` — ${market.neighborhood}` : ""}
              </option>
            ))}
          </select>
          {selected ? (
            <button type="button" className="btn-base btn-secondary mt-3" onClick={() => update(null)}>
              Remover mercado habitual
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
