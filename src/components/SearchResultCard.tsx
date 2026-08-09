import { Link } from "@tanstack/react-router";
import { ArrowRight, Store } from "lucide-react";
import { ProductImage } from "@/components/card-v2/identity";
import { formatPrice, formatProductName } from "@/lib/format";
import type { ResumoDeBusca } from "@/services/demo-source";

/**
 * O card de resultado da busca — Tela 2 do North Star.
 *
 * =============================================================================
 * ELE PRECISA PARECER CATÁLOGO, NÃO TABELA (§3 do mandato)
 * =============================================================================
 *
 * A busca anterior era um painel de sugestões: linha, linha, linha, cada uma com nome e um
 * preço pequeno à direita. Funcionava e parecia um autocomplete de sistema interno — que é
 * exatamente o diagnóstico do Founder, "muito sistema, pouco produto".
 *
 * A referência resolve com três decisões, e são estas três:
 *
 *  1. **a embalagem ocupa uma coluna inteira** à esquerda, alta o suficiente para o produto
 *     ser reconhecido antes de ser lido;
 *  2. **o preço é verde e grande**, e o rótulo acima dele delimita o que ele é —
 *     "menor preço observado", não "menor preço";
 *  3. **o CTA verde fecha o card**, em largura inteira. Um card de catálogo termina numa ação.
 *
 * O que NÃO entrou da referência: preço unitário. Ele só aparece quando existe quantidade
 * estruturada aprovada, e a fixture não tem — a porta é a mesma de `montarVisaoDoCard`, e
 * mostrar "R$ 34,98/kg" derivado de texto livre seria inventar a conta.
 */
export function SearchResultCard({ resumo }: { resumo: ResumoDeBusca }) {
  const { product, imagem, menorPreco, unidadeDePreco, mercado, mercados } = resumo;
  const detalhes = [product.brand, product.variant, product.size_text].filter(Boolean).join(" · ");

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
            <p className="text-muted-foreground mt-0.5 text-[0.8125rem] leading-snug">{detalhes}</p>

            {menorPreco === null ? (
              <p className="text-muted-foreground mt-2 text-sm">
                Sem preço válido nos mercados monitorados.
              </p>
            ) : (
              <>
                {/* O RÓTULO É O ESCOPO. "Menor preço" sozinho é uma afirmação sobre o mundo;
                    "menor preço observado" é uma afirmação sobre o que este produto viu, que é
                    a única que o piloto sustenta. */}
                <p className="text-muted-foreground mt-2 text-xs">Menor preço observado</p>
                <p
                  aria-hidden="true"
                  className="font-display text-primary text-[1.75rem] leading-none font-extrabold tabular-nums min-[430px]:text-[2rem]"
                >
                  <span className="text-[62%] font-bold">R$</span>
                  <span className="ml-1">{formatPrice(menorPreco).replace("R$", "").trim()}</span>
                  {/* Sem a unidade, "R$ 20,99" numa lista de cortes de carne é lido como o
                      preço de uma peça — e o card de busca é onde a comparação começa. */}
                  {unidadeDePreco === undefined ? null : (
                    <span className="text-muted-foreground ml-0.5 text-[44%] font-bold">
                      /{unidadeDePreco}
                    </span>
                  )}
                </p>
                <span className="sr-only">
                  Menor preço observado: {formatPrice(menorPreco)}
                  {unidadeDePreco === "kg" ? " por quilo" : ""}
                </span>

                {mercado ? (
                  <p className="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-[0.8125rem] leading-snug">
                    <Store aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {mercado.name}
                      {mercado.neighborhood ? ` · ${mercado.neighborhood}` : ""}
                    </span>
                  </p>
                ) : null}
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
