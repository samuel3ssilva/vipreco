import { useId, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { sourceLabel } from "@/lib/sources";
import { PILOT_LOCALITY } from "@/lib/pilot";
import { TEMPORAL_STYLE, temporalState } from "@/lib/temporal";
import {
  formatDate,
  formatPrice,
  formatPriceParts,
  formatRelativeDay,
  spokenPrice,
} from "@/lib/format";
import type { Opportunity, SourceType } from "@/types/domain";

/**
 * Card oficial de Achado (North Star v1.2.2). Uma anatomia só, duas ênfases.
 *
 * Anatomia, de cima para baixo: tarja temporal, chip de origem à esquerda, chip de validade à
 * direita (só quando informada), produto, embalagem, preço, preço anterior (opcional), mercado
 * com a localidade do piloto, linha mono com data e origem, e — apenas no destaque — a ação de
 * compartilhar.
 *
 * Regras de dado que o componente **não** contorna:
 * - validade só aparece quando `valid_until` existe; nunca é inventada nem estimada;
 * - preço anterior só aparece quando `previous_price` existe; ausência é estado normal;
 * - "preço de gôndola observado, sem remarcação" só aparece nas origens que de fato são
 *   observação de gôndola — nunca em preço informado pelo mercado ou anunciado.
 */

/** Um Achado pode trazer um preço anterior; a maioria não traz, e isso é normal. */
export interface AchadoEntry extends Opportunity {
  previous_price?: number;
}

/** Origens que são, de fato, observação direta da gôndola. */
const SHELF_OBSERVED_SOURCES: readonly SourceType[] = ["weekly_audit", "shelf_photo"];

const SHELF_OBSERVED_NOTE = "Preço de gôndola observado, sem remarcação.";

interface AchadoCardProps {
  entry: AchadoEntry;
  /** Instante de referência do servidor — mantém "ontem" igual antes e depois da hidratação. */
  now: Date;
  /** `destaque` domina a composição; `secundario` é a versão compacta. */
  variant?: "destaque" | "secundario";
  /**
   * Ação de compartilhamento. Só é renderizada no destaque, por decisão de design: repetir o
   * compartilhamento em cada card transforma a lista em um mural de botões.
   */
  shareSlot?: ReactNode;
  className?: string;
}

export function AchadoCard({
  entry,
  now,
  variant = "secundario",
  shareSlot,
  className = "",
}: AchadoCardProps) {
  const titleId = useId();
  const destaque = variant === "destaque";
  const estado = temporalState(entry, now);
  const { color, height } = TEMPORAL_STYLE[estado];
  const { currency, amount } = formatPriceParts(entry.price);
  const origem = sourceLabel(entry.source_type);
  const mostraGondola = SHELF_OBSERVED_SOURCES.includes(entry.source_type);

  return (
    <article
      aria-labelledby={titleId}
      className={`card-base flex flex-col overflow-hidden p-0 ${className}`}
    >
      {/* Tarja temporal — decorativa. Tudo o que ela sugere está escrito abaixo, em texto. */}
      <div aria-hidden="true" style={{ height, backgroundColor: color }} />

      <div className={`flex flex-1 flex-col ${destaque ? "gap-2 p-4" : "gap-1.5 p-3"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SourceBadge source={entry.source_type} />
          {entry.valid_until ? (
            <span className="font-data inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
              válido até {formatDate(entry.valid_until)}
            </span>
          ) : null}
        </div>

        <div>
          {/* `h2` porque o card vive sob o `h1` da primeira dobra: um `h3` ali pularia um nível
              da hierarquia de títulos. */}
          <h2
            id={titleId}
            className={`font-display leading-tight ${destaque ? "text-xl" : "text-base"}`}
          >
            {[entry.product.name, entry.product.brand, entry.product.variant]
              .filter(Boolean)
              .join(" ")}
          </h2>
          {entry.product.size_text ? (
            <p className="meta-text mt-0.5">{entry.product.size_text}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p
            aria-hidden="true"
            className={`font-display font-extrabold leading-none tabular-nums text-primary ${
              destaque ? "text-[2.125rem]" : "text-[1.625rem]"
            }`}
          >
            <span className="text-[62%] font-bold">{currency}</span>
            <span className="ml-1">{amount}</span>
          </p>
          <span className="sr-only">{spokenPrice(entry.price)}</span>
          {typeof entry.previous_price === "number" ? (
            <p className="meta-text">
              antes <s>{formatPrice(entry.previous_price)}</s>
            </p>
          ) : null}
        </div>

        <p className={destaque ? "text-base font-semibold" : "text-sm font-semibold"}>
          {entry.market.name} <span className="font-normal">{`· ${PILOT_LOCALITY}`}</span>
        </p>

        {/* Linha de procedência: o registro seco do preço, em mono. */}
        <p className="font-data text-xs leading-snug text-muted-foreground">
          {`${formatDate(entry.observed_at)} · ${formatRelativeDay(
            entry.observed_at,
            now,
          )} · ${origem.toLowerCase()}`}
        </p>

        {entry.special_condition ? (
          <p className="meta-text">Condição: {entry.special_condition}</p>
        ) : null}
        {mostraGondola ? <p className="meta-text">{SHELF_OBSERVED_NOTE}</p> : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Link
            to="/produto/$productId"
            params={{ productId: entry.product.id }}
            className="btn-base btn-secondary btn-sm btn-touch-48 w-full"
          >
            Ver preços por mercado
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          {destaque ? shareSlot : null}
        </div>
      </div>
    </article>
  );
}
