import { computeUnitPrice } from "@/lib/unit-price";
import type { UnitPriceBasis } from "@/lib/unit-price";
import type { Market, Product, SourceType } from "@/types/domain";
import type { ImagemDeProduto, OfertaCardV2 } from "@/lib/card-v2";

/**
 * =============================================================================
 * O CATÁLOGO DA DEMONSTRAÇÃO — COMPARABLE PRODUCTS DEMO V2
 * =============================================================================
 *
 * Fonte da verdade: a planilha do Founder
 * `Comparativo_Precos_Supermercados_09-08-2026.xlsx` (abas Comparativo Geral, Detalhe por
 * item e Conferência 2 fontes), auditada linha a linha antes deste arquivo ser escrito.
 * **Nenhum número aqui foi inventado**: preço cheio, preço de clube, gramatura, condição,
 * fonte e período vêm todos de lá, e os testes conferem os normalizados contra os valores
 * que a própria planilha calculou.
 *
 * São **12 grupos comparáveis** em **5 mercados reais** — Açougue Mota, Safra, Savegnago,
 * Atacadão e Pague Menos —, escolhidos pelo Founder (§2 do mandato) para mostrar cada caso
 * que o produto precisa saber contar: mesmo corte por kg, mesma embalagem, embalagens
 * diferentes, granel, unitário, promoção de clube.
 *
 * =============================================================================
 * AS DUAS NATUREZAS DE PREÇO, E ONDE CADA UMA MORA (§0)
 * =============================================================================
 *
 * **Preço principal** = o que o consumidor paga: o preço da embalagem (`price`), ou — nos
 * produtos de peso variável — o preço calculado para a quantidade escolhida, sempre
 * rotulado "aprox." (`peso-variavel.ts`).
 *
 * **Preço secundário** = R$/kg, R$/L ou R$/un. Ele NUNCA é armazenado: é calculado por
 * `computeUnitPrice` a partir da quantidade estruturada de cada SKU, que veio da planilha e
 * entra aqui com procedência `confirmed` porque a aba "Conferência 2 fontes" a conferiu
 * contra o encarte original. Guardar o normalizado seria criar uma segunda verdade.
 *
 * =============================================================================
 * EMBALAGENS DIFERENTES NÃO SÃO O MESMO SKU (princípio 1)
 * =============================================================================
 *
 * Elseve 400 ml ≠ 200 ml, Dreamies 80 g ≠ 40 g, Sanol 30 un ≠ 7 un. Nestes três grupos cada
 * oferta carrega o SEU SKU (`entry.product`), com a sua gramatura e a sua imagem, e a
 * comparação é explicitamente **por custo unitário** — que é a única comparação que o
 * princípio 1 autoriza entre tamanhos diferentes. A tela diz isso; o ranking usa o
 * normalizado; o desembolso continua sendo o número grande de cada linha. "Mais barato"
 * sem qualificação não existe nesses grupos (§5).
 *
 * =============================================================================
 * DATAS E VALIDADES SÃO AS REAIS (§15)
 * =============================================================================
 *
 * Foto do balcão do Mota: 08/08/2026, sem validade anunciada. Cartazes e painel do Safra:
 * 09/08/2026, balcão, sem validade. Encartes: coletados em 09/08/2026, com a validade que o
 * próprio encarte anuncia — 09/08 (Savegnago, Atacadão, Pague Menos) ou 12/08 (tabloide
 * Safra). Consequência honesta: **as ofertas de encarte expiram nessas datas** e saem da
 * lista orgânica, como o produto faz com qualquer oferta vencida. Não há data sintética.
 */

// =============================================================================
// ROTULAGEM DO CONJUNTO
// =============================================================================

export const ACOUGUE_MOTA_NOME = "Açougue Mota";

/** Data-base da coleta, como a planilha declara. */
export const DEMO_OBSERVACAO_LABEL = "09/08/2026";

export const DEMO_FIXTURE_REFERENCE =
  "Planilha Comparativo_Precos_Supermercados_09-08-2026 — encartes, tabloides e fotos de loja, 03–12/08/2026";

/**
 * A frase que diz o que este dado é. Cinco mercados reais, fontes reais, período real —
 * e a palavra "demonstração" na frente, porque é o que isto é (§copy do mandato).
 */
export const DEMO_NATUREZA_DO_DADO =
  "Comparação de demonstração: preços coletados em encartes, tabloides e fotos de loja entre 03 e 12/08/2026, em cinco mercados de Piracicaba e região.";

// =============================================================================
// FONTES — cada oferta declara de onde veio, com o rótulo do §15
// =============================================================================
//
// O nome técnico do arquivo nunca vira copy: `Mercado-Local_Acougue_Bovinos (foto)` é
// "Foto em loja", `Safra_Loja_Painel-TV` é "Painel da loja", tabloide e encarte são
// "Encarte da loja". O rótulo vive em `fonte_rotulo`; o `source_type` continua sendo o
// enum do domínio, mapeado pelo que de fato aconteceu: foto/painel/cartaz fotografados
// são `shelf_photo`, material publicado pelo próprio mercado é `store_list`.

interface FonteDaColeta {
  readonly rotulo: string;
  readonly tipo: SourceType;
  readonly observadoEm: string;
  readonly validoAte: string | null;
  readonly referencia: string;
}

const OBS_MOTA = "2026-08-08T15:00:00-03:00";
const OBS_SAFRA_LOJA = "2026-08-09T10:00:00-03:00";
const OBS_ENCARTE = "2026-08-09T09:00:00-03:00";
const FIM_09_08 = "2026-08-09T23:59:59-03:00";
const FIM_12_08 = "2026-08-12T23:59:59-03:00";

const FONTE = {
  motaFoto: {
    rotulo: "Foto em loja",
    tipo: "shelf_photo",
    observadoEm: OBS_MOTA,
    validoAte: null,
    referencia: "Fotos das placas do balcão, 08/08/2026",
  },
  safraCartaz: {
    rotulo: "Cartaz na loja",
    tipo: "shelf_photo",
    observadoEm: OBS_SAFRA_LOJA,
    validoAte: null,
    referencia: "Cartazes do açougue fotografados na loja, 09/08/2026",
  },
  safraPainel: {
    rotulo: "Painel da loja",
    tipo: "shelf_photo",
    observadoEm: OBS_SAFRA_LOJA,
    validoAte: null,
    referencia: "Painel de TV do açougue, preço de balcão, 09/08/2026",
  },
  safraTabloide: {
    rotulo: "Encarte da loja",
    tipo: "store_list",
    observadoEm: OBS_ENCARTE,
    validoAte: FIM_12_08,
    referencia: "Tabloide Safra, ofertas 06–12/08/2026",
  },
  savegnagoEncarte: {
    rotulo: "Encarte da loja",
    tipo: "store_list",
    observadoEm: OBS_ENCARTE,
    validoAte: FIM_09_08,
    referencia: "Encarte Savegnago Aniversário 50 anos, ofertas 06–09/08/2026",
  },
  atacadaoEncarte: {
    rotulo: "Encarte da loja",
    tipo: "store_list",
    observadoEm: OBS_ENCARTE,
    validoAte: FIM_09_08,
    referencia: "Encartes Atacadão, ofertas 03–09/08/2026",
  },
  pagueMenosEncarte: {
    rotulo: "Encarte da loja",
    tipo: "store_list",
    observadoEm: OBS_ENCARTE,
    validoAte: FIM_09_08,
    referencia: "Encarte Pague Menos, ofertas 03–09/08/2026",
  },
} satisfies Record<string, FonteDaColeta>;

// =============================================================================
// MERCADOS — cinco, reais, com a localização que a planilha valida e nada além (§16)
// =============================================================================
//
// Só dois têm bairro: o Mota (Artemis) e o Safra (loja única, endereço no Leia-me da
// planilha). Savegnago, Atacadão e Pague Menos são preços de rede/tabloide regional —
// bairro nulo, porque afirmar um seria inventar proximidade. Nenhuma distância é dita
// em lugar nenhum: não existe geolocalização no MVP.

export const ACOUGUE_MOTA: Market = {
  id: "11111111-1111-1111-1111-0000000000a1",
  name: ACOUGUE_MOTA_NOME,
  neighborhood: "Artemis",
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

export const SAFRA: Market = {
  id: "11111111-1111-1111-1111-0000000000a3",
  name: "Safra",
  neighborhood: "Mário Dedini",
  address: "Av. Luiz Ralf Benatti, 1001",
  maps_url: null,
  is_active: true,
  is_demo: true,
};

export const SAVEGNAGO: Market = {
  id: "11111111-1111-1111-1111-0000000000a4",
  name: "Savegnago",
  neighborhood: null,
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

export const ATACADAO: Market = {
  id: "11111111-1111-1111-1111-0000000000a5",
  name: "Atacadão",
  neighborhood: null,
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

export const PAGUE_MENOS: Market = {
  id: "11111111-1111-1111-1111-0000000000a6",
  name: "Pague Menos",
  neighborhood: null,
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

export const DEMO_MARKETS: readonly Market[] = [
  ACOUGUE_MOTA,
  SAFRA,
  SAVEGNAGO,
  ATACADAO,
  PAGUE_MENOS,
];

// =============================================================================
// PRODUTOS
// =============================================================================
//
// Dois tipos de registro:
//
// - **corte/granel** — vendido a peso, sem embalagem: `size_text` nulo (não existe
//   gramatura; escrever uma seria inventá-la) e preço por kg na oferta;
// - **embalado** — com quantidade estruturada `confirmed`, vinda da planilha e conferida
//   na aba "Conferência 2 fontes". É dela que `computeUnitPrice` deriva o R$/kg, R$/L e
//   R$/un — os mesmos valores que a planilha normalizou, e os testes cobram a igualdade.
//
// GTIN nulo em todos: nenhum código de barras foi coletado, e inventar um seria afirmação
// falsa sobre um identificador global.

function granel(id: string, name: string, category: string): Product {
  return {
    id,
    name,
    brand: null,
    variant: null,
    size_text: null,
    gtin: null,
    category,
    is_active: true,
    is_demo: true,
  };
}

interface EmbaladoSpec {
  readonly id: string;
  readonly name: string;
  readonly brand: string;
  readonly variant?: string;
  readonly sizeText: string;
  readonly quantidade: { value: number; unit: "g" | "kg" | "ml" | "l" | "un" };
  readonly category: string;
}

function embalado(spec: EmbaladoSpec): Product {
  return {
    id: spec.id,
    name: spec.name,
    brand: spec.brand,
    variant: spec.variant ?? null,
    size_text: spec.sizeText,
    gtin: null,
    category: spec.category,
    is_active: true,
    is_demo: true,
    quantity_value: spec.quantidade.value,
    quantity_unit: spec.quantidade.unit,
  };
}

// ---------- granel — preço por kg, seletor de 250 g / 500 g / 1 kg ----------

export const PRODUTO_FRANGO_INTEIRO = granel(
  "33333333-3333-3333-3333-0000000000b1",
  "Frango inteiro",
  "Carnes e Aves",
);

export const PRODUTO_BUCHO = granel(
  "33333333-3333-3333-3333-0000000000b2",
  "Bucho bovino",
  "Carnes e Aves",
);

export const PRODUTO_BISTECA = granel(
  "33333333-3333-3333-3333-0000000000b3",
  "Bisteca bovina",
  "Carnes e Aves",
);

export const PRODUTO_CEBOLA = granel(
  "33333333-3333-3333-3333-0000000000b4",
  "Cebola",
  "Hortifruti",
);

// ---------- embalados de embalagem igual — a comparação exata clássica ----------

export const PRODUTO_OLEO_LIZA = embalado({
  id: "33333333-3333-3333-3333-0000000000b5",
  name: "Óleo de soja",
  brand: "Liza",
  sizeText: "900 ml",
  quantidade: { value: 900, unit: "ml" },
  category: "Mercearia",
});

export const PRODUTO_FAROFA_YOKI = embalado({
  id: "33333333-3333-3333-3333-0000000000b6",
  name: "Farofa pronta",
  brand: "Yoki",
  variant: "Tradicional",
  sizeText: "400 g",
  quantidade: { value: 400, unit: "g" },
  category: "Mercearia",
});

export const PRODUTO_DOLCE_GUSTO = embalado({
  id: "33333333-3333-3333-3333-0000000000b7",
  name: "Café em cápsulas",
  brand: "Nescafé Dolce Gusto",
  sizeText: "caixa 10 cápsulas",
  quantidade: { value: 10, unit: "un" },
  category: "Café e Matinais",
});

export const PRODUTO_LASANHA_SADIA = embalado({
  id: "33333333-3333-3333-3333-0000000000b8",
  name: "Lasanha",
  brand: "Sadia",
  sizeText: "600 g",
  quantidade: { value: 600, unit: "g" },
  category: "Congelados",
});

export const PRODUTO_TIXAN = embalado({
  id: "33333333-3333-3333-3333-0000000000b9",
  name: "Lava-roupas em pó",
  brand: "Tixan Ypê",
  sizeText: "2,2 kg",
  quantidade: { value: 2.2, unit: "kg" },
  category: "Limpeza",
});

// ---------- grupos de embalagens diferentes — cada oferta carrega o SEU SKU ----------
//
// O produto "de grupo" (size_text nulo) é o que dá título à comparação; os SKUs por
// tamanho são o que cada linha exibe. A comparação entre eles é por custo unitário, e
// só por custo unitário — princípio 1.

/**
 * O produto que dá título a um grupo de embalagens diferentes.
 *
 * `size_text` nulo é a afirmação central: o GRUPO não tem uma gramatura — cada SKU dele
 * tem a sua, e é cada linha da comparação que a declara. Dar uma gramatura ao grupo seria
 * eleger um dos tamanhos como "o verdadeiro".
 */
function grupoDeMarca(id: string, name: string, brand: string, category: string): Product {
  return { ...granel(id, name, category), brand };
}

export const PRODUTO_ELSEVE = grupoDeMarca(
  "33333333-3333-3333-3333-0000000000ba",
  "Shampoo",
  "Elseve",
  "Higiene e Beleza",
);

export const SKU_ELSEVE_400 = embalado({
  id: "33333333-3333-3333-3333-0000000000bb",
  name: "Shampoo",
  brand: "Elseve",
  sizeText: "400 ml",
  quantidade: { value: 400, unit: "ml" },
  category: "Higiene e Beleza",
});

export const SKU_ELSEVE_200 = embalado({
  id: "33333333-3333-3333-3333-0000000000bc",
  name: "Shampoo",
  brand: "Elseve",
  sizeText: "200 ml",
  quantidade: { value: 200, unit: "ml" },
  category: "Higiene e Beleza",
});

export const PRODUTO_DREAMIES = grupoDeMarca(
  "33333333-3333-3333-3333-0000000000bd",
  "Petisco para gatos",
  "Dreamies",
  "Pet",
);

export const SKU_DREAMIES_80 = embalado({
  id: "33333333-3333-3333-3333-0000000000be",
  name: "Petisco para gatos",
  brand: "Dreamies",
  sizeText: "80 g",
  quantidade: { value: 80, unit: "g" },
  category: "Pet",
});

export const SKU_DREAMIES_40 = embalado({
  id: "33333333-3333-3333-3333-0000000000bf",
  name: "Petisco para gatos",
  brand: "Dreamies",
  sizeText: "40 g",
  quantidade: { value: 40, unit: "g" },
  category: "Pet",
});

export const PRODUTO_SANOL = grupoDeMarca(
  "33333333-3333-3333-3333-0000000000c0",
  "Tapete higiênico para cães",
  "Sanol Dog",
  "Pet",
);

export const SKU_SANOL_30 = embalado({
  id: "33333333-3333-3333-3333-0000000000c1",
  name: "Tapete higiênico para cães",
  brand: "Sanol Dog",
  sizeText: "30 unidades",
  quantidade: { value: 30, unit: "un" },
  category: "Pet",
});

export const SKU_SANOL_7 = embalado({
  id: "33333333-3333-3333-3333-0000000000c2",
  name: "Tapete higiênico para cães",
  brand: "Sanol Dog",
  sizeText: "7 unidades",
  quantidade: { value: 7, unit: "un" },
  category: "Pet",
});

/** Os 12 grupos que a busca enxerga e as rotas de produto abrem. */
export const DEMO_PRODUCTS: readonly Product[] = [
  PRODUTO_FRANGO_INTEIRO,
  PRODUTO_BUCHO,
  PRODUTO_BISTECA,
  PRODUTO_CEBOLA,
  PRODUTO_OLEO_LIZA,
  PRODUTO_FAROFA_YOKI,
  PRODUTO_DOLCE_GUSTO,
  PRODUTO_LASANHA_SADIA,
  PRODUTO_TIXAN,
  PRODUTO_ELSEVE,
  PRODUTO_DREAMIES,
  PRODUTO_SANOL,
];

// =============================================================================
// IMAGENS — corretas ou ausentes, nunca aproximadas (§10)
// =============================================================================
//
// Duas origens, as duas autorizadas pelo mandato:
//
// - **IA fornecida pelo Founder** para os itens de balcão (frango, bucho, cebola) —
//   ilustrativas, com `alt` que diz as duas coisas que quem usa leitor de tela não tem
//   como conferir: que a imagem é ilustrativa e que foi gerada por IA;
// - **recorte do encarte/tabloide fornecido** para produtos de marca — a arte da própria
//   embalagem, publicada pelo mercado, recortada limpa. Nenhuma embalagem foi gerada ou
//   imitada, e nenhuma imagem foi baixada da internet.
//
// Três SKUs ficam SEM imagem de propósito: bisteca bovina (nenhuma imagem IA fornecida
// corresponde ao corte), Elseve 200 ml e Sanol 7 unidades (o único material fornecido é
// foto de tabloide impresso, sem qualidade para recorte limpo). Placeholder — porque
// imagem errada é pior que imagem nenhuma.

function ilustracaoIA(arquivo: string, corte: string): ImagemDeProduto {
  return {
    src: `/img/demo/comparaveis/${arquivo}`,
    alt: `Imagem ilustrativa de ${corte}, gerada por IA — não é a peça vendida`,
    review_status: "approved",
    variant_match: "exact",
    ilustrativa: true,
    formato: "foto",
  };
}

function recorteDeEncarte(arquivo: string, descricao: string): ImagemDeProduto {
  return {
    src: `/img/demo/comparaveis/${arquivo}`,
    alt: `${descricao} — imagem do encarte do mercado`,
    review_status: "approved",
    variant_match: "exact",
    formato: "foto",
  };
}

const IMAGEM_POR_PRODUTO: Readonly<Record<string, ImagemDeProduto>> = {
  [PRODUTO_FRANGO_INTEIRO.id]: ilustracaoIA("frango-inteiro.jpg", "frango inteiro"),
  [PRODUTO_BUCHO.id]: ilustracaoIA("bucho-bovino.jpg", "bucho bovino"),
  [PRODUTO_CEBOLA.id]: ilustracaoIA("cebola.jpg", "cebola"),
  [PRODUTO_OLEO_LIZA.id]: recorteDeEncarte("liza-900.jpg", "Garrafa de óleo de soja Liza 900 ml"),
  [PRODUTO_FAROFA_YOKI.id]: recorteDeEncarte(
    "farofa-yoki.jpg",
    "Pacote de farofa pronta Yoki tradicional 400 g",
  ),
  [PRODUTO_DOLCE_GUSTO.id]: recorteDeEncarte(
    "dolce-atk.jpg",
    "Caixa de cápsulas Nescafé Dolce Gusto com 10",
  ),
  [PRODUTO_LASANHA_SADIA.id]: recorteDeEncarte(
    "lasanha.jpg",
    "Embalagem de lasanha à bolonhesa Sadia 600 g",
  ),
  [PRODUTO_TIXAN.id]: recorteDeEncarte("tixan.jpg", "Caixa de lava-roupas em pó Tixan Ypê 2,2 kg"),
  [SKU_ELSEVE_400.id]: recorteDeEncarte("elseve-400.jpg", "Frasco de shampoo Elseve 400 ml"),
  [SKU_DREAMIES_80.id]: recorteDeEncarte(
    "dreamies-80.jpg",
    "Pacotes de petisco Dreamies 80 g para gatos",
  ),
  [SKU_DREAMIES_40.id]: recorteDeEncarte(
    "dreamies-40.jpg",
    "Pacotes de petisco Dreamies 40 g para gatos",
  ),
  [SKU_SANOL_30.id]: recorteDeEncarte(
    "sanol-30.jpg",
    "Pacotes de tapete higiênico Sanol Dog com 30 unidades",
  ),
  // Os produtos-GRUPO dos conjuntos de embalagens diferentes NÃO têm entrada aqui, de
  // propósito: o grupo não tem uma embalagem, então nenhuma foto o representa sem eleger
  // um dos tamanhos como "o verdadeiro". O topo da comparação desses grupos desenha o
  // placeholder; as fotos vivem nas LINHAS, cada uma ao lado da própria gramatura — que é
  // onde uma imagem de 80 g não consegue se passar por 40 g.
};

export function imagemDoProdutoDemo(productId: string): ImagemDeProduto | null {
  return IMAGEM_POR_PRODUTO[productId] ?? null;
}

// =============================================================================
// OFERTAS — uma por mercado, dentro de cada grupo
// =============================================================================

/** Preço condicionado a cartão, app ou compra casada — SEMPRE separado do preço cheio (§8). */
export interface PrecoDeClube {
  readonly preco: number;
  readonly condicao: string;
}

interface SementeDeOferta {
  readonly id: string;
  /** O SKU anunciado — nos grupos de embalagens diferentes, cada oferta tem o seu. */
  readonly sku: Product;
  readonly mercado: Market;
  readonly price: number;
  readonly fonte: FonteDaColeta;
  readonly clube?: PrecoDeClube;
  /** "kg" quando o preço observado é por quilo (granel). */
  readonly porKg?: true;
}

export interface GrupoDemo {
  /** O produto que dá título à comparação — a rota `/produto/$id` abre por ele. */
  readonly produto: Product;
  readonly sementes: readonly SementeDeOferta[];
  /**
   * Presente quando o grupo compara EMBALAGENS DIFERENTES: a base do custo unitário que
   * ordena a lista (§5, §17). Ausente = embalagem igual, ordem por preço de prateleira.
   */
  readonly basePorUnidade?: UnitPriceBasis;
  /** Grupo de peso variável: preço por kg com seletor de quantidade (§3). */
  readonly granel?: true;
}

const GRUPOS: readonly GrupoDemo[] = [
  {
    produto: PRODUTO_FRANGO_INTEIRO,
    granel: true,
    sementes: [
      {
        id: "demo-v2-frango-safra",
        sku: PRODUTO_FRANGO_INTEIRO,
        mercado: SAFRA,
        price: 7.99,
        fonte: FONTE.safraCartaz,
        porKg: true,
      },
      {
        id: "demo-v2-frango-mota",
        sku: PRODUTO_FRANGO_INTEIRO,
        mercado: ACOUGUE_MOTA,
        price: 9.99,
        fonte: FONTE.motaFoto,
        porKg: true,
      },
    ],
  },
  {
    produto: PRODUTO_BUCHO,
    granel: true,
    sementes: [
      {
        id: "demo-v2-bucho-mota",
        sku: PRODUTO_BUCHO,
        mercado: ACOUGUE_MOTA,
        price: 24.99,
        fonte: FONTE.motaFoto,
        porKg: true,
      },
      {
        id: "demo-v2-bucho-safra",
        sku: PRODUTO_BUCHO,
        mercado: SAFRA,
        price: 25.99,
        fonte: FONTE.safraPainel,
        porKg: true,
      },
    ],
  },
  {
    produto: PRODUTO_BISTECA,
    granel: true,
    sementes: [
      {
        id: "demo-v2-bisteca-mota",
        sku: PRODUTO_BISTECA,
        mercado: ACOUGUE_MOTA,
        price: 39.9,
        fonte: FONTE.motaFoto,
        porKg: true,
      },
      {
        id: "demo-v2-bisteca-safra",
        sku: PRODUTO_BISTECA,
        mercado: SAFRA,
        price: 39.99,
        fonte: FONTE.safraCartaz,
        porKg: true,
      },
    ],
  },
  {
    produto: PRODUTO_CEBOLA,
    granel: true,
    sementes: [
      {
        id: "demo-v2-cebola-savegnago",
        sku: PRODUTO_CEBOLA,
        mercado: SAVEGNAGO,
        price: 4.45,
        fonte: FONTE.savegnagoEncarte,
        clube: { preco: 3.95, condicao: "no cartão Savegnago" },
        porKg: true,
      },
      {
        id: "demo-v2-cebola-mota",
        sku: PRODUTO_CEBOLA,
        mercado: ACOUGUE_MOTA,
        price: 5.99,
        fonte: FONTE.motaFoto,
        porKg: true,
      },
    ],
  },
  {
    produto: PRODUTO_OLEO_LIZA,
    sementes: [
      {
        id: "demo-v2-oleo-savegnago",
        sku: PRODUTO_OLEO_LIZA,
        mercado: SAVEGNAGO,
        price: 5.95,
        fonte: FONTE.savegnagoEncarte,
      },
      {
        id: "demo-v2-oleo-safra",
        sku: PRODUTO_OLEO_LIZA,
        mercado: SAFRA,
        price: 6.99,
        fonte: FONTE.safraTabloide,
      },
    ],
  },
  {
    produto: PRODUTO_FAROFA_YOKI,
    sementes: [
      {
        id: "demo-v2-farofa-savegnago",
        sku: PRODUTO_FAROFA_YOKI,
        mercado: SAVEGNAGO,
        price: 4.75,
        fonte: FONTE.savegnagoEncarte,
      },
      {
        id: "demo-v2-farofa-safra",
        sku: PRODUTO_FAROFA_YOKI,
        mercado: SAFRA,
        price: 4.99,
        fonte: FONTE.safraTabloide,
      },
    ],
  },
  {
    produto: PRODUTO_DOLCE_GUSTO,
    sementes: [
      {
        id: "demo-v2-dolce-atacadao",
        sku: PRODUTO_DOLCE_GUSTO,
        mercado: ATACADAO,
        price: 16.99,
        fonte: FONTE.atacadaoEncarte,
      },
      {
        id: "demo-v2-dolce-savegnago",
        sku: PRODUTO_DOLCE_GUSTO,
        mercado: SAVEGNAGO,
        price: 18.9,
        fonte: FONTE.savegnagoEncarte,
        clube: { preco: 15.9, condicao: "cada, levando 3 caixas" },
      },
    ],
  },
  {
    produto: PRODUTO_LASANHA_SADIA,
    sementes: [
      {
        id: "demo-v2-lasanha-savegnago",
        sku: PRODUTO_LASANHA_SADIA,
        mercado: SAVEGNAGO,
        price: 14.9,
        fonte: FONTE.savegnagoEncarte,
        clube: { preco: 13.9, condicao: "no cartão Savegnago" },
      },
      {
        id: "demo-v2-lasanha-safra",
        sku: PRODUTO_LASANHA_SADIA,
        mercado: SAFRA,
        price: 16.99,
        fonte: FONTE.safraTabloide,
      },
    ],
  },
  {
    produto: PRODUTO_TIXAN,
    sementes: [
      {
        id: "demo-v2-tixan-savegnago",
        sku: PRODUTO_TIXAN,
        mercado: SAVEGNAGO,
        price: 18.7,
        fonte: FONTE.savegnagoEncarte,
      },
      {
        id: "demo-v2-tixan-paguemenos",
        sku: PRODUTO_TIXAN,
        mercado: PAGUE_MENOS,
        price: 18.99,
        fonte: FONTE.pagueMenosEncarte,
      },
    ],
  },
  {
    produto: PRODUTO_ELSEVE,
    basePorUnidade: "per_l",
    sementes: [
      {
        id: "demo-v2-elseve-savegnago",
        sku: SKU_ELSEVE_400,
        mercado: SAVEGNAGO,
        price: 25.9,
        fonte: FONTE.savegnagoEncarte,
      },
      {
        id: "demo-v2-elseve-safra",
        sku: SKU_ELSEVE_200,
        mercado: SAFRA,
        price: 16.99,
        fonte: FONTE.safraTabloide,
      },
    ],
  },
  {
    produto: PRODUTO_DREAMIES,
    basePorUnidade: "per_kg",
    sementes: [
      {
        id: "demo-v2-dreamies-atacadao",
        sku: SKU_DREAMIES_80,
        mercado: ATACADAO,
        price: 7.9,
        fonte: FONTE.atacadaoEncarte,
      },
      {
        id: "demo-v2-dreamies-savegnago",
        sku: SKU_DREAMIES_40,
        mercado: SAVEGNAGO,
        price: 5.95,
        fonte: FONTE.savegnagoEncarte,
      },
      {
        id: "demo-v2-dreamies-paguemenos",
        sku: SKU_DREAMIES_40,
        mercado: PAGUE_MENOS,
        price: 5.99,
        fonte: FONTE.pagueMenosEncarte,
      },
    ],
  },
  {
    produto: PRODUTO_SANOL,
    basePorUnidade: "per_un",
    sementes: [
      {
        id: "demo-v2-sanol-atacadao",
        sku: SKU_SANOL_30,
        mercado: ATACADAO,
        price: 69.9,
        fonte: FONTE.atacadaoEncarte,
      },
      {
        id: "demo-v2-sanol-paguemenos",
        sku: SKU_SANOL_7,
        mercado: PAGUE_MENOS,
        price: 22.99,
        fonte: FONTE.pagueMenosEncarte,
      },
    ],
  },
];

// =============================================================================
// CONSTRUÇÃO
// =============================================================================

function construirOferta(semente: SementeDeOferta): OfertaCardV2 {
  return {
    id: semente.id,
    product_id: semente.sku.id,
    market_id: semente.mercado.id,
    price: semente.price,
    ...(semente.porKg === true ? { price_unit: "kg" as const } : {}),
    source_type: semente.fonte.tipo,
    fonte_rotulo: semente.fonte.rotulo,
    observed_at: semente.fonte.observadoEm,
    valid_until: semente.fonte.validoAte,
    special_condition: null,
    source_reference: semente.fonte.referencia,
    is_featured: true,
    is_active: true,
    is_demo: true,
    created_at: semente.fonte.observadoEm,
    market: semente.mercado,
    product: semente.sku,
    image: imagemDoProdutoDemo(semente.sku.id),
    // A quantidade estruturada dos embalados veio da planilha e foi conferida contra o
    // encarte original ("Conferência 2 fontes") — é o que `confirmed` significa aqui.
    quantity_provenance: "confirmed",
    ...(semente.clube === undefined ? {} : { clube: semente.clube }),
  };
}

export function gruposDemo(): readonly GrupoDemo[] {
  return GRUPOS;
}

/**
 * O grupo de um produto — pelo id do grupo OU pelo id de um SKU dele.
 *
 * A segunda busca existe porque um card pode apontar para o SKU que exibe ("Dreamies
 * 80 g") e a comparação certa continua sendo a do grupo inteiro. Um SKU sem grupo não
 * existe neste catálogo.
 */
export function grupoDoProduto(productId: string): GrupoDemo | null {
  return (
    GRUPOS.find((g) => g.produto.id === productId) ??
    GRUPOS.find((g) => g.sementes.some((s) => s.sku.id === productId)) ??
    null
  );
}

/** Todas as ofertas da demonstração, com SKU, mercado e imagem já resolvidos. */
export function construirOfertasDemo(): OfertaCardV2[] {
  return GRUPOS.flatMap((g) => g.sementes.map(construirOferta));
}

/**
 * O custo unitário que ordena os grupos de embalagens diferentes.
 *
 * É o MESMO `computeUnitPrice` que a interface exibe — não uma segunda conta. `null`
 * quando a oferta não tem quantidade estruturada aprovada, e aí ela vai para o fim: uma
 * oferta cujo custo não se conhece não pode ganhar uma comparação por custo.
 */
export function custoUnitarioDaOferta(oferta: OfertaCardV2): number | null {
  const { quantity_value, quantity_unit } = oferta.product;
  const quantidade =
    typeof quantity_value === "number" && quantity_unit != null
      ? { value: quantity_value, unit: quantity_unit }
      : null;
  const resultado = computeUnitPrice({
    price: oferta.price,
    quantity: quantidade,
    provenance: oferta.quantity_provenance ?? "missing",
    unitsPerPackage: oferta.product.units_per_package ?? null,
    packageType: oferta.product.package_type ?? null,
  });
  return resultado.status === "ok" ? resultado.display : null;
}

/**
 * Ordem canônica de comparação de EMBALAGEM IGUAL, a mesma do banco e do `CLAUDE.md`
 * princípio 3: **preço crescente → observação mais recente → `id`**. O terceiro critério
 * não é opcional: sem ele a mesma consulta produz listas diferentes.
 */
export function ordenarOfertas(ofertas: OfertaCardV2[]): OfertaCardV2[] {
  return [...ofertas].sort(
    (a, b) =>
      a.price - b.price ||
      Date.parse(b.observed_at) - Date.parse(a.observed_at) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Ordem dos grupos de EMBALAGENS DIFERENTES: **custo unitário crescente → preço da
 * embalagem → `id`** (§17). O preço da embalagem continua sendo o número grande de cada
 * linha; o que muda é só quem decide a posição — porque entre tamanhos diferentes o
 * desembolso não responde "qual custa menos", e fingir que responde é o erro que o §5
 * proíbe chamar de "mais barato".
 */
export function ordenarPorCustoUnitario(ofertas: OfertaCardV2[]): OfertaCardV2[] {
  return [...ofertas].sort((a, b) => {
    const ua = custoUnitarioDaOferta(a);
    const ub = custoUnitarioDaOferta(b);
    if (ua === null && ub === null) return a.id.localeCompare(b.id);
    if (ua === null) return 1;
    if (ub === null) return -1;
    return ua - ub || a.price - b.price || a.id.localeCompare(b.id);
  });
}

/** Um preço por mercado — o válido mais recente —, como a policy de RLS faria. */
export function umPrecoPorMercado(ofertas: OfertaCardV2[]): OfertaCardV2[] {
  const porMercado = new Map<string, OfertaCardV2>();
  for (const oferta of ordenarOfertas(ofertas)) {
    const atual = porMercado.get(oferta.market_id);
    if (atual === undefined || Date.parse(oferta.observed_at) > Date.parse(atual.observed_at)) {
      porMercado.set(oferta.market_id, oferta);
    }
  }
  return ordenarOfertas([...porMercado.values()]);
}
