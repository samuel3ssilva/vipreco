import type { Product } from "@/types/domain";

/** Formata um valor em reais no padrão brasileiro. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/** Diferença absoluta formatada, sem sinal. */
export function formatPriceDifference(value: number): string {
  return formatPrice(Math.abs(value));
}

/** Nome completo do produto: nome, marca, variante e tamanho. */
export function formatProductName(
  product: Pick<Product, "name" | "brand" | "variant" | "size_text">,
) {
  return [product.name, product.brand, product.variant, product.size_text]
    .filter(Boolean)
    .join(" ");
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

/** Texto relativo simples: "hoje", "ontem", "há 3 dias". */
export function formatRelativeDay(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return months === 1 ? "há 1 mês" : `há ${months} meses`;
}
