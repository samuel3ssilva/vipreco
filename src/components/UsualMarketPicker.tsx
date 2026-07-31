import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store, Check, Pencil } from "lucide-react";
import { getMarkets } from "@/services/catalog";
import { getUsualMarketId, setUsualMarketId } from "@/lib/local-preferences";
import type { Market } from "@/types/domain";

interface UsualMarketPickerProps {
  onChange?: (marketId: string | null) => void;
  /** Variante enxuta usada dentro da página de produto. */
  compact?: boolean;
  /**
   * Mercados já resolvidos no servidor (loader da Home). Quando presentes, a lista é renderizada
   * no HTML inicial e nenhum carregamento aparece. Quando ausentes — página do produto, ou falha
   * do servidor no modo piloto —, o componente mantém o comportamento anterior de buscar no
   * cliente, com estado de carregamento e "Tentar novamente".
   */
  initialMarkets?: Market[] | null;
}

export function UsualMarketPicker({
  onChange,
  compact = false,
  initialMarkets,
}: UsualMarketPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setSelected(getUsualMarketId());
  }, []);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["markets"],
    queryFn: getMarkets,
    staleTime: 5 * 60_000,
    initialData: initialMarkets ?? undefined,
  });

  function update(value: string | null) {
    setSelected(value);
    setUsualMarketId(value);
    setEditing(false);
    onChange?.(value);
  }

  const markets = data ?? [];
  const current = markets.find((market) => market.id === selected) ?? null;
  const showList = editing || !current;

  return (
    <section
      className={compact ? "card-compact bg-surface" : "card-base"}
      aria-labelledby="mercado-habitual-titulo"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <h2
            id="mercado-habitual-titulo"
            className="flex items-center gap-1.5 text-base font-bold"
          >
            <Store aria-hidden="true" className="size-4 shrink-0 text-primary" />
            Seu mercado habitual
          </h2>
          {current && !editing ? (
            <p className="mt-0.5 truncate text-sm font-semibold">
              {current.name}
              {current.neighborhood ? ` — ${current.neighborhood}` : ""}
            </p>
          ) : (
            <p className="meta-text mt-0.5">
              Escolha onde você costuma comprar para ver a diferença de preço. Fica salvo só neste
              aparelho.
            </p>
          )}
        </div>
        {current && !editing ? (
          <button
            type="button"
            className="btn-base btn-quiet btn-sm shrink-0"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" className="size-4" />
            Trocar
          </button>
        ) : null}
      </div>

      {isError ? (
        <div role="alert" className="mt-2 text-sm">
          <p>Não conseguimos carregar a lista de mercados.</p>
          <button
            type="button"
            className="btn-base btn-secondary btn-sm mt-2"
            onClick={() => refetch()}
          >
            Tentar novamente
          </button>
        </div>
      ) : showList ? (
        <div className="mt-3">
          {isPending ? (
            <p className="meta-text">Carregando mercados…</p>
          ) : (
            <>
              <ul className="flex flex-wrap gap-2">
                {markets.map((market) => {
                  const isActive = market.id === selected;
                  return (
                    <li key={market.id}>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => update(market.id)}
                        className={`btn-base btn-sm ${isActive ? "btn-primary" : "btn-secondary"} max-w-full`}
                      >
                        {isActive ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
                        <span className="truncate">{market.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {selected ? (
                <button
                  type="button"
                  className="btn-base btn-quiet btn-sm mt-2"
                  onClick={() => update(null)}
                >
                  Remover mercado habitual
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
