import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Flag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriceCard } from "@/components/PriceCard";
import { PriceSummary } from "@/components/PriceSummary";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { StateMessage } from "@/components/StateMessage";
import { SubmitPriceForm } from "@/components/SubmitPriceForm";
import { DecisionFeedback } from "@/components/DecisionFeedback";
import { UsualMarketPicker } from "@/components/UsualMarketPicker";
import { SectionHeader } from "@/components/PageContainer";
import { getProductComparison, registerWatchRequest } from "@/services/catalog";
import { compareWithUsualMarket } from "@/lib/comparison";
import { formatDate, formatPrice, formatProductName, formatRelativeDay } from "@/lib/format";
import { getUsualMarketId, hasWatched, markWatched } from "@/lib/local-preferences";

const DEFAULT_TITLE = "Comparar preços do produto — ViPreço";
const DEFAULT_DESCRIPTION =
  "Compare o preço válido mais recente de cada mercado para o mesmo produto e veja a diferença em relação ao seu mercado habitual.";

export const Route = createFileRoute("/produto/$productId")({
  loader: ({ params }) => getProductComparison(params.productId),
  head: ({ loaderData }) => {
    const lowest = loaderData?.entries[0];
    const title = loaderData ? `${formatProductName(loaderData.product)} — ViPreço` : DEFAULT_TITLE;
    const description = lowest
      ? `A partir de ${formatPrice(lowest.price)} no ${lowest.market.name}. Preço válido mais recente por mercado, fonte da informação e data da observação.`
      : DEFAULT_DESCRIPTION;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ProductPage,
  errorComponent: () => (
    <AppShell>
      <StateMessage
        variant="error"
        title="Não conseguimos carregar este produto."
        description="Tente novamente em instantes."
        onRetry={() => window.location.reload()}
      />
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <StateMessage variant="empty" title="Produto não encontrado." />
    </AppShell>
  ),
});

function ProductPage() {
  const { productId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [usualMarketId, setUsual] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reportMarketId, setReportMarketId] = useState<string | null>(null);
  const [watched, setWatched] = useState(false);
  const [watchStatus, setWatchStatus] = useState<"idle" | "sending" | "error">("idle");

  useEffect(() => {
    setUsual(getUsualMarketId());
    setWatched(hasWatched(productId));
  }, [productId]);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["product-comparison", productId],
    queryFn: () => getProductComparison(productId),
    staleTime: 30_000,
    initialData: loaderData ?? undefined,
  });

  const comparison = useMemo(
    () => compareWithUsualMarket(data?.entries ?? [], usualMarketId),
    [data, usualMarketId],
  );

  async function watch() {
    setWatchStatus("sending");
    try {
      await registerWatchRequest(productId);
      markWatched(productId);
      setWatched(true);
      setWatchStatus("idle");
    } catch {
      setWatchStatus("error");
    }
  }

  if (isPending) {
    return (
      <AppShell>
        <StateMessage variant="loading" title="Carregando preços…" />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell>
        <StateMessage
          variant="error"
          title="Não conseguimos carregar os preços."
          description="Verifique sua conexão e tente novamente."
          onRetry={() => refetch()}
        />
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <StateMessage
          variant="empty"
          title="Produto não encontrado."
          description={
            <Link to="/buscar" className="underline">
              Buscar outro produto
            </Link>
          }
        />
      </AppShell>
    );
  }

  const { product, entries, lastUpdatedAt } = data;
  const isDemo = product.is_demo || entries.some((entry) => entry.is_demo);
  const lowest = entries[0]?.price ?? 0;

  return (
    <AppShell>
      <div className="space-y-5">
        <header className="space-y-1">
          <p className="eyebrow">{product.category ?? "Produto"}</p>
          <h1 className="text-xl font-bold sm:text-2xl">{product.name}</h1>
          <p className="meta-text">
            {product.brand ?? "Marca não informada"} · {product.variant ?? "Variante única"} ·{" "}
            {product.size_text ?? "Tamanho não informado"}
          </p>
          <p className="meta-text">
            {lastUpdatedAt
              ? `${entries.length} ${entries.length === 1 ? "mercado" : "mercados"} · Preço mais recente em ${formatDate(lastUpdatedAt)} (${formatRelativeDay(lastUpdatedAt)})`
              : "Ainda não há preços válidos cadastrados para este produto."}
          </p>
        </header>

        {entries.length === 0 ? (
          <>
            <PriceDisclaimer showDemoNotice={isDemo} />
            <StateMessage
              variant="empty"
              title="Nenhum preço válido cadastrado."
              description="Você pode informar um preço que viu na loja ou pedir para acompanharmos este produto."
            />
          </>
        ) : (
          <>
            <PriceSummary best={entries[0]} comparison={comparison} />

            <UsualMarketPicker compact onChange={setUsual} />

            <section aria-labelledby="precos-titulo" className="space-y-2">
              <SectionHeader
                id="precos-titulo"
                title="Preços por mercado"
                description="Preço válido mais recente de cada mercado, do menor para o maior."
                display={false}
              />
              <ul className="space-y-2">
                {entries.map((entry, index) => (
                  <PriceCard
                    key={entry.id}
                    entry={entry}
                    isLowest={index === 0}
                    isUsualMarket={entry.market_id === usualMarketId}
                    differenceToLowest={Number((entry.price - lowest).toFixed(2))}
                    onReport={(clickedEntry) => {
                      setReportMarketId(clickedEntry.market_id);
                      setShowForm(true);
                    }}
                  />
                ))}
              </ul>
            </section>

            <PriceDisclaimer showDemoNotice={isDemo} />
          </>
        )}

        <section
          aria-label="Ajude a manter os preços atualizados"
          className="card-compact bg-surface"
        >
          <h2 className="text-base font-bold">Viu um preço diferente?</h2>
          <p className="meta-text mt-0.5">
            Sua informação é conferida por uma pessoa antes de aparecer para os outros moradores.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-base btn-primary btn-sm"
              onClick={() => {
                setReportMarketId(null);
                setShowForm(true);
              }}
            >
              <Flag aria-hidden="true" className="size-4" />
              Informar preço
            </button>
            <button
              type="button"
              className="btn-base btn-secondary btn-sm"
              disabled={watched || watchStatus === "sending"}
              onClick={() => void watch()}
            >
              <BellRing aria-hidden="true" className="size-4" />
              {watched ? "Interesse registrado" : "Quero acompanhar"}
            </button>
          </div>
          {watchStatus === "error" ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
              Não conseguimos registrar seu interesse agora. Tente novamente.
            </p>
          ) : null}
        </section>

        <DecisionFeedback productId={product.id} />
      </div>

      {showForm ? (
        <SubmitPriceForm
          product={product}
          defaultMarketId={reportMarketId ?? usualMarketId}
          onClose={() => setShowForm(false)}
        />
      ) : null}
    </AppShell>
  );
}
