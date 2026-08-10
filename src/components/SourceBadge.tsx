import { SOURCE_LABELS, type EvidenceLevel } from "@/lib/sources";
import type { SourceType } from "@/types/domain";
import { FileCheck2, Store, ClipboardList, Camera, Users, Megaphone } from "lucide-react";

const ICONS: Record<SourceType, typeof FileCheck2> = {
  receipt: FileCheck2,
  store_list: Store,
  weekly_audit: ClipboardList,
  shelf_photo: Camera,
  community: Users,
  social_media: Megaphone,
};

/** Pesos visuais diferentes por nível de evidência (nunca só cor: o texto muda também). */
const LEVEL_CLASS: Record<EvidenceLevel, string> = {
  comprovado: "border-success/45 bg-success/12 text-success font-semibold",
  verificado: "border-primary/35 bg-primary/8 text-primary font-semibold",
  informado: "border-border bg-muted text-muted-foreground font-medium",
  anunciado: "border-dashed border-border bg-transparent text-muted-foreground font-medium",
};

interface SourceBadgeProps {
  source: SourceType;
  /**
   * Rótulo declarado pela coleta, quando o genérico do enum não descreve o que aconteceu:
   * "Foto em loja", "Painel da loja", "Encarte da loja" (mandato v2 §15 — nome técnico
   * nunca vira copy). Nível de evidência, ícone e descrição continuam vindo do enum.
   */
  label?: string;
  className?: string;
}

export function SourceBadge({ source, label, className = "" }: SourceBadgeProps) {
  const descriptor = SOURCE_LABELS[source];
  const Icon = ICONS[source];
  if (!descriptor) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs ${LEVEL_CLASS[descriptor.level]} ${className}`}
      title={descriptor.description}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span>{label ?? descriptor.label}</span>
      <span className="sr-only">. {descriptor.description}</span>
    </span>
  );
}
