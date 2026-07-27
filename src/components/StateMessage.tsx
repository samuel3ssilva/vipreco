import { AlertCircle, Loader2, Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface StateMessageProps {
  variant: "loading" | "error" | "empty";
  title: string;
  description?: ReactNode;
  onRetry?: () => void;
}

export function StateMessage({ variant, title, description, onRetry }: StateMessageProps) {
  const Icon = variant === "loading" ? Loader2 : variant === "error" ? AlertCircle : Inbox;

  return (
    <div
      className="card-base flex flex-col items-center gap-2 text-center"
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <Icon
        aria-hidden="true"
        className={`size-7 text-muted-foreground ${variant === "loading" ? "animate-spin" : ""}`}
      />
      <p className="font-semibold">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-base btn-secondary mt-2">
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
