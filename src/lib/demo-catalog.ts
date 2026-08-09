import type { Market, Product } from "@/types/domain";
import type { ImagemDeProduto, OfertaCardV2 } from "@/lib/card-v2";

/**
 * =============================================================================
 * O CATÁLOGO DA DEMONSTRAÇÃO — AÇOUGUE MOTA, ARTEMIS
 * =============================================================================
 *
 * Uma coleção só, lida pelas quatro telas de produto em modo `demo`. É isto que torna
 * impossível a imagem, o preço ou a gramatura mudarem entre Home, busca, comparação e
 * detalhe: não existe um segundo lugar onde escolher outra coisa.
 *
 * =============================================================================
 * DUAS NATUREZAS DE DADO NA MESMA LISTA, E POR QUE ISSO EXIGE CUIDADO
 * =============================================================================
 *
 * **Açougue Mota é real.** Os cinco preços foram observados presencialmente em 08/08/2026,
 * fotografando as placas do balcão. É por isso que a fonte declarada é `shelf_photo` — "Foto
 * da etiqueta" —, e não porque soe bem: foi literalmente o que aconteceu.
 *
 * **Mercado 2 não existe.** Os cinco preços dele são exemplo, escritos para mostrar ao dono
 * do açougue como a comparação vai funcionar quando houver um segundo mercado de verdade.
 * Nenhum deles foi observado em lugar nenhum.
 *
 * Misturar as duas naturezas numa lista só é exatamente o tipo de coisa que vira mentira
 * quando ninguém marca a diferença NO DADO. Por isso `exemplo_ilustrativo` existe como campo,
 * e não como lembrança: a linha que o carrega perde a procedência na tela, perde a imagem e
 * perde o link para o detalhe — porque não há detalhe de uma oferta que não foi observada.
 *
 * =============================================================================
 * A ORDEM NÃO FOI ESCOLHIDA — ELA CAI
 * =============================================================================
 *
 * O Açougue Mota aparece em primeiro lugar nas cinco comparações. Isso é consequência de ele
 * ser mais barato nos cinco produtos, e de `ordenarOfertas` ordenar por preço crescente. Não
 * há nenhum campo aqui que o promova, e não pode haver: o princípio 4 do `CLAUDE.md` diz que
 * conteúdo destacado **jamais** reordena a lista orgânica. Se o exemplo do Mercado 2 fosse
 * mais barato, ele viria antes — e é assim que tem de ser numa demonstração honesta de um
 * comparador neutro. Há teste para isso.
 *
 * =============================================================================
 * IMAGENS
 * =============================================================================
 *
 * Ilustrações geradas por IA, com marca d'água "Imagem ilustrativa" na própria arte. Elas
 * mostram o CORTE, não a peça específica que estava no balcão naquele dia — e o `alt` diz
 * isso em texto, porque quem usa leitor de tela é justamente quem não pode conferir olhando.
 * `ilustrativa: true`, como o adendo R3.3B do `IMAGE-POLICY.md` exige.
 *
 * GTIN é nulo em todos: corte de carne fatiado no balcão não tem código de barras de
 * fabricante, e inventar um seria afirmação falsa sobre um identificador global.
 */

/** O nome da loja, escrito uma vez. Toda tela que o mostra lê daqui. */
export const ACOUGUE_MOTA_NOME = "Açougue Mota";

export const DEMO_FIXTURE_REFERENCE = `Coleta presencial no ${ACOUGUE_MOTA_NOME}, 08/08/2026`;

/** A data em que os preços do açougue foram observados, como o balcão os mostrava. */
export const DEMO_OBSERVACAO_LABEL = "08/08/2026";

/**
 * A FRASE QUE DIZ O QUE ESTE DADO É — e ela mudou porque o dado mudou.
 *
 * Até 08/08/2026 a demonstração era mercearia inventada, e as telas diziam "produtos e preços
 * ilustrativos". Era verdade. Hoje **não é**: cinco dos dez preços foram observados a olho nu
 * num balcão real, e chamá-los de ilustrativos seria mentir para baixo — o tipo de imprecisão
 * que parece cautela e que, na frente do dono da loja, desmente a única coisa que a demonstração
 * tem para provar, que é ter ido lá.
 *
 * A frase separa as duas naturezas em uma linha, porque é assim que elas convivem na tela.
 */
export const DEMO_NATUREZA_DO_DADO = `Preços observados no ${ACOUGUE_MOTA_NOME} em ${DEMO_OBSERVACAO_LABEL}. Mercado 2 é exemplo ilustrativo.`;

function ilustracao(arquivo: string, corte: string): ImagemDeProduto {
  return {
    src: `/img/demo/acougue/${arquivo}`,
    // Diz o que a imagem É, e as duas coisas que ela NÃO é. Quem usa leitor de tela é
    // justamente quem não pode conferir olhando que aquilo não é a peça do balcão — e, sendo
    // uma imagem gerada, quem também não tem como perceber que não é fotografia de ninguém.
    alt: `Imagem ilustrativa de ${corte}, gerada por IA — não é a peça vendida`,
    review_status: "approved",
    variant_match: "exact",
    ilustrativa: true,
    formato: "foto",
  };
}

// =============================================================================
// MERCADOS
// =============================================================================

/**
 * A loja real da demonstração.
 *
 * Endereço e link de mapa ficam nulos de propósito: eu não conferi nenhum dos dois, e um
 * endereço errado na tela de alguém que conhece a própria loja é pior do que endereço nenhum.
 */
export const ACOUGUE_MOTA: Market = {
  id: "11111111-1111-1111-1111-0000000000a1",
  name: ACOUGUE_MOTA_NOME,
  neighborhood: "Artemis",
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

/**
 * O segundo mercado — que não existe.
 *
 * Nome genérico, sem bairro, sem endereço, sem mapa. Cada campo vazio aqui é uma afirmação
 * que a tela não vai poder fazer.
 */
export const MERCADO_EXEMPLO: Market = {
  id: "11111111-1111-1111-1111-0000000000a2",
  name: "Mercado 2",
  neighborhood: null,
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

export const DEMO_MARKETS: readonly Market[] = [ACOUGUE_MOTA, MERCADO_EXEMPLO];

// =============================================================================
// PRODUTOS
// =============================================================================
//
// Corte de açougue não tem marca, variante nem embalagem — os três campos são nulos.
//
// Preencher `brand` com o nome da loja seria transformar o vendedor em fabricante, e faria dois
// açougues venderem "produtos diferentes" para o mesmo corte, o que destruiria a comparação no
// dia em que o segundo mercado for real.
//
// `size_text` é nulo porque **não existe gramatura**: a peça é fatiada na hora e pesada. Escrever
// "1 kg" ali seria inventar uma embalagem para ter o que mostrar, e `parseSizeText` leria como
// quantidade estruturada de verdade. Nulo produz o estado `missing` — ausência declarada, que é
// o que de fato se sabe. A unidade de cobrança vive em `price_unit`, que é campo próprio.

function corte(id: string, name: string, category: string): Product {
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

export const PRODUTO_FILE_DE_PEITO = corte(
  "22222222-2222-2222-2222-0000000000a1",
  "Filé de peito de frango",
  "Aves",
);

export const PRODUTO_LINGUICA_CASEIRA = corte(
  "22222222-2222-2222-2222-0000000000a2",
  "Linguiça caseira",
  "Embutidos",
);

export const PRODUTO_COXA_SOBRECOXA = corte(
  "22222222-2222-2222-2222-0000000000a3",
  "Coxa e sobrecoxa de frango",
  "Aves",
);

export const PRODUTO_PATINHO = corte(
  "22222222-2222-2222-2222-0000000000a4",
  "Patinho bovino",
  "Bovinos",
);

export const PRODUTO_ACEM = corte(
  "22222222-2222-2222-2222-0000000000a5",
  "Acém sem osso",
  "Bovinos",
);

/**
 * A IMAGEM É DO PRODUTO, NÃO DA TELA.
 *
 * Um mapa único, consultado por toda tela que desenha um produto. É o que torna impossível a
 * imagem mudar entre Home, busca, comparação e detalhe.
 */
const IMAGEM_POR_PRODUTO: Readonly<Record<string, ImagemDeProduto>> = {
  [PRODUTO_FILE_DE_PEITO.id]: ilustracao("file-de-peito.jpg", "filé de peito de frango"),
  [PRODUTO_LINGUICA_CASEIRA.id]: ilustracao("linguica-caseira.jpg", "linguiça caseira"),
  [PRODUTO_COXA_SOBRECOXA.id]: ilustracao("coxa-sobrecoxa.jpg", "coxa e sobrecoxa de frango"),
  [PRODUTO_PATINHO.id]: ilustracao("patinho.jpg", "patinho bovino"),
  [PRODUTO_ACEM.id]: ilustracao("acem-sem-osso.jpg", "acém sem osso"),
};

export function imagemDoProdutoDemo(productId: string): ImagemDeProduto | null {
  return IMAGEM_POR_PRODUTO[productId] ?? null;
}

export const DEMO_PRODUCTS: readonly Product[] = [
  PRODUTO_FILE_DE_PEITO,
  PRODUTO_LINGUICA_CASEIRA,
  PRODUTO_COXA_SOBRECOXA,
  PRODUTO_PATINHO,
  PRODUTO_ACEM,
];

// =============================================================================
// OFERTAS
// =============================================================================

const DIA = 86_400_000;

/** Múltiplo exato de 24 h: é assim que `formatRelativeDay` conta. */
function dias(now: Date, offset: number): string {
  return new Date(now.getTime() + offset * DIA).toISOString();
}

interface Semente {
  readonly id: string;
  readonly produto: Product;
  readonly mercado: Market;
  readonly price: number;
  readonly observadoHa: number;
  /** Exemplo, e não observação. Nunca as duas coisas. */
  readonly exemplo?: true;
}

/**
 * Os dez preços: cinco observados, cinco de exemplo.
 *
 * Os observados são exatamente os das placas do balcão, sem arredondar e sem "melhorar".
 * Os de exemplo foram escolhidos acima dos reais **porque foi assim que o Founder os pediu**
 * — e nada no código garante que sempre será assim; a ordem continua saindo do preço.
 */
const SEMENTES: readonly Semente[] = [
  // ---------- Açougue Mota — observado presencialmente em 08/08/2026 ----------
  {
    id: "demo-price-mota-file-de-peito",
    produto: PRODUTO_FILE_DE_PEITO,
    mercado: ACOUGUE_MOTA,
    price: 20.99,
    observadoHa: -1,
  },
  {
    id: "demo-price-mota-linguica-caseira",
    produto: PRODUTO_LINGUICA_CASEIRA,
    mercado: ACOUGUE_MOTA,
    price: 26.99,
    observadoHa: -1,
  },
  {
    id: "demo-price-mota-coxa-sobrecoxa",
    produto: PRODUTO_COXA_SOBRECOXA,
    mercado: ACOUGUE_MOTA,
    price: 11.99,
    observadoHa: -1,
  },
  {
    id: "demo-price-mota-patinho",
    produto: PRODUTO_PATINHO,
    mercado: ACOUGUE_MOTA,
    price: 46.99,
    observadoHa: -1,
  },
  {
    id: "demo-price-mota-acem",
    produto: PRODUTO_ACEM,
    mercado: ACOUGUE_MOTA,
    price: 39.99,
    observadoHa: -1,
  },

  // ---------- Mercado 2 — exemplo ilustrativo, nada disto foi observado ----------
  {
    id: "demo-price-exemplo-file-de-peito",
    produto: PRODUTO_FILE_DE_PEITO,
    mercado: MERCADO_EXEMPLO,
    price: 22.49,
    observadoHa: -1,
    exemplo: true,
  },
  {
    id: "demo-price-exemplo-linguica-caseira",
    produto: PRODUTO_LINGUICA_CASEIRA,
    mercado: MERCADO_EXEMPLO,
    price: 28.99,
    observadoHa: -1,
    exemplo: true,
  },
  {
    id: "demo-price-exemplo-coxa-sobrecoxa",
    produto: PRODUTO_COXA_SOBRECOXA,
    mercado: MERCADO_EXEMPLO,
    price: 13.49,
    observadoHa: -1,
    exemplo: true,
  },
  {
    id: "demo-price-exemplo-patinho",
    produto: PRODUTO_PATINHO,
    mercado: MERCADO_EXEMPLO,
    price: 49.99,
    observadoHa: -1,
    exemplo: true,
  },
  {
    id: "demo-price-exemplo-acem",
    produto: PRODUTO_ACEM,
    mercado: MERCADO_EXEMPLO,
    price: 42.99,
    observadoHa: -1,
    exemplo: true,
  },
];

/**
 * Todas as ofertas da demonstração, com produto, mercado e imagem já resolvidos.
 *
 * A linha de exemplo sai daqui **sem imagem**. Não é economia de asset: dar a mesma
 * ilustração ao Mercado 2 faria as duas linhas parecerem igualmente observadas, que é
 * exatamente a confusão que esta demonstração não pode criar.
 */
export function construirOfertasDemo(now: Date = new Date()): OfertaCardV2[] {
  return SEMENTES.map((s) => ({
    id: s.id,
    product_id: s.produto.id,
    market_id: s.mercado.id,
    price: s.price,
    price_unit: "kg" as const,
    // `shelf_photo` descreve a coleta real: as placas do balcão foram fotografadas. Na linha
    // de exemplo o campo continua preenchido porque o domínio o exige, e a tela é proibida de
    // desenhá-lo — ver `exemploIlustrativo` em `card-v2.ts`.
    source_type: "shelf_photo" as const,
    observed_at: dias(now, s.observadoHa),
    // Preço de balcão não tem validade anunciada, e inventar uma criaria urgência falsa.
    valid_until: null,
    special_condition: null,
    source_reference: DEMO_FIXTURE_REFERENCE,
    is_featured: true,
    is_active: true,
    is_demo: true,
    created_at: dias(now, s.observadoHa),
    market: s.mercado,
    product: s.produto,
    image: s.exemplo === true ? null : imagemDoProdutoDemo(s.produto.id),
    ...(s.exemplo === true ? { exemplo_ilustrativo: true as const } : {}),
  }));
}

/**
 * Ordem canônica de comparação, a MESMA do banco e de `CLAUDE.md` princípio 3:
 * **preço crescente → observação mais recente → `id`**.
 *
 * O terceiro critério não é enfeite: sem ele, dois preços iguais no mesmo instante trocam de
 * lugar entre renderizações, e a mesma consulta produz listas diferentes.
 */
export function ordenarOfertas(ofertas: OfertaCardV2[]): OfertaCardV2[] {
  return [...ofertas].sort(
    (a, b) =>
      a.price - b.price ||
      Date.parse(b.observed_at) - Date.parse(a.observed_at) ||
      a.id.localeCompare(b.id),
  );
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
