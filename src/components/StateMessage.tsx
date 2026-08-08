import { AlertCircle, Loader2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface StateMessageProps {
  variant: "loading" | "error" | "empty";
  title: string;
  description?: ReactNode;
  /**
   * Saída oferecida junto com a mensagem — um link, normalmente. Slot próprio, e não um link
   * embutido na descrição: a descrição é uma frase, e um botão de 48 px dentro de um parágrafo
   * de texto corrido não é nem parágrafo nem botão.
   */
  action?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function StateMessage({
  variant,
  title,
  description,
  action,
  onRetry,
  className = "",
}: StateMessageProps) {
  const Icon = variant === "loading" ? Loader2 : variant === "error" ? AlertCircle : Inbox;

  return (
    // R3.3B §9 — o estado também precisa parecer produto final.
    //
    // A composição era um ícone de 24 px, um título em negrito e uma linha de metadado, dentro
    // de um card apertado: a aparência de uma mensagem de sistema, não de uma tela. O que mudou
    // é peso e ar — ícone dentro de um círculo suave, título na tipografia de display, descrição
    // em texto de leitura, e espaço para respirar. Nada do contrato mudou: `role`, `aria-live`,
    // a copy e a saída oferecida continuam vindo de fora, decididos por dado.
    <div
      className={`card-base flex flex-col items-center gap-2 px-5 py-10 text-center ${className}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={`mb-1 flex size-12 items-center justify-center rounded-full ${
          variant === "error" ? "bg-destructive-surface" : "bg-surface"
        }`}
      >
        <Icon
          className={`size-6 ${
            variant === "error" ? "text-destructive" : "text-muted-foreground"
          } ${variant === "loading" ? "animate-spin" : ""}`}
        />
      </span>
      <p className="font-display max-w-sm text-lg leading-tight font-bold text-balance">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="btn-base btn-secondary btn-sm btn-touch-48 mt-3"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState({
  title = "Carregando…",
  ...rest
}: Omit<StateMessageProps, "variant" | "title"> & { title?: string }) {
  return <StateMessage variant="loading" title={title} {...rest} />;
}

export function EmptyState({ title, ...rest }: Omit<StateMessageProps, "variant">) {
  return <StateMessage variant="empty" title={title} {...rest} />;
}

export function ErrorState({
  title = "Não conseguimos carregar estas informações.",
  description = "Verifique sua conexão e tente novamente.",
  ...rest
}: Omit<StateMessageProps, "variant" | "title"> & { title?: string }) {
  return <StateMessage variant="error" title={title} description={description} {...rest} />;
}
