import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HomeAchados } from "@/components/HomeAchados";
import { HomeContexto } from "@/components/HomeContexto";
import { TrustSection } from "@/components/TrustSection";
import { LocalStory } from "@/components/LocalStory";
import { ProductSearch } from "@/components/ProductSearch";
import { ShareAchadoButton } from "@/components/ShareAchadoButton";
import { StickyWhatsAppCta } from "@/components/StickyWhatsAppCta";
import { UsualMarketPicker } from "@/components/UsualMarketPicker";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { StateMessage } from "@/components/StateMessage";
import { SectionHeader } from "@/components/PageContainer";
import { loadHomeOpportunities } from "@/services/home-opportunities";
import { loadHomeMarkets } from "@/services/home-markets";
import { appMode } from "@/lib/app-mode";
import { absoluteAssetUrl, ogImageMeta } from "@/lib/og";
import { formatProductName } from "@/lib/format";
import { isValidPrice } from "@/lib/comparison";

// Tudo o que a Home mostra de primeira — os Achados e a lista de mercados do seletor — chega pelo
// loader da rota (mesmo padrão de `/produto/$productId`), não por `useQuery` no cliente: o HTML
// inicial já vem completo, sem nenhum estado de carregamento e sem depender de JavaScript no
// navegador para aparecer.
export const Route = createFileRoute("/")({
  loader: async () => {
    // Uma única resolução de modo para as duas fontes: Achados e mercados nunca podem divergir
    // entre demonstração e piloto.
    const source = appMode();
    const [opportunities, markets] = await Promise.all([
      loadHomeOpportunities(source),
      loadHomeMarkets(source),
    ]);
    return { ...opportunities, markets };
  },
  head: () => ({
    meta: [
      { title: "ViPreço — onde está mais barato hoje" },
      {
        name: "description",
        content:
          "Compare o mesmo produto entre os mercados da sua região e veja onde está mais barato, quando o preço foi observado e de onde veio a informação.",
      },
      { property: "og:title", content: "ViPreço — onde está mais barato hoje" },
      {
        property: "og:description",
        content:
          "Compare produtos iguais entre mercados da sua região com data e fonte de cada preço.",
      },
      { property: "og:type", content: "website" },
      ...ogImageMeta(),
    ],
  }),
  component: HomePage,
  errorComponent: () => (
    <AppShell>
      <StateMessage
        variant="error"
        title="Não conseguimos carregar as oportunidades."
        description="Verifique sua conexão e tente novamente."
        onRetry={() => window.location.reload()}
      />
    </AppShell>
  ),
});

const SHORTCUTS = ["Café", "Arroz", "Feijão", "Leite"];

/**
 * A ORDEM DA HOME MUDOU EM R3.3, E A MUDANÇA É A BUSCA SUBINDO.
 *
 * Antes: promessa → Achados → busca → seletor de mercado → confiança → história local. A busca
 * ficava depois de tudo o que o produto tinha para mostrar, e o usuário que chegava sabendo o
 * que queria precisava rolar por uma vitrine antes de poder perguntar.
 *
 * Agora: contexto → **busca** → Achados → seletor → confiança → história. É a decisão D2 do
 * roadmap (MVP-E2-02, MVP-DESIGN-05), e ela reconhece o que o produto é: a comparação é o
 * núcleo, e a busca é a porta dela. Achados são descoberta — importam, e vêm logo abaixo, mas
 * não na frente de quem já sabe o que procura.
 *
 * O que NÃO mudou: os Achados continuam vindo do loader, o HTML inicial continua sem estado de
 * carregamento, e o CTA fixo do mobile continua com a anti-duplicação.
 */
function HomePage() {
  const { source, opportunities, generatedAt, markets } = Route.useLoaderData();
  // Referência única de tempo, vinda do servidor: mantém "ontem"/"há 2 dias" idêntico no HTML
  // inicial e depois da hidratação, mesmo se o relógio do aparelho estiver adiantado.
  const renderedAt = new Date(generatedAt);
  const validOpportunities = opportunities.filter((entry) => isValidPrice(entry, renderedAt));
  // O modo do ambiente decide; a origem do dado é uma trava a mais, para o caso de um dado
  // fictício aparecer num ambiente que se declara piloto.
  const isDemo =
    source === "demo" || validOpportunities.some((entry) => entry.is_demo || entry.market?.is_demo);
  const [destaque] = validOpportunities;

  return (
    <AppShell>
      <div className="space-y-10">
        <HomeContexto />

        {/* A BUSCA NA PRIMEIRA DOBRA. Sem `autoFocus`: abrir o teclado do celular por conta
            própria cobre metade da tela antes de a pessoa decidir o que quer fazer. */}
        <section aria-labelledby="busca-titulo" className="space-y-3">
          <SectionHeader
            id="busca-titulo"
            title="Procurando um produto específico?"
            description="Compare o mesmo produto entre os mercados, com data e fonte de cada preço."
          />
          <ProductSearch label="Qual produto você quer comparar?" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-text">Buscas comuns:</span>
            {SHORTCUTS.map((shortcut) => (
              <Link
                key={shortcut}
                to="/buscar"
                search={{ q: shortcut }}
                className="btn-base btn-secondary btn-sm btn-touch-48"
              >
                {shortcut}
              </Link>
            ))}
          </div>
          <PriceDisclaimer />
        </section>

        <HomeAchados
          opportunities={validOpportunities}
          now={renderedAt}
          shareSlot={
            destaque ? (
              <ShareAchadoButton
                payload={{
                  produto: formatProductName(destaque.product),
                  preco: destaque.price,
                  mercado: destaque.market.name,
                  validUntil: destaque.valid_until,
                  url: absoluteAssetUrl(`/produto/${destaque.product.id}`),
                  isDemo,
                }}
              />
            ) : null
          }
          seal={
            isDemo ? (
              <p
                className="font-data inline-flex items-center gap-2 rounded-md border border-dashed bg-surface px-3 py-1.5 text-xs text-muted-foreground"
                style={{ borderColor: "var(--vp-border-strong)" }}
              >
                <span aria-hidden="true">◌</span>
                dados fictícios · exemplos para demonstrar o formato
              </p>
            ) : null
          }
          fallback={
            <StateMessage
              variant="empty"
              title="Estamos começando a mapear preços na sua região."
              description="Os primeiros Achados aparecem aqui assim que forem conferidos. Por enquanto, use a busca para comparar um produto específico."
            />
          }
        />

        {/* O WHATSAPP É SECUNDÁRIO, e a posição diz isso. Ele vem depois do que o produto
            entrega, não antes: pedir o contato de alguém que ainda não viu nada é pedir cedo
            demais. Nenhuma promessa de frequência — o texto do CTA não diz "todo dia". */}
        <WhatsAppCta />

        <UsualMarketPicker initialMarkets={markets} />

        <TrustSection isDemo={isDemo} />

        <LocalStory />
      </div>

      <StickyWhatsAppCta />
    </AppShell>
  );
}
