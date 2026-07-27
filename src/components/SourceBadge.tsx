import { SOURCE_LABELS } from "@/lib/sources";
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

const TONE_CLASS: Record<string, string> = {
  documento: "bg-secondary text-secondary-foreground border-primary/40",
  estabelecimento: "bg-surface text-surface-foreground border-border",
  pesquisa: "bg-muted text-muted-foreground border-border",
  comunidade: "bg-card text-muted-foreground border-dashed border-border",
};

export function SourceBadge({ source }: { source: SourceType }) {
  const descriptor = SOURCE_LABELS[source];
  const Icon = ICONS[source];
  if (!descriptor) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[descriptor.tone]}`}
      title={descriptor.description}
    >
      <Icon aria-hidden="true" className="size-4" />
      <span>{descriptor.label}</span>
      <span className="sr-only">. {descriptor.description}</span>
    </span>
  );
}
