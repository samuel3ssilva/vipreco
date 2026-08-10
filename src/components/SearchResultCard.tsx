import { Link } from "@tanstack/react-router";
import { ArrowRight, Store } from "lucide-react";
import { ProductImage } from "@/components/card-v2/identity";
import { isDemoMode } from "@/lib/app-mode";
import { montarVisaoDoCard } from "@/lib/card-v2";
import { formatDate, formatPrice, formatProductName } from "@/lib/format";
import type { ResumoDeBusca } from "@/services/demo-source";

/**
 * O card de resultado da busca — Tela 2 do North Star, com a hierarquia do mandato v2 §12.
 *
 * =============================================================================
 * O NÚMERO GRANDE É O QUE SE PAGA; O NORMALIZADO FICA EMBAIXO (§0)
 * =============================================================================
 *
 * Embalado: preço da embalagem grande, gramatura na identidade, R$/kg (ou R$/L, R$/un)
 * pequeno logo abaixo. Peso variável: preço calculado de "aprox. 500 g" grande, R$/kg
 * observado abaixo. É a mesma `montarVisaoDoCard` das outras telas — o card de busca não
 * tem conta própria.
 *
 * =============================================================================
 * O RÓTULO DIZ O QUE O NÚMERO É — E MUDA QUANDO O CRITÉRIO MUDA (§5)
 * =============================================================================
 *
 * Embalagem igual: "Menor preço observado". Embalagens diferentes: "Melhor custo
 * observado", com a gramatura da oferta vencedora dita ao lado do mercado — porque nesses
 * grupos "menor preço" apontaria a embalagem pequena e cara, que é exatamente a confusão
 * que o produto existe para desfazer.
 */
export function SearchResultCard({ resumo, now }: { resumo: ResumoDeBusca; now: Date }) {
  const { product, imagem, melhor, basePorUnidade, granel, mercados } = resumo;
  const detalhes = [product.brand, product.variant, product.size_text].filter(Boolean).join(" · ");
  const visao =
    melhor === null
      ? null
      : montarVisaoDoCard(melhor, now, formatDate, { snapshotHistorico: isDemoMode() });
  const embalagensDiferentes = basePorUnidade !== undefined;

  return (
    <li>
      <article className="border-border bg-card shadow-card overflow-hidden rounded-xl border">
        <div className="flex items-start gap-3.5 p-3.5 sm:gap-4 sm:p-4">
          <ProductImage
            imagem={imagem}
            categoria={product.category}
            tamanho="destaque"
            prioridade={false}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="font-display line-clamp-2 text-[1.0625rem] leading-tight font-bold sm:text-lg">
              {formatProductName(product)}
            </h2>
            {detalhes.length > 0 ? (
              <p className="text-muted-foreground mt-0.5 text-[0.8125rem] leading-snug">
                {detalhes}
              </p>
            ) : null}

            {visao === null || melhor === null ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Sem preço válido nos mercados monitorados.
              </p>
            ) : (
              <>
                {/* O RÓTULO É O ESCOPO. "Menor preço" sozinho é uma afirmação sobre o
                    mundo; com "observado" é uma afirmação sobre o que este produto viu —
                    a única que o piloto sustenta. */}
                <p className="text-muted-foreground mt-2 text-xs">
                  {embalagensDiferentes ? "Melhor custo observado" : "Menor preço observado"}
                </p>
                <p
                  aria-hidden="true"
                  className="font-display text-primary text-[1.75rem] leading-none font-extrabold tabular-nums min-[430px]:text-[2rem]"
                >
                  <span className="text-[62%] font-bold">R$</span>
                  <span className="ml-1">{visao.preco.numero}</span>
                  {visao.preco.quantidade !== null ? (
                    <span className="text-muted-foreground ml-1.5 text-[40%] font-bold whitespace-nowrap">
                      {visao.preco.quantidade}
                    </span>
                  ) : null}
                </p>
                {/* O normalizado, menor: é ele que torna as ofertas comparáveis, e nunca é
                    o protagonista (§25). Nos grupos de embalagens diferentes a gramatura da
                    vencedora vem junto — sem ela o número não identifica nada. */}
                {visao.unitario !== null ? (
                  <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                    {embalagensDiferentes && melhor.product.size_text !== null
                      ? `${melhor.product.size_text} · `
                      : ""}
                    {formatPrice(visao.unitario.display)} {visao.unitario.rotulo}
                  </p>
                ) : null}
                <span className="sr-only">{visao.preco.falado}</span>

                <p className="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-[0.8125rem] leading-snug">
                  <Store aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {melhor.market.name}
                    {melhor.market.neighborhood ? ` · ${melhor.market.neighborhood}` : ""}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="px-3.5 pb-3.5 sm:px-4 sm:pb-4">
          <Link
            to="/produto/$productId"
            params={{ productId: product.id }}
            className="btn-base btn-primary btn-touch-48 w-full"
          >
            {mercados > 1 ? `Comparar em ${mercados} mercados` : "Ver preço e procedência"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </article>
    </li>
  );
}
