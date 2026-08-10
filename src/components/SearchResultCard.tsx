import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { MarketAvatar } from "@/components/MarketAvatar";
import { ProductImage } from "@/components/card-v2/identity";
import { isDemoMode } from "@/lib/app-mode";
import { montarVisaoDoCard } from "@/lib/card-v2";
import { formatDate, formatPrice, formatProductName } from "@/lib/format";
import type { ResumoDeBusca } from "@/services/demo-source";

/**
 * O card de resultado da busca e do catálogo — Tela 2 do North Star, redesenhado pela V4 §5.
 *
 * =============================================================================
 * O CARD INTEIRO É O LINK — NENHUM BOTÃO VERDE POR CARD
 * =============================================================================
 *
 * A V3 punha um CTA sólido de 48 px dentro de cada card. Com 24 produtos, isso era o mesmo
 * botão verde repetido 24 vezes — e o que se repete deixa de ser ação e vira textura: a
 * tela parecia sistema interno, não catálogo. A V4 §5 é explícita: no catálogo, o card
 * inteiro é clicável, com chevron; o CTA verde é reservado às ações realmente principais
 * (hero da Home, ficha da oferta — §6). O alvo de toque não encolheu: cresceu para o card
 * inteiro, e o nome acessível do link é o card na ordem em que está escrito.
 *
 * A informação do rótulo antigo ("Comparar em N mercados") não saiu: virou a linha final
 * do card, em texto — continua dizendo que existe comparação, sem gastar um botão.
 *
 * =============================================================================
 * O NÚMERO GRANDE É O QUE A PLACA DIZ (§0 corrigido pela V4 §4)
 * =============================================================================
 *
 * Embalado: preço da embalagem, gramatura na identidade, R$/kg (ou R$/L, R$/un) pequeno
 * logo abaixo. Peso variável: R$/kg observado com a unidade colada, simulação "500 g ≈
 * R$ 4,00" abaixo. É a mesma `montarVisaoDoCard` das outras telas — o card de busca não
 * tem conta própria.
 *
 * O escopo continua dito: "menor preço observado" / "melhor custo observado" qualificam o
 * número — uma afirmação sobre o que este produto viu, a única que o piloto sustenta. Nos
 * grupos de embalagens diferentes a gramatura da vencedora vem junto, porque sem ela o
 * número não identifica nada (§5).
 */
export function SearchResultCard({ resumo, now }: { resumo: ResumoDeBusca; now: Date }) {
  const { product, imagem, melhor, basePorUnidade, mercados } = resumo;
  const detalhes = [product.brand, product.variant, product.size_text].filter(Boolean).join(" · ");
  const visao =
    melhor === null
      ? null
      : montarVisaoDoCard(melhor, now, formatDate, { snapshotHistorico: isDemoMode() });
  const embalagensDiferentes = basePorUnidade !== undefined;

  return (
    <li>
      <Link
        to="/produto/$productId"
        params={{ productId: product.id }}
        className="border-border bg-card shadow-card hover:bg-surface group flex items-start gap-3 overflow-hidden rounded-xl border p-3 transition-colors"
      >
        <ProductImage imagem={imagem} categoria={product.category} tamanho="lista" />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="font-display line-clamp-2 text-base leading-tight font-bold">
            {formatProductName(product)}
          </h2>
          {detalhes.length > 0 ? (
            <p className="text-muted-foreground text-xs leading-snug">{detalhes}</p>
          ) : null}

          {visao === null || melhor === null ? (
            <p className="text-muted-foreground mt-1.5 text-sm">
              Sem preço válido nos mercados monitorados.
            </p>
          ) : (
            <>
              {/* O RÓTULO É O ESCOPO. "Menor preço" sozinho é uma afirmação sobre o mundo;
                  com "observado" é uma afirmação sobre o que este produto viu. */}
              <p className="text-muted-foreground mt-1 text-[0.6875rem]">
                {embalagensDiferentes ? "Melhor custo observado" : "Menor preço observado"}
              </p>
              <p
                aria-hidden="true"
                className="font-display text-primary text-[1.5rem] leading-none font-extrabold tabular-nums"
              >
                <span className="text-[62%] font-bold">R$</span>
                <span className="ml-0.5">{visao.preco.numero}</span>
                {visao.preco.quantidade !== null ? (
                  <span className="text-muted-foreground ml-0.5 text-[45%] font-bold">
                    {visao.preco.quantidade}
                  </span>
                ) : null}
              </p>
              {visao.simulacao !== null ? (
                <p aria-hidden="true" className="text-muted-foreground text-xs tabular-nums">
                  {visao.simulacao}
                </p>
              ) : null}
              {/* O normalizado, menor: é ele que torna as ofertas comparáveis, e nunca é o
                  protagonista. Nos grupos de embalagens diferentes a gramatura da vencedora
                  vem junto — sem ela o número não identifica nada. */}
              {visao.unitario !== null ? (
                <p aria-hidden="true" className="text-muted-foreground text-xs tabular-nums">
                  {embalagensDiferentes && melhor.product.size_text !== null
                    ? `${melhor.product.size_text} · `
                    : ""}
                  {formatPrice(visao.unitario.display)} {visao.unitario.rotulo}
                </p>
              ) : null}
              <span className="sr-only">{visao.preco.falado}</span>

              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[0.8125rem] leading-snug">
                <MarketAvatar market={melhor.market} tamanho="sm" />
                <span className="min-w-0">{melhor.market.name}</span>
              </p>

              {/* A antiga label do botão, agora como texto: diz que a comparação existe. */}
              <p className="text-primary mt-1 text-xs font-semibold">
                {mercados > 1 ? `Comparar em ${mercados} mercados` : "Ver preço e procedência"}
              </p>
            </>
          )}
        </div>

        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground group-hover:text-primary mt-1 size-5 shrink-0 self-start"
        />
      </Link>
    </li>
  );
}
