import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { VisuallyHidden } from "@/components/primitives";
import { montarVisaoDoCard, type OfertaCardV2 } from "@/lib/card-v2";
import { formatDate } from "@/lib/format";
import { sourceLabel } from "@/lib/sources";
import { TEMPORAL_STYLE } from "@/lib/temporal";
import { cn } from "@/lib/utils";
import { ProductImage } from "./identity";

/**
 * R3.3B §6 — a linha de "Outros Achados".
 *
 * =============================================================================
 * DERIVADA DO CARD V2, E NÃO UM SEGUNDO CARD
 * =============================================================================
 *
 * Até R3.3A a lista usava o `AchadoCard`, um componente com anatomia própria: outro título,
 * outra composição de preço, outra linha de procedência. Duas anatomias para a mesma coisa
 * significam duas chances de uma regra ser cumprida de um lado e esquecida do outro — foi
 * exatamente assim que o histórico de preço sobreviveu na Home depois de sair do Card v2
 * (DL-030), e ninguém percebeu por uma onda inteira.
 *
 * Esta linha chama a **mesma** `montarVisaoDoCard`. Todo portão continua sendo o mesmo, no
 * mesmo lugar: imagem só com revisão aprovada e correspondência exata, preço unitário só com
 * quantidade de procedência conhecida, estado só quando não é o normal, nada de histórico. O
 * que muda daqui para o destaque é a composição — o que cabe no polegar numa lista —, nunca o
 * que pode ser dito.
 *
 * =============================================================================
 * A LINHA INTEIRA É O LINK
 * =============================================================================
 *
 * O card anterior tinha um botão "Ver preços por mercado" ocupando 48 px no rodapé de cada
 * item. Numa lista, isso é um botão idêntico repetido a cada 130 px, e o que se repete deixa
 * de ser ação e vira textura — o mesmo argumento que manteve os secundários fora do Card v2
 * completo em R3.3.
 *
 * O alvo não encolheu: ele cresceu para a linha toda, que passa dos 88 px de altura. E o nome
 * acessível do link é o card inteiro, na ordem em que está escrito — produto, preço, mercado,
 * procedência —, que é a leitura que alguém usando leitor de tela precisa ouvir antes de
 * decidir se entra.
 */
export function AchadoCompacto({
  oferta,
  now,
  className,
}: {
  oferta: OfertaCardV2;
  /** Instante de referência do servidor — mantém "ontem" igual antes e depois da hidratação. */
  now: Date;
  className?: string;
}) {
  const visao = montarVisaoDoCard(oferta, now, formatDate);
  const { color } = TEMPORAL_STYLE[visao.temporal];

  // Fonte, atualização e validade continuam inseparáveis (`R3-SCREEN-SPEC.md`) — o que muda é
  // que aqui elas cabem numa linha só. A validade ausente é DITA, nunca omitida: sem isso o
  // leitor supõe que o preço vale indefinidamente, que é a suposição que o produto não induz.
  const procedencia = [
    sourceLabel(oferta.source_type),
    visao.procedencia.relativo,
    visao.procedencia.validoAte === null
      ? "validade não informada"
      : `válido até ${visao.procedencia.validoAte}`,
  ].join(" · ");

  return (
    <Link
      to="/produto/$productId"
      params={{ productId: oferta.product.id }}
      className={cn(
        // DUAS GEOMETRIAS, E A ESTREITA É A QUE MANDA.
        //
        // A primeira versão era um `flex` de três colunas em toda largura, e a 320 px ela
        // estourava a página: `minmax(0,1fr)` não existe em flex, e o item de grade que a
        // continha herdava `min-width: auto`, então a linha crescia até caber o conteúdo em vez
        // de o conteúdo se ajustar à linha. Foi a captura que pegou — 549 px de conteúdo numa
        // tela de 320 —, não a leitura do código.
        //
        // Agora são duas colunas abaixo de 360 px, com o preço numa segunda linha alinhada à
        // direita, e três colunas a partir daí. A virada é em 360 e não em `sm` (640) porque a
        // conta é de pixel, não de nome de breakpoint: com imagem de 64, preço de 22 px e o
        // chevron, sobram ~118 px para o nome a 360 e só ~78 a 320. O primeiro cabe em duas
        // linhas; o segundo não cabe em nenhuma.
        "bg-card border-border group relative grid items-start gap-x-3 gap-y-1.5 overflow-hidden rounded-lg border py-3 pr-3 pl-4",
        "grid-cols-[auto_minmax(0,1fr)] min-[360px]:grid-cols-[auto_minmax(0,1fr)_auto]",
        "shadow-card hover:bg-surface transition-colors",
        className,
      )}
    >
      {/* Tarja temporal — decorativa, deitada na borda em vez de no topo, porque numa linha
          horizontal uma barra no topo separaria o card do anterior em vez de qualificá-lo.
          Tudo o que ela sugere está escrito na linha de procedência. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color }}
      />

      <div className="row-span-3 min-[360px]:row-span-2">
        <ProductImage
          imagem={visao.imagem}
          categoria={oferta.product.category}
          tamanho="compacto"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="font-display line-clamp-2 text-[0.9375rem] leading-tight font-bold">
          {visao.identidade.nome}
          {visao.identidade.marca === null ? null : (
            <span className="font-normal"> {visao.identidade.marca}</span>
          )}
        </p>
        {visao.identidade.quantidade === null ? null : (
          // Sem truncar. A gramatura é o que separa dois SKUs que de resto são o mesmo.
          <p className="text-muted-foreground text-xs break-words tabular-nums">
            {[visao.identidade.variante, visao.identidade.quantidade].filter(Boolean).join(" · ")}
          </p>
        )}
        {/* Mercado e bairro. O bairro é âncora de proximidade — "é aqui perto" é metade da razão
            de alguém confiar num preço local — e quando o mercado não tem bairro cadastrado a
            linha simplesmente não aparece: inventar bairro é inventar proximidade.

            R3.3C SEPAROU AS DUAS LINHAS. Elas eram uma só, unidas por "·", e na coluna estreita
            desta composição a quebra caía sempre depois do separador: "Mercado local 2 ·" numa
            linha e "Jardim Novo" na outra. Um separador pendurado no fim da linha é ruído que
            ninguém escolheu — e como a quebra já acontecia, separar não custa altura nenhuma. */}
        <p className="mt-0.5 text-sm leading-tight font-semibold">{visao.mercado.nome}</p>
        {visao.mercado.bairro === null || visao.mercado.bairro.trim().length === 0 ? null : (
          <p className="text-muted-foreground text-xs leading-tight">{visao.mercado.bairro}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1 min-[360px]:self-start min-[360px]:pt-0.5">
        <p
          aria-hidden="true"
          className={cn(
            "font-display text-[1.375rem] leading-none font-extrabold tabular-nums",
            visao.naListaOrganica ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span className="text-[62%] font-bold">{visao.preco.simbolo}</span>
          <span className="ml-1">{visao.preco.numero}</span>
        </p>
        <VisuallyHidden>{visao.preco.falado}</VisuallyHidden>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground group-hover:text-primary size-5 shrink-0"
        />
      </div>

      {/* A PROCEDÊNCIA OCUPA A LINHA INTEIRA, e não a coluna estreita da identidade.
          Espremida ao lado do preço, "Oferta anunciada · há 2 dias · válido até 10/08/2026"
          quebrava em três linhas e dobrava a altura do card. Aqui ela cabe em uma ou duas, e
          continua sendo o bloco inseparável de sempre: fonte, atualização e validade juntas.

          NADA AQUI TRUNCA. A primeira versão truncava, e o resultado era "válido até 10/0…" —
          a data cortada no meio — e "validade…" no lugar de "validade não informada". Truncar
          serve para texto que se repete; não serve para o dado que o card existe para carregar. */}
      <p className="text-muted-foreground col-span-1 text-xs leading-snug min-[360px]:col-span-2">
        {procedencia}
      </p>
    </Link>
  );
}
