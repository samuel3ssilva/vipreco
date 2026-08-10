import { precoParaGramas, rotuloDoPeso } from "@/lib/peso-variavel";
import { formatPrice } from "@/lib/format";
import type { OfertaCardV2 } from "@/lib/card-v2";

/**
 * §12 do mandato de polish — a diferença de preço entre o 1º e o 2º mercado da comparação.
 *
 * A frase só existe quando a conta é indiscutível: MESMO produto (grupo de SKU único; nos
 * grupos de embalagens diferentes 80 g × 40 g não têm "diferença de preço", têm custo
 * unitário — e essa história já é contada pelo selo) e MESMA quantidade (no peso variável a
 * diferença é calculada para a quantidade escolhida no seletor, com a mesma aritmética de
 * centavos de `precoParaGramas`). Nenhuma palavra promocional: "economize", "melhor oferta"
 * e afins não têm contrato — a frase diz o fato e para.
 *
 * Devolve `null` sempre que a frase não seria um fato: menos de dois mercados, grupo de
 * embalagens diferentes, empate.
 */
export function diferencaParaOSegundo(
  entries: readonly OfertaCardV2[],
  opcoes: { embalagensDiferentes: boolean; granel: boolean; gramas: number },
): string | null {
  if (opcoes.embalagensDiferentes) return null;
  const [primeira, segunda] = entries;
  if (primeira === undefined || segunda === undefined) return null;

  if (opcoes.granel) {
    const diferenca =
      precoParaGramas(segunda.price, opcoes.gramas) -
      precoParaGramas(primeira.price, opcoes.gramas);
    // Centavos inteiros: os dois lados já saíram arredondados de precoParaGramas.
    const centavos = Math.round(diferenca * 100);
    if (centavos <= 0) return null;
    // V4 §9/§23 — a forma curta do benchmark: "R$ 1,00 a menos em 500 g". O referente
    // ("que o 2º mercado") é a própria lista, ordenada logo abaixo da frase que explica a
    // ordem; repeti-lo fazia a frase quebrar em duas linhas. NBSP entre número e unidade:
    // "500 g" é UM dado, e a quebra não pode deixar o "g" órfão na linha de baixo.
    return `${formatPrice(centavos / 100)} a menos em ${rotuloDoPeso(opcoes.gramas).replace(" ", " ")}`;
  }

  const centavos = Math.round((segunda.price - primeira.price) * 100);
  if (centavos <= 0) return null;
  return `${formatPrice(centavos / 100)} a menos que o 2º mercado`;
}
