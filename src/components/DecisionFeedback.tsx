import { useEffect, useState } from "react";
import { submitDecisionFeedback } from "@/services/catalog";
import { hasAnsweredFeedback, markFeedbackAnswered } from "@/lib/local-preferences";
import type { DecisionType, HelpfulnessAnswer } from "@/types/domain";

const ANSWERS: Array<{ value: HelpfulnessAnswer; label: string }> = [
  { value: "yes", label: "Sim" },
  { value: "not_yet", label: "Ainda não" },
  { value: "no", label: "Não" },
];

const DECISIONS: Array<{ value: DecisionType; label: string }> = [
  { value: "confirmed_usual_market", label: "Confirmou meu mercado habitual" },
  { value: "considered_other_market", label: "Considerei outro mercado" },
  { value: "found_opportunity", label: "Encontrei uma oportunidade" },
  { value: "avoided_trip", label: "Evitei um deslocamento" },
  { value: "waited_or_anticipated", label: "Decidi esperar ou antecipar a compra" },
];

export function DecisionFeedback({ productId }: { productId: string }) {
  const [answer, setAnswer] = useState<HelpfulnessAnswer | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    setAnswer(null);
    setStatus(hasAnsweredFeedback(productId) ? "sent" : "idle");
  }, [productId]);

  async function send(helpfulness: HelpfulnessAnswer, decisionType: DecisionType | null) {
    setStatus("sending");
    try {
      await submitDecisionFeedback({ productId, helpfulness, decisionType });
      markFeedbackAnswered(productId);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <section className="card-base" aria-live="polite">
        <p className="font-semibold">Obrigado pela sua resposta.</p>
        <p className="text-sm text-muted-foreground">
          Ela ajuda a escolher quais produtos atualizar com mais frequência.
        </p>
      </section>
    );
  }

  return (
    <section className="card-base" aria-labelledby="feedback-titulo">
      <h2 id="feedback-titulo" className="text-base font-bold">
        Essa informação ajudou sua decisão de compra?
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {ANSWERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`btn-base ${answer === option.value ? "btn-primary" : "btn-secondary"}`}
            aria-pressed={answer === option.value}
            disabled={status === "sending"}
            onClick={() => {
              setAnswer(option.value);
              if (option.value !== "yes") void send(option.value, null);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {answer === "yes" ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">O que aconteceu? (opcional)</p>
          <div className="mt-2 space-y-2">
            {DECISIONS.map((decision) => (
              <button
                key={decision.value}
                type="button"
                className="btn-base btn-secondary w-full justify-start text-left"
                disabled={status === "sending"}
                onClick={() => void send("yes", decision.value)}
              >
                {decision.label}
              </button>
            ))}
            <button
              type="button"
              className="btn-base btn-primary w-full"
              disabled={status === "sending"}
              onClick={() => void send("yes", null)}
            >
              Prefiro não detalhar
            </button>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
          Não estamos registrando respostas no momento.
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {status === "sending" ? "Enviando resposta" : ""}
      </p>
    </section>
  );
}
