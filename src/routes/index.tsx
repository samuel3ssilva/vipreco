import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileCheck2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { UsualMarketPicker } from "@/components/UsualMarketPicker";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { SourceBadge } from "@/components/SourceBadge";
import { StateMessage } from "@/components/StateMessage";
import { SectionHeader } from "@/components/PageContainer";
import { getWeeklyOpportunities } from "@/services/catalog";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";
import { isValidPrice } from "@/lib/comparison";

export const Route = createFileRoute("/")({
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
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

const SHORTCUTS = ["Café", "Arroz", "Feijão", "Leite"];

function HomePage() {
  const opportunities = useQuery({
    queryKey: ["weekly-opportunities"],
    queryFn: () => getWeeklyOpportunities(),
    staleTime: 60_000,
  });
  const validOpportunities = (opportunities.data ?? []).filter((entry) => isValidPrice(entry));
  const isDemo =
    import.meta.env.VITE_DEMO_MODE === "true" ||
    validOpportunities.some((entry) => entry.is_demo || entry.market?.is_demo);

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
          <PriceDisclaimer showDemoNotice={isDemo} />
        </section>

        <section aria-labelledby="oportunidades-titulo" className="space-y-3">
          <SectionHeader
            id="oportunidades-titulo"
            title="Oportunidades da semana"
            description="Preços baixos conferidos recentemente nos mercados da sua região."
          />
          {opportunities.isPending ? (
            <StateMessage variant="loading" title="Carregando oportunidades…" />
          ) : opportunities.isError ? (
            <StateMessage
              variant="error"
              title="Não conseguimos carregar as oportunidades."
              description="Verifique sua conexão e tente novamente."
              onRetry={() => opportunities.refetch()}
            />
          ) : validOpportunities.length === 0 ? (
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
                    {formatRelativeDay(entry.observed_at)})
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
        </section>

        <UsualMarketPicker />

        <section className="card-compact bg-surface">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <FileCheck2 aria-hidden="true" className="size-4 text-primary" />
            De onde vêm esses preços?
          </h2>
          <p className="meta-text mt-0.5">
            Notas fiscais, pesquisa em loja, fotos de etiqueta, informações dos mercados e da
            comunidade.
          </p>
          <Link to="/como-funciona" className="btn-base btn-secondary btn-sm mt-2">
            Entender como funciona
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
