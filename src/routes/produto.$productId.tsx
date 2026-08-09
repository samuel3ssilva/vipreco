import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OfferRankRow } from "@/components/OfferRankRow";
import { ProductImage } from "@/components/card-v2/identity";
import { StateMessage } from "@/components/StateMessage";
import { ShareAchadoButton } from "@/components/ShareAchadoButton";
import { DemoNote } from "@/components/DemoNote";
import { appMode, isDemoMode } from "@/lib/app-mode";
import { carregarComparacao, imagemDoProduto } from "@/services/demo-source";
import { absoluteAssetUrl } from "@/lib/og";
import { formatPrice, formatProductName } from "@/lib/format";

const DEFAULT_TITLE = "Comparar produto — ViPreço";

/**
 * =============================================================================
 * TELA 3 DO NORTH STAR — COMPARAÇÃO DO PRODUTO
 * =============================================================================
 *
 * O que esta tela era: um cabeçalho com categoria e nome, um bloco "Melhor preço encontrado"
 * com quatro linhas de metadados, um seletor de mercado habitual, uma lista de `PriceCard` com
 * diferença em reais e percentual, e um aviso. Sete blocos, cada um com a sua moldura.
 *
 * O que a referência mostra: uma seta, um título, o produto identificado uma vez, e uma lista
 * numerada onde cada linha é **mercado, bairro, preço, procedência**. Nada mais.
 *
 * As três decisões desta reconstrução:
 *
 *  1. **O produto é dito UMA vez**, no topo, com a embalagem ao lado e o selo "Produto exato".
 *     O bloco de resumo que repetia preço, mercado, data e fonte saiu: ele dizia de novo, em
 *     formato de ficha, o que a primeira linha da lista já diz.
 *  2. **A contagem é medida, nunca escrita à mão** (§4: "não inventar"). "Comparação em 3
 *     mercados" é `entries.length`, e some quando há um só.
 *  3. **O seletor de mercado habitual saiu desta tela.** Ele é personalização, e o §11 do
 *     mandato anterior já tinha tirado da Home pelo mesmo motivo — na demonstração ele é um
 *     controle a mais entre a pessoa e a comparação. A preferência continua no produto; o que
 *     saiu foi o controle desta tela.
 */
export const Route = createFileRoute("/produto/$productId")({
  loader: ({ params }) => carregarComparacao(params.productId, appMode()),
  head: ({ loaderData }) => {
    const menor = loaderData?.entries[0];
    const title = loaderData ? `${formatProductName(loaderData.product)} — ViPreço` : DEFAULT_TITLE;
    const description = menor
      ? `A partir de ${formatPrice(menor.price)} no ${menor.market.name}. Preço observado em cada mercado, com fonte, data e validade.`
      : "Compare o preço observado do mesmo produto em cada mercado monitorado, com fonte, data e validade.";

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
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <AppShell>
        <StateMessage
          variant="empty"
          title="Produto não encontrado."
          description="Ele pode ter saído do catálogo, ou o endereço está incompleto."
          action={
            <Link to="/buscar" className="btn-base btn-secondary btn-touch-48">
              Buscar outro produto
            </Link>
          }
        />
      </AppShell>
    );
  }

  const { product, entries } = data;
  const detalhes = [product.brand, product.variant, product.size_text].filter(Boolean).join(" · ");
  const menor = entries[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4">
        {/* SETA · TÍTULO · COMPARTILHAR — a mesma barra da referência. */}
        <div className="flex items-center gap-2">
          <Link
            to="/buscar"
            aria-label="Voltar para a busca"
            className="btn-base btn-quiet size-12 shrink-0 rounded-full p-0"
          >
            <ArrowLeft aria-hidden="true" className="size-5" />
          </Link>
          <h1 className="font-display flex-1 text-center text-base font-bold">Comparar produto</h1>
          {menor ? (
            <ShareAchadoButton
              payload={{
                produto: formatProductName(product),
                preco: menor.price,
                mercado: menor.market.name,
                validUntil: menor.valid_until,
                url: absoluteAssetUrl(`/produto/${product.id}`),
                isDemo: isDemoMode(),
              }}
            />
          ) : (
            <span className="size-12 shrink-0" />
          )}
        </div>

        {/* O PRODUTO, UMA VEZ. */}
        <div className="flex items-start gap-4">
          <ProductImage
            imagem={imagemDoProduto(product.id)}
            categoria={product.category}
            tamanho="destaque"
            prioridade
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl leading-tight font-bold sm:text-2xl">
              {formatProductName(product)}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">{detalhes}</p>
            {/* "Produto exato" é o selo da referência, e aqui ele é literal: a comparação usa
                um único `product_id`, e nada de tamanho ou marca diferente entra nela. */}
            <p className="bg-secondary text-secondary-foreground mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
              Produto exato
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <StateMessage
            variant="empty"
            title="Nenhum preço válido neste momento."
            description="Os preços que tínhamos deste produto venceram ou saíram do ar."
          />
        ) : (
          <>
            <div>
              <h3 className="font-display text-base leading-tight font-bold">
                {entries.length === 1
                  ? "Preço observado em 1 mercado"
                  : `Comparação em ${entries.length} mercados`}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Do menor para o maior. Um preço por mercado, o mais recente.
              </p>
            </div>

            <ul className="space-y-2.5">
              {entries.map((entry, i) => (
                <OfferRankRow key={entry.id} entry={entry} posicao={i + 1} productId={product.id} />
              ))}
            </ul>

            <p className="bg-caution/25 text-caution-foreground flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">Importante.</strong> Preços e condições podem
                mudar. Confira no mercado antes de comprar.
              </span>
            </p>

            <DemoNote />
          </>
        )}
      </div>
    </AppShell>
  );
}
