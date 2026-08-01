import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { getProductsPriceStats, searchProducts } from "@/services/catalog";
import { searchState, type SearchState } from "@/lib/search-state";
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

/** O que o leitor de tela ouve em cada estado. */
const ANUNCIO: Record<SearchState, (dados: { count: number }) => string> = {
  inicial: () => "",
  carregando: () => "Buscando produtos",
  erro: () => "Não foi possível atualizar a busca agora.",
  vazio: () => "Nenhum produto encontrado para esta busca.",
  resultado: ({ count }) => `${count} produtos encontrados`,
};

/**
 * Esqueleto da busca. Existe só depois de uma ação explícita — o visitante digitou pelo menos
 * duas letras. A Home nunca chega ao navegador com ele: o HTML inicial não tem busca em curso.
 */
function SearchSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {[0, 1, 2].map((linha) => (
        <div key={linha} className="space-y-1.5">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
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

  const estado = searchState({ enabled, isFetching, isError, count: results.length });
  const showPanel = (inline || open) && estado !== "inicial";

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
            {ANUNCIO[estado]({ count: results.length })}
          </div>
          {estado === "erro" ? (
            // Erro factual: diz o que não aconteceu e o que fazer. Não culpa a conexão do
            // visitante, não promete atualização instantânea e não apaga nada do que já está na
            // tela — os Achados da primeira dobra vêm do loader e seguem visíveis.
            <div className="p-4 text-sm" role="alert">
              <p className="font-semibold">Não foi possível atualizar a busca agora.</p>
              <p className="meta-text">Confira novamente em alguns instantes.</p>
              <button
                type="button"
                className="btn-base btn-secondary btn-sm btn-touch-48 mt-2"
                onClick={() => refetch()}
              >
                Tentar novamente
              </button>
            </div>
          ) : estado === "carregando" ? (
            <SearchSkeleton />
          ) : estado === "vazio" ? (
            // Vazio não é erro: não é anunciado como alerta, não tem tom de falha e oferece
            // uma saída concreta.
            <div className="p-4">
              <p className="font-semibold">Ainda não temos esse produto no catálogo.</p>
              <p className="meta-text mt-0.5">
                Pode ser que ainda não tenha sido cadastrado na sua região — tente outro nome, marca
                ou tamanho. Ex.: “café 500 g”.
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
                      {stat ? (
                        <span className="meta-text">
                          {stat.marketCount > 0
                            ? `A partir de ${formatPrice(stat.lowest ?? 0)} · Atualizado em ${stat.marketCount} ${
                                stat.marketCount === 1 ? "mercado" : "mercados"
                              }`
                            : "Preço em atualização."}
                        </span>
                      ) : (
                        // Esqueleto no lugar do texto de carregamento, que piscava a
                        // cada tecla. Só aparece depois de uma busca, nunca no HTML inicial.
                        <span
                          aria-hidden="true"
                          className="mt-1 block h-3 w-40 animate-pulse rounded bg-muted"
                        />
                      )}
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
