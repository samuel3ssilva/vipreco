import type { ReactNode } from "react";
import { AchadoCard, type AchadoEntry } from "@/components/AchadoCard";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { PILOT_REGION_LABEL } from "@/lib/pilot";

/**
 * Primeira dobra da Home (North Star v1.2.2, seção B do mandato da Parte 2).
 *
 * Duas coreografias, uma única árvore de DOM — o CTA existe uma vez só, nunca dois competindo
 * na mesma tela:
 *
 * - **Desktop**: composição dividida. À esquerda a promessa (eyebrow, H1, subtexto) e, logo
 *   abaixo dela, o CTA — o `gap` da grade é o que garante os 16–24 px pedidos entre o subtexto
 *   e a ação. À direita o conjunto de Achados, com o destaque dominando.
 * - **Mobile**: vertical. Promessa, Achado principal, os secundários em carrossel horizontal e,
 *   por último, o CTA da seção. O CTA sempre acessível no primeiro viewport é o fixo, que vive
 *   fora daqui.
 *
 * A troca de ordem entre os dois é feita por `order` na grade, não por duplicar blocos.
 * Nenhuma animação de entrada.
 */

interface HomeHeroProps {
  /** Achados já filtrados por validade, na ordem em que devem aparecer. */
  opportunities: AchadoEntry[];
  /** Instante de referência do servidor. */
  now: Date;
  /** Selo de dados fictícios, renderizado junto ao conjunto de cards. */
  seal?: ReactNode;
  /** Estado alternativo quando não há nenhum Achado válido. */
  fallback?: ReactNode;
  /** Ação de compartilhamento do card de destaque. */
  shareSlot?: ReactNode;
}

export function HomeHero({ opportunities, now, seal, fallback, shareSlot }: HomeHeroProps) {
  const [destaque, ...secundarios] = opportunities;

  return (
    <section
      aria-labelledby="titulo-principal"
      className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      {/* `self-end` no texto e `self-start` no CTA: a coluna de cards ocupa as duas linhas, o
          navegador divide a altura dela entre elas, e o par promessa+ação acaba no centro
          vertical — sem o vão morto que apareceria se o texto ficasse colado no topo. O `gap-y`
          da grade é a distância entre subtexto e CTA (24 px). */}
      <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
        <p className="eyebrow">{PILOT_REGION_LABEL}</p>
        <h1
          id="titulo-principal"
          className="font-display mt-1.5 text-3xl leading-tight sm:text-4xl"
        >
          Veja como os Achados de Artemis vão aparecer
        </h1>
        <p className="mt-2 max-w-prose text-base text-muted-foreground">
          Exemplos fictícios para mostrar produto, preço, mercado, data e fonte.
        </p>
      </div>

      <div className="space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {destaque ? (
          <>
            <AchadoCard entry={destaque} now={now} variant="destaque" shareSlot={shareSlot} />

            {secundarios.length > 0 ? (
              <ul
                // Carrossel só no mobile: rola com o dedo, com as setas do teclado quando a
                // faixa recebe foco, e vira grade de duas colunas a partir de `sm`.
                tabIndex={0}
                aria-label="Outros Achados"
                className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0"
              >
                {secundarios.map((entry) => (
                  <li key={entry.id} className="flex min-w-[78%] snap-start sm:min-w-0">
                    <AchadoCard entry={entry} now={now} className="w-full" />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          fallback
        )}

        {seal}
      </div>

      {/* Fica por último no DOM porque essa é a ordem visual do mobile — o alvo primário. Assim
          o teclado e o leitor de tela percorrem promessa → Achados → ação, exatamente como o
          olho. No desktop a grade recoloca o bloco na coluna da esquerda, logo abaixo do
          subtexto; o `gap-y` da grade é a distância de 24 px entre os dois. */}
      <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
        <WhatsAppCta />
      </div>
    </section>
  );
}
