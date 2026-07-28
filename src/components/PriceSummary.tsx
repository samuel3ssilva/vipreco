import { Link } from "@tanstack/react-router";
import { MapPin, TrendingDown, Store } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { formatDate, formatPrice, formatPriceDifference, formatRelativeDay } from "@/lib/format";
import type { UsualMarketComparison } from "@/lib/comparison";
import type { PriceWithMarket } from "@/types/domain";

interface PriceSummaryProps {
  best: PriceWithMarket;
  comparison: UsualMarketComparison;
}

/** Bloco de decisão: melhor preço, onde, quando, fonte e diferença para o mercado habitual. */
export function PriceSummary({ best, comparison }: PriceSummaryProps) {
  return (
    <section aria-labelledby="resumo-titulo" className="card-base border-primary/40 bg-card p-4">
      <h2 id="resumo-titulo" className="eyebrow">
        Melhor preço encontrado
      </h2>

      <div className="mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-4xl font-bold tabular-nums leading-none text-primary sm:text-5xl">
            {formatPrice(best.price)}
          </p>
          <p className="mt-1.5 truncate text-base font-bold">{best.market.name}</p>
          <p className="meta-text">
            {best.market.neighborhood ? `${best.market.neighborhood} · ` : ""}
            Observado em {formatDate(best.observed_at)} ({formatRelativeDay(best.observed_at)})
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SourceBadge source={best.source_type} />
            {best.special_condition ? (
              <span className="meta-text">Condição: {best.special_condition}</span>
            ) : null}
          </div>
        </div>

        {best.market.maps_url ? (
          <a
            href={best.market.maps_url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-base btn-secondary btn-sm shrink-0"
          >
            <MapPin aria-hidden="true" className="size-4" />
            Ver endereço
            <span className="sr-only"> de {best.market.name} (abre em nova aba)</span>
          </a>
        ) : (
          <p className="meta-text inline-flex shrink-0 items-center gap-1">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {best.market.address ?? "Endereço não informado"}
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3 text-sm">
        {comparison.kind === "no-usual-market" ? (
          <p className="flex items-start gap-1.5 text-muted-foreground">
            <Store aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Escolha seu mercado habitual abaixo para ver quanto você economiza.
          </p>
        ) : comparison.kind === "no-price" ? (
          <p className="text-muted-foreground">
            Ainda não temos preço válido deste produto no seu mercado habitual.
          </p>
        ) : comparison.kind === "cheapest" ? (
          <p className="font-semibold text-success">
            Seu mercado habitual já está com o menor preço cadastrado. Não precisa mudar de loja.
          </p>
        ) : (
          <p>
            <TrendingDown aria-hidden="true" className="mr-1 inline size-4 text-success" />
            <strong className="text-success">
              {formatPriceDifference(comparison.difference)} mais barato
            </strong>{" "}
            que no seu mercado habitual ({comparison.usual.market.name},{" "}
            {formatPrice(comparison.usual.price)}
            ). Avalie se a diferença compensa o deslocamento.
          </p>
        )}
      </div>

      <p className="meta-text mt-2">
        Preços podem mudar sem aviso.{" "}
        <Link to="/como-funciona" className="underline">
          Como conferimos as informações
        </Link>
        .
      </p>
    </section>
  );
}
