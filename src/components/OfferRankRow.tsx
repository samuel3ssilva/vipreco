import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { VisuallyHidden } from "@/components/primitives";
import { MarketAvatar } from "@/components/MarketAvatar";
import { SourceBadge } from "@/components/SourceBadge";
import { ProductImage } from "@/components/card-v2/identity";
import { isDemoMode } from "@/lib/app-mode";
import { montarVisaoDoCard } from "@/lib/card-v2";
import type { OfertaCardV2 } from "@/lib/card-v2";
import { formatDate, formatPrice } from "@/lib/format";
import type { UnitPriceBasis } from "@/lib/unit-price";

/**
 * Uma linha da comparação — Tela 3 do North Star, agora com as DUAS histórias do
 * mandato v2 (§13).
 *
 * =============================================================================
 * A POSIÇÃO É CONSEQUÊNCIA, NUNCA CURADORIA
 * =============================================================================
 *
 * O número 1, 2, 3 vem da ordenação, e de mais nada — por isso é `aria-hidden` e a posição
 * é dita em texto para quem usa leitor de tela. **Nada reordena esta lista**: não há
 * destaque pago, não há parceiro, e o preço de clube não sobe ninguém de posição — a ordem
 * é pelo preço cheio de prateleira (`CLAUDE.md`, princípio 4). O Açougue Mota abre a
 * comparação do bucho porque tem o menor R$/kg, e não porque é a loja da demonstração.
 *
 * =============================================================================
 * EMBALAGEM IGUAL × EMBALAGENS DIFERENTES (§5)
 * =============================================================================
 *
 * **Embalagem igual** (e granel, onde o kg é o mesmo denominador): a linha é mercado →
 * preço, e o primeiro é o menor desembolso E o melhor custo ao mesmo tempo — não há
 * ambiguidade a desfazer.
 *
 * **Embalagens diferentes**: cada linha carrega o PRÓPRIO SKU — imagem, gramatura — e a
 * ordem é por custo unitário. O desembolso continua sendo o número grande; o custo/kg fica
 * logo abaixo; e o primeiro ganha o selo "Melhor custo/kg", nunca "mais barato" — porque
 * R$ 5,95 por 40 g É o menor desembolso da lista de Dreamies e ainda assim o pior custo.
 * A linha não decide qual dos dois importa para a pessoa: mostra os dois, nomeados.
 */

const SELO_POR_BASE: Record<UnitPriceBasis, string> = {
  per_kg: "Melhor custo/kg",
  per_l: "Melhor custo/L",
  per_un: "Melhor custo/un",
};

export function OfferRankRow({
  entry,
  posicao,
  productId,
  now,
  gramas,
  basePorUnidade,
  diferenca = null,
}: {
  entry: OfertaCardV2;
  posicao: number;
  /** O id do GRUPO — é para a comparação dele que o detalhe volta. */
  productId: string;
  now: Date;
  /** Quantidade escolhida no seletor, quando o grupo é de peso variável. */
  gramas?: number;
  /** Presente quando o grupo compara embalagens diferentes por custo unitário. */
  basePorUnidade?: UnitPriceBasis;
  /**
   * A frase do §12 — "R$ 0,50 a menos que o 2º mercado" —, calculada pela tela com
   * `diferencaParaOSegundo` e desenhada só na primeira linha. É informação, nunca promoção.
   */
  diferenca?: string | null;
}) {
  const visao = montarVisaoDoCard(entry, now, formatDate, {
    ...(gramas === undefined ? {} : { gramas }),
    snapshotHistorico: isDemoMode(),
  });
  const primeiro = posicao === 1;
  const embalagensDiferentes = basePorUnidade !== undefined;

  const conteudo = (
    <div className="flex items-start gap-3 p-3.5">
      {/* V3: o selo de posição mora no canto do AVATAR do mercado — mesma informação da
          ordenação, sem gastar uma coluna própria. O que "primeiro" significa continua
          escrito na própria tela: menor preço, ou melhor custo unitário. */}
      <MarketAvatar market={entry.market} posicao={posicao} className="mt-0.5" />

      {/* A IMAGEM SÓ ENTRA QUANDO CADA LINHA É UM SKU DIFERENTE. No grupo de embalagem
          igual o produto já está uma vez, grande, no topo da tela — repeti-lo linha a linha
          espremeria o nome do mercado (medido em 09/08: "Açougue Mota" virava "Aç…"). No
          grupo de embalagens diferentes a imagem É informação da linha: o pacote de 80 g e
          o de 40 g precisam parecer diferentes, porque são. `rank` (64→80 px) e não
          `compacto`: esta linha agora carrega avatar + nome + preço, e a conta de 320 px
          manda (V3 §1 — zero sobreposição). */}
      {embalagensDiferentes ? (
        <ProductImage imagem={visao.imagem} categoria={entry.product.category} tamanho="rank" />
      ) : null}

      <div className="min-w-0 flex-1">
        {/* `flex-wrap` + `ml-auto` no preço: quando "Savegnago" (uma palavra, que NÃO
            quebra) e "R$ 47,88" não cabem lado a lado, o preço desce uma linha e continua
            à direita — em vez de os dois se sobreporem, que foi o bug da V2. Nome de
            mercado segue sem truncar, em qualquer largura. */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          {/* NOME DE MERCADO NÃO TRUNCA. Quebrar em duas linhas custa altura; truncar custa
              a informação — na tela cujo propósito é dizer EM QUAL loja está o preço. */}
          <div className="min-w-0">
            <p className="text-[0.9375rem] leading-tight font-bold">{entry.market.name}</p>
            {entry.market.neighborhood ? (
              <p className="text-muted-foreground text-xs">{entry.market.neighborhood}</p>
            ) : null}
            {/* A gramatura do SKU DESTA linha — obrigatória quando as embalagens diferem:
                sem ela, R$ 5,95 e R$ 7,90 parecem o mesmo produto em promoções diferentes. */}
            {embalagensDiferentes && visao.identidade.quantidade !== null ? (
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {visao.identidade.quantidade}
                {visao.identidade.complemento !== null ? (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {visao.identidade.complemento}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {/* O DESEMBOLSO É O NÚMERO GRANDE (§0). O custo unitário fica embaixo, menor —
              presente sempre que existe, porque é ele que torna as linhas comparáveis.
              Nesta linha o rótulo é a forma curta de balcão ("R$ 98,75/kg"): a coluna do
              preço disputa largura com o nome do mercado, e foi exatamente esse encontro
              que sobrepôs "Pague Menos" a "R$ 149,75 por kg" na V2 (V3 §1). */}
          <div className="ml-auto shrink-0 text-right">
            <p
              aria-hidden="true"
              className="font-display text-primary text-[1.375rem] leading-none font-extrabold tabular-nums"
            >
              <span className="text-[64%] font-bold">R$</span>
              <span className="ml-0.5">{visao.preco.numero}</span>
            </p>
            {visao.preco.quantidade !== null ? (
              <p aria-hidden="true" className="text-muted-foreground mt-0.5 text-xs">
                {visao.preco.quantidade}
              </p>
            ) : null}
            {visao.unitario !== null ? (
              <p aria-hidden="true" className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                {formatPrice(visao.unitario.display)}
                {visao.unitario.rotulo.replace(/^por /, "/")}
              </p>
            ) : null}
            <VisuallyHidden>
              Posição {posicao}: {visao.preco.falado}
              {visao.unitario !== null && visao.preco.quantidade === null
                ? `. ${formatPrice(visao.unitario.display)} ${visao.unitario.rotulo}`
                : ""}
            </VisuallyHidden>
          </div>
        </div>

        {/* O selo do §5 — só no grupo de embalagens diferentes, só no primeiro, e sempre
            nomeando a base. "Mais barato" sem denominador não existe aqui. */}
        {embalagensDiferentes && primeiro ? (
          <p className="bg-primary/10 text-primary mt-2 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-bold">
            {SELO_POR_BASE[basePorUnidade]}
          </p>
        ) : null}

        {/* A diferença do §12 — mesmo produto, mesma quantidade, aritmética de centavos.
            Frase de fato, sem verbo de promoção, e só onde ela responde à pergunta da tela:
            "quanto muda se eu for no primeiro?" */}
        {primeiro && diferenca !== null ? (
          <p className="text-primary mt-1.5 text-xs font-semibold">{diferenca}</p>
        ) : null}

        {/* Preço de clube/cartão — informação, nunca posição (§8). */}
        {visao.clube !== null ? (
          <p className="bg-secondary text-secondary-foreground mt-2 w-fit max-w-full rounded-md px-2 py-1 text-xs">
            <span className="font-bold tabular-nums">R$ {visao.clube.precoTexto}</span>{" "}
            {visao.clube.condicao}
          </p>
        ) : null}

        {/* Condição declarada pelo mercado ("preço por lata, venda só no pack de 12") —
            na LINHA, não só na ficha: sem ela o R$ 3,79 da Original parece comprável
            avulso, e a comparação estaria contando uma história que o encarte não conta. */}
        {visao.condicao !== null ? (
          <p className="bg-caution/25 text-caution-foreground mt-2 w-fit max-w-full rounded-md px-2 py-1 text-xs">
            {visao.condicao}
          </p>
        ) : null}

        {/* §11: o olho lê MERCADO → PREÇO → DIFERENÇA; fonte e data vêm depois, numa faixa
            só, sem ícones extras — os dois relógios que viviam aqui davam à metadata o mesmo
            peso visual do preço, que é a inversão que o benchmark não comete. Nada saiu:
            fonte, observação e validade continuam juntas, com o verbo honesto do §18. */}
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
          <SourceBadge source={entry.source_type} label={visao.procedencia.origem} />
          <span className="tabular-nums">
            {visao.procedencia.observadoEm} · {visao.procedencia.relativo}
            {visao.procedencia.validoAte !== null
              ? ` · ${visao.procedencia.validadePassada ? "valeu até" : "válido até"} ${visao.procedencia.validoAte}`
              : ""}
          </span>
        </div>
      </div>

      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground group-hover:text-primary mt-1 size-5 shrink-0"
      />
    </div>
  );

  const moldura = `block overflow-hidden rounded-xl border ${
    primeiro ? "border-primary/45 shadow-card bg-card" : "border-border bg-card"
  }`;

  return (
    <li>
      <Envelope
        className={`group transition-colors hover:bg-surface ${moldura}`}
        productId={productId}
        priceId={entry.id}
      >
        {conteudo}
      </Envelope>
    </li>
  );
}

/** O link para a ficha da oferta. */
function Envelope({
  className,
  productId,
  priceId,
  children,
}: {
  className: string;
  productId: string;
  priceId: string;
  children: ReactNode;
}) {
  return (
    <Link
      to="/produto/$productId/oferta/$priceId"
      params={{ productId, priceId }}
      className={className}
    >
      {children}
    </Link>
  );
}
