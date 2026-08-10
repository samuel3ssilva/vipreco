import { isDemoMode } from "@/lib/app-mode";
import { logoDoMercadoDemo } from "@/lib/demo-catalog";
import type { Market } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * V3/V4 — o avatar do mercado: logo quando existe, monograma quando não.
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
 * - **nenhuma posição vem do logo** — a ordem da lista continua sendo só o preço. A V4 §8
 *   reforçou isso no desenho: o selo 1/2/3 que a V3 punha no canto do avatar SAIU daqui —
 *   ranking não é parte da marca de ninguém, e o número agora mora na própria linha;
 * - **o monograma é solução de primeira classe** — o Açougue Mota não forneceu logo, e um
 *   mercado de bairro sem marca gráfica é exatamente o usuário do piloto. A inicial no
 *   mesmo quadro, com o mesmo peso, diz "mercado como os outros", não "mercado sem foto".
 *
 * O quadro segue o sistema do V4 §7: caixa consistente (44 px no tamanho `md`), fundo
 * branco/neutro, borda discreta, `object-contain` com padding interno — o logo nunca
 * encosta na borda. O `alt` da imagem é vazio e o quadro é `aria-hidden`: o nome do mercado
 * está sempre escrito ao lado, e um leitor de tela não precisa ouvir a mesma loja duas vezes.
 */

/**
 * A letra do monograma — a palavra DISTINTIVA do nome, não o tipo de loja.
 *
 * "Açougue Mota" é o açougue DO MOTA: o monograma é "M". Usar a primeira letra crua daria
 * "A" de "Açougue" — a inicial do formato, igual para qualquer açougue, que é exatamente o
 * que um monograma não pode ser (V4 §7). Nenhuma marca é inventada: é uma letra do próprio
 * nome, tipografada no sistema do produto.
 */
function letraDoMonograma(nome: string): string {
  const GENERICOS = new Set([
    "acougue",
    "açougue",
    "mercado",
    "mercadinho",
    "supermercado",
    "padaria",
    "emporio",
    "empório",
    "atacado",
    "casa",
  ]);
  const palavras = nome.trim().split(/\s+/);
  const distintiva = palavras.find((p) => !GENERICOS.has(p.toLowerCase())) ?? palavras[0] ?? "";
  return distintiva.charAt(0).toUpperCase();
}

export function MarketAvatar({
  market,
  tamanho = "md",
  className,
}: {
  market: Market;
  /** `sm` acompanha o nome em linhas compactas; `md` (44 px) ancora comparação e ficha. */
  tamanho?: "sm" | "md";
  className?: string;
}) {
  const logo = isDemoMode() ? logoDoMercadoDemo(market.id) : null;
  const md = tamanho === "md";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center border",
        md ? "size-11 rounded-xl" : "size-5 rounded-md",
        logo === null ? "border-primary/25 bg-surface" : "border-border bg-white",
        className,
      )}
    >
      {logo === null ? (
        <span
          className={cn(
            "font-display text-primary leading-none font-bold",
            md ? "text-lg" : "text-[0.625rem]",
          )}
        >
          {letraDoMonograma(market.name)}
        </span>
      ) : (
        <img
          src={logo}
          alt=""
          width={md ? 44 : 20}
          height={md ? 44 : 20}
          loading="lazy"
          className={cn("size-full object-contain", md ? "p-1.5" : "p-0.5")}
        />
      )}
    </span>
  );
}
