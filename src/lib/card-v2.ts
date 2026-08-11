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
 *   observação → id, e nada aqui influencia posição;
 * - **não exibe histórico de preço.** Preço anterior e variação percentual saíram em
 *   06/08/2026 (DL-030). A regra existia, estava testada e batia com `OFFER-STATES.md` §5;
 *   o que faltava era contrato: **P-01** — qual observação anterior conta — nunca foi
 *   decidida, e sem ela dois cards com o mesmo dado exibem percentuais diferentes e os
 *   dois estão "certos". Volta em R6/R8, contra o contrato que P-01 produzir.
 */
import { computeUnitPrice } from "@/lib/unit-price";
import type { UnitPriceBasis } from "@/lib/unit-price";
import { PESO_PADRAO, faladoAproximado, precoParaGramas, rotuloDoPeso } from "@/lib/peso-variavel";
import { formatPrice, formatPriceParts, formatRelativeDay, spokenPrice } from "@/lib/format";
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
  /**
   * Ilustração genérica de categoria, desenhada para a demonstração — **nunca** a embalagem
   * real de ninguém.
   *
   * R3.3B §5 autorizou criar estes assets para que a Home pareça um produto de consumo em vez
   * de um painel técnico, e no mesmo parágrafo proibiu o que os tornaria perigosos: "não tratar
   * imagem ilustrativa como correspondência real de SKU". Esta bandeira é essa proibição virando
   * dado, e não prosa: o teste de fixtures ilustrativas reprova qualquer oferta que a carregue
   * sem `is_demo`, o que fecha o caminho pelo qual uma ilustração chegaria a um preço de piloto.
   * (O nome do arquivo de teste não é citado de propósito — este módulo é varrido por uma
   * regressão que proíbe qualquer menção ao fixture de demonstração dentro do domínio.)
   *
   * Ela **não** afrouxa o portão de `resolverImagem`: revisão aprovada e correspondência exata
   * continuam sendo as duas condições, e para um produto fictício quem as satisfaz é a
   * ilustração feita para ele. O que a bandeira acrescenta é a distinção que o `IMAGE-POLICY.md`
   * vai precisar quando existir foto de verdade: exata é diferente de ilustrativa, mesmo quando
   * as duas passam pelo mesmo portão.
   */
  ilustrativa?: boolean;
  /**
   * Como o arquivo foi feito, porque disso depende como ele é desenhado.
   *
   * - `recorte` (padrão) — arte com fundo transparente, tipicamente SVG. Cabe DENTRO da moldura,
   *   com respiro, sobre a superfície do card;
   * - `foto` — imagem retangular com fundo próprio. Preenche a moldura inteira.
   *
   * É campo declarado e não dedução por extensão de arquivo. Um `.png` pode ser qualquer um dos
   * dois, e adivinhar erraria em silêncio: recorte esticado até preencher fica cortado nas
   * bordas, e foto encolhida para caber deixa duas faixas vazias de cada lado.
   */
  formato?: "recorte" | "foto";
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
/**
 * A unidade em que o preço é cobrado, quando ela não é "a embalagem".
 *
 * Carne é vendida a quilo, e a placa do balcão escreve isso junto do número: `R$ 20,99 KG`.
 * Um card que mostrasse só `R$ 20,99` estaria afirmando outra coisa — o preço de uma peça —,
 * e é o tipo de erro que quem compra carne percebe na hora.
 *
 * É **campo declarado**, nunca inferido. Nada aqui olha para o nome do produto e conclui
 * "isto é carne, então é por quilo": inferência em tempo de apresentação é o que o
 * `MVP-DATA-CONTRACT.md` §2 proíbe, e com razão — ela erra em silêncio.
 *
 * Não confundir com preço unitário (`UnitarioExibido`). Aquele é CALCULADO a partir de
 * quantidade estruturada, para comparar embalagens de tamanhos diferentes. Este é a unidade
 * em que o preço já foi observado.
 */
export type PriceUnit = "kg" | "L" | "un";

export interface OfertaCardV2 extends Opportunity {
  offer_state?: OfferState;
  /** `"kg"` quando o preço observado é por quilo. Ausente = preço da embalagem. */
  price_unit?: PriceUnit;
  /**
   * Preço condicionado a cartão, clube, app ou compra casada — **sempre ao lado do preço
   * cheio, nunca no lugar dele** (mandato v2 §8).
   *
   * O preço cheio é o que qualquer pessoa paga sem condição nenhuma; é ele que ordena a
   * lista (`CLAUDE.md` princípio 4: a ordem é pelo preço de prateleira, nunca pelo preço
   * efetivo). O de clube aparece como informação adicional, com a condição colada nele —
   * uma promoção cujo requisito não está escrito é uma promessa que o produto não faz.
   */
  clube?: { preco: number; condicao: string };
  /**
   * A unidade de VENDA que o mercado anunciou junto do número, quando o preço não é o da
   * embalagem comprável isolada — "lata" no "R$ 3,79 por lata, venda só no pack de 12" do
   * Safra (V4.2 §4). Vira o sufixo colado no número grande ("R$ 3,79/lata"): sem ele, o
   * preço afirmaria um desembolso avulso que o encarte não oferece. Campo declarado,
   * nunca inferido do texto da condição — inferência em apresentação erra em silêncio.
   */
  unidade_de_venda?: string;
  /**
   * Tamanho do pack OBRIGATÓRIO quando o preço observado é por `unidade_de_venda` mas a
   * compra mínima é o pack inteiro — o "(venda somente no pack)" do encarte do Safra
   * (V4.3 §1). Com ele declarado, o número grande passa a ser o DESEMBOLSO MÍNIMO REAL
   * (preço × pack, arredondado ao centavo): "R$ 3,79" como protagonista afirmaria uma
   * compra de R$ 3,79 que o mercado não vende. O por-unidade anunciado continua na tela,
   * secundário. Campo declarado, nunca inferido do texto da condição; sem
   * `unidade_de_venda` ele é ignorado — um pack de quê?
   */
  pack_obrigatorio?: number;
  /**
   * Como a fonte é dita ao usuário quando o rótulo genérico do enum não descreve a coleta:
   * "Foto em loja", "Painel da loja", "Encarte da loja" (§15 — nome técnico de arquivo
   * nunca vira copy). Ausente, vale `sourceLabel(source_type)`. O `source_type` continua
   * sendo o enum do domínio; isto é apresentação, não classificação.
   */
  fonte_rotulo?: string;
  /**
   * Esta oferta **não foi observada**: existe para mostrar como a comparação vai funcionar.
   *
   * A demonstração do açougue tem duas naturezas de linha na mesma lista — preço que eu fui
   * ver, e preço de exemplo. Sem esta distinção no DADO, a única coisa que separaria as duas
   * seria a lembrança de quem montou a tela, e a lista inteira passaria a afirmar observação
   * onde não houve nenhuma.
   *
   * Quem a carrega perde a procedência na tela: não se atribui fonte a um número inventado.
   */
  exemplo_ilustrativo?: boolean;
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
  /**
   * O núcleo da gramatura — "500 g", "2,1 L". É o que distingue dois SKUs que de resto são
   * o mesmo produto, e é o único pedaço da linha que recebe peso tipográfico.
   *
   * Quando não há quantidade estruturada, aqui vem o `size_text` **como está escrito** —
   * e aí `quantidadeEstruturada` é `false`, que é o sinal para o componente não dar a esse
   * texto o peso de um dado conferido.
   */
  quantidade: string | null;
  /** "6 unidades" e afins: acompanha a gramatura sem competir com ela. */
  complemento: string | null;
  /** `true` quando a quantidade veio de campo estruturado, e não de texto livre. */
  quantidadeEstruturada: boolean;
  /** Embalagem, quando ela acrescenta alguma coisa que a variante já não disse. */
  embalagem: string | null;
}

export interface PrecoExibido {
  valor: number;
  /** `R$` e `26,49` separados — o card compõe os dois em tamanhos diferentes. */
  simbolo: string;
  numero: string;
  /**
   * A unidade a que o número grande se refere, quando ela não é "a embalagem": `"/kg"`
   * num produto de peso variável — colada no número, porque `R$ 7,99` sem o `/kg` afirmaria
   * o preço de uma peça (V4 §4). `null` quando o preço é o da embalagem (a gramatura já
   * está na identidade).
   */
  quantidade: string | null;
  /**
   * "pack 12" — a embalagem mínima a que o número grande se refere, quando a venda só
   * existe em pack obrigatório declarado (V4.3 §1). Desenhada colada abaixo do número,
   * porque "R$ 45,48" sem o pack afirmaria o preço de uma lata. `null` fora do pack.
   */
  embalagemMinima: string | null;
  /**
   * "R$ 3,79/lata" — o por-unidade anunciado pelo mercado, SECUNDÁRIO quando o pack é
   * obrigatório: é informação real do encarte, mas não é um desembolso possível. `null`
   * fora do pack obrigatório.
   */
  porUnidade: string | null;
  /** O que o leitor de tela ouve no lugar da composição visual. */
  falado: string;
}

/** O preço de clube/cartão como a tela pode mostrá-lo: número e condição, inseparáveis. */
export interface ClubeExibido {
  precoTexto: string;
  condicao: string;
  falado: string;
}

export interface UnitarioExibido {
  display: number;
  basis: UnitPriceBasis;
  /** "por kg", "por L", "por unidade". */
  rotulo: string;
}

/**
 * O estado quando ele **não** é o normal. `active` não produz rótulo nenhum.
 *
 * Só o rótulo. A frase explicativa que existia aqui — "A validade informada pelo mercado já
 * passou." — foi removida em 06/08/2026: ela convivia, três linhas abaixo, com a data que
 * a provava ("válido até 03/08/2026"), e dizer duas vezes a mesma coisa dentro de um card
 * que precisa caber numa lista é gastar altura para repetir.
 */
export interface EstadoExibido {
  chave: OfferState | "desatualizada";
  rotulo: string;
}

export interface ProcedenciaExibida {
  origem: string;
  nivel: EvidenceLevel;
  observadoEm: string;
  /** "hoje", "ontem", "há 3 dias". */
  relativo: string;
  /** `null` quando o mercado não informou validade. A ausência é dita, nunca inventada. */
  validoAte: string | null;
  /**
   * `true` quando a validade informada já passou. O componente troca o verbo — "valeu até"
   * em vez de "válido até" — porque afirmar vigência depois do vencimento é a mentira que o
   * §18 do mandato de polish proíbe. A data continua a mesma; só o tempo verbal diz a verdade.
   */
  validadePassada: boolean;
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
  /**
   * A SIMULAÇÃO de quantidade do peso variável — "500 g ≈ R$ 4,00" —, sempre secundária
   * (V4 §4). O "≈" é a ressalva: o valor não foi observado, foi calculado do R$/kg pela
   * mesma `precoParaGramas` de sempre, e a balança define o final. `null` fora do peso
   * variável. O leitor de tela já ouve o cálculo dentro de `preco.falado`.
   */
  simulacao: string | null;
  unitario: UnitarioExibido | null;
  /** Preço de clube/cartão, quando o mercado anunciou um. Nunca substitui `preco`. */
  clube: ClubeExibido | null;
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
  /**
   * `true` quando a linha é exemplo, e não observação.
   *
   * Quem lê isto tem uma obrigação: **não desenhar procedência**. `procedencia` continua
   * preenchida porque `source_type` é obrigatório no domínio, mas ela não descreve nada real
   * numa linha de exemplo — exibi-la seria carimbar "foto da etiqueta" num preço que ninguém
   * fotografou.
   */
  exemploIlustrativo: boolean;
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

/** Como o leitor de tela ouve a unidade do preço. "kg" soletrado é ruído. */
const UNIDADE_FALADA: Record<PriceUnit, string> = {
  kg: "por quilo",
  L: "por litro",
  un: "por unidade",
};

const BASE_POR_UNIDADE_DE_PRECO: Record<PriceUnit, UnitPriceBasis> = {
  kg: "per_kg",
  L: "per_l",
  un: "per_un",
};

const ROTULO_DA_BASE: Record<UnitPriceBasis, string> = {
  per_kg: "por kg",
  per_l: "por L",
  per_un: "por unidade",
};

const ESTADO_ESCRITO: Record<OfferState | "desatualizada", string> = {
  active: "",
  expired: "Oferta expirada",
  ended: "Oferta encerrada",
  sold_out: "Produto esgotado",
  desatualizada: "Preço desatualizado",
};

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
  complemento: string | null;
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
    const itens =
      typeof units_per_package === "number" && Number.isInteger(units_per_package)
        ? units_per_package
        : null;
    return {
      // A GRAMATURA E O QUE A ACOMPANHA SÃO CAMPOS SEPARADOS, e não uma string só.
      //
      // Quando eram uma só, "2.100 ml · 6 unidades" herdava inteiro o peso reservado à
      // gramatura, quebrava em duas linhas a 320 px e pesava mais que o próprio título do
      // produto. O que precisa saltar é "2.100 ml"; "6 unidades" é contexto.
      texto: `${numero} ${UNIDADE_ESCRITA[quantity_unit]}`,
      complemento: itens !== null && itens > 1 ? `${itens} unidades` : null,
      estruturada: true,
    };
  }

  const livre = size_text?.trim();
  return {
    texto: livre !== undefined && livre.length > 0 ? livre : null,
    complemento: null,
    estruturada: false,
  };
}

/**
 * Embalagem — quando ela acrescenta alguma coisa.
 *
 * `package_type` chega cru do banco (`sache`, `vidro`, `pack`). Duas coisas o tornavam
 * ruído em vez de identidade: ele aparecia sem acento nem maiúscula, ao lado da gramatura,
 * parecendo defeito de dado; e repetia a variante quando as duas dizem o mesmo — "Marca
 * Exemplo · Sachê" seguido de "250 g · sache".
 *
 * A comparação ignora caixa e acento, e **não** usa `normalize.ts`: aquele módulo é o
 * contrato único de BUSCA, casado com `pa_normalize_text()` no banco. Reaproveitá-lo aqui
 * amarraria uma decisão de apresentação a um contrato de consulta, e qualquer ajuste de um
 * viraria mudança silenciosa no outro.
 */
function escreverEmbalagem(embalagem: string | null, variante: string | null): string | null {
  const bruta = embalagem?.trim();
  if (bruta === undefined || bruta.length === 0) return null;

  const achatar = (v: string) =>
    v
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();

  if (variante !== null && achatar(variante) === achatar(bruta)) return null;
  return bruta.charAt(0).toUpperCase() + bruta.slice(1);
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
    return { chave: declarado, rotulo: ESTADO_ESCRITO[declarado] };
  }
  if (temporal === "expirado") {
    return { chave: "expired", rotulo: ESTADO_ESCRITO.expired };
  }
  if (temporal === "sem-validade-antigo") {
    return { chave: "desatualizada", rotulo: ESTADO_ESCRITO.desatualizada };
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
export interface OpcoesDaVisao {
  /**
   * Quantidade escolhida para produtos de peso variável, em gramas. Só é lida quando a
   * oferta declara `price_unit: "kg"`. Padrão: `PESO_PADRAO` (500 g).
   */
  gramas?: number;
  /**
   * A demonstração é um SNAPSHOT HISTÓRICO (§18 do mandato de polish): preço observado
   * numa data real não desaparece nem ganha tarja de urgência quando a validade do encarte
   * passa. Com esta opção, os estados derivados só do RELÓGIO ("Oferta expirada", "Preço
   * desatualizado") não produzem rótulo — a moldura factual fica na linha de procedência
   * ("observado em 09/08 · valeu até 09/08") e na nota da demonstração. Um `offer_state`
   * DECLARADO continua produzindo rótulo: suprimir estado dito pelo dado seria esconder.
   *
   * O caminho do piloto nunca liga esta opção: lá o preço vencido continua saindo da lista
   * pela regra do princípio 2, no `isValidPrice()` e na RLS, que não mudaram.
   */
  snapshotHistorico?: boolean;
}

/**
 * O pack obrigatório declarado, resolvido em desembolso mínimo e rótulo — ou `null`.
 *
 * Só existe quando `unidade_de_venda` E `pack_obrigatorio` (inteiro > 1) estão declarados
 * juntos. O desembolso é preço-fonte × pack com arredondamento monetário determinístico ao
 * centavo — o preço-fonte nunca muda; o que muda é qual número pode ser protagonista.
 */
function packObrigatorio(
  oferta: OfertaCardV2,
): { desembolso: number; rotulo: string; unidades: number } | null {
  const unidades = oferta.pack_obrigatorio;
  if (oferta.unidade_de_venda === undefined || unidades === undefined) return null;
  if (!Number.isInteger(unidades) || unidades <= 1) return null;
  return {
    desembolso: Math.round(oferta.price * unidades * 100) / 100,
    rotulo: `pack ${unidades}`,
    unidades,
  };
}

/**
 * O preço que pode viajar SOZINHO — no texto de compartilhamento, que não leva a tela
 * junto (V4.3 §1). Com pack obrigatório declarado, é o desembolso mínimo com o rótulo do
 * pack; sem ele, o preço observado, como sempre foi.
 */
export function precoParaCompartilhar(oferta: OfertaCardV2): { preco: number; embalagem?: string } {
  const pack = packObrigatorio(oferta);
  if (pack === null) return { preco: oferta.price };
  return { preco: pack.desembolso, embalagem: pack.rotulo };
}

/** O sufixo colado no número grande do peso variável: "R$ 7,99" + "/kg". */
const SUFIXO_POR_UNIDADE: Record<PriceUnit, string> = {
  kg: "/kg",
  L: "/L",
  un: "/un",
};

/**
 * O preço principal e o secundário — §0 do mandato v2, corrigido pela V4 §4.
 *
 * **Embalado**: o número grande é o preço da embalagem, como sempre foi; o secundário é o
 * unitário calculado de quantidade estruturada aprovada (`calcularUnitario`).
 *
 * **Peso variável** (`price_unit: "kg"`): o número grande é o PREÇO OBSERVADO — R$ 7,99/kg,
 * com a unidade colada no número —, porque é ele que a placa do balcão diz e ele que compara
 * mercados. O preço calculado para a quantidade escolhida vira SIMULAÇÃO, nomeada e
 * secundária: "500 g ≈ R$ 4,00". A V3 invertia isso ("R$ 4,00 · aprox. 500 g" grande), e a
 * leitura errada possível — "um frango inteiro custa R$ 4,00 e pesa 500 g" — é exatamente a
 * que a V4 §4 manda impedir. O falado diz os dois, na mesma ordem do visual.
 */
function resolverPrecos(
  oferta: OfertaCardV2,
  gramas: number,
): { preco: PrecoExibido; simulacao: string | null; unitario: UnitarioExibido | null } {
  if (oferta.price_unit === undefined) {
    const unidadeDeVenda = oferta.unidade_de_venda;
    const pack = packObrigatorio(oferta);

    // V4.3 §1 — venda só no pack: o protagonista é o desembolso mínimo real. "R$ 3,79"
    // grande com "venda somente no pack de 12" embaixo induzia a crer numa compra de
    // R$ 3,79 que o mercado não vende; o número grande passa a ser o que sai do bolso.
    // O por-unidade e o normalizado continuam na tela, secundários — nenhum dado sumiu.
    if (pack !== null) {
      const { currency, amount } = formatPriceParts(pack.desembolso);
      return {
        preco: {
          valor: pack.desembolso,
          simbolo: currency,
          numero: amount,
          quantidade: null,
          embalagemMinima: pack.rotulo,
          porUnidade: `${formatPrice(oferta.price)}/${unidadeDeVenda}`,
          falado: `${spokenPrice(pack.desembolso)} o pack de ${pack.unidades} — ${spokenPrice(oferta.price)} por ${unidadeDeVenda}`,
        },
        simulacao: null,
        unitario: calcularUnitario(oferta),
      };
    }

    const { currency, amount } = formatPriceParts(oferta.price);
    return {
      preco: {
        valor: oferta.price,
        simbolo: currency,
        numero: amount,
        // V4.2 §4 — a unidade de venda anunciada cola no número ("R$ 3,79/lata"),
        // exatamente como o "/kg" do granel: o número nunca afirma mais que a placa.
        quantidade: unidadeDeVenda === undefined ? null : `/${unidadeDeVenda}`,
        embalagemMinima: null,
        porUnidade: null,
        falado:
          unidadeDeVenda === undefined
            ? spokenPrice(oferta.price)
            : `${spokenPrice(oferta.price)} por ${unidadeDeVenda}`,
      },
      simulacao: null,
      unitario: calcularUnitario(oferta),
    };
  }

  const calculado = precoParaGramas(oferta.price, gramas);
  const { currency, amount } = formatPriceParts(oferta.price);
  return {
    preco: {
      valor: oferta.price,
      simbolo: currency,
      numero: amount,
      quantidade: SUFIXO_POR_UNIDADE[oferta.price_unit],
      embalagemMinima: null,
      porUnidade: null,
      falado: `${spokenPrice(oferta.price)} ${UNIDADE_FALADA[oferta.price_unit]} — ${spokenPrice(calculado)} ${faladoAproximado(gramas)}`,
    },
    // "≈" e não "=": o número não foi observado. `rotuloAproximado` continua sendo a forma
    // falada/da ficha; aqui o rótulo curto é o do benchmark ("500 g ≈ R$ 4,00").
    simulacao: `${rotuloDoPeso(gramas)} ≈ ${formatPrice(calculado)}`,
    // O normalizado não repete: o número grande JÁ É o R$/kg.
    unitario: null,
  };
}

function resolverClube(oferta: OfertaCardV2): ClubeExibido | null {
  if (oferta.clube === undefined) return null;
  return {
    precoTexto: formatPriceParts(oferta.clube.preco).amount,
    condicao: oferta.clube.condicao,
    falado: `${spokenPrice(oferta.clube.preco)} ${oferta.clube.condicao}`,
  };
}

export function montarVisaoDoCard(
  oferta: OfertaCardV2,
  now: Date,
  formatarData: (valor: string) => string,
  opcoes: OpcoesDaVisao = {},
): VisaoDoCard {
  const temporal = temporalState(oferta, now);
  const derivadoDoRelogio = resolverEstado(oferta, temporal);
  // No snapshot histórico só o estado DECLARADO rotula; o do relógio vira tempo verbal na
  // procedência ("valeu até"), nunca supressão da data.
  const estado =
    opcoes.snapshotHistorico === true && (oferta.offer_state ?? "active") === "active"
      ? null
      : derivadoDoRelogio;
  const quantidade = escreverQuantidade(oferta);
  // Com pack obrigatório, a quantidade exibida é o que se COMPRA, não só o que se bebe:
  // "350 ml" ao lado de R$ 45,48 lia como uma lata a preço de doze (Fable review §1).
  const pack = packObrigatorio(oferta);
  const quantidadeExibida =
    pack !== null && quantidade.texto !== null
      ? `${pack.rotulo} × ${quantidade.texto}`
      : quantidade.texto;
  const { preco, simulacao, unitario } = resolverPrecos(oferta, opcoes.gramas ?? PESO_PADRAO);

  return {
    identidade: {
      nome: oferta.product.name,
      marca: oferta.product.brand,
      variante: oferta.product.variant,
      quantidade: quantidadeExibida,
      complemento: quantidade.complemento,
      quantidadeEstruturada: quantidade.estruturada,
      embalagem: escreverEmbalagem(oferta.product.package_type ?? null, oferta.product.variant),
    },
    mercado: { nome: oferta.market.name, bairro: oferta.market.neighborhood },
    preco,
    simulacao,
    unitario,
    clube: resolverClube(oferta),
    procedencia: {
      // O rótulo declarado pela coleta manda; o do enum é o fallback (§15).
      origem: oferta.fonte_rotulo ?? sourceLabel(oferta.source_type),
      nivel: SOURCE_LABELS[oferta.source_type].level,
      observadoEm: formatarData(oferta.observed_at),
      relativo: formatRelativeDay(oferta.observed_at, now),
      validoAte: oferta.valid_until === null ? null : formatarData(oferta.valid_until),
      validadePassada:
        oferta.valid_until !== null && new Date(oferta.valid_until).getTime() < now.getTime(),
    },
    condicao: oferta.special_condition,
    temporal,
    estado,
    naListaOrganica: estado === null,
    imagem: resolverImagem(oferta),
    cta: resolverCta(oferta, estado === null),
    exemploIlustrativo: oferta.exemplo_ilustrativo === true,
  };
}
