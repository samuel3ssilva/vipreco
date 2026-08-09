import { Link } from "@tanstack/react-router";
import { CalendarClock, ChevronRight, Clock, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { SourceBadge } from "@/components/SourceBadge";
import { formatDate, formatPrice, formatRelativeDay } from "@/lib/format";
import type { OfertaCardV2 } from "@/lib/card-v2";

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
 * ser o primeiro é ele custar menos (`CLAUDE.md`, princípio 4). Vale inclusive para a loja da
 * demonstração: o Açougue Mota abre as cinco comparações porque é mais barato nas cinco, e não
 * porque exista um campo que o promova.
 *
 * =============================================================================
 * DUAS NATUREZAS DE LINHA, E A DIFERENÇA É VISÍVEL SEM LER MIUDINHO (09/08/2026)
 * =============================================================================
 *
 * **Observada** — procedência, data e link para o detalhe.
 *
 * **Exemplo ilustrativo** — sem procedência, sem data, moldura tracejada e **sem link**. Não é
 * economia de trabalho: não existe detalhe de uma oferta que ninguém foi ver, e uma seta que
 * abre uma ficha inventada é a forma mais convincente de mentir sobre isto. A linha diz o que é,
 * em texto, dentro dela mesma.
 */
export function OfferRankRow({
  entry,
  posicao,
  productId,
}: {
  entry: OfertaCardV2;
  posicao: number;
  productId: string;
}) {
  const exemplo = entry.exemplo_ilustrativo === true;
  const primeiro = posicao === 1 && !exemplo;

  const conteudo = (
    <div className="flex items-start gap-3 p-3.5">
      {/* O selo de posição. Verde cheio no primeiro observado, neutro nos demais — a
          diferença visual que a referência usa, e que aqui significa apenas "este é o menor". */}
      <span
        aria-hidden="true"
        className={`font-display mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          primeiro ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
        }`}
      >
        {posicao}
      </span>

      {/* A IMAGEM ENTROU AQUI E SAIU NA MESMA TARDE, E O MOTIVO ESTÁ MEDIDO.
          A 390 px, o selo de posição, uma imagem de 72, o preço com "/kg" e o chevron deixam
          ~90 px para o nome do mercado. "Açougue Mota" quebrava em duas linhas e a primeira
          encostava no "R$". Numa tela cujo propósito é dizer EM QUAL LOJA o preço está, o nome
          da loja é a última coisa que pode ser espremida.
          E o produto não fica sem imagem: ele é mostrado uma vez, grande, no topo da tela —
          que é o desenho desta rota desde o começo. Repeti-lo linha a linha era ganhar pouco e
          pagar caro. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          {/* NOME DE MERCADO NÃO TRUNCA. Ele truncava, e com a imagem na linha virou "Aç…" —
              na tela cujo propósito é dizer em QUAL loja o preço está. Quebrar em duas linhas
              custa altura; truncar custa a informação. */}
          <div className="min-w-0">
            <p className="text-[0.9375rem] leading-tight font-bold">{entry.market.name}</p>
            {entry.market.neighborhood ? (
              <p className="text-muted-foreground text-xs">{entry.market.neighborhood}</p>
            ) : null}
          </div>

          {/* O PREÇO É O ELEMENTO PRINCIPAL À DIREITA — a instrução é literal do §4. */}
          <div className="shrink-0 text-right">
            <p
              aria-hidden="true"
              className="font-display text-primary text-[1.375rem] leading-none font-extrabold tabular-nums"
            >
              <span className="text-[64%] font-bold">R$</span>
              <span className="ml-0.5">{formatPrice(entry.price).replace("R$", "").trim()}</span>
              {entry.price_unit !== undefined ? (
                <span className="text-muted-foreground ml-0.5 text-[52%] font-bold">
                  /{entry.price_unit}
                </span>
              ) : null}
            </p>
            <span className="sr-only">
              Posição {posicao}: {formatPrice(entry.price)}
              {entry.price_unit === "kg" ? " por quilo" : ""}
            </span>
          </div>
        </div>

        {exemplo ? (
          <p className="bg-surface text-muted-foreground mt-2 w-fit max-w-full rounded-md px-2 py-1 text-xs">
            Exemplo ilustrativo — preço não observado
          </p>
        ) : (
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
        )}

        {entry.special_condition ? (
          <p className="bg-caution/25 text-caution-foreground mt-2 flex w-fit max-w-full items-start gap-1.5 rounded-md px-2 py-1 text-xs">
            <Tag aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>{entry.special_condition}</span>
          </p>
        ) : null}
      </div>

      {exemplo ? null : (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground group-hover:text-primary mt-1 size-5 shrink-0"
        />
      )}
    </div>
  );

  const moldura = `block overflow-hidden rounded-xl border ${
    exemplo
      ? "border-border border-dashed bg-card/60"
      : primeiro
        ? "border-primary/45 shadow-card bg-card"
        : "border-border bg-card"
  }`;

  return (
    <li>
      {exemplo ? (
        <div className={moldura}>{conteudo}</div>
      ) : (
        <Envelope
          className={`group transition-colors hover:bg-surface ${moldura}`}
          productId={productId}
          priceId={entry.id}
        >
          {conteudo}
        </Envelope>
      )}
    </li>
  );
}

/** O link para a ficha da oferta. Existe só para a linha observada. */
function Envelope({
  className,
  productId,
  priceId,
  children,
}: {
  className: string;
  productId: string;
  priceId: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/produto/$productId/oferta/$priceId"
      params={{ productId, priceId }}
      className={className}
    >
      {children}
    </Link>
  );
}
