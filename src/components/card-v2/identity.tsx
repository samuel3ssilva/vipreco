import { ImagePlaceholder } from "@/components/primitives";
import type { ImagemDeProduto, IdentidadeExibida } from "@/lib/card-v2";
import { cn } from "@/lib/utils";

/**
 * R3.2 — identidade do produto e imagem.
 *
 * =============================================================================
 * O SKU VEM ANTES DO PREÇO
 * =============================================================================
 *
 * O `AchadoCard` de hoje concatena nome, marca e variante num título só. Funciona para
 * ler, e falha para o que o produto existe para fazer: distinguir 250 g de 500 g,
 * tradicional de descafeinado, vidro de sachê. Quando os três viram uma frase, a diferença
 * entre dois SKUs vira uma palavra no meio de um texto corrido.
 *
 * Aqui eles são campos separados — itens 2, 3 e 4 do `CARD-V2-SPEC.md`. O nome é o título;
 * marca, variante e quantidade são uma linha própria, com peso próprio.
 *
 * **Quantidade e variante nunca truncam** (`R3-SCREEN-SPEC.md` §A, responsividade). O nome
 * pode ganhar reticências em duas linhas; o que distingue o SKU, não.
 */

export function ProductIdentity({
  identidade,
  tituloId,
  destaque,
}: {
  identidade: IdentidadeExibida;
  tituloId: string;
  destaque: boolean;
}) {
  const detalhes = [identidade.marca, identidade.variante].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );

  return (
    <div className="min-w-0">
      {/* `h2` porque o card vive sob o `h1` da primeira dobra. Um `h3` pularia um nível. */}
      <h2
        id={tituloId}
        className={cn(
          "font-display line-clamp-2 leading-tight",
          destaque ? "text-lg" : "text-base",
        )}
      >
        {identidade.nome}
      </h2>

      {detalhes.length > 0 ? (
        <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{detalhes.join(" · ")}</p>
      ) : null}

      {identidade.quantidade !== null ? (
        // Sem `truncate` e sem `line-clamp`, de propósito: a gramatura é o que separa dois
        // produtos que de resto são o mesmo. Cortá-la para caber é apagar a comparação.
        <p className="font-data mt-1 text-sm font-semibold break-words">
          {identidade.quantidade}
          {identidade.embalagem !== null ? (
            <span className="text-muted-foreground font-normal"> · {identidade.embalagem}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Imagem do produto, ou o placeholder.
 *
 * Este componente **não decide** se a imagem corresponde ao SKU — quem decide é a revisão,
 * e `montarVisaoDoCard` já traduziu a decisão em "tem imagem" ou "não tem". Aqui só há o
 * desenho, e o caminho sem imagem é o padrão.
 *
 * O tamanho é fixo em `rem`, e não relativo ao conteúdo: numa lista com cards com e sem
 * foto, uma imagem que se dimensiona pelo próprio arquivo faz cada linha começar num lugar
 * diferente, e a lista inteira parece quebrada.
 */
export function ProductImage({
  imagem,
  categoria,
  destaque,
  prioridade = false,
}: {
  imagem: ImagemDeProduto | null;
  categoria: string | null;
  destaque: boolean;
  /** Só o destaque carrega o LCP: `high` nele, `lazy` nos demais (`CARD-V2-SPEC.md` §6). */
  prioridade?: boolean;
}) {
  const tamanho = destaque ? "h-24 w-24 sm:h-28 sm:w-28" : "h-20 w-20";

  if (imagem === null) {
    return (
      <ImagePlaceholder categoria={categoria ?? undefined} className={cn(tamanho, "shrink-0")} />
    );
  }

  return (
    <img
      src={imagem.src}
      // Curto e factual. Repetir o card inteiro no `alt` faz o leitor de tela ouvir o
      // produto duas vezes — uma na imagem, outra no título logo abaixo.
      alt={imagem.alt}
      width={112}
      height={112}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={cn(tamanho, "border-border shrink-0 rounded-md border object-cover")}
    />
  );
}
