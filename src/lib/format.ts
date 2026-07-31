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

/**
 * Data no fuso do piloto (Artemis/Piracicaba-SP), não no fuso do dispositivo.
 *
 * O fuso é fixado de propósito: as datas passaram a ser renderizadas no servidor (Worker, em
 * UTC) e reidratadas no navegador (normalmente em America/Sao_Paulo). Sem fixar, o mesmo
 * instante vira dois dias diferentes nos dois lados sempre que a hora UTC for menor que 3h —
 * divergência de hidratação e, para o visitante, uma data que não é a do mercado.
 */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
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
