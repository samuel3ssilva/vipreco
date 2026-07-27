import { AlertCircle, Loader2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface StateMessageProps {
  variant: "loading" | "error" | "empty";
  title: string;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function StateMessage({
  variant,
  title,
  description,
  onRetry,
  className = "",
}: StateMessageProps) {
  const Icon = variant === "loading" ? Loader2 : variant === "error" ? AlertCircle : Inbox;

  return (
    <div
      className={`card-base flex flex-col items-center gap-1.5 py-6 text-center ${className}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon
        aria-hidden="true"
        className={`size-6 ${variant === "error" ? "text-destructive" : "text-muted-foreground"} ${
          variant === "loading" ? "animate-spin" : ""
        }`}
      />
      <p className="font-semibold">{title}</p>
      {description ? <p className="meta-text max-w-md">{description}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-base btn-secondary btn-sm mt-2">
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
