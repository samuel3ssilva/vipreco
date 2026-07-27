import { formatDate, formatPrice, formatRelativeDay } from "@/lib/format";
import { SourceBadge } from "@/components/SourceBadge";
import type { PriceWithMarket } from "@/types/domain";
import { MapPin, Flag } from "lucide-react";

interface PriceCardProps {
  entry: PriceWithMarket;
  isLowest?: boolean;
  isUsualMarket?: boolean;
  onReport: (entry: PriceWithMarket) => void;
}

export function PriceCard({ entry, isLowest, isUsualMarket, onReport }: PriceCardProps) {
  return (
    <li className="card-base">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg">{entry.market.name}</h3>
          {entry.market.neighborhood ? (
            <p className="text-sm text-muted-foreground">{entry.market.neighborhood}</p>
          ) : null}
        </div>
        <p className="font-display text-2xl font-semibold text-primary">{formatPrice(entry.price)}</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {isLowest ? (
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            Menor preço encontrado
          </span>
        ) : null}
        {isUsualMarket ? (
          <span className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-bold text-surface-foreground">
            Seu mercado habitual
          </span>
        ) : null}
        <SourceBadge source={entry.source_type} />
      </div>

      <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-1">
          <dt className="font-semibold text-foreground">Preço observado em:</dt>
          <dd>
            {formatDate(entry.observed_at)} ({formatRelativeDay(entry.observed_at)})
          </dd>
        </div>
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

      <div className="mt-3 flex flex-wrap gap-2">
        {entry.market.maps_url ? (
          <a
            href={entry.market.maps_url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-base btn-secondary"
          >
            <MapPin aria-hidden="true" className="size-5" />
            Ver endereço
            <span className="sr-only"> de {entry.market.name} (abre em nova aba)</span>
          </a>
        ) : null}
        <button type="button" className="btn-base btn-secondary" onClick={() => onReport(entry)}>
          <Flag aria-hidden="true" className="size-5" />
          Informar atualização
        </button>
      </div>
    </li>
  );
}
