/**
 * R3.1 — a fundação visual do ViPreço.
 *
 * Um ponto de importação para as primitivas. O que existe aqui e por quê:
 *
 * | Primitiva          | Origem                                                       |
 * | ------------------ | ------------------------------------------------------------ |
 * | `Stack`, `Inline`  | novas — layout com a escala de `--vp-sp-*`                   |
 * | `Container`        | nova, embrulhando a utilitária `page-container` que já existe |
 * | `VisuallyHidden`   | nova — `sr-only` com nome próprio                            |
 * | `Surface`          | nova — a caixa, com três elevações                           |
 * | `Divider`          | nova — régua decorativa, `role="presentation"`               |
 * | `Skeleton`         | nova — dimensionada pelo chamador, `aria-hidden`             |
 * | `Button`           | compõe `btn-base`/`btn-*`, que já são o padrão do produto    |
 * | `IconButton`       | nova — rótulo acessível **obrigatório**                      |
 * | `Badge`            | nova — cor **mais** texto, nunca cor sozinha                 |
 * | `ImagePlaceholder` | nova — o estado padrão, não o de exceção                     |
 *
 * O que NÃO está aqui, de propósito: nada que dependa de dado. Card de produto, bloco de
 * procedência, preço unitário e linha de comparação são R3.2 em diante, e cada um tem
 * contrato funcional próprio. Uma primitiva que conhecesse `Price` já não seria primitiva.
 *
 * `src/components/ui/` continua sendo o shadcn, consumido por si mesmo. Estas primitivas
 * não o substituem e não o duplicam — quando as duas coisas existiam, esta camada compõe
 * a que já estava (o caso do `Button`), em vez de abrir um terceiro sistema.
 */
export { Stack, Inline, Container, VisuallyHidden } from "./layout";
export type { Espaco } from "./layout";
export { Surface, Divider, Skeleton } from "./surface";
export type { Elevacao } from "./surface";
export { Button, IconButton } from "./button";
export type { VarianteDeBotao, ButtonProps } from "./button";
export { Badge } from "./badge";
export type { TomDeSelo } from "./badge";
export { ImagePlaceholder } from "./image-placeholder";
export type { CategoriaDeProduto } from "./image-placeholder";
