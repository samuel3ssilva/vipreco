import { MapPin } from "lucide-react";
import { PILOT_REGION_LABEL } from "@/lib/pilot";

/**
 * A primeira dobra da Home (R3.3, item A do mandato): onde você está e o que isto é.
 *
 * =============================================================================
 * O QUE NÃO ESTÁ AQUI, E POR QUÊ
 * =============================================================================
 *
 * **Não há sino de notificação.** O North Star original desenhava um; o V2 o removeu, e a razão
 * é de contrato, não de estética: notificação exige um canal, um consentimento e uma decisão
 * sobre o que é digno de interromper alguém. Nada disso existe. Um sino que não notifica é um
 * botão que ensina o usuário a não confiar no que a interface promete.
 *
 * **Não há promessa absoluta.** Nem "o melhor preço de Artemis", nem "o mais barato perto de
 * você". O ViPreço mostra os preços que ele **observou**, nos mercados que ele **monitora** —
 * e é exatamente isso que a linha abaixo do título diz. A diferença entre "o mais barato" e "o
 * mais barato entre os que eu vi" é a diferença entre uma afirmação que o piloto não pode
 * sustentar e uma que ele pode.
 *
 * **Não há contagem de usuários, de mercados ou de economia acumulada.** Nenhum desses números
 * existe, e inventá-los na primeira dobra é a forma mais barata de perder a única coisa que o
 * produto tem para vender, que é ser confiável sobre um assunto onde ninguém é.
 */
export function HomeContexto() {
  return (
    <header className="space-y-2">
      <p className="eyebrow inline-flex items-center gap-1.5">
        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
        {PILOT_REGION_LABEL}
      </p>
      <h1 id="titulo-principal" className="font-display text-3xl leading-tight sm:text-4xl">
        Você está vendo ofertas de Artemis
      </h1>
      <p className="max-w-prose text-base text-muted-foreground">
        Preços observados nos mercados monitorados do bairro, cada um com a data em que foi visto e
        de onde veio a informação.
      </p>
    </header>
  );
}
