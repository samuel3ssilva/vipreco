import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { UsualMarketPicker } from "@/components/UsualMarketPicker";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { SourceBadge } from "@/components/SourceBadge";
import { StateMessage } from "@/components/StateMessage";
import { SectionHeader } from "@/components/PageContainer";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { loadHomeOpportunities } from "@/services/home-opportunities";
import { loadHomeMarkets } from "@/services/home-markets";
import { appMode } from "@/lib/app-mode";
import { ogImageMeta } from "@/lib/og";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";
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

  return (
    <AppShell>
      <div className="space-y-8">
        <section aria-labelledby="titulo-principal" className="space-y-3">
          <h1 id="titulo-principal" className="font-display text-2xl leading-tight sm:text-3xl">
            Descubra onde o seu produto está mais barato na sua região.
          </h1>
          <p className="meta-text max-w-2xl text-sm">
            Compare produtos iguais entre mercados, com data e fonte de cada preço.
          </p>
          <ProductSearch label="Qual produto você quer comparar?" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="meta-text">Buscas comuns:</span>
            {SHORTCUTS.map((shortcut) => (
              <Link
                key={shortcut}
                to="/buscar"
                search={{ q: shortcut }}
                className="btn-base btn-secondary btn-sm"
              >
                {shortcut}
              </Link>
            ))}
          </div>
          {/* O aviso de ambiente saiu daqui: a faixa acima do header já diz, em toda página, que
              esta não é a versão pública. Aqui fica só o que é sobre preço. */}
          <PriceDisclaimer />
          <WhatsAppCta />
        </section>

        <section aria-labelledby="oportunidades-titulo" className="space-y-3">
          <SectionHeader
            id="oportunidades-titulo"
            title="Achados da semana"
            description="Exemplos fictícios para mostrar como produtos iguais podem aparecer em diferentes mercados."
          />
          {validOpportunities.length === 0 ? (
            <StateMessage
              variant="empty"
              title="Estamos começando a mapear preços na sua região."
              description="As primeiras oportunidades aparecem aqui assim que forem conferidas. Por enquanto, use a busca para comparar um produto específico."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {validOpportunities.map((entry) => (
                <li key={entry.id} className="card-base flex flex-col">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="clamp-2 text-base font-bold">
                        {formatProductName(entry.product)}
                      </h3>
                      <p className="meta-text truncate">{entry.market.name}</p>
                    </div>
                    <p className="font-data shrink-0 text-xl font-bold tabular-nums text-primary">
                      {formatPrice(entry.price)}
                    </p>
                  </div>
                  <p className="meta-text mt-1.5">
                    Observado em {formatDate(entry.observed_at)} (
                    {formatRelativeDay(entry.observed_at, renderedAt)})
                  </p>
                  {entry.special_condition ? (
                    <p className="meta-text">Condição: {entry.special_condition}</p>
                  ) : null}
                  <div className="mt-1.5">
                    <SourceBadge source={entry.source_type} />
                  </div>
                  <Link
                    to="/produto/$productId"
                    params={{ productId: entry.product.id }}
                    className="btn-base btn-secondary btn-sm mt-3 w-full"
                  >
                    Ver preços por mercado
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {/* Selo de dados fictícios (North Star v1.2.2): marca os Achados, logo abaixo deles. */}
          {isDemo ? (
            <p
              className="font-data inline-flex items-center gap-2 rounded-md border border-dashed bg-surface px-3 py-1.5 text-xs text-muted-foreground"
              style={{ borderColor: "var(--vp-border-strong)" }}
            >
              <span aria-hidden="true">◌</span>
              dados fictícios · exemplos para demonstrar o formato
            </p>
          ) : null}
        </section>

        <UsualMarketPicker initialMarkets={markets} />

        <section className="card-compact bg-surface">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <FileCheck2 aria-hidden="true" className="size-4 text-primary" />
            De onde vêm esses preços?
          </h2>
          <p className="meta-text mt-0.5">
            Nesta demonstração, todos os preços são fictícios. Quando o teste começar, cada preço
            será publicado com sua origem identificada, como informação enviada pelo mercado ou
            pesquisa autorizada.
          </p>
          <Link to="/como-funciona" className="btn-base btn-secondary btn-sm mt-2">
            Entender como funciona
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
