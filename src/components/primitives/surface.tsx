import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * R3.1 — superfície, divisor e esqueleto.
 *
 * O card é a unidade de leitura do ViPreço (princípio 5 do contrato visual), e por isso a
 * superfície é a primitiva mais usada de todas. Ela não decide conteúdo: só a caixa.
 */

/**
 * Elevação.
 *
 * Três degraus e nada além. Sombra existe para SEPARAR, não para decorar (princípio 6) —
 * e uma escala com sete níveis produz, na prática, telas onde nada parece mais importante
 * que nada, porque a diferença entre dois níveis vizinhos deixa de ser perceptível.
 */
export type Elevacao = "plana" | "card" | "destaque";

const ELEVACAO: Record<Elevacao, string> = {
  plana: "shadow-none",
  card: "shadow-card",
  destaque: "shadow-raised",
};

const PADDING = {
  nenhum: "p-0",
  compacto: "p-3",
  normal: "p-3.5",
  largo: "p-5",
} as const;

export function Surface({
  children,
  elevacao = "card",
  padding = "normal",
  borda = true,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  elevacao?: Elevacao;
  padding?: keyof typeof PADDING;
  borda?: boolean;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag
      className={cn(
        "bg-card text-card-foreground rounded-lg",
        borda && "border-border border",
        ELEVACAO[elevacao],
        PADDING[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Divisor.
 *
 * `role="presentation"` de propósito: uma linha que separa visualmente não acrescenta nada
 * para quem ouve a página, e anunciá-la só alonga a leitura. Quando a separação for
 * semântica, o elemento certo é um `<section>` com título, não uma régua.
 */
export function Divider({ className }: { className?: string }) {
  return <hr role="presentation" className={cn("border-border m-0 border-t", className)} />;
}

/**
 * Esqueleto de carregamento.
 *
 * Recebe altura e largura por classe porque o ponto inteiro do esqueleto é ocupar o
 * espaço que o conteúdo vai ocupar. Um esqueleto de tamanho genérico faz a página saltar
 * quando o dado chega — que é exatamente o incômodo que ele existia para evitar.
 *
 * `aria-hidden` porque o estado de carregamento é anunciado uma vez, pelo `aria-live` da
 * região, e não uma vez por retângulo cinza.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("bg-muted animate-pulse rounded-md", className ?? "h-4 w-full")}
    />
  );
}
