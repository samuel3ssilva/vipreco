import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * R3.1 — as primitivas de layout.
 *
 * `Stack` empilha, `Inline` alinha em linha, `Container` centraliza. Três, e não trinta:
 * o mandato §13.C avisa contra abstração excessiva, e uma biblioteca de layout com vinte
 * props vira um segundo dialeto de CSS que ninguém lembra de ler.
 *
 * O ESPAÇAMENTO VEM DA ESCALA, e não de número solto. `gap` aceita os degraus de
 * `--vp-sp-*` porque é isso que faz uma tela parecer com a outra: o mesmo respiro entre
 * as mesmas coisas. Um `gap: 13px` escrito à mão em um lugar só é a forma mais comum de
 * uma fundação visual se dissolver — cada tela fica quase certa, e o conjunto fica errado.
 */

/** Os degraus de `--vp-sp-*`. Nomes, não pixels: o valor mora no CSS. */
export type Espaco = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16;

/**
 * Mapa estático de propósito.
 *
 * Uma classe montada por interpolação (`gap-[${n}px]`) não existe para o Tailwind, que
 * varre o código como TEXTO: a classe some do CSS gerado e o layout colapsa sem nenhum
 * erro. Escrever cada uma por extenso é o que garante que elas cheguem ao build.
 */
const GAP: Record<Espaco, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
};

const ALINHAMENTO = {
  inicio: "items-start",
  centro: "items-center",
  fim: "items-end",
  esticar: "items-stretch",
  base: "items-baseline",
} as const;

const DISTRIBUICAO = {
  inicio: "justify-start",
  centro: "justify-center",
  fim: "justify-end",
  entre: "justify-between",
} as const;

interface BaseDeLayout {
  children: ReactNode;
  gap?: Espaco;
  alinhar?: keyof typeof ALINHAMENTO;
  distribuir?: keyof typeof DISTRIBUICAO;
  className?: string;
  as?: ElementType;
}

/** Empilha na vertical. O padrão de toda seção. */
export function Stack({
  children,
  gap = 4,
  alinhar = "esticar",
  distribuir = "inicio",
  className,
  as: Tag = "div",
}: BaseDeLayout) {
  return (
    <Tag
      className={cn(
        "flex flex-col",
        GAP[gap],
        ALINHAMENTO[alinhar],
        DISTRIBUICAO[distribuir],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Alinha em linha, com quebra.
 *
 * `flex-wrap` é o padrão, e não uma opção: a partir de 320 px, uma linha que não quebra é
 * uma linha que produz scroll horizontal na página inteira. O princípio 20 diz que o
 * desktop é consequência — então o comportamento que protege o celular é o padrão.
 */
export function Inline({
  children,
  gap = 2,
  alinhar = "centro",
  distribuir = "inicio",
  className,
  as: Tag = "div",
  quebrar = true,
}: BaseDeLayout & { quebrar?: boolean }) {
  return (
    <Tag
      className={cn(
        "flex",
        quebrar ? "flex-wrap" : "min-w-0",
        GAP[gap],
        ALINHAMENTO[alinhar],
        DISTRIBUICAO[distribuir],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * Container central.
 *
 * Reaproveita a utilitária `page-container` que já existe em `styles.css` em vez de
 * declarar uma segunda largura máxima. Duas larguras máximas para o mesmo produto é o
 * tipo de divergência que só aparece quando alguém compara duas telas lado a lado.
 */
export function Container({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return <Tag className={cn("page-container", className)}>{children}</Tag>;
}

/**
 * Conteúdo para leitor de tela, invisível na tela.
 *
 * `sr-only` do Tailwind, com nome próprio. O nome importa: `<span className="sr-only">`
 * espalhado pelo código é fácil de apagar por engano numa limpeza de classes, e o que se
 * apaga é a única informação que um usuário de leitor de tela tinha.
 */
export function VisuallyHidden({
  children,
  as: Tag = "span",
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return <Tag className="sr-only">{children}</Tag>;
}
