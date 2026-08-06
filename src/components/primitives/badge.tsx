import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * R3.1 — selo.
 *
 * =============================================================================
 * O SELO NUNCA É O ÚNICO SINAL
 * =============================================================================
 *
 * Toda variante aqui é cor **mais texto**. Nenhuma é só cor.
 *
 * Não é preferência estética. Um selo verde sem palavra nenhuma comunica "está bom" para
 * quem enxerga a cor e não comunica absolutamente nada para quem não enxerga — e "não
 * depender exclusivamente de cor" é WCAG 2.2 SC 1.4.1, não uma sugestão. Por isso
 * `children` é obrigatório: um selo vazio não compila.
 *
 * O amarelo de marca (`--vp-yellow`) **não** tem variante aqui. Ele é reservado a
 * contribuição, e não há contribuição pública nesta fase — abrir uma variante amarela
 * agora seria criar o uso decorativo que o princípio 4 proíbe.
 */

export type TomDeSelo =
  "neutro" | "positivo" | "atencao" | "critico" | "critico-suave" | "informativo";

const TOM: Record<TomDeSelo, string> = {
  neutro: "bg-muted text-muted-foreground border-border",
  positivo: "bg-secondary text-secondary-foreground border-transparent",
  // `caution` é a família âmbar de `--vp-warning` — e não o amarelo de marca.
  atencao: "bg-caution text-caution-foreground border-transparent",
  critico: "bg-destructive text-destructive-foreground border-transparent",
  // O par suave da mesma família — 5.34:1, medido. Existe para o caso em que a mensagem é
  // "isto não vale mais", e não "isto é um alarme": um selo vermelho cheio dentro de um
  // card de produto vira o elemento de maior peso da composição, mais chamativo que o nome
  // e que o preço, e passa a competir com a identidade que ele deveria qualificar.
  "critico-suave": "bg-destructive-surface text-destructive-surface-foreground border-transparent",
  informativo: "bg-info text-info-foreground border-transparent",
};

export function Badge({
  children,
  tom = "neutro",
  className,
}: {
  /** Obrigatório: um selo sem palavra é cor sozinha, e cor sozinha não comunica. */
  children: ReactNode;
  tom?: TomDeSelo;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
        TOM[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}
