import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ProductSearch } from "@/components/ProductSearch";
import { UsualMarketPicker } from "@/components/UsualMarketPicker";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { SourceBadge } from "@/components/SourceBadge";
import { StateMessage } from "@/components/StateMessage";
import { getRecentlyUpdatedProducts, getWeeklyOpportunities } from "@/services/catalog";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";
import { isValidPrice } from "@/lib/comparison";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Preço Artemis — preços recentes e verificados em Artemis" },
      {
        name: "description",
        content:
          "Veja oportunidades da semana, compare produtos iguais e descubra se a diferença de preço merece sua atenção em Artemis.",
      },
      { property: "og:title", content: "Preço Artemis — compre melhor com preços recentes" },
      {
        property: "og:description",
        content: "Oportunidades verificadas da semana e comparação de produtos iguais entre mercados de Artemis.",
      },
    ],
  }),
  component: HomePage,
});

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

  const validOpportunities = (opportunities.data ?? []).filter((entry) => isValidPrice(entry));
  const isDemo =
    import.meta.env.VITE_DEMO_MODE === "true" ||
    validOpportunities.some((entry) => entry.is_demo || entry.market?.is_demo);

  return (
    <AppShell>
      <div className="space-y-6">
        <section aria-labelledby="titulo-principal" className="space-y-4">
          <div>
            <h1 id="titulo-principal" className="text-2xl leading-tight sm:text-3xl">
              Compre melhor em Artemis com preços recentes e verificados.
            </h1>
            <p className="mt-2 text-muted-foreground">
              Veja oportunidades da semana, compare produtos iguais e descubra se a diferença realmente merece
              sua atenção.
            </p>
          </div>
          <ProductSearch />
          <PriceDisclaimer showDemoNotice={isDemo} />
        </section>

        <section aria-labelledby="oportunidades-titulo" className="space-y-3">
          <h2 id="oportunidades-titulo" className="text-xl">
            Oportunidades verificadas da semana
          </h2>
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
            <ul className="space-y-3">
              {validOpportunities.map((entry) => (
                <li key={entry.id} className="card-base">
                  <h3 className="text-lg">{formatProductName(entry.product)}</h3>
                  <p className="text-sm text-muted-foreground">
                    Marca: {entry.product.brand ?? "não informada"} · Variante:{" "}
                    {entry.product.variant ?? "única"} · Tamanho: {entry.product.size_text ?? "não informado"}
                  </p>
                  <p className="mt-2 font-semibold">{entry.market.name}</p>
                  <p className="font-display text-2xl font-semibold text-primary">
                    {formatPrice(entry.price)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Observado em {formatDate(entry.observed_at)} ({formatRelativeDay(entry.observed_at)})
                  </p>
                  {entry.special_condition ? (
                    <p className="mt-1 text-sm">
                      <span className="font-semibold">Condição:</span> {entry.special_condition}
                    </p>
                  ) : null}
                  <div className="mt-2">
                    <SourceBadge source={entry.source_type} />
                  </div>
                  <Link
                    to="/produto/$productId"
                    params={{ productId: entry.product.id }}
                    className="btn-base btn-primary mt-3 w-full"
                  >
                    Comparar este produto
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="recentes-titulo" className="space-y-3">
          <h2 id="recentes-titulo" className="text-xl">
            Produtos atualizados recentemente
          </h2>
          {recent.isPending ? (
            <StateMessage variant="loading" title="Carregando produtos…" />
          ) : recent.isError ? (
            <StateMessage
              variant="error"
              title="Não conseguimos carregar os produtos."
              onRetry={() => recent.refetch()}
            />
          ) : recent.data && recent.data.length > 0 ? (
            <ul className="space-y-2">
              {recent.data.map(({ product, observedAt }) => (
                <li key={product.id}>
                  <Link
                    to="/produto/$productId"
                    params={{ productId: product.id }}
                    className="card-base flex flex-col hover:bg-surface"
                  >
                    <span className="font-semibold">{formatProductName(product)}</span>
                    <span className="text-sm text-muted-foreground">
                      Preço atualizado {formatRelativeDay(observedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <StateMessage variant="empty" title="Ainda não há produtos com preços recentes." />
          )}
        </section>

        <UsualMarketPicker />
      </div>
    </AppShell>
  );
}
