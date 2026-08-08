import { Link } from "@tanstack/react-router";
import { ArrowRight, Sprout } from "lucide-react";

/**
 * "Feito para começar por Artemis" — o fechamento compacto da Home (R3.3A, item 4).
 *
 * O bloco anterior contava uma pequena história ("antes de ser um site, era conversa de corredor
 * de mercado") ao lado de um segundo cartão convidando donos de mercado. Duas colunas, dois
 * assuntos e dois destinos no rodapé de uma tela cuja função é descoberta de preço.
 *
 * O que ficou é a única coisa que este ponto da página precisa dizer, e é uma **expectativa**:
 * poucos mercados, poucos produtos, e ampliação depois. Dito no fechamento, ele explica o que a
 * pessoa acabou de ver — uma lista curta — sem que ela conclua que o produto é incompleto por
 * defeito.
 *
 * O convite B2B não sumiu do produto: `/para-mercados` continua alcançável pelo rodapé em toda
 * rota e pela pill "Tenho um mercado" no cabeçalho. Ele não precisa de uma terceira entrada na
 * Home do consumidor — que é justamente a mistura de audiências que o gate de B2B-0 reprovou.
 *
 * A história é sobre o lugar, nunca sobre pessoas: sem nome de fundador, sem endereço, sem
 * família, sem número de moradores ou de mercados participantes — nada que afirme uma operação
 * que ainda não existe.
 */
export function LocalStory() {
  return (
    // Os dois blocos de fechamento levam para a MESMA rota — é a copy do mandato, e a instrução
    // era não criar rota nova quando a existente já responde. R3.3B pelo menos os diferenciou em
    // peso: o de procedência tem o botão, este tem um link. Dois botões idênticos, colados, com
    // o mesmo destino, são a definição de redundância que o §7 mandou reduzir.
    <section aria-labelledby="pertencimento-titulo" className="space-y-1.5 px-1">
      <div className="flex items-start gap-3">
        <Sprout aria-hidden="true" className="text-primary mt-0.5 size-5 shrink-0" />
        <div>
          <h2 id="pertencimento-titulo" className="font-display text-lg leading-tight">
            Feito para começar por Artemis
          </h2>
          <p className="text-muted-foreground mt-1 max-w-prose text-sm">
            Estamos testando com poucos mercados e produtos antes de ampliar.
          </p>
          <Link
            to="/como-funciona"
            className="text-primary mt-1 inline-flex min-h-12 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
          >
            Como funciona o piloto
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
