import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Info } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { OfferRankRow } from "@/components/OfferRankRow";
import { PesoSelector } from "@/components/PesoSelector";
import { ProductImage } from "@/components/card-v2/identity";
import { StateMessage } from "@/components/StateMessage";
import { ShareAchadoButton } from "@/components/ShareAchadoButton";
import { DemoNote } from "@/components/DemoNote";
import { appMode, isDemoMode } from "@/lib/app-mode";
import { carregarComparacao, imagemDoProduto } from "@/services/demo-source";
import { PESO_PADRAO, rotuloDoPeso, type PesoSelecionado } from "@/lib/peso-variavel";
import { absoluteAssetUrl } from "@/lib/og";
import { formatPrice, formatProductName } from "@/lib/format";
import type { OfertaCardV2 } from "@/lib/card-v2";
import type { UnitPriceBasis } from "@/lib/unit-price";

const DEFAULT_TITLE = "Comparar produto — ViPreço";

/**
 * =============================================================================
 * TELA 3 DO NORTH STAR — COMPARAÇÃO, COM AS DUAS HISTÓRIAS DO MANDATO V2 (§13)
 * =============================================================================
 *
 * **Golden flow A — granel.** Bucho bovino: seletor de 250 g / 500 g / 1 kg (padrão
 * 500 g), preço calculado grande em cada linha, R$/kg observado logo abaixo. A ordem é
 * pelo R$/kg — que, com denominador igual, é a mesma ordem do desembolso.
 *
 * **Golden flow B — embalagens diferentes.** Dreamies 80 g × 40 g: cada linha carrega o
 * próprio SKU, a ordem é por custo unitário e o primeiro leva o selo "Melhor custo/kg".
 * A tela DIZ que compara por custo, porque entre tamanhos diferentes "mais barato" sem
 * denominador é a ambiguidade que o §5 proíbe.
 *
 * A contagem é sempre medida (`entries.length`), o produto é dito uma vez no topo, e nada
 * reordena a lista além do critério declarado — princípio 4.
 */
export const Route = createFileRoute("/produto/$productId")({
  loader: ({ params }) => carregarComparacao(params.productId, appMode()),
  head: ({ loaderData }) => {
    const menor = loaderData?.entries[0] as OfertaCardV2 | undefined;
    const title = loaderData ? `${formatProductName(loaderData.product)} — ViPreço` : DEFAULT_TITLE;
    const description = menor
      ? `A partir de ${formatPrice(menor.price)}${menor.price_unit === "kg" ? " por kg" : ""} no ${menor.market.name}. Preço observado em cada mercado, com fonte, data e validade.`
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

/** A frase que explica a ordem — o critério nunca fica implícito. */
function explicacaoDaOrdem(basePorUnidade: UnitPriceBasis | undefined, granel: boolean): string {
  if (basePorUnidade !== undefined) {
    const base =
      basePorUnidade === "per_kg" ? "quilo" : basePorUnidade === "per_l" ? "litro" : "unidade";
    return `Embalagens diferentes: a ordem é pelo custo por ${base}. O preço grande é o de cada embalagem.`;
  }
  if (granel) {
    return "Do menor para o maior preço por quilo. Um preço por mercado, o mais recente.";
  }
  return "Do menor para o maior. Um preço por mercado, o mais recente.";
}

function ProductPage() {
  const data = Route.useLoaderData();
  // O seletor de quantidade (§3) — só existe nos grupos de peso variável, padrão 500 g.
  // Ele muda o preço CALCULADO exibido; o R$/kg observado e a ordem não se movem.
  const [gramas, setGramas] = useState<PesoSelecionado>(PESO_PADRAO);
  const now = useMemo(() => new Date(), []);

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
  const granel = data.granel === true;
  const basePorUnidade = data.basePorUnidade;
  const detalhes = [product.brand, product.variant, product.size_text].filter(Boolean).join(" · ");
  const menor = entries[0] as OfertaCardV2 | undefined;

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
                ...(menor.price_unit === undefined ? {} : { unidade: menor.price_unit }),
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

        {/* O PRODUTO, UMA VEZ.
            No grupo de EMBALAGENS DIFERENTES não há imagem de cabeçalho — nem placeholder:
            o grupo não tem uma embalagem, e as fotos vivem nas linhas, cada uma ao lado da
            própria gramatura. Um placeholder aqui só anunciaria uma ausência que não é
            defeito. Nos demais grupos a imagem (ou o placeholder legítimo) continua. */}
        <div className="flex items-start gap-4">
          {basePorUnidade === undefined ? (
            <ProductImage
              imagem={imagemDoProduto(product.id)}
              categoria={product.category}
              tamanho="destaque"
              prioridade
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl leading-tight font-bold sm:text-2xl">
              {formatProductName(product)}
            </h2>
            {detalhes.length > 0 ? (
              <p className="text-muted-foreground mt-1 text-sm">{detalhes}</p>
            ) : null}
            {/* O selo diz O QUE a comparação é — e nos grupos de embalagens diferentes ele
                NÃO pode dizer "produto exato": 80 g e 40 g não são o mesmo SKU. O que os
                torna comparáveis é o custo unitário, e é isso que o selo afirma. */}
            <p className="bg-secondary text-secondary-foreground mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
              {basePorUnidade !== undefined
                ? "Mesma marca · embalagens diferentes"
                : granel
                  ? "Mesmo corte · preço por kg"
                  : "Produto exato"}
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
            {granel ? (
              <div className="space-y-1.5">
                <PesoSelector gramas={gramas} onChange={setGramas} />
                <p className="text-muted-foreground text-xs">
                  Preço calculado para {rotuloDoPeso(gramas)} — a balança define o valor final.
                </p>
              </div>
            ) : null}

            <div>
              <h3 className="font-display text-base leading-tight font-bold">
                {entries.length === 1
                  ? "Preço observado em 1 mercado"
                  : `Comparação em ${entries.length} mercados`}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {explicacaoDaOrdem(basePorUnidade, granel)}
              </p>
            </div>

            <ul className="space-y-2.5">
              {entries.map((entry, i) => (
                <OfferRankRow
                  key={entry.id}
                  entry={entry as OfertaCardV2}
                  posicao={i + 1}
                  productId={product.id}
                  now={now}
                  {...(granel ? { gramas } : {})}
                  {...(basePorUnidade === undefined ? {} : { basePorUnidade })}
                />
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
