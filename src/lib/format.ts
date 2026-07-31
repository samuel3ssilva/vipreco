import type { Product } from "@/types/domain";

/** Formata um valor em reais no padrão brasileiro. */
export function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Preço partido em símbolo e valor, para o card oficial da North Star: o "R$" é composto num
 * tamanho menor que o número (≈62%), enquanto reais e centavos ficam do mesmo tamanho.
 *
 * A separação é feita aqui, e não no componente, porque é regra de formatação — o componente só
 * decide o tamanho de cada parte. `amount` já vem no padrão brasileiro, com vírgula decimal.
 */
export function formatPriceParts(value: number): { currency: string; amount: string } {
  const formatted = formatPrice(value);
  // `Intl` produz "R$ 26,49" com espaço não separável (U+00A0) entre símbolo e valor.
  const separator = formatted.search(/[\d]/);
  return {
    currency: formatted.slice(0, separator).trim(),
    amount: formatted.slice(separator).trim(),
  };
}

/**
 * Preço por extenso, para leitores de tela.
 *
 * "R$ 26,49" composto em dois tamanhos diferentes é lido de forma imprevisível — de "erre cifrão"
 * a "26 vírgula 49". O card esconde a composição visual da árvore de acessibilidade e oferece
 * esta frase no lugar.
 */
export function spokenPrice(value: number): string {
  const total = Math.round(value * 100);
  const reais = Math.trunc(total / 100);
  const centavos = total % 100;
  const parteReais = `${reais} ${reais === 1 ? "real" : "reais"}`;
  if (centavos === 0) return parteReais;
  return `${parteReais} e ${centavos} ${centavos === 1 ? "centavo" : "centavos"}`;
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
