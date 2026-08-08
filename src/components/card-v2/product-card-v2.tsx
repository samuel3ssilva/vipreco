import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Skeleton, Surface } from "@/components/primitives";
import { montarVisaoDoCard } from "@/lib/card-v2";
import type { OfertaCardV2 } from "@/lib/card-v2";
import { formatDate } from "@/lib/format";
import { TEMPORAL_STYLE } from "@/lib/temporal";
import { ProductIdentity, ProductImage } from "./identity";
import { MarketBadge, NeighborhoodLabel } from "./market";
import { PriceDisplay, PromotionCondition, UnitPrice } from "./price";
import { OfferStatus, ProvenanceBlock } from "./provenance";

/**
 * R3.2 — o Card v2 de produto exato.
 *
 * =============================================================================
 * ELE NÃO DECIDE NADA
 * =============================================================================
 *
 * Toda regra de exibir/não exibir mora em `montarVisaoDoCard` (`src/lib/card-v2.ts`), que
 * é uma função pura e testada sem DOM. Este arquivo recebe a visão já decidida e desenha.
 *
 * A separação é o que torna as regras verificáveis: "preço unitário só com quantidade
 * aprovada" é uma frase que se interroga com uma chamada de função, e não uma condição
 * espremida entre dois elementos JSX.
 *
 * =============================================================================
 * A HIERARQUIA, E POR QUE ELA É ESTA
 * =============================================================================
 *
 * Ordem do mandato R3.2 §10, de cima para baixo:
 *
 *   1. imagem ou placeholder
 *   2. identidade exata (nome)
 *   3. marca, variante e quantidade
 *   4. preço observado
 *   5. preço unitário, condicionado
 *   6. mercado e bairro
 *   7. promoção e validade
 *   8. fonte e atualização
 *   9. CTA
 *
 * **Produto exato aparece antes do preço** (§6). É a hierarquia que o produto defende: um
 * preço que o leitor não sabe de qual item é não serve para comparar nada.
 *
 * Duas decisões que se afastam da lista, e o motivo de cada uma:
 *
 * - **o rótulo de estado vem ANTES do preço**, quando existe. Ler "R$ 8,90" e só depois
 *   descobrir que a oferta expirou é ler um preço vigente que não é vigente. O estado é
 *   condição de leitura do número, não nota de rodapé;
 * - **validade sobe junto de fonte e data**, dentro de `ProvenanceBlock`. A convenção do
 *   `R3-SCREEN-SPEC.md` diz que fonte, data e validade formam um bloco inseparável;
 *   espalhá-los em dois lugares para respeitar a numeração seria cumprir a ordem e quebrar
 *   a regra que a ordem existe para servir.
 *
 * =============================================================================
 * O QUE ELE CONTINUA NÃO FAZENDO
 * =============================================================================
 *
 * Herdado do `AchadoCard` e coberto por teste: não inventa validade, não inventa preço
 * anterior, não cria urgência, não afirma gôndola observada fora das origens que a
 * observaram, e a tarja de cor nunca é o único canal — tudo o que ela sugere está escrito
 * em texto logo abaixo.
 */

interface ProductCardV2Props {
  oferta: OfertaCardV2;
  /** Instante de referência do servidor — mantém "ontem" igual antes e depois da hidratação. */
  now: Date;
  /** `destaque` domina a composição; `secundario` é a versão de lista. Uma anatomia só. */
  variant?: "destaque" | "secundario";
  /**
   * Um campo que não pôde ser carregado, nomeado.
   *
   * É a variante de erro parcial: a falha é de carregamento, e não de dado, então quem
   * sabe dela é quem carregou — não o domínio. O card continua compreensível, o produto
   * continua identificável, e o que falta é dito em vez de aparecer como buraco.
   */
  avisoParcial?: string | null;
  className?: string;
}

export function ProductCardV2({
  oferta,
  now,
  variant = "secundario",
  avisoParcial = null,
  className = "",
}: ProductCardV2Props) {
  const tituloId = useId();
  const avisoId = useId();
  const destaque = variant === "destaque";
  const visao = montarVisaoDoCard(oferta, now, formatDate);
  const { color, height } = TEMPORAL_STYLE[visao.temporal];

  return (
    <Surface
      as="article"
      aria-labelledby={tituloId}
      padding="nenhum"
      elevacao={destaque ? "destaque" : "card"}
      className={`flex flex-col overflow-hidden ${className}`}
    >
      {/* Tarja temporal — decorativa. Tudo o que ela sugere está em texto abaixo. */}
      <div aria-hidden="true" style={{ height, backgroundColor: color }} />

      {/* TRÊS ZONAS, E NÃO OITO LINHAS EQUIDISTANTES.
          O `gap-3` uniforme de antes punha identidade, preço, mercado, condição,
          procedência e CTA todos à mesma distância entre si — e um card assim é lido como
          uma lista de linhas, não como uma composição com hierarquia. Agora o espaço é
          hierárquico: apertado dentro de cada grupo, folgado entre grupos. */}
      <div className={`flex flex-1 flex-col ${destaque ? "gap-3 p-4 sm:p-5" : "gap-2 p-3"}`}>
        {/* =====================================================================
            R3.3C §14 — O PREÇO SUBIU PARA A COLUNA DA IDENTIDADE
            =====================================================================

            Até aqui o card era duas faixas: [imagem | identidade] em cima, e preço, mercado,
            condição e procedência em linhas de largura inteira embaixo. Com a imagem em 128 px
            e a identidade em três linhas curtas, sobrava um retângulo vazio à DIREITA da imagem
            e outro à direita do preço — e é esse vazio, mais do que qualquer cor ou tipografia,
            o que fazia a composição parecer registro em vez de produto.

            A referência aprovada (North Star V2, tela 1) resolve exatamente assim: nome, marca,
            variante, quantidade e preço empilhados numa coluna só, ao lado da imagem. A ordem
            de leitura do §5 não muda — imagem, nome, marca/variante, quantidade, preço, mercado
            —, e a ordem do DOM tampouco, que é o que o leitor de tela ouve.

            AS MEDIDAS SÃO POR FAIXA, E NÃO POR GOSTO. A coluna útil a 320 px tem 144 px depois
            da imagem de 96; "R$ 26,49" a 2.25rem ocupa ~130. A cada faixa em que a coluna
            cresce, imagem e preço crescem junto — nunca antes. Foi assim que R3.3B descobriu o
            estouro a 320: medindo a captura, não lendo o código. */}
        <div className={`flex items-start ${destaque ? "gap-4 sm:gap-5" : "gap-3"}`}>
          <ProductImage
            imagem={visao.imagem}
            categoria={oferta.product.category}
            tamanho={destaque ? "destaque" : "lista"}
            prioridade={destaque}
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <ProductIdentity
              identidade={visao.identidade}
              tituloId={tituloId}
              destaque={destaque}
            />
            <OfferStatus estado={visao.estado} />
            <div className="flex flex-col gap-0.5">
              <PriceDisplay
                preco={visao.preco}
                destaque={destaque}
                atenuado={!visao.naListaOrganica}
              />
              <UnitPrice unitario={visao.unitario} />
            </div>
          </div>
        </div>

        {/* Mercado e bairro continuam colados no preço — "quanto custa, e onde" segue sendo uma
            pergunta só. O que mudou é que o preço agora termina a coluna da direita, e estas
            duas linhas vêm logo abaixo dela em largura inteira, onde o nome do mercado cabe sem
            disputar espaço com a imagem. */}
        <div className="flex flex-col gap-0.5">
          <MarketBadge nome={visao.mercado.nome} destaque={destaque} />
          <NeighborhoodLabel bairro={visao.mercado.bairro} />
        </div>

        <PromotionCondition condicao={visao.condicao} />

        <ProvenanceBlock procedencia={visao.procedencia} sourceType={oferta.source_type} />

        {avisoParcial !== null ? (
          <p id={avisoId} className="text-muted-foreground flex items-start gap-1.5 text-xs">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            {avisoParcial}
          </p>
        ) : null}

        {/* O CTA CONTINUA SENDO UM BOTÃO — a recomendação de transformá-lo em link discreto
            na variante de lista foi rejeitada. Ele é a única ação do card e leva à
            comparação, que é o núcleo do produto; economizar oito pixels de altura
            enfraquecendo a ação que o card existe para oferecer é trocar propósito por
            densidade. O que muda é o peso: em lista, superfície discreta em vez de caixa
            contornada — mesma forma, mesmo alvo de 48 px, menos linha desenhada por card. */}
        <div className="mt-auto pt-1">
          <Link
            to="/produto/$productId"
            params={{ productId: oferta.product.id }}
            aria-describedby={avisoParcial !== null ? avisoId : undefined}
            // R3.3B §6 INVERTEU A ÊNFASE ENTRE OS DOIS CTAs DA HOME. O do destaque era
            // contornado e o do WhatsApp era sólido — a página pedia o contato com mais força
            // do que oferecia a comparação, que é o núcleo do produto. Agora o sólido é este.
            className={`btn-base btn-touch-48 w-full ${
              destaque ? "btn-primary" : "bg-surface text-primary"
            }`}
          >
            {visao.cta.rotulo}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </Surface>
  );
}

/**
 * Esqueleto do Card v2.
 *
 * A geometria repete a do card real — imagem quadrada de 80 px, duas linhas de identidade,
 * preço, duas linhas de procedência e o botão de 48 px. É o ponto inteiro de um esqueleto:
 * ocupar o espaço que o conteúdo vai ocupar, para a página não saltar quando o dado chega.
 *
 * O anúncio de carregamento é da REGIÃO, uma vez, por `aria-live`. Cada retângulo é
 * `aria-hidden` — anunciar seis retângulos cinzentos por card numa lista de cards seria
 * transformar o carregamento em ruído.
 */
export function ProductCardV2Skeleton({ className = "" }: { className?: string }) {
  return (
    <Surface padding="nenhum" className={`flex flex-col overflow-hidden ${className}`}>
      <div aria-hidden="true" style={{ height: "var(--vp-time-bar-now)" }} className="bg-muted" />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-20 w-20 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-12 w-full" />
      </div>
    </Surface>
  );
}
