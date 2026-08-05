import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * R3.1 — botão e botão de ícone.
 *
 * =============================================================================
 * POR QUE ISTO NÃO É UM TERCEIRO SISTEMA DE BOTÃO
 * =============================================================================
 *
 * O repositório já tem dois: as utilitárias `btn-base` / `btn-primary` / `btn-secondary`
 * / `btn-quiet` em `styles.css`, que é o que o produto de fato usa, e o `ui/button.tsx`
 * do shadcn, consumido só por outros componentes do shadcn.
 *
 * Um terceiro seria exatamente a abstração excessiva contra a qual o mandato §13.C avisa.
 * Então esta primitiva **não redefine nada**: ela compõe as utilitárias que já existem, e
 * o que ela acrescenta é uma coisa só — o alvo de toque de 48 px deixa de ser algo que
 * cada chamador precisa lembrar de escrever.
 *
 * É a diferença entre uma regra que vale porque está documentada e uma que vale porque é
 * o padrão. `touch-targets.test.ts` existe justamente porque a primeira falha.
 */

export type VarianteDeBotao = "primario" | "secundario" | "discreto";

const VARIANTE: Record<VarianteDeBotao, string> = {
  primario: "btn-primary",
  secundario: "btn-secondary",
  // A borda de `btn-quiet` é transparente por padrão; `btn-quiet-bordered` a torna
  // visível. Sempre em par — sozinha, uma não faz nada.
  discreto: "btn-quiet btn-quiet-bordered",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteDeBotao;
  children: ReactNode;
}

export function Button({
  variante = "primario",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // `type="button"` por padrão, e não `submit`: um botão dentro de `<form>` que
      // submete sem ninguém pedir é o defeito mais silencioso que um botão pode ter.
      type={type}
      className={cn("btn-base btn-touch-48", VARIANTE[variante], className)}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Botão com ícone e sem texto visível.
 *
 * `rotulo` é OBRIGATÓRIO, e vira `aria-label`. Não é zelo: um botão cujo conteúdo é um
 * `<svg>` é, para quem usa leitor de tela, um botão sem nome nenhum — e um botão sem nome
 * é um botão que ninguém consegue usar. Tornar o rótulo opcional aqui seria oferecer o
 * caminho errado como padrão.
 *
 * O ícone recebe `aria-hidden` na composição: ele já está descrito pelo rótulo, e
 * anunciar os dois lê a mesma coisa duas vezes.
 */
export function IconButton({
  rotulo,
  variante = "discreto",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps & { rotulo: string }) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      className={cn("btn-base btn-touch-48 min-w-12 px-0", VARIANTE[variante], className)}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex">
        {children}
      </span>
    </button>
  );
}
