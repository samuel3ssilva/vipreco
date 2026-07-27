import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { getProductsPriceStats, searchProducts } from "@/services/catalog";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/domain";

interface ProductSearchProps {
  autoFocus?: boolean;
  label?: string;
  initialTerm?: string;
  /** Quando definido, o resultado aparece em lista fixa e não em painel flutuante. */
  inline?: boolean;
  onTermChange?: (term: string) => void;
}

export function ProductSearch({
  autoFocus,
  label = "Buscar produto",
  initialTerm = "",
  inline = false,
  onTermChange,
}: ProductSearchProps) {
  const navigate = useNavigate();
  const inputId = useId();
  const listId = useId();
  const [term, setTerm] = useState(initialTerm);
  const [debounced, setDebounced] = useState(initialTerm);
  const [open, setOpen] = useState(Boolean(initialTerm));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerm(initialTerm);
    setDebounced(initialTerm);
    if (initialTerm) setOpen(true);
  }, [initialTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    onTermChange?.(debounced);
  }, [debounced, onTermChange]);

  const enabled = debounced.trim().length >= 2;
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () => searchProducts(debounced),
    enabled,
    staleTime: 30_000,
  });

  const results = data ?? [];
  const ids = results.map((product) => product.id);
  const { data: stats } = useQuery({
    queryKey: ["product-search-stats", ids],
    queryFn: () => getProductsPriceStats(ids),
    enabled: ids.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (inline) return;
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [inline]);

  function choose(product: Product) {
    setOpen(false);
    navigate({ to: "/produto/$productId", params: { productId: product.id } });
  }

  const showPanel = (inline || open) && enabled;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={inputId}
          type="search"
          inputMode="search"
          autoFocus={autoFocus}
          className="field-base pl-9"
          placeholder="Ex.: café, arroz 5 kg, 7896..."
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={`${inputId}-ajuda`}
        />
      </div>
      <p id={`${inputId}-ajuda`} className="meta-text mt-1">
        Busque por nome, marca, variante, tamanho ou código de barras. Digite pelo menos 2 letras.
      </p>

      {showPanel ? (
        <div
          className={
            inline
              ? "mt-2 rounded-xl border border-border bg-card"
              : "absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-border bg-card shadow-lg"
          }
        >
          <div aria-live="polite" className="sr-only">
            {isFetching ? "Buscando produtos" : `${results.length} produtos encontrados`}
          </div>
          {isError ? (
            <div className="p-4 text-sm" role="alert">
              <p className="font-semibold">Não conseguimos buscar agora.</p>
              <p className="meta-text">Verifique sua conexão com a internet.</p>
              <button
                type="button"
                className="btn-base btn-secondary btn-sm mt-2"
                onClick={() => refetch()}
              >
                Tentar novamente
              </button>
            </div>
          ) : isFetching ? (
            <p className="meta-text p-4">Buscando produtos…</p>
          ) : results.length === 0 ? (
            <div className="p-4">
              <p className="font-semibold">Ainda não temos esse produto no catálogo.</p>
              <p className="meta-text mt-0.5">
                Pode ser que ainda não tenha sido cadastrado em Artemis — tente outro nome, marca ou
                tamanho. Ex.: “café 500 g”.
              </p>
            </div>
          ) : (
            <ul
              id={listId}
              role="listbox"
              aria-label="Sugestões de produtos"
              className="max-h-96 divide-y divide-border overflow-auto"
            >
              {results.map((product) => {
                const stat = stats?.[product.id];
                return (
                  <li key={product.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => choose(product)}
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-surface"
                    >
                      <span className="font-semibold leading-tight">
                        {product.name}
                        {product.brand ? ` ${product.brand}` : ""}
                        {product.variant ? ` ${product.variant}` : ""}
                      </span>
                      <span className="meta-text">
                        {[
                          product.size_text ?? "tamanho não informado",
                          product.gtin ? `Código ${product.gtin}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className="meta-text">
                        {stat
                          ? stat.marketCount > 0
                            ? `A partir de ${formatPrice(stat.lowest ?? 0)} · Atualizado em ${stat.marketCount} ${
                                stat.marketCount === 1 ? "mercado" : "mercados"
                              }`
                            : "Preço em atualização."
                          : "Carregando preços…"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
