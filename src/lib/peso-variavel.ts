/**
 * Peso variável — o preço que o consumidor paga por uma quantidade escolhida.
 *
 * =============================================================================
 * POR QUE ESTE MÓDULO EXISTE (mandato Comparable Products Demo v2, §0 e §3)
 * =============================================================================
 *
 * Carne, frango e cebola não têm embalagem: a placa do balcão diz `R$ 24,99/kg`, e ninguém
 * leva "um R$/kg" para casa. A pergunta que a interface precisa responder em menos de três
 * segundos é **"quanto eu pago?"** — e para um produto de peso variável a única resposta
 * honesta é "depende de quanto você leva", com uma quantidade de referência escolhida.
 *
 * Por isso o preço principal dessas ofertas é o preço CALCULADO para a quantidade escolhida
 * (250 g, 500 g ou 1 kg, padrão 500 g), sempre rotulado "aprox." — porque peça fatiada na
 * hora nunca pesa exatamente o que se pediu —, e o R$/kg observado fica logo abaixo, intacto,
 * como preço secundário de comparação. A hierarquia nunca se inverte (§25).
 *
 * =============================================================================
 * A CONTA É EM CENTAVOS INTEIROS, E ISSO NÃO É PRECIOSISMO
 * =============================================================================
 *
 * `39.9 * 100` em ponto flutuante é `3989.9999…`; multiplicado por `0.25` e arredondado
 * direto, produziria R$ 9,97 onde a conta de padaria dá R$ 9,98. Converter o R$/kg para
 * centavos inteiros ANTES de escalar elimina a classe inteira de erro: o mesmo produto
 * nunca mostra dois totais diferentes para a mesma quantidade.
 */

/** As três quantidades do seletor, em gramas. */
export const PESOS_DO_SELETOR = [250, 500, 1000] as const;

export type PesoSelecionado = (typeof PESOS_DO_SELETOR)[number];

/** A quantidade de referência quando ninguém escolheu nada (§3: "Padrão: 500 g"). */
export const PESO_PADRAO: PesoSelecionado = 500;

/**
 * Quanto custa `gramas` de um produto vendido a `precoPorKg` reais o quilo.
 *
 * Arredondamento monetário comercial, em centavos: 24,99 × 0,5 = 12,495 → **12,50**.
 * É a conta da balança do açougue, e o mandato §3 traz os casos de prova:
 * 7,99 → R$ 4,00 · 9,99 → R$ 5,00 · 24,99 → R$ 12,50 · 25,99 → R$ 13,00 (500 g).
 */
export function precoParaGramas(precoPorKg: number, gramas: number): number {
  const centavosPorKg = Math.round(precoPorKg * 100);
  return Math.round((centavosPorKg * gramas) / 1000) / 100;
}

/** "250 g", "500 g", "1 kg" — como o seletor e o rótulo do preço escrevem. */
export function rotuloDoPeso(gramas: number): string {
  return gramas >= 1000 ? `${gramas / 1000} kg` : `${gramas} g`;
}

/**
 * O rótulo que acompanha o preço calculado: "aprox. 500 g".
 *
 * O "aprox." é obrigatório e não decorativo: o preço mostrado NÃO foi observado — o que foi
 * observado é o R$/kg. Afirmar "500 g = R$ 12,50" sem a ressalva transformaria uma conta de
 * referência numa promessa de balança.
 */
export function rotuloAproximado(gramas: number): string {
  return `aprox. ${rotuloDoPeso(gramas)}`;
}

/** Como o leitor de tela ouve a quantidade: "por aproximadamente 500 gramas". */
export function faladoAproximado(gramas: number): string {
  return gramas >= 1000
    ? `por aproximadamente ${gramas / 1000} quilo${gramas > 1000 ? "s" : ""}`
    : `por aproximadamente ${gramas} gramas`;
}
