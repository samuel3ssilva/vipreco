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
  /**
   * O TÍTULO DO DESTAQUE É A IDENTIDADE INTEIRA (V4 §8) — e, desde a V4.2 §5, o que o
   * título já disse NÃO se repete na linha de apoio: no destaque as linhas de apoio
   * somem; na lista o título é só o nome, e marca/variante/gramatura continuam. Regra
   * visual e genérica — os dados não mudam, só a decisão do que exibir.
   */
  const titulo = destaque
    ? [identidade.nome, identidade.marca, identidade.variante, identidade.quantidade]
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .join(" ")
    : identidade.nome;
  const jaNoTitulo = (v: string) => titulo.toLowerCase().includes(v.toLowerCase());

  const detalhes = [identidade.marca, identidade.variante].filter(
    (v): v is string => typeof v === "string" && v.length > 0 && !jaNoTitulo(v),
  );

  return (
    <div className="min-w-0">
      {/* `h2` porque o card vive sob o `h1` da primeira dobra. Um `h3` pularia um nível. */}
      <h2
        id={tituloId}
        className={cn(
          "font-display line-clamp-2 leading-tight",
          destaque ? "text-[1.35rem] leading-tight sm:text-2xl" : "text-base leading-tight",
        )}
      >
        {titulo}
      </h2>

      {detalhes.length > 0 ? (
        <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{detalhes.join(" · ")}</p>
      ) : null}

      {identidade.quantidade !== null && !jaNoTitulo(identidade.quantidade) ? (
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
  // 09/08/2026: `compacto` passou a servir também a linha da comparação, que já tem selo de
  // posição, nome de mercado, preço e chevron na mesma linha. A 96 px a imagem espremia o nome
  // do mercado até ele virar "Aç…" — e nome de loja truncado, na tela que existe para comparar
  // lojas, é o pior lugar possível para economizar largura.
  // 10/08/2026 (polish §7/§9): 80 px de base e 96 px a partir de 390 — o benchmark de grocery
  // mostra que o reconhecimento do produto é o que faz a lista escanear. O degrau de 96 só
  // entra onde a coluna do nome ainda comporta o preço sem truncar (medido a 360: não cabe).
  compacto: "size-20 min-[390px]:size-24",
  // V3: a linha da comparação ganhou o avatar do mercado, e a conta de largura mudou — a
  // 320 px, avatar (40) + imagem + nome + preço só fecham sem colisão com a imagem em 64.
  // O degrau para 80 entra a partir de 390, onde a coluna do nome volta a sobrar.
  rank: "size-16 min-[390px]:size-20",
  lista: "size-24 min-[360px]:size-28",
  // V4 §3: o destaque voltou a dividir a linha com o preço, e o preço agora pode carregar o
  // sufixo "/kg" — a conta da coluna mudou. A 320 px (card p-4): 320−32−112−14 = 162 px para a
  // coluna, e "R$ 39,90" + "/kg" a 2rem ocupa ~140. Cada degrau de imagem só entra na largura
  // em que a coluna já comporta o preço do degrau correspondente.
  destaque: "size-28 min-[360px]:size-32 min-[430px]:size-36 sm:size-40",
  // A ficha da oferta (tela 4) é a única em que o produto não divide a largura com uma lista —
  // mas desde a V4 §4 o preço dela pode carregar "/kg", e a 320 px "R$ 24,99/kg" ao lado de uma
  // imagem de 144 estourava a página (medido pelo QA de larguras, ficha do bucho). O primeiro
  // degrau desceu para 128; a coluna do preço passa a ter 144 px, que comporta 2rem + sufixo.
  ficha: "size-32 min-[360px]:size-36 min-[430px]:size-44 sm:size-48",
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

  // FOTO PREENCHE, RECORTE CABE DENTRO — e o formato vem declarado no dado, não deduzido.
  //
  // A arte de embalagem tem fundo transparente e precisa de respiro para não encostar na borda
  // da moldura. A foto de produto traz o próprio fundo: dar respiro a ela desenha uma faixa da
  // cor do card em volta de uma imagem que já era retangular, e o resultado parece thumbnail
  // colada, não fotografia.
  const foto = imagem.formato === "foto";

  return (
    <img
      src={imagem.src}
      // Curto e factual. Repetir o card inteiro no `alt` faz o leitor de tela ouvir o
      // produto duas vezes — uma na imagem, outra no título logo abaixo.
      alt={imagem.alt}
      width={160}
      height={160}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      className={cn(
        classe,
        // V4 §15 — o frame é UM: mesmo raio, mesma borda sutil em toda superfície. É a
        // moldura comum que faz 24 recortes de fontes diferentes parecerem um catálogo só.
        "border-border/60 shrink-0 rounded-xl border",
        foto ? "object-cover" : "bg-surface/70 object-contain p-1",
      )}
    />
  );
}
