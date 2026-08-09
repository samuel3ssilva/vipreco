import { Link } from "@tanstack/react-router";
import { CalendarClock, ChevronRight, Clock, Tag } from "lucide-react";
import { SourceBadge } from "@/components/SourceBadge";
import { formatDate, formatPrice, formatRelativeDay } from "@/lib/format";
import type { PriceWithMarket } from "@/types/domain";

/**
 * Uma linha da comparação — Tela 3 do North Star.
 *
 * =============================================================================
 * A POSIÇÃO É CONSEQUÊNCIA, NUNCA CURADORIA
 * =============================================================================
 *
 * O número 1, 2, 3 vem da ordenação por preço, e de mais nada. É por isso que ele é
 * `aria-hidden` e a posição é dita em texto para quem usa leitor de tela: um numeral solto na
 * frente de um nome de mercado, sem contexto, soa como classificação editorial — que é
 * exatamente o oposto do que o produto faz.
 *
 * **Nada reordena esta lista.** Não há destaque pago, não há parceiro, não há promoção que
 * suba de posição: a ordem é preço de prateleira crescente, e a única razão para o primeiro
 * ser o primeiro é ele custar menos (`CLAUDE.md`, princípio 4).
 *
 * =============================================================================
 * PROCEDÊNCIA NÃO É TABELA (§4 do mandato)
 * =============================================================================
 *
 * Fonte, data e validade vinham em linhas rotuladas, uma embaixo da outra, com o rótulo à
 * esquerda e o valor à direita — a forma de uma planilha. Aqui elas são uma faixa de metadados
 * discreta, na largura do card: mesma informação, sem a moldura que fazia a tela parecer
 * relatório.
 */
export function OfferRankRow({
  entry,
  posicao,
  productId,
}: {
  entry: PriceWithMarket;
  posicao: number;
  productId: string;
}) {
  const primeiro = posicao === 1;

  return (
    <li>
      <Link
        to="/produto/$productId/oferta/$priceId"
        params={{ productId, priceId: entry.id }}
        className={`group bg-card block overflow-hidden rounded-xl border transition-colors ${
          primeiro ? "border-primary/45 shadow-card" : "border-border hover:bg-surface"
        }`}
      >
        <div className="flex items-start gap-3 p-3.5">
          {/* O selo de posição. Verde cheio no primeiro, neutro nos demais — a diferença
              visual que a referência usa, e que aqui significa apenas "este é o menor". */}
          <span
            aria-hidden="true"
            className={`font-display mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              primeiro ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
            }`}
          >
            {posicao}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] leading-tight font-bold">
                  {entry.market.name}
                </p>
                {entry.market.neighborhood ? (
                  <p className="text-muted-foreground truncate text-xs">
                    {entry.market.neighborhood}
                  </p>
                ) : null}
              </div>

              {/* O PREÇO É O ELEMENTO PRINCIPAL À DIREITA — a instrução é literal do §4. */}
              <div className="shrink-0 text-right">
                <p
                  aria-hidden="true"
                  className="font-display text-primary text-[1.375rem] leading-none font-extrabold tabular-nums"
                >
                  <span className="text-[64%] font-bold">R$</span>
                  <span className="ml-0.5">
                    {formatPrice(entry.price).replace("R$", "").trim()}
                  </span>
                </p>
                <span className="sr-only">
                  Posição {posicao}: {formatPrice(entry.price)}
                </span>
              </div>
            </div>

            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <SourceBadge source={entry.source_type} />
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock aria-hidden="true" className="size-3.5 shrink-0" />
                {formatDate(entry.observed_at)} · {formatRelativeDay(entry.observed_at)}
              </span>
              {entry.valid_until ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
                  válido até {formatDate(entry.valid_until)}
                </span>
              ) : null}
            </div>

            {entry.special_condition ? (
              <p className="bg-caution/25 text-caution-foreground mt-2 flex w-fit max-w-full items-start gap-1.5 rounded-md px-2 py-1 text-xs">
                <Tag aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span>{entry.special_condition}</span>
              </p>
            ) : null}
          </div>

          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground group-hover:text-primary mt-1 size-5 shrink-0"
          />
        </div>
      </Link>
    </li>
  );
}
