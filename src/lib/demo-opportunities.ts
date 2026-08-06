/**
 * Fixture versionado da Home no modo DEMO (Teste MVP): os três Achados e a lista de mercados
 * do seletor "Seu mercado habitual".
 *
 * Por que existe: até este PR os três primeiros Achados eram buscados no cliente
 * (`useQuery` + Supabase), o que produzia um HTML inicial sem conteúdo e o texto
 * "Carregando oportunidades…". Com o loader da rota, a Home precisa de uma fonte que o
 * servidor possa resolver sem rede — este arquivo é essa fonte.
 *
 * Regras que este arquivo respeita (não afrouxar sem decisão do PMO):
 * - Todos os dados são **fictícios** e marcados com `is_demo: true` nas três entidades.
 * - Nenhum mercado real aparece como participante: os nomes seguem a mesma convenção
 *   genérica de `supabase/seed.sql` ("Mercado principal", "Mercado local 2"…).
 * - Sem segredo, sem telefone, sem endereço de pessoa, sem qualquer dado pessoal.
 * - Os `id` de produto e de mercado são os mesmos do seed fictício aplicado em staging,
 *   para que "Ver preços por mercado" continue abrindo a página do produto — este PR não
 *   pode quebrar a navegação existente.
 * - Datas são **relativas** ao momento em que o loader roda (múltiplos exatos de 24 h), para
 *   que "ontem"/"há 2 dias" e a data exibida continuem coerentes entre si em qualquer dia.
 *
 * Este arquivo não cria migration, não altera schema e não é inserido no Supabase.
 */
import type { Market, Opportunity, Product } from "@/types/domain";

/** Quantidade de Achados que a Home entrega no modo DEMO. */
export const HOME_OPPORTUNITY_COUNT = 3;

/** Marcador explícito de demonstração, carregado por todo preço deste fixture. */
export const DEMO_FIXTURE_REFERENCE = "Dado fictício de demonstração (fixture versionado)";

/**
 * Achado de demonstração — o tipo de domínio, sem extensão.
 *
 * Ele teve um `previous_price?` opcional, para alimentar o "antes R$ X" do North Star. O campo
 * saiu em R3.3 junto com o que o exibia: sem P-01 decidida (MVP-DOCS-02), não existe critério
 * escrito para QUAL observação anterior conta, e um fixture que carrega o número mantém vivo o
 * componente que o mostra. Tirar do card e deixar no dado é adiar, não decidir.
 */
export type DemoOpportunity = Opportunity;

const MARKET_PRINCIPAL: Market = {
  id: "11111111-1111-1111-1111-000000000001",
  name: "Mercado principal",
  neighborhood: "Centro",
  address: "Rua Exemplo, 100 - Artemis",
  maps_url: "https://maps.google.com/?q=-22.5,-47.5",
  is_active: true,
  is_demo: true,
};

const MARKET_LOCAL_2: Market = {
  id: "11111111-1111-1111-1111-000000000002",
  name: "Mercado local 2",
  neighborhood: "Jardim Novo",
  address: "Rua Exemplo, 200 - Artemis",
  maps_url: "https://maps.google.com/?q=-22.51,-47.51",
  is_active: true,
  is_demo: true,
};

const MARKET_LOCAL_3: Market = {
  id: "11111111-1111-1111-1111-000000000003",
  name: "Mercado local 3",
  neighborhood: "Vila Antiga",
  address: "Rua Exemplo, 300 - Artemis",
  maps_url: null,
  is_active: true,
  is_demo: true,
};

const MARKET_LOCAL_4: Market = {
  id: "11111111-1111-1111-1111-000000000004",
  name: "Mercado local 4",
  neighborhood: "Beira Rio",
  address: "Rua Exemplo, 400 - Artemis",
  maps_url: "https://maps.google.com/?q=-22.52,-47.52",
  is_active: true,
  is_demo: true,
};

/**
 * Mercados fictícios oferecidos no seletor "Seu mercado habitual" em modo DEMO.
 *
 * São os mesmos quatro do seed fictício de staging, na mesma ordem alfabética que
 * `getMarkets()` devolveria: assim a escolha feita aqui continua válida na página do produto,
 * que lê o preço por mercado do banco. Nenhum mercado real aparece como participante.
 */
export const DEMO_MARKETS: readonly Market[] = [
  MARKET_LOCAL_2,
  MARKET_LOCAL_3,
  MARKET_LOCAL_4,
  MARKET_PRINCIPAL,
];

const PRODUCT_ARROZ: Product = {
  id: "22222222-2222-2222-2222-000000000001",
  name: "Arroz",
  brand: "Camil",
  variant: "Tipo 1",
  size_text: "5 kg",
  gtin: "7896006711117",
  category: "Mercearia",
  is_active: true,
  is_demo: true,
};

const PRODUCT_CAFE: Product = {
  id: "22222222-2222-2222-2222-000000000002",
  name: "Café",
  brand: "Pilão",
  variant: "Tradicional",
  size_text: "500 g",
  // Sem GTIN de propósito. O produto é fictício, e o valor que estava aqui reprovava no
  // dígito verificador GS1: um código inválido em dado de demonstração vira defeito assim
  // que a validação de MVP-E1-05 existir. Trocar por um código válido seria pior — um GTIN
  // válido pertence a algum produto real. GTIN é opcional, e ausente é o estado honesto.
  gtin: null,
  category: "Mercearia",
  is_active: true,
  is_demo: true,
};

const PRODUCT_LEITE: Product = {
  id: "22222222-2222-2222-2222-000000000003",
  name: "Leite",
  brand: "Italac",
  variant: "Integral",
  size_text: "1 L",
  gtin: "7898080640611",
  category: "Laticínios",
  is_active: true,
  is_demo: true,
};

const DAY_IN_MS = 86_400_000;

/**
 * Instante exatamente `offsetDays` dias antes/depois de `now`. Múltiplo exato de 24 h de
 * propósito: é assim que `formatRelativeDay` conta, então "ontem" nunca aparece ao lado de uma
 * data que não é a de ontem.
 */
function offsetByDays(now: Date, offsetDays: number): string {
  return new Date(now.getTime() + offsetDays * DAY_IN_MS).toISOString();
}

/**
 * Os três Achados fictícios da Home, já na ordem em que aparecem (observação mais recente
 * primeiro), espelhando preços destacados do seed fictício de staging.
 */
export function buildDemoOpportunities(now: Date = new Date()): DemoOpportunity[] {
  const observedYesterday = offsetByDays(now, -1);
  const observedTwoDaysAgo = offsetByDays(now, -2);

  return [
    {
      id: "demo-fixture-price-arroz-mercado-local-3",
      product_id: PRODUCT_ARROZ.id,
      market_id: MARKET_LOCAL_3.id,
      price: 26.49,
      source_type: "store_list",
      observed_at: observedYesterday,
      valid_until: offsetByDays(now, 5),
      special_condition: "Limite de 2 unidades por cliente",
      source_reference: DEMO_FIXTURE_REFERENCE,
      is_featured: true,
      is_active: true,
      is_demo: true,
      created_at: observedYesterday,
      market: MARKET_LOCAL_3,
      product: PRODUCT_ARROZ,
    },
    {
      id: "demo-fixture-price-cafe-mercado-local-2",
      product_id: PRODUCT_CAFE.id,
      market_id: MARKET_LOCAL_2.id,
      price: 17.49,
      source_type: "social_media",
      observed_at: observedTwoDaysAgo,
      valid_until: offsetByDays(now, 3),
      special_condition: "Oferta válida enquanto durar o estoque",
      source_reference: DEMO_FIXTURE_REFERENCE,
      is_featured: true,
      is_active: true,
      is_demo: true,
      created_at: observedTwoDaysAgo,
      market: MARKET_LOCAL_2,
      product: PRODUCT_CAFE,
    },
    {
      id: "demo-fixture-price-leite-mercado-principal",
      product_id: PRODUCT_LEITE.id,
      market_id: MARKET_PRINCIPAL.id,
      price: 5.29,
      source_type: "weekly_audit",
      observed_at: observedTwoDaysAgo,
      valid_until: null,
      special_condition: null,
      source_reference: DEMO_FIXTURE_REFERENCE,
      is_featured: true,
      is_active: true,
      is_demo: true,
      created_at: observedTwoDaysAgo,
      market: MARKET_PRINCIPAL,
      product: PRODUCT_LEITE,
    },
  ];
}
