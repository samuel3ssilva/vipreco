import { isDemoMode } from "@/lib/app-mode";
import { logoDoMercadoDemo } from "@/lib/demo-catalog";
import type { Market } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * V3 — o avatar do mercado: logo quando existe, monograma quando não.
 *
 * =============================================================================
 * IDENTIFICAÇÃO, NUNCA PARCERIA
 * =============================================================================
 *
 * O logo cumpre aqui o papel que cumpre na fachada: reconhecimento imediato. As regras que
 * o mantêm neutro (princípio 4) estão no desenho, não na boa vontade:
 *
 * - **tamanho uniforme** — todo mercado tem o mesmo avatar, na mesma posição;
 * - **sempre ao lado do nome, nunca no lugar dele** — o nome continua sendo a informação;
 * - **nenhuma posição vem do logo** — a ordem da lista continua sendo só o preço;
 * - **o monograma é solução de primeira classe** — o Açougue Mota não forneceu logo, e um
 *   mercado de bairro sem marca gráfica é exatamente o usuário do piloto. A inicial no
 *   mesmo quadro, com o mesmo peso, diz "mercado como os outros", não "mercado sem foto".
 *
 * O `alt` da imagem é vazio e o quadro é `aria-hidden`: o nome do mercado está sempre
 * escrito ao lado, e um leitor de tela não precisa ouvir a mesma loja duas vezes.
 *
 * `posicao` desenha o selo 1/2/3 da comparação sobre o canto do avatar — é o mesmo dado da
 * ordenação, só que morando onde o benchmark de varejo o coloca: junto da identidade da
 * loja, sem gastar uma coluna própria numa linha que disputa cada pixel a 320 px.
 */
export function MarketAvatar({
  market,
  tamanho = "md",
  posicao,
  className,
}: {
  market: Market;
  /** `sm` acompanha o nome em linhas compactas; `md` ancora a linha da comparação. */
  tamanho?: "sm" | "md";
  /** Posição na comparação — desenhada como selo no canto quando presente. */
  posicao?: number;
  className?: string;
}) {
  const logo = isDemoMode() ? logoDoMercadoDemo(market.id) : null;
  const md = tamanho === "md";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-lg border",
        md ? "size-10" : "size-5 rounded-md",
        logo === null ? "border-primary/25 bg-surface" : "border-border bg-white",
        className,
      )}
    >
      {logo === null ? (
        <span
          className={cn(
            "font-display text-primary leading-none font-bold",
            md ? "text-base" : "text-[0.625rem]",
          )}
        >
          {market.name.trim().charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          src={logo}
          alt=""
          width={md ? 40 : 20}
          height={md ? 40 : 20}
          loading="lazy"
          className={cn("size-full object-contain", md ? "p-1" : "p-0.5")}
        />
      )}
      {posicao === undefined ? null : (
        <span
          className={cn(
            "font-display absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full text-[0.6875rem] font-bold",
            posicao === 1
              ? "bg-primary text-primary-foreground"
              : "border-border text-muted-foreground border bg-white",
          )}
        >
          {posicao}
        </span>
      )}
    </span>
  );
}
