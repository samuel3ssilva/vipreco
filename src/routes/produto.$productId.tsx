import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PriceCard } from "@/components/PriceCard";
import { PriceDisclaimer } from "@/components/PriceDisclaimer";
import { StateMessage } from "@/components/StateMessage";
import { SubmitPriceForm } from "@/components/SubmitPriceForm";
import { DecisionFeedback } from "@/components/DecisionFeedback";
import { getProductComparison, registerWatchRequest } from "@/services/catalog";
import { compareWithUsualMarket } from "@/lib/comparison";
import { formatDate, formatPrice, formatPriceDifference, formatProductName, formatRelativeDay } from "@/lib/format";
import { getUsualMarketId, hasWatched, markWatched } from "@/lib/local-preferences";

export const Route = createFileRoute("/produto/$productId")({
  head: () => ({
    meta: [
      { title: "Comparar preços do produto — Preço Artemis" },
      {
        name: "description",
        content:
          "Compare o preço válido mais recente de cada mercado para o mesmo produto e veja a diferença em relação ao seu mercado habitual.",
      },
      { property: "og:title", content: "Comparar preços do produto — Preço Artemis" },
      {
        property: "og:description",
        content: "Preço válido mais recente por mercado, fonte da informação e data da observação.",
      },
    ],
  }),
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
  const [usualMarketId, setUsual] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
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
          description={<Link to="/buscar" className="underline">Buscar outro produto</Link>}
        />
      </AppShell>
    );
  }

  const { product, entries, lastUpdatedAt } = data;
  const isDemo = product.is_demo || entries.some((entry) => entry.is_demo);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl">{product.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Marca: {product.brand ?? "não informada"} · Variante: {product.variant ?? "única"} · Tamanho:{" "}
            {product.size_text ?? "não informado"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {lastUpdatedAt
              ? `Preço mais recente observado em ${formatDate(lastUpdatedAt)} (${formatRelativeDay(lastUpdatedAt)}).`
              : "Ainda não há preços válidos cadastrados para este produto."}
          </p>
        </div>

        <PriceDisclaimer showDemoNotice={isDemo} />

        {entries.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Nenhum preço válido cadastrado."
            description="Você pode avisar quando encontrar este produto ou pedir para acompanharmos."
          />
        ) : (
          <>
            <section aria-labelledby="resumo-titulo" className="card-base bg-surface">
              <h2 id="resumo-titulo" className="text-lg">
                Resumo da comparação
              </h2>
              <p className="mt-1">
                Menor preço válido: <strong>{formatPrice(entries[0].price)}</strong> em{" "}
                <strong>{entries[0].market.name}</strong>.
              </p>
              {comparison.kind === "no-usual-market" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Escolha seu mercado habitual na página inicial para ver a diferença comparada a ele.
                </p>
              ) : comparison.kind === "no-price" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Ainda não temos preço válido deste produto no seu mercado habitual.
                </p>
              ) : comparison.kind === "cheapest" ? (
                <p className="mt-2 text-sm">
                  Seu mercado habitual já está com o menor preço cadastrado. Não precisa mudar de loja.
                </p>
              ) : (
                <p className="mt-2 text-sm">
                  Em {comparison.best.market.name} está{" "}
                  <strong>{formatPriceDifference(comparison.difference)}</strong> mais barato que no seu
                  mercado habitual ({comparison.usual.market.name}). Avalie se a diferença compensa o
                  deslocamento.
                </p>
              )}
            </section>

            <section aria-labelledby="precos-titulo">
              <h2 id="precos-titulo" className="text-xl">
                Preços por mercado
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mostramos apenas o preço válido mais recente de cada mercado, do menor para o maior.
              </p>
              <ul className="mt-3 space-y-3">
                {entries.map((entry, index) => (
                  <PriceCard
                    key={entry.id}
                    entry={entry}
                    isLowest={index === 0}
                    isUsualMarket={entry.market_id === usualMarketId}
                    onReport={() => setShowForm(true)}
                  />
                ))}
              </ul>
            </section>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-base btn-primary" onClick={() => setShowForm(true)}>
            Informar preço deste produto
          </button>
          <button
            type="button"
            className="btn-base btn-secondary"
            disabled={watched || watchStatus === "sending"}
            onClick={() => void watch()}
          >
            <BellRing aria-hidden="true" className="size-5" />
            {watched ? "Interesse registrado" : "Quero acompanhar este produto"}
          </button>
        </div>
        {watchStatus === "error" ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            Não conseguimos registrar seu interesse agora. Tente novamente.
          </p>
        ) : null}

        <DecisionFeedback productId={product.id} />

        <p className="text-sm text-muted-foreground">
          Produto selecionado: {formatProductName(product)}.{" "}
          <Link to="/como-funciona" className="underline">
            Entenda de onde vêm os preços
          </Link>
          .
        </p>
      </div>

      {showForm ? (
        <SubmitPriceForm product={product} defaultMarketId={usualMarketId} onClose={() => setShowForm(false)} />
      ) : null}
    </AppShell>
  );
}
