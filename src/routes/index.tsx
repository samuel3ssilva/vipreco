import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { UsualMarketPicker } from "@/components/UsualMarketPicker";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { SourceBadge } from "@/components/SourceBadge";
import { StateMessage } from "@/components/StateMessage";
import { SectionHeader } from "@/components/PageContainer";
import {
  getProductsPriceStats,
  getRecentlyUpdatedProducts,
  getWeeklyOpportunities,
} from "@/services/catalog";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";
import { isValidPrice } from "@/lib/comparison";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Preço Artemis — onde está mais barato hoje" },
      {
        name: "description",
        content:
          "Compare o mesmo produto entre os mercados de Artemis e veja onde está mais barato, quando o preço foi observado e de onde veio a informação.",
      },
      { property: "og:title", content: "Preço Artemis — onde está mais barato hoje" },
      {
        property: "og:description",
        content: "Compare produtos iguais entre mercados de Artemis com data e fonte de cada preço.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

const SHORTCUTS = ["Café", "Arroz", "Feijão", "Leite", "Óleo", "Açúcar"];

function HomePage() {
  const opportunities = useQuery({
    queryKey: ["weekly-opportunities"],
    queryFn: () => getWeeklyOpportunities(),
    staleTime: 60_000,
  });
  const recent = useQuery({
    queryKey: ["recent-products"],
    queryFn: () => getRecentlyUpdatedProducts(),
    staleTime: 60_000,
  });

  const recentIds = (recent.data ?? []).map(({ product }) => product.id);
  const recentStats = useQuery({
    queryKey: ["recent-products-stats", recentIds],
    queryFn: () => getProductsPriceStats(recentIds),
    enabled: recentIds.length > 0,
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
            Descubra onde o seu produto está mais barato em Artemis.
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
            description="Preços baixos conferidos recentemente. Confira a data e a condição antes de ir à loja."
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
              title="Nenhuma oportunidade cadastrada no momento."
              description="Use a busca para comparar um produto específico."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {validOpportunities.map((entry) => (
                <li key={entry.id} className="card-base flex flex-col">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="clamp-2 text-base font-bold">{formatProductName(entry.product)}</h3>
                      <p className="meta-text truncate">{entry.market.name}</p>
                    </div>
                    <p className="shrink-0 text-xl font-bold tabular-nums text-primary">
                      {formatPrice(entry.price)}
                    </p>
                  </div>
                  <p className="meta-text mt-1.5">
                    Observado em {formatDate(entry.observed_at)} ({formatRelativeDay(entry.observed_at)})
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

        <section aria-labelledby="recentes-titulo" className="space-y-3">
          <SectionHeader
            id="recentes-titulo"
            title="Atualizados recentemente"
            description="Produtos com preço conferido nos últimos dias."
          />
          {recent.isPending ? (
            <StateMessage variant="loading" title="Carregando produtos…" />
          ) : recent.isError ? (
            <StateMessage
              variant="error"
              title="Não conseguimos carregar os produtos."
              onRetry={() => recent.refetch()}
            />
          ) : recent.data && recent.data.length > 0 ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recent.data.map(({ product, observedAt }) => {
                const stat = recentStats.data?.[product.id];
                return (
                  <li key={product.id}>
                    <Link
                      to="/produto/$productId"
                      params={{ productId: product.id }}
                      className="card-compact grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 hover:bg-surface"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{formatProductName(product)}</span>
                        <span className="meta-text block">
                          {stat && stat.marketCount > 0
                            ? `${stat.marketCount} ${stat.marketCount === 1 ? "mercado" : "mercados"} · `
                            : ""}
                          Atualizado {formatRelativeDay(observedAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {stat?.lowest != null ? (
                          <>
                            <span className="meta-text block">a partir de</span>
                            <span className="block font-bold tabular-nums">{formatPrice(stat.lowest)}</span>
                          </>
                        ) : (
                          <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground" />
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <StateMessage variant="empty" title="Ainda não há produtos com preços recentes." />
          )}
        </section>

        <UsualMarketPicker />

        <section className="card-compact bg-surface">
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            De onde vêm esses preços?
          </h2>
          <p className="meta-text mt-0.5">
            Notas fiscais, pesquisa em loja, fotos de etiqueta, informações dos mercados e da comunidade.
          </p>
          <Link to="/como-funciona" className="btn-base btn-secondary btn-sm mt-2">
            Entender como funciona
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
