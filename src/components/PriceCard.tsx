import { formatDate, formatPrice, formatRelativeDay } from "@/lib/format";
import { SourceBadge } from "@/components/SourceBadge";
import type { PriceWithMarket } from "@/types/domain";
import { MapPin, Star, Store } from "lucide-react";

interface PriceCardProps {
  entry: PriceWithMarket;
  isLowest?: boolean;
  isUsualMarket?: boolean;
  /** Diferença em relação ao menor preço (positiva). */
  differenceToLowest?: number;
}

export function PriceCard({ entry, isLowest, isUsualMarket, differenceToLowest }: PriceCardProps) {
  return (
    <li className={`card-compact ${isLowest ? "border-primary/50 ring-1 ring-primary/25" : ""}`}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold">{entry.market.name}</h3>
          <p className="meta-text truncate">
            {entry.market.neighborhood ?? "Bairro não informado"} · {formatDate(entry.observed_at)}{" "}
            ({formatRelativeDay(entry.observed_at)})
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {isLowest ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                <Star aria-hidden="true" className="size-3.5" />
                Menor preço
              </span>
            ) : null}
            {isUsualMarket ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-bold text-surface-foreground">
                <Store aria-hidden="true" className="size-3.5" />
                Seu mercado
              </span>
            ) : null}
            <SourceBadge source={entry.source_type} />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xl font-bold tabular-nums text-foreground">
            {formatPrice(entry.price)}
          </p>
          {!isLowest && differenceToLowest && differenceToLowest > 0 ? (
            <p className="meta-text">+{formatPrice(differenceToLowest)}</p>
          ) : null}
        </div>
      </div>

      {entry.valid_until || entry.special_condition || entry.source_reference ? (
        <dl className="meta-text mt-2 space-y-0.5 border-t border-border pt-2">
          {entry.valid_until ? (
            <div className="flex flex-wrap gap-1">
              <dt className="font-semibold text-foreground">Válido até:</dt>
              <dd>{formatDate(entry.valid_until)}</dd>
            </div>
          ) : null}
          {entry.special_condition ? (
            <div className="flex flex-wrap gap-1">
              <dt className="font-semibold text-foreground">Condição:</dt>
              <dd>{entry.special_condition}</dd>
            </div>
          ) : null}
          {entry.source_reference ? (
            <div className="flex flex-wrap gap-1">
              <dt className="font-semibold text-foreground">Referência:</dt>
              <dd>{entry.source_reference}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {entry.market.maps_url ? (
          <a
            href={entry.market.maps_url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-base btn-secondary btn-sm"
          >
            <MapPin aria-hidden="true" className="size-4" />
            Ver endereço
            <span className="sr-only"> de {entry.market.name} (abre em nova aba)</span>
          </a>
        ) : (
          <p className="meta-text inline-flex items-center gap-1">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {entry.market.address ?? "Endereço não informado"}
          </p>
        )}
      </div>
    </li>
  );
}
