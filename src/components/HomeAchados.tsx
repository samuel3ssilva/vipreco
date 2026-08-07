import type { ReactNode } from "react";
import { AchadoCompacto, ProductCardV2 } from "@/components/card-v2";
import type { OfertaCardV2 } from "@/lib/card-v2";

/**
 * Os Achados da Home — o destaque e a lista.
 *
 * =============================================================================
 * UMA ANATOMIA, DUAS COMPOSIÇÕES (R3.3B §6)
 * =============================================================================
 *
 * Em R3.3 esta seção misturava dois componentes com regras próprias: o Card v2 no destaque e o
 * `AchadoCard` na lista. A decisão estava certa quanto à densidade — o Card v2 completo repetido
 * quatro vezes ocupa mais de uma tela e meia de um celular comum, e o que se repete vira textura
 * — e errada quanto ao meio: duas anatomias são duas chances de uma regra ser cumprida de um
 * lado e esquecida do outro. Foi assim que o histórico de preço sobreviveu na Home depois de
 * sair do Card v2 (DL-030), por uma onda inteira, sem que nenhum teste reclamasse.
 *
 * R3.3B manteve a densidade e removeu a duplicação: `AchadoCompacto` chama a MESMA
 * `montarVisaoDoCard` do destaque. Os portões — imagem, preço unitário, estado, procedência,
 * nada de histórico — ficaram todos onde já estavam, e o `AchadoCard` deixou de existir.
 *
 * NENHUM CRITÉRIO EDITORIAL ESCOLHE O DESTAQUE. Ele é o primeiro da lista que o serviço já
 * entregou ordenada. "Destaque do dia" com curadoria seria ranking editorial, que é o oposto
 * da neutralidade — e não existe critério objetivo escrito para elegê-lo. É por isso, também,
 * que ele não ganhou a tarja "DESTAQUE DE HOJE" da referência visual: a referência é autoridade
 * de qualidade, não de função.
 */

interface HomeAchadosProps {
  /** Achados já filtrados por validade, na ordem em que devem aparecer. */
  opportunities: OfertaCardV2[];
  /** Instante de referência do servidor. */
  now: Date;
  /** Nota de dados fictícios. */
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
      {/* "Achados", e não "Achados de hoje". O fixture tem preços de ontem, de dois e de
          três dias atrás — e o piloto vai ter dados mais velhos que isso. Um título que diz
          "de hoje" promete uma frescura que a linha de procedência de cada card desmente três
          linhas abaixo. Foi um teste de regressão que pegou isto, não uma revisão. */}
      <h2 id="achados-titulo" className="font-display text-xl">
        Achados
      </h2>

      <ProductCardV2 oferta={destaque} now={now} variant="destaque" />
      {shareSlot}

      {secundarios.length > 0 ? (
        <>
          <h3 className="eyebrow pt-2">Outros Achados</h3>
          <ul className="grid gap-2.5 lg:grid-cols-2">
            {secundarios.map((entry) => (
              <li key={entry.id} className="flex">
                <AchadoCompacto oferta={entry} now={now} className="w-full" />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {seal}
    </section>
  );
}
