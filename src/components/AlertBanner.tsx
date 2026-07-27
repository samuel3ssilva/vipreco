import type { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

type BannerTone = "atencao" | "neutro" | "positivo";

const TONE: Record<BannerTone, { className: string; Icon: typeof Info; prefix: string }> = {
  atencao: {
    className: "border-caution-foreground/25 bg-caution text-caution-foreground",
    Icon: AlertTriangle,
    prefix: "Atenção",
  },
  neutro: {
    className: "border-border bg-info text-info-foreground",
    Icon: Info,
    prefix: "Informação",
  },
  positivo: {
    className: "border-success/35 bg-success/10 text-success",
    Icon: CheckCircle2,
    prefix: "Tudo certo",
  },
};

interface AlertBannerProps {
  tone?: BannerTone;
  children: ReactNode;
  className?: string;
}

/** Caixa de aviso: o texto sempre diz o significado, nunca só a cor. */
export function AlertBanner({ tone = "neutro", children, className = "" }: AlertBannerProps) {
  const { className: toneClass, Icon, prefix } = TONE[tone];
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${toneClass} ${className}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <span className="sr-only">{prefix}: </span>
        {children}
      </div>
    </div>
  );
}
