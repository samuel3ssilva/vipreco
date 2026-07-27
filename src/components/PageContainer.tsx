import type { ReactNode } from "react";

/** Container central com a largura máxima do produto (1120px). */
export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-container ${className}`}>{children}</div>;
}

interface SectionHeaderProps {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Títulos de grandes seções usam a serifada da marca. */
  display?: boolean;
  as?: "h2" | "h3";
}

export function SectionHeader({
  id,
  title,
  description,
  action,
  display = true,
  as: Tag = "h2",
}: SectionHeaderProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
      <div className="min-w-0">
        <Tag id={id} className={`text-lg sm:text-xl ${display ? "font-display" : ""}`}>
          {title}
        </Tag>
        {description ? <p className="meta-text mt-0.5">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
