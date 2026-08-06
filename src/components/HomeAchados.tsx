import type { ReactNode } from "react";
import { AchadoCard, type AchadoEntry } from "@/components/AchadoCard";
import { ProductCardV2 } from "@/components/card-v2";

/**
 * Os Achados da Home (R3.3) — o destaque e a lista.
 *
 * =============================================================================
 * O DESTAQUE USA O CARD V2; OS OUTROS, NÃO — E ISSO É DELIBERADO
 * =============================================================================
 *
 * O Card v2 foi aprovado em R3.2 como a unidade de **produto exato**: identidade antes do
 * preço, quantidade estruturada quando aprovada, procedência completa, oito estados. Ele é o
 * card certo para a oferta que o usuário vai olhar com atenção.
 *
 * Numa lista, o mesmo card vira textura. Foi medido em R3.2, na captura de quatro cards
 * consecutivos: 400 px de CSS cada. Quatro deles ocupam mais de uma tela e meia de um celular
 * comum, e o que se repete — selo, bloco de procedência, botão — para de ser informação e vira
 * padrão de fundo. Por isso os secundários continuam no `AchadoCard` compacto.
 *
 * Isto não é um card v1 sobrevivendo por inércia: é a mesma decisão que o próprio painel de
 * R3.2 registrou ao separar "cada estado é reconhecível" de "quantos cabem no polegar". A
 * unificação dos dois é assunto de R6, quando o detalhe da oferta existir e a lista tiver mais
 * do que três itens fictícios para provar densidade.
 *
 * NENHUM CRITÉRIO EDITORIAL ESCOLHE O DESTAQUE. Ele é o primeiro da lista que o serviço já
 * entregou ordenada. "Destaque do dia" com curadoria seria ranking editorial, que é o oposto
 * da neutralidade — e não existe critério objetivo escrito para elegê-lo.
 */

interface HomeAchadosProps {
  /** Achados já filtrados por validade, na ordem em que devem aparecer. */
  opportunities: AchadoEntry[];
  /** Instante de referência do servidor. */
  now: Date;
  /** Selo de dados fictícios. */
  seal?: ReactNode;
  /** Estado alternativo quando não há nenhum Achado válido. */
  fallback?: ReactNode;
  /** Ação de compartilhamento do card de destaque. */
  shareSlot?: ReactNode;
}

export function HomeAchados({ opportunities, now, seal, fallback, shareSlot }: HomeAchadosProps) {
  const [destaque, ...secundarios] = opportunities;

  if (!destaque) {
    return (
      <section aria-labelledby="achados-titulo" className="space-y-3">
        <h2 id="achados-titulo" className="font-display text-xl">
          Achados
        </h2>
        {fallback}
        {seal}
      </section>
    );
  }

  return (
    <section aria-labelledby="achados-titulo" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        {/* "Achados", e não "Achados de hoje". O fixture tem preços de ontem, de dois e de
            três dias atrás — e o piloto vai ter dados mais velhos que isso. Um título que diz
            "de hoje" promete uma frescura que a linha de procedência de cada card desmente três
            linhas abaixo. Foi um teste de regressão que pegou isto, não uma revisão. */}
        <h2 id="achados-titulo" className="font-display text-xl">
          Achados
        </h2>
      </div>

      <ProductCardV2 oferta={destaque} now={now} variant="destaque" />
      {shareSlot}

      {secundarios.length > 0 ? (
        <>
          <h3 className="meta-text pt-1">Outros Achados</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {secundarios.map((entry) => (
              <li key={entry.id} className="flex">
                <AchadoCard entry={entry} now={now} className="w-full" />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {seal}
    </section>
  );
}
