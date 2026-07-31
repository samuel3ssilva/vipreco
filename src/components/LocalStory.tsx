import { Link } from "@tanstack/react-router";

/**
 * Pertencimento local (North Star v1.2.2, seção I do mandato da Parte 2).
 *
 * A história é sobre o lugar, nunca sobre pessoas: sem nome de fundador, sem endereço, sem
 * família, sem número de moradores ou de mercados participantes — nada que afirme uma operação
 * que ainda não existe. É por isso que o texto fala de corredor de mercado e não de gente.
 */
export function LocalStory() {
  return (
    <section aria-labelledby="pertencimento-titulo" className="grid gap-4 sm:grid-cols-2">
      <div>
        <h2 id="pertencimento-titulo" className="font-display text-xl sm:text-2xl">
          Começou em Artemis
        </h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          O ViPreço começou em Artemis — nos mercados onde a gente sempre fez compra. Antes de ser
          um site, era conversa de corredor de mercado.
        </p>
      </div>

      <div className="card-compact bg-surface flex flex-col items-start gap-2">
        <p className="text-sm font-semibold">
          Tem um mercado no bairro? Você escolhe o que aparece.
        </p>
        <Link to="/para-mercados" className="btn-base btn-secondary btn-sm btn-touch-48 mt-auto">
          Conhecer a proposta
        </Link>
      </div>
    </section>
  );
}
