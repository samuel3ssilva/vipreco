import { cn } from "@/lib/utils";

/**
 * R3.1 — o placeholder de imagem de produto.
 *
 * =============================================================================
 * POR QUE ESTA PRIMITIVA EXISTE ANTES DE QUALQUER IMAGEM REAL
 * =============================================================================
 *
 * O princípio 11 do contrato visual, e o `IMAGE-POLICY.md` antes dele: **imagem errada é
 * pior que ausência de imagem**. Sem correspondência exata de variante e gramatura, o
 * produto mostra placeholder — nunca aproximação.
 *
 * Se o placeholder for construído depois das imagens, ele nasce como caso de exceção, e
 * caso de exceção é o que se implementa com pressa. Construído primeiro, ele é o estado
 * PADRÃO: a imagem é que precisa se justificar para aparecer.
 *
 * =============================================================================
 * ELE É DECORATIVO, E ISSO É DELIBERADO
 * =============================================================================
 *
 * `aria-hidden` e sem texto alternativo. A identidade do produto — nome, marca, variante,
 * gramatura — está escrita ao lado, em texto de verdade. Um `alt` dizendo "imagem de
 * arroz" seria repetir o que já foi lido e, pior, sugerir que existe uma imagem daquele
 * item quando não existe.
 */

/** As categorias que o catálogo de demonstração usa hoje. */
export type CategoriaDeProduto =
  "Mercearia" | "Laticínios" | "Limpeza" | "Higiene" | "Bebidas" | "Hortifruti";

/**
 * Uma silhueta por categoria, em traço, no grid de 24 px dos ícones.
 *
 * Silhueta genérica de propósito. Um desenho detalhado de uma caixa de arroz específica
 * seria uma imagem aproximada com outro nome — e o que o `IMAGE-POLICY` proíbe é a
 * aproximação, não o formato do arquivo.
 */
const SILHUETA: Record<CategoriaDeProduto, string> = {
  Mercearia: "M4 8h16v12H4z M4 8l2-4h12l2 4",
  Laticínios: "M9 3h6v3l2 4v10H7V10l2-4z",
  Limpeza: "M10 3h4v4h-4z M8 7h8v14H8z",
  Higiene: "M8 3h8v5H8z M9 8h6v13H9z",
  Bebidas: "M9 3h6l-1 5v13h-4V8z",
  Hortifruti: "M12 7c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7z M12 7V3",
};

/** Fallback para categoria que ainda não tem silhueta — uma caixa, e nada mais. */
const GENERICA = "M4 6h16v14H4z";

export function ImagePlaceholder({
  categoria,
  className,
}: {
  categoria?: string;
  className?: string;
}) {
  const traco =
    categoria !== undefined && categoria in SILHUETA
      ? SILHUETA[categoria as CategoriaDeProduto]
      : GENERICA;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-muted text-muted-foreground flex items-center justify-center rounded-md",
        className ?? "aspect-square w-full",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-1/2 w-1/2 opacity-60"
        focusable="false"
      >
        <path d={traco} />
      </svg>
    </div>
  );
}
