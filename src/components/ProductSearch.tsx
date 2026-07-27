import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { searchProducts } from "@/services/catalog";
import type { Product } from "@/types/domain";

interface ProductSearchProps {
  autoFocus?: boolean;
  label?: string;
}

export function ProductSearch({ autoFocus, label = "Buscar produto" }: ProductSearchProps) {
  const navigate = useNavigate();
  const inputId = useId();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const enabled = debounced.trim().length >= 2;
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["product-search", debounced],
    queryFn: () => searchProducts(debounced),
    enabled,
    staleTime: 30_000,
  });

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function choose(product: Product) {
    setOpen(false);
    navigate({ to: "/produto/$productId", params: { productId: product.id } });
  }

  const results = data ?? [];

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={inputId} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="search"
          inputMode="search"
          autoFocus={autoFocus}
          className="field-base"
          placeholder="Ex.: café, arroz 5 kg, 7896..."
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={open && enabled}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-describedby={`${inputId}-ajuda`}
        />
        <button
          type="button"
          className="btn-base btn-primary shrink-0"
          onClick={() => setOpen(true)}
          aria-label="Buscar produto"
        >
          <Search aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </div>
      <p id={`${inputId}-ajuda`} className="mt-1 text-sm text-muted-foreground">
        Busque por nome, marca, variante, tamanho ou código de barras.
      </p>

      {open && enabled ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 rounded-xl border border-border bg-card shadow-lg">
          <div aria-live="polite" className="sr-only">
            {isFetching ? "Buscando produtos" : `${results.length} produtos encontrados`}
          </div>
          {isError ? (
            <div className="p-4 text-sm" role="alert">
              <p className="font-semibold">Não conseguimos buscar agora.</p>
              <button type="button" className="btn-base btn-secondary mt-2" onClick={() => refetch()}>
                Tentar novamente
              </button>
            </div>
          ) : isFetching ? (
            <p className="p-4 text-sm text-muted-foreground">Buscando…</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhum produto encontrado. Tente outro nome ou marca.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Sugestões de produtos" className="max-h-80 overflow-auto py-1">
              {results.map((product) => (
                <li key={product.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => choose(product)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-surface"
                  >
                    <span className="font-semibold">{product.name}</span>
                    <span className="text-sm text-muted-foreground">
                      Marca: {product.brand ?? "não informada"} · Variante: {product.variant ?? "única"} ·
                      Tamanho: {product.size_text ?? "não informado"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
