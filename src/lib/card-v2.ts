/**
 * R3.2 — o que o Card v2 **pode** mostrar de uma oferta observada.
 *
 * =============================================================================
 * POR QUE ISTO É UMA FUNÇÃO PURA, E NÃO UM COMPONENTE
 * =============================================================================
 *
 * Quase toda regra do `CARD-V2-SPEC.md` é uma decisão sobre **exibir ou não exibir**:
 * preço unitário só com quantidade aprovada, percentual só com a data ao lado, imagem só
 * com correspondência exata, rótulo de estado só quando o estado não é o normal.
 *
 * Decisão dessas escrita dentro do JSX vira um `&&` no meio de uma árvore de elementos —
 * e um `&&` no meio de JSX é a coisa mais fácil de mudar por engano de todo o React. Aqui
 * elas ficam num só lugar, sem DOM, e o teste as interroga diretamente: dado este dado,
 * o que aparece?
 *
 * O componente que consome isto não decide nada. Ele desenha o que esta função permitiu.
 *
 * =============================================================================
 * O QUE ESTE MÓDULO NÃO FAZ
 * =============================================================================
 *
 * - **não normaliza texto.** `pa_normalize_text()` e `normalize.ts` são o contrato único
 *   de busca; duplicar normalização aqui criaria uma segunda verdade sobre o mesmo dado;
 * - **não infere quantidade a partir do nome.** `size-text.ts` existe para curadoria
 *   assistida de backfill, com revisão humana, e o `MVP-DATA-CONTRACT.md` §2 proíbe
 *   explicitamente inferência em tempo de apresentação;
 * - **não persiste preço unitário.** Ele é calculado a cada leitura, por `computeUnitPrice`;
 * - **não mistura produto similar com produto exato.** Este módulo enxerga UMA oferta de
 *   UM `product_id`; a separação entre exato, outro tamanho e similar é de `equivalence.ts`
 *   e da tela de busca, não do card;
 * - **não ordena nada.** A ordem da lista orgânica é de `comparison.ts`, por preço →
 *   observação → id, e nada aqui influencia posição.
 */
import { computeUnitPrice } from "@/lib/unit-price";
import type { UnitPriceBasis } from "@/lib/unit-price";
import { formatPriceParts, formatRelativeDay, spokenPrice } from "@/lib/format";
import { sourceLabel, SOURCE_LABELS } from "@/lib/sources";
import type { EvidenceLevel } from "@/lib/sources";
import { temporalState } from "@/lib/temporal";
import type { TemporalState } from "@/lib/temporal";
import type { QuantityProvenance } from "@/lib/size-text";
import type { Opportunity, QuantityUnit } from "@/types/domain";

// ---------------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------------

/**
 * Os quatro estados de oferta que chegam a uma superfície pública.
 *
 * `OFFER-STATES.md` §2 define seis. `corrected` e `removed` **nunca** saem do banco para o
 * público (§3), então o card não tem como representá-los — e não deve ter: um tipo que
 * admite um estado impossível é um convite a alguém tratá-lo como possível.
 *
 * Nenhuma coluna `offer_state` existe hoje. O campo é opcional na entrada e o ausente vale
 * `active`, que é como o produto se comporta desde a Parte 2.
 */
export type OfferState = "active" | "expired" | "ended" | "sold_out";

/** O que a revisão de imagem decidiu. `IMAGE-POLICY.md` — nada além de `approved` publica. */
export type ImageReviewStatus = "approved" | "pending" | "rejected";

/** Correspondência entre a foto e o SKU. Nada além de `exact` publica. */
export type ImageVariantMatch = "exact" | "approximate" | "unknown";

export interface ImagemDeProduto {
  src: string;
  /** Curto e factual. Não repete o card inteiro — o nome já está em texto ao lado. */
  alt: string;
  review_status: ImageReviewStatus;
  variant_match: ImageVariantMatch;
}

/**
 * Uma oferta observada, como o card a recebe.
 *
 * Estende `Opportunity` — o mesmo tipo que a Home e a comparação já usam — em vez de
 * declarar uma forma paralela. Uma segunda forma para o mesmo conceito é o começo de dois
 * contratos para o mesmo dado.
 *
 * Todo campo acrescentado é **opcional**, e isso não é conveniência: o backfill de
 * quantidade (MVP-E1-08) continua proibido, `offer_state` e `price_events` são R8, e a
 * política de imagem é R6. Exigir qualquer um deles faria o card só funcionar num banco
 * que ainda não existe.
 */
export interface OfertaCardV2 extends Opportunity {
  /** Observação anterior real do MESMO produto no MESMO mercado. Nunca média, nunca tabela. */
  previous_price?: number | null;
  /** A data daquela observação. Sem ela o percentual não é exibido — número sem procedência. */
  previous_observed_at?: string | null;
  offer_state?: OfferState;
  /**
   * De onde veio a quantidade estruturada.
   *
   * O padrão é `missing`, e o padrão é o lado seguro: ausência de procedência não é
   * aprovação. Um produto com `quantity_value` preenchido e procedência não declarada não
   * libera preço unitário — libera a pergunta "quem aprovou isto?".
   */
  quantity_provenance?: QuantityProvenance;
  image?: ImagemDeProduto | null;
  /** Quantos mercados têm preço válido para este SKU. Alimenta o rótulo do CTA. */
  markets_with_valid_price?: number | null;
}

// ---------------------------------------------------------------------------------
// Saída
// ---------------------------------------------------------------------------------

export interface IdentidadeExibida {
  nome: string;
  marca: string | null;
  variante: string | null;
  /** Quantidade estruturada quando existe; senão o `size_text` como está escrito. */
  quantidade: string | null;
  /** `true` quando a quantidade veio de campo estruturado, e não de texto livre. */
  quantidadeEstruturada: boolean;
  /** Embalagem, quando faz parte da identidade. */
  embalagem: string | null;
}

export interface PrecoExibido {
  valor: number;
  /** `R$` e `26,49` separados — o card compõe os dois em tamanhos diferentes. */
  simbolo: string;
  numero: string;
  /** O que o leitor de tela ouve no lugar da composição visual. */
  falado: string;
}

export interface PrecoAnteriorExibido {
  valor: number;
  observadoEm: string;
  /** Inteiro com sinal. Negativo é queda. */
  variacaoPercentual: number;
  /** "12% mais barato que em 28/07" — rótulo textual, nunca só a cor e a seta. */
  rotulo: string;
}

export interface UnitarioExibido {
  display: number;
  basis: UnitPriceBasis;
  /** "por kg", "por L", "por unidade". */
  rotulo: string;
}

/** O estado quando ele **não** é o normal. `active` não produz rótulo nenhum. */
export interface EstadoExibido {
  chave: OfferState | "desatualizada";
  rotulo: string;
  /** Frase curta que explica o rótulo sem criar urgência. */
  explicacao: string;
}

export interface ProcedenciaExibida {
  origem: string;
  nivel: EvidenceLevel;
  observadoEm: string;
  /** "hoje", "ontem", "há 3 dias". */
  relativo: string;
  /** `null` quando o mercado não informou validade. A ausência é dita, nunca inventada. */
  validoAte: string | null;
}

export interface CtaExibido {
  rotulo: string;
  /** Quantos mercados o rótulo declara, quando a contagem é conhecida. */
  mercados: number | null;
}

export interface VisaoDoCard {
  identidade: IdentidadeExibida;
  mercado: { nome: string; bairro: string | null };
  preco: PrecoExibido;
  precoAnterior: PrecoAnteriorExibido | null;
  unitario: UnitarioExibido | null;
  procedencia: ProcedenciaExibida;
  /** Condição da promoção, como o mercado a informou. Nunca separada do preço. */
  condicao: string | null;
  temporal: TemporalState;
  /** `null` quando a oferta está ativa — o estado normal não precisa de rótulo. */
  estado: EstadoExibido | null;
  /** Só oferta ativa participa da lista orgânica (`OFFER-STATES.md` §2). */
  naListaOrganica: boolean;
  /** `null` quando não há imagem com correspondência exata aprovada. */
  imagem: ImagemDeProduto | null;
  cta: CtaExibido;
}

// ---------------------------------------------------------------------------------
// Regras
// ---------------------------------------------------------------------------------

/** Como cada unidade declarada é escrita para o leitor. `l` maiúsculo, o resto minúsculo. */
const UNIDADE_ESCRITA: Record<QuantityUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "L",
  un: "un",
};

const ROTULO_DA_BASE: Record<UnitPriceBasis, string> = {
  per_kg: "por kg",
  per_l: "por L",
  per_un: "por unidade",
};

const ESTADO_ESCRITO: Record<OfferState | "desatualizada", { rotulo: string; explicacao: string }> =
  {
    active: { rotulo: "", explicacao: "" },
    expired: {
      rotulo: "Oferta expirada",
      explicacao: "A validade informada pelo mercado já passou.",
    },
    ended: {
      rotulo: "Oferta encerrada",
      explicacao: "O mercado avisou que a oferta terminou.",
    },
    sold_out: {
      rotulo: "Produto esgotado",
      explicacao: "O produto foi dado como esgotado neste mercado.",
    },
    desatualizada: {
      rotulo: "Preço desatualizado",
      explicacao: "A última observação tem mais de uma semana e não há validade informada.",
    },
  };

/** Abaixo disto o percentual não é exibido: ruído de arredondamento não é notícia. */
const VARIACAO_MINIMA = 1;

/**
 * Quantidade em texto.
 *
 * Estruturada quando os campos existem; senão o `size_text` **como está escrito**. A
 * segunda metade importa tanto quanto a primeira: a variante E do laboratório existe
 * justamente para o caso em que não há quantidade confiável, e apagar o texto livre ali
 * tiraria do leitor a única pista de gramatura que o card tinha.
 */
function escreverQuantidade(oferta: OfertaCardV2): {
  texto: string | null;
  estruturada: boolean;
} {
  const { quantity_value, quantity_unit, units_per_package, size_text } = oferta.product;

  if (
    typeof quantity_value === "number" &&
    Number.isFinite(quantity_value) &&
    quantity_value > 0 &&
    quantity_unit != null
  ) {
    const numero = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
      quantity_value,
    );
    const base = `${numero} ${UNIDADE_ESCRITA[quantity_unit]}`;
    const itens =
      typeof units_per_package === "number" && Number.isInteger(units_per_package)
        ? units_per_package
        : null;
    return {
      texto: itens !== null && itens > 1 ? `${base} · ${itens} unidades` : base,
      estruturada: true,
    };
  }

  const livre = size_text?.trim();
  return { texto: livre !== undefined && livre.length > 0 ? livre : null, estruturada: false };
}

/**
 * Preço unitário — ou nada.
 *
 * `computeUnitPrice` já devolve `ambiguous` e `unavailable` com o motivo. Aqui os dois
 * viram a MESMA coisa: ausência. O card não escreve traço, não escreve zero, não escreve
 * "indisponível" — some, porque "—" comunica ausência de dado como se fosse dado, e quem
 * lê entende "grátis", "zero" ou "erro".
 */
function calcularUnitario(oferta: OfertaCardV2): UnitarioExibido | null {
  const { quantity_value, quantity_unit, units_per_package, package_type } = oferta.product;

  const quantidade =
    typeof quantity_value === "number" && quantity_unit != null
      ? { value: quantity_value, unit: quantity_unit }
      : null;

  const resultado = computeUnitPrice({
    price: oferta.price,
    quantity: quantidade,
    provenance: oferta.quantity_provenance ?? "missing",
    unitsPerPackage: units_per_package ?? null,
    packageType: package_type ?? null,
  });

  if (resultado.status !== "ok") return null;
  return {
    display: resultado.display,
    basis: resultado.basis,
    rotulo: ROTULO_DA_BASE[resultado.basis],
  };
}

/**
 * Preço anterior e variação — ou nada.
 *
 * Três guardas, e cada uma nasceu de uma regra escrita: o valor precisa existir, a DATA
 * precisa existir (`OFFER-STATES.md` §5 — percentual sem data é número sem procedência), e
 * a variação precisa ter módulo de pelo menos 1%.
 *
 * O rótulo é textual de propósito. "−12%" em vermelho é a mesma informação para quem
 * enxerga a cor e informação nenhuma para quem não enxerga (WCAG 2.2 SC 1.4.1).
 */
function calcularAnterior(
  oferta: OfertaCardV2,
  formatarData: (v: string) => string,
): PrecoAnteriorExibido | null {
  const anterior = oferta.previous_price;
  const quando = oferta.previous_observed_at;

  if (typeof anterior !== "number" || !Number.isFinite(anterior) || anterior <= 0) return null;
  if (typeof quando !== "string" || quando.length === 0) return null;

  const variacao = ((oferta.price - anterior) / anterior) * 100;

  // A COMPARAÇÃO É FEITA SOBRE O VALOR ESTABILIZADO, e não sobre o resultado cru.
  //
  // `(10,10 − 10,00) ÷ 10,00 × 100` é exatamente 1 em aritmética decimal e
  // `0.9999999999999787` em binário. Comparando o número cru, uma queda de 1% redonda —
  // o próprio limiar que a regra descreve — desaparecia da tela. O teste pegou; a conta
  // não estava errada, o limiar é que estava sendo aplicado a um valor que carrega o
  // resíduo da representação.
  //
  // Seis casas são muito além de qualquer variação que alguém observe e muito aquém do
  // resíduo binário, então o corte volta a significar o que está escrito: **abaixo de 1%
  // não é notícia; 1% é.**
  const estavel = Number(variacao.toFixed(6));
  if (Math.abs(estavel) < VARIACAO_MINIMA) return null;

  const inteiro = Math.round(estavel);
  const data = formatarData(quando);
  const rotulo =
    inteiro < 0
      ? `${Math.abs(inteiro)}% mais barato que em ${data}`
      : `${inteiro}% mais caro que em ${data}`;

  return { valor: anterior, observadoEm: data, variacaoPercentual: inteiro, rotulo };
}

/**
 * A imagem só passa por duas portas ao mesmo tempo.
 *
 * `IMAGE-POLICY.md` e o princípio 11: imagem errada é pior que ausência de imagem. Revisão
 * aprovada **e** correspondência exata de variante e gramatura. Qualquer outra combinação
 * — inclusive "aprovada, mas aproximada" — devolve `null`, e o card desenha o placeholder.
 */
function resolverImagem(oferta: OfertaCardV2): ImagemDeProduto | null {
  const img = oferta.image;
  if (img == null) return null;
  if (img.src.trim().length === 0) return null;
  if (img.review_status !== "approved") return null;
  if (img.variant_match !== "exact") return null;
  return img;
}

/**
 * O estado da oferta, quando ele não é o normal.
 *
 * `offer_state` explícito manda. Quando ele é `active` — ou não veio —, o relógio ainda
 * pode ter algo a dizer: uma validade que já passou é `expired` por definição
 * (`OFFER-STATES.md` §2, "quem muda: relógio"), e uma observação antiga sem validade
 * nenhuma não é expirada coisa nenhuma, é desatualizada. São coisas diferentes e o texto
 * precisa distingui-las: dizer "expirada" onde nunca houve validade é inventar uma
 * validade para poder dizer que ela venceu.
 */
function resolverEstado(oferta: OfertaCardV2, temporal: TemporalState): EstadoExibido | null {
  const declarado = oferta.offer_state ?? "active";

  if (declarado !== "active") {
    return { chave: declarado, ...ESTADO_ESCRITO[declarado] };
  }
  if (temporal === "expirado") {
    return { chave: "expired", ...ESTADO_ESCRITO.expired };
  }
  if (temporal === "sem-validade-antigo") {
    return { chave: "desatualizada", ...ESTADO_ESCRITO.desatualizada };
  }
  return null;
}

/**
 * O rótulo do CTA.
 *
 * Com contagem conhecida e mais de um mercado, ele diz quantos. Com um mercado só, dizer
 * "comparar em 1 mercado" seria prometer uma comparação que não existe. Sem contagem, o
 * card cai no texto que o produto já usa hoje — e não inventa um número.
 *
 * Oferta fora da lista orgânica troca o verbo: o que interessa a quem vê um preço vencido
 * é o preço de agora, não a oferta que acabou.
 */
function resolverCta(oferta: OfertaCardV2, ativa: boolean): CtaExibido {
  const bruto = oferta.markets_with_valid_price;
  const mercados = typeof bruto === "number" && Number.isInteger(bruto) && bruto > 0 ? bruto : null;

  if (!ativa) {
    return { rotulo: "Ver preços atuais por mercado", mercados };
  }
  if (mercados !== null && mercados > 1) {
    return { rotulo: `Comparar em ${mercados} mercados`, mercados };
  }
  return { rotulo: "Ver preços por mercado", mercados };
}

/**
 * Monta a visão do card a partir de uma oferta observada.
 *
 * `formatarData` entra por parâmetro porque a formatação de data do produto fixa o fuso do
 * piloto (`format.ts`) — e um módulo de regra que importa formatação de apresentação
 * começa a decidir apresentação. Aqui ele recebe a função e usa; o componente passa a do
 * produto, o teste passa a que quiser.
 */
export function montarVisaoDoCard(
  oferta: OfertaCardV2,
  now: Date,
  formatarData: (valor: string) => string,
): VisaoDoCard {
  const temporal = temporalState(oferta, now);
  const estado = resolverEstado(oferta, temporal);
  const quantidade = escreverQuantidade(oferta);
  const { currency, amount } = formatPriceParts(oferta.price);

  return {
    identidade: {
      nome: oferta.product.name,
      marca: oferta.product.brand,
      variante: oferta.product.variant,
      quantidade: quantidade.texto,
      quantidadeEstruturada: quantidade.estruturada,
      embalagem: oferta.product.package_type ?? null,
    },
    mercado: { nome: oferta.market.name, bairro: oferta.market.neighborhood },
    preco: {
      valor: oferta.price,
      simbolo: currency,
      numero: amount,
      falado: spokenPrice(oferta.price),
    },
    precoAnterior: calcularAnterior(oferta, formatarData),
    unitario: calcularUnitario(oferta),
    procedencia: {
      origem: sourceLabel(oferta.source_type),
      nivel: SOURCE_LABELS[oferta.source_type].level,
      observadoEm: formatarData(oferta.observed_at),
      relativo: formatRelativeDay(oferta.observed_at, now),
      validoAte: oferta.valid_until === null ? null : formatarData(oferta.valid_until),
    },
    condicao: oferta.special_condition,
    temporal,
    estado,
    naListaOrganica: estado === null,
    imagem: resolverImagem(oferta),
    cta: resolverCta(oferta, estado === null),
  };
}
