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
          destaque ? "text-xl sm:text-2xl" : "text-base",
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
        //
        // O PESO É SÓ DA GRAMATURA, e não da linha inteira. Antes, "2.100 ml · 6 unidades ·
        // pack" saía todo em mono semibold, quebrava em duas linhas a 320 px e ficava mais
        // pesado que o próprio título do produto — o que inverte a hierarquia que o card
        // existe para defender. O que precisa saltar é "2.100 ml"; o resto é contexto.
        //
        // Quando a quantidade não é estruturada — `size_text` livre, como "aprox. 1,2 kg —
        // peso variável" — o peso também não vem: ela continua legível e continua sem
        // truncar, mas não recebe a ênfase reservada a um dado conferido.
        // R3.3B tirou o `font-data` daqui. A regra do design system é "mono só em dado tabular
        // de fato — nunca em texto corrido", e "500 g · 6 unidades · Sachê" é texto corrido: a
        // monoespaçada não alinhava coluna nenhuma e só emprestava ao card o ar de terminal que
        // o mandato §7 mandou reduzir. `tabular-nums` mantém o dígito de largura fixa, que era
        // a única propriedade da mono que servia para alguma coisa aqui.
        <p className="mt-1 text-sm break-words tabular-nums">
          <span className={identidade.quantidadeEstruturada ? "font-semibold" : undefined}>
            {identidade.quantidade}
          </span>
          {identidade.complemento !== null ? (
            <span className="text-muted-foreground"> · {identidade.complemento}</span>
          ) : null}
          {identidade.embalagem !== null ? (
            <span className="text-muted-foreground"> · {identidade.embalagem}</span>
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
/**
 * Três tamanhos, nomeados pelo papel e não pelo número de pixels.
 *
 * R3.3B aumentou o destaque: 96 px eram o tamanho de um ícone grande, e o mandato §6 pede que a
 * imagem seja o **primeiro** item da hierarquia do card protagonista. `compacto` é o da linha
 * de "Outros Achados", onde a imagem serve para reconhecer, não para dominar.
 */
const TAMANHO_DA_IMAGEM = {
  compacto: "size-16 min-[360px]:size-[4.5rem]",
  lista: "size-20",
  // R3.3C: o destaque escalona por faixa de largura, e o número sai de uma conta, não do gosto.
  // Desde que o PREÇO passou para a coluna ao lado da imagem, os dois disputam a mesma largura:
  // a 320 px sobram 144 px para a coluna com a imagem em 96, e "R$ 26,49" a 2.25rem ocupa ~130
  // deles. Cada degrau de imagem só entra na largura em que a coluna já comporta o preço maior.
  destaque: "size-24 min-[430px]:size-28 sm:size-32",
} as const;

export type TamanhoDaImagem = keyof typeof TAMANHO_DA_IMAGEM;

export function ProductImage({
  imagem,
  categoria,
  tamanho = "lista",
  prioridade = false,
}: {
  imagem: ImagemDeProduto | null;
  categoria: string | null;
  tamanho?: TamanhoDaImagem;
  /** Só o destaque carrega o LCP: `high` nele, `lazy` nos demais (`CARD-V2-SPEC.md` §6). */
  prioridade?: boolean;
}) {
  const classe = TAMANHO_DA_IMAGEM[tamanho];

  if (imagem === null) {
    return (
      <ImagePlaceholder categoria={categoria ?? undefined} className={cn(classe, "shrink-0")} />
    );
  }

  return (
    <img
      src={imagem.src}
      // Curto e factual. Repetir o card inteiro no `alt` faz o leitor de tela ouvir o
      // produto duas vezes — uma na imagem, outra no título logo abaixo.
      alt={imagem.alt}
      width={128}
      height={128}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={cn(classe, "border-border shrink-0 rounded-lg border object-cover")}
    />
  );
}
