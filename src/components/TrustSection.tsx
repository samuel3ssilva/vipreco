import { Link } from "@tanstack/react-router";
import { Store, CalendarDays, FileSearch, Clock3 } from "lucide-react";

/**
 * "Nenhum preço aparece sozinho" (North Star v1.2.2, seção H do mandato da Parte 2).
 *
 * A seção existe para responder, antes que a pergunta apareça, o que o ViPreço faz e o que ele
 * não faz. Tom direto, sem jargão jurídico: cada regra é uma frase do que acontece e uma frase
 * do porquê.
 */

const ACOMPANHA = [
  { Icon: Store, titulo: "Mercado", detalhe: "Onde o preço foi visto." },
  { Icon: CalendarDays, titulo: "Data", detalhe: "Quando foi observado." },
  { Icon: FileSearch, titulo: "Origem", detalhe: "De onde veio a informação." },
  { Icon: Clock3, titulo: "Validade", detalhe: "Quando o mercado informa até quando vale." },
] as const;

const REGRAS = [
  { regra: "Você compra na loja.", porque: "O ViPreço não altera o preço no caixa." },
  {
    regra: "O estoque é do mercado.",
    porque: "O produto pode acabar antes da validade informada.",
  },
  { regra: "A ordem não é vendida.", porque: "Pagamento nunca muda a comparação orgânica." },
] as const;

export function TrustSection({ isDemo }: { isDemo: boolean }) {
  return (
    <section aria-labelledby="confianca-titulo" className="card-base space-y-4">
      <div>
        <h2 id="confianca-titulo" className="font-display text-xl sm:text-2xl">
          Nenhum preço aparece sozinho
        </h2>
        <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">
          Todo preço no ViPreço chega acompanhado de mercado, data e origem — e da validade, quando
          informada.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ACOMPANHA.map(({ Icon, titulo, detalhe }) => (
          <li key={titulo} className="card-compact bg-surface flex items-start gap-2">
            <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-bold">{titulo}</p>
              <p className="meta-text">{detalhe}</p>
            </div>
          </li>
        ))}
      </ul>

      <ul className="grid gap-2 sm:grid-cols-3">
        {REGRAS.map(({ regra, porque }) => (
          <li key={regra} className="text-sm">
            <p className="font-semibold">{regra}</p>
            <p className="meta-text">{porque}</p>
          </li>
        ))}
      </ul>

      {isDemo ? (
        <p className="text-sm text-muted-foreground">
          Nesta demonstração, os preços são fictícios. No piloto, cada preço será publicado com
          origem identificada.
        </p>
      ) : null}

      <Link to="/como-funciona" className="btn-base btn-secondary btn-sm btn-touch-48">
        Entender como funciona
      </Link>
    </section>
  );
}
