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
 *
 * =============================================================================
 * O TÍTULO ENCURTOU EM R3.3B, E A PROMESSA NÃO CRESCEU
 * =============================================================================
 *
 * Era "Você está vendo ofertas de Artemis" — sete palavras que ocupavam três linhas a 390 px e
 * empurravam a busca e o primeiro Achado para fora da primeira dobra. O mandato §6 ofereceu as
 * duas opções e pediu "a visualmente mais clara sem aumentar promessa".
 *
 * "Achados em Artemis" é mais curta e diz **menos**, não mais: "Achados" é a palavra que o
 * produto já usa para o que ele observou, e "em Artemis" delimita o universo — que é exatamente
 * a diferença entre uma afirmação que o piloto sustenta e uma que não. O que a frase antiga
 * dizia a mais ("você está vendo") era enquadramento, não conteúdo, e a linha abaixo continua
 * dizendo o que esses preços são.
 */
export function HomeContexto() {
  return (
    <header className="space-y-1.5">
      <p className="eyebrow inline-flex items-center gap-1.5">
        <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
        {PILOT_REGION_LABEL}
      </p>
      <h1
        id="titulo-principal"
        className="font-display text-[2rem] leading-[1.1] font-extrabold tracking-tight sm:text-[2.5rem]"
      >
        Achados em Artemis
      </h1>
      {/* R3.3C §4 fixou a frase: "Preços observados nos mercados monitorados, com data e fonte."
          A anterior dizia "nos mercados do bairro", e "do bairro" é uma afirmação de COBERTURA —
          lida como "todos os mercados daqui". "Monitorados" delimita o universo pelo que o
          produto de fato faz, que é a única promessa que o piloto sustenta. Nenhuma palavra sobre
          frescor: "de hoje" só poderia entrar depois de existir contrato de frescor. */}
      <p className="text-muted-foreground max-w-prose text-base">
        Preços observados nos mercados monitorados, com data e fonte.
      </p>
    </header>
  );
}
