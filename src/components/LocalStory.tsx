import { Link } from "@tanstack/react-router";

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
    <section aria-labelledby="pertencimento-titulo" className="card-base space-y-3">
      <div>
        <h2 id="pertencimento-titulo" className="font-display text-xl sm:text-2xl">
          Feito para começar por Artemis
        </h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Estamos testando com poucos mercados e produtos antes de ampliar.
        </p>
      </div>

      <Link to="/como-funciona" className="btn-base btn-secondary btn-sm btn-touch-48">
        Como funciona o piloto
      </Link>
    </section>
  );
}
