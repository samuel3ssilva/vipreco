/**
 * R3.2 — as ofertas fictícias do laboratório do Card v2.
 *
 * =============================================================================
 * TUDO AQUI É INVENTADO, E É INVENTADO DE UM JEITO QUE NÃO DÁ PARA CONFUNDIR
 * =============================================================================
 *
 * O mandato §8 é explícito e a razão é de produto, não de estilo: um card de exemplo com
 * nome de rede real e preço plausível é indistinguível de um card real assim que sai da
 * página em que nasceu — num screenshot, num slide, numa conversa. E o ViPreço inteiro se
 * apoia em nunca publicar preço sem procedência.
 *
 * Por isso: **"Mercado Exemplo A"**, **"Bairro Exemplo"**, **"Produto Demonstrativo"**.
 * Nomes que ninguém confunde com um mercado de Artemis.
 *
 * O que NÃO existe neste arquivo, e o contrato reprova se aparecer:
 *
 * - preço vindo de staging, de produção ou de qualquer lugar remoto;
 * - nome de rede — nem os ilustrativos do North Star (Bom Preço, Mix Mateus, Assaí);
 * - logotipo de qualquer mercado;
 * - GTIN — nem válido, nem inválido, nem exibido, nem guardado;
 * - foto de embalagem de marca real;
 * - bairro ou promoção de verdade.
 *
 * =============================================================================
 * A IMAGEM "APROVADA" É UM DESENHO, E ISSO É O PONTO
 * =============================================================================
 *
 * A variante A precisa provar o caminho **com** imagem. Usar a foto de um produto real
 * seria usar a imagem de uma marca sem autorização; usar a foto de um produto parecido
 * seria a aproximação que o `IMAGE-POLICY.md` proíbe. Então a imagem é um SVG geométrico
 * embutido, e o `alt` diz o que ela é: uma demonstração. Ninguém a confunde com uma
 * embalagem.
 */
import type { OfertaCardV2 } from "@/lib/card-v2";
import type { Market, Product } from "@/types/domain";

/**
 * Instante de referência FIXO.
 *
 * Nenhum `Date.now()`. Duas razões, e as duas doem quando faltam: `Date.now()` no render
 * produz HTML diferente no servidor e no cliente (divergência de hidratação), e um
 * screenshot de evidência gerado hoje ficaria diferente do de amanhã sem que nada tivesse
 * mudado — evidência que muda sozinha não é evidência.
 */
export const AGORA_DEMO = new Date("2026-08-06T15:00:00.000Z");

/** Uma silhueta neutra, embutida. Não é foto, não é embalagem, não é marca. */
const IMAGEM_DEMONSTRATIVA =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112 112">` +
      `<rect width="112" height="112" rx="8" fill="#e8efe9"/>` +
      `<rect x="30" y="26" width="52" height="62" rx="4" fill="none" stroke="#0e5c3c" stroke-width="3"/>` +
      `<path d="M30 42h52" stroke="#0e5c3c" stroke-width="3"/>` +
      `<circle cx="56" cy="65" r="12" fill="none" stroke="#0e5c3c" stroke-width="3"/>` +
      `</svg>`,
  );

const MERCADO_A: Market = {
  id: "mercado-exemplo-a",
  name: "Mercado Exemplo A",
  neighborhood: "Bairro Exemplo",
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

const MERCADO_B: Market = {
  id: "mercado-exemplo-b",
  name: "Mercado Exemplo B",
  neighborhood: "Bairro Exemplo",
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

/** Mercado sem bairro cadastrado — o rótulo de bairro simplesmente não aparece. */
const MERCADO_C: Market = {
  id: "mercado-exemplo-c",
  name: "Mercado Exemplo C com nome bastante longo para testar a quebra",
  neighborhood: null,
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

/** Base comum. `gtin` é sempre `null`: o card não exibe identificador, e o fixture não guarda um. */
function produto(campos: Partial<Product> & Pick<Product, "id" | "name">): Product {
  return {
    brand: "Marca Exemplo",
    variant: null,
    size_text: null,
    gtin: null,
    category: "Mercearia",
    is_active: true,
    is_demo: true,
    ...campos,
  };
}

function oferta(campos: Partial<OfertaCardV2> & Pick<OfertaCardV2, "id" | "product" | "market">) {
  const base: OfertaCardV2 = {
    product_id: campos.product.id,
    market_id: campos.market.id,
    price: 0,
    source_type: "weekly_audit",
    observed_at: AGORA_DEMO.toISOString(),
    valid_until: null,
    special_condition: null,
    source_reference: null,
    is_featured: false,
    is_active: true,
    is_demo: true,
    created_at: AGORA_DEMO.toISOString(),
    ...campos,
  };
  return base;
}

/** Um dia antes/depois do instante fixo, em ISO. Determinístico por construção. */
function dias(delta: number): string {
  return new Date(AGORA_DEMO.getTime() + delta * 86_400_000).toISOString();
}

export interface VarianteDoLaboratorio {
  chave: string;
  titulo: string;
  /** O que esta variante prova. Aparece na página, ao lado do card. */
  proposito: string;
  oferta: OfertaCardV2 | null;
  destaque?: boolean;
  avisoParcial?: string;
}

/**
 * As variantes obrigatórias do mandato §9, na ordem em que ele as lista.
 *
 * `D` aparece em duas leituras porque "desatualizada" tem duas causas diferentes no
 * domínio, e o texto precisa distingui-las: uma validade que venceu é uma coisa; uma
 * observação antiga onde validade nenhuma foi informada é outra. Dizer "expirada" na
 * segunda seria inventar uma validade só para poder anunciar que ela venceu.
 */
export const VARIANTES: readonly VarianteDoLaboratorio[] = [
  {
    chave: "A",
    titulo: "A. Oferta padrão",
    proposito:
      "Produto exato, imagem com correspondência aprovada, preço, mercado e procedência completa. " +
      "A quantidade é estruturada e aprovada, então o preço unitário aparece; há observação anterior " +
      "com data, então o percentual aparece — em frase, não só em cor.",
    destaque: true,
    oferta: oferta({
      id: "oferta-a",
      product: produto({
        id: "produto-demonstrativo-1",
        name: "Produto Demonstrativo Um",
        variant: "Tradicional",
        package_type: "unidade",
        quantity_value: 500,
        quantity_unit: "g",
      }),
      market: MERCADO_A,
      price: 12.9,
      source_type: "receipt",
      observed_at: dias(-1),
      valid_until: dias(9),
      quantity_provenance: "confirmed",
      markets_with_valid_price: 4,
      image: {
        src: IMAGEM_DEMONSTRATIVA,
        alt: "Imagem de demonstração — silhueta genérica, não é a embalagem do produto",
        review_status: "approved",
        variant_match: "exact",
      },
    }),
  },
  {
    chave: "B",
    titulo: "B. Promoção com condição",
    proposito:
      "A condição fica visível junto do preço, com a validade ao lado. O requisito nunca é " +
      "escondido: uma promoção cujo limite só aparece na gôndola é uma promessa que o produto " +
      "não pode cumprir.",
    oferta: oferta({
      id: "oferta-b",
      product: produto({
        id: "produto-demonstrativo-2",
        name: "Produto Demonstrativo Dois",
        variant: "Concentrado",
        package_type: "garrafa",
        quantity_value: 900,
        quantity_unit: "ml",
        category: "Limpeza",
      }),
      market: MERCADO_B,
      price: 7.49,
      source_type: "store_list",
      observed_at: dias(-2),
      valid_until: dias(2),
      special_condition: "Limite de 2 unidades por cliente, enquanto durar o estoque",
      quantity_provenance: "confirmed",
      markets_with_valid_price: 3,
    }),
  },
  {
    chave: "C",
    titulo: "C. Sem imagem confiável",
    proposito:
      "Há imagem, e ela é recusada: a correspondência de variante é apenas aproximada. Cai no " +
      "placeholder, com dignidade e sem espaço quebrado — imagem errada é pior que ausência de " +
      "imagem, e a identidade continua inteira em texto.",
    oferta: oferta({
      id: "oferta-c",
      product: produto({
        id: "produto-demonstrativo-3",
        name: "Produto Demonstrativo Três com nome longo o bastante para ocupar duas linhas inteiras",
        variant: "Sem lactose",
        package_type: "caixa",
        quantity_value: 1,
        quantity_unit: "l",
        category: "Laticínios",
      }),
      market: MERCADO_C,
      price: 6.25,
      source_type: "shelf_photo",
      observed_at: dias(-3),
      valid_until: dias(5),
      quantity_provenance: "confirmed",
      markets_with_valid_price: 2,
      image: {
        src: IMAGEM_DEMONSTRATIVA,
        alt: "Imagem de demonstração",
        review_status: "approved",
        // Aprovada **e** aproximada. As duas portas precisam abrir; esta fica fechada.
        variant_match: "approximate",
      },
    }),
  },
  {
    chave: "D1",
    titulo: "D1. Oferta desatualizada — validade vencida",
    proposito:
      "O relógio mudou o estado: a validade informada pelo mercado já passou. O rótulo vem antes " +
      "do preço, o preço perde ênfase, o CTA passa a oferecer os preços atuais, e o card sai da " +
      "lista orgânica.",
    oferta: oferta({
      id: "oferta-d1",
      product: produto({
        id: "produto-demonstrativo-4",
        name: "Produto Demonstrativo Quatro",
        variant: "Sachê",
        package_type: "sache",
        quantity_value: 250,
        quantity_unit: "g",
      }),
      market: MERCADO_A,
      price: 9.9,
      source_type: "social_media",
      observed_at: dias(-14),
      valid_until: dias(-3),
      quantity_provenance: "confirmed",
      markets_with_valid_price: 3,
    }),
  },
  {
    chave: "D2",
    titulo: "D2. Oferta desatualizada — observação antiga, sem validade",
    proposito:
      "Ninguém informou validade, e a última observação tem mais de uma semana. O rótulo diz " +
      "'desatualizado', e não 'expirado': afirmar expiração exigiria uma validade que nunca " +
      "existiu.",
    oferta: oferta({
      id: "oferta-d2",
      product: produto({
        id: "produto-demonstrativo-5",
        name: "Produto Demonstrativo Cinco",
        variant: "Pack",
        package_type: "pack",
        quantity_value: 2100,
        quantity_unit: "ml",
        units_per_package: 6,
        category: "Bebidas",
      }),
      market: MERCADO_B,
      price: 18.4,
      source_type: "community",
      observed_at: dias(-21),
      quantity_provenance: "confirmed",
      markets_with_valid_price: 2,
    }),
  },
  {
    chave: "E",
    titulo: "E. Quantidade não confiável",
    proposito:
      "Só existe `size_text`, que é texto livre. Nenhum preço unitário é exibido e nenhum é " +
      "estimado. O texto da embalagem é preservado como está escrito — é a única pista de " +
      "gramatura que o leitor tem.",
    oferta: oferta({
      id: "oferta-e",
      product: produto({
        id: "produto-demonstrativo-6",
        name: "Produto Demonstrativo Seis",
        variant: "A granel",
        size_text: "aprox. 1,2 kg — peso variável",
        category: "Hortifruti",
      }),
      market: MERCADO_C,
      price: 15.8,
      source_type: "weekly_audit",
      observed_at: dias(-1),
      valid_until: dias(6),
      markets_with_valid_price: 2,
    }),
  },
  {
    chave: "F",
    titulo: "F. Sem validade informada",
    proposito:
      "A ausência de validade é dita, não omitida. Nenhuma data é inventada e o card não sugere " +
      "que o preço vale indefinidamente. Como a observação é recente, a oferta continua ativa.",
    oferta: oferta({
      id: "oferta-f",
      product: produto({
        id: "produto-demonstrativo-7",
        name: "Produto Demonstrativo Sete",
        package_type: "vidro",
        quantity_value: 300,
        quantity_unit: "g",
        category: "Higiene",
      }),
      market: MERCADO_A,
      price: 21.99,
      source_type: "weekly_audit",
      observed_at: dias(-2),
      quantity_provenance: "confirmed",
      markets_with_valid_price: 1,
    }),
  },
  {
    chave: "G",
    titulo: "G. Carregamento",
    proposito:
      "A geometria do esqueleto é a do card. O layout não desloca quando o dado chega, e o " +
      "carregamento é anunciado uma vez pela região — não uma vez por retângulo.",
    oferta: null,
  },
  {
    chave: "H",
    titulo: "H. Erro parcial",
    proposito:
      "Um campo não pôde ser carregado e é nomeado. O produto continua identificável, o preço " +
      "continua com procedência, e o que falta aparece como frase em vez de buraco.",
    oferta: oferta({
      id: "oferta-h",
      product: produto({
        id: "produto-demonstrativo-8",
        name: "Produto Demonstrativo Oito",
        variant: "Refil",
        package_type: "unidade",
        quantity_value: 400,
        quantity_unit: "ml",
        category: "Limpeza",
      }),
      market: MERCADO_B,
      price: 5.35,
      source_type: "store_list",
      observed_at: dias(-4),
      valid_until: dias(4),
      quantity_provenance: "confirmed",
    }),
    avisoParcial: "Contagem de mercados indisponível agora.",
  },
] as const;

/** Um preço grande, para provar que o número não estoura a 320 px. */
export const OFERTA_PRECO_GRANDE: OfertaCardV2 = oferta({
  id: "oferta-preco-grande",
  product: produto({
    id: "produto-demonstrativo-9",
    name: "Produto Demonstrativo Nove",
    variant: "Embalagem econômica",
    package_type: "caixa",
    quantity_value: 20,
    quantity_unit: "kg",
  }),
  market: MERCADO_C,
  price: 1234.56,
  observed_at: dias(-1),
  valid_until: dias(10),
  quantity_provenance: "confirmed",
  markets_with_valid_price: 5,
});
