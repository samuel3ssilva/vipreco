import { VisuallyHidden } from "@/components/primitives";
import type { PrecoExibido, UnitarioExibido } from "@/lib/card-v2";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * R3.2 — preço, preço unitário e condição de promoção.
 *
 * Os três moram no mesmo arquivo porque são a mesma pergunta vista de ângulos diferentes:
 * **quanto custa, e o que é preciso saber para que esse número não engane.** Separá-los em
 * três arquivos daria a impressão de que um pode ser usado sem os outros.
 */

/**
 * O preço observado.
 *
 * A composição em dois tamanhos sai da árvore de acessibilidade e `spokenPrice()` entra no
 * lugar. Não é preciosismo: "R$ 26,49" partido em dois `<span>` de tamanhos diferentes é
 * lido de forma imprevisível — de "erre cifrão" a "26 vírgula 49" — e o preço é justamente
 * o dado que o produto existe para comunicar.
 */
export function PriceDisplay({
  preco,
  destaque,
  atenuado = false,
}: {
  preco: PrecoExibido;
  destaque: boolean;
  /**
   * Oferta que não participa da lista orgânica — expirada, encerrada, esgotada ou
   * desatualizada. O número continua legível e continua sendo lido por inteiro pelo leitor
   * de tela; o que muda é o peso visual, para que um preço que não vale mais não seja a
   * coisa mais chamativa da tela. A cor **não** é o único sinal: o rótulo de estado está
   * escrito logo acima.
   */
  atenuado?: boolean;
}) {
  return (
    <>
      <p
        aria-hidden="true"
        className={cn(
          "font-display leading-none tabular-nums",
          atenuado ? "text-muted-foreground font-bold" : "text-primary font-extrabold",
          // R3.3B §8: no destaque o preço passou de 2rem para 2.625rem. A hierarquia pedida é
          // PRODUTO → PREÇO → MERCADO, e a 2rem o preço empatava com o nome do produto e com o
          // nome do mercado logo abaixo — três linhas com o mesmo peso não são hierarquia.
          // R3.3C §14 ("preço maior") levou o destaque até 3rem, POR FAIXA DE LARGURA. Ele
          // divide a coluna com a imagem desde que subiu para o lado dela, então o teto de cada
          // faixa é o que a coluna comporta: 144 px a 320, 184 a 360, 238 a 430. Um único
          // `text-[3rem]` caberia no desktop e estouraria no aparelho mais estreito que o
          // produto atende — e é o estreito que manda.
          destaque
            ? "text-[2.25rem] min-[360px]:text-[2.5rem] min-[430px]:text-[2.75rem] sm:text-[3rem]"
            : "text-[1.625rem]",
        )}
      >
        <span className="text-[62%] font-bold">{preco.simbolo}</span>
        <span className="ml-1">{preco.numero}</span>
      </p>
      <VisuallyHidden>{preco.falado}</VisuallyHidden>
    </>
  );
}

/*
 * ONDE FICAVA `PreviousPrice`.
 *
 * O componente exibia "antes R$ 14,90 · 13% mais barato que em 25/07/2026", e fazia isso
 * direito: frase em vez de "−12%" colorido, data ao lado do percentual, nada calculado
 * dentro do JSX. Ele saiu em 06/08/2026 (DL-030) por um motivo que não é de código.
 *
 * "Preço anterior" só significa alguma coisa depois que alguém disser **qual** observação
 * anterior conta — a última? a de sete dias atrás? a mais alta da janela? Essa decisão é a
 * pendência **P-01** (card MVP-DOCS-02) e nunca foi tomada. Sem ela, dois cards com o mesmo
 * dado exibem percentuais diferentes e os dois estão "certos", e um percentual que ninguém
 * consegue defender corrói exatamente a confiança que o produto existe para construir.
 *
 * Não sobrou caminho desligado nem campo atrás de flag: quem reintroduzir isto em R6/R8 vai
 * escrever contra o contrato que P-01 produzir, e não contra uma implementação adivinhada.
 *
 * `OFFER-STATES.md` §5 continua íntegro e continua sendo a spec de quando o preço anterior
 * aparece.
 */

/**
 * Preço unitário — presente ou **ausente**, nunca em dúvida.
 *
 * O estado que mais importa é o de ausência, e ele é `return null`: sem traço, sem zero,
 * sem "indisponível". Um "—" comunica ausência de dado como se fosse um dado, e quem lê
 * entende "grátis", "zero" ou "erro" (`R3-SCREEN-SPEC.md`, convenções).
 *
 * Ele nunca é o número principal e nunca ordena a lista orgânica — a ordem é por preço de
 * prateleira, e este componente não sabe o que é ordem.
 */
export function UnitPrice({ unitario }: { unitario: UnitarioExibido | null }) {
  if (unitario === null) return null;
  return (
    <p className="font-data text-muted-foreground text-sm">
      {formatPrice(unitario.display)} {unitario.rotulo}
    </p>
  );
}

/**
 * A condição da promoção, sempre visível junto do preço.
 *
 * O conflito registrado entre o North Star e os contratos é exatamente este: o mockup
 * mostra promoção sem a condição. Uma promoção cujo requisito só aparece na gôndola é uma
 * promessa que o produto não pode cumprir — e o produto inteiro se sustenta em não
 * prometer o que não observou.
 *
 * O texto vem como o mercado informou (`special_condition`). A tipificação em quatro tipos
 * — `unit_limit`, `buy_x_pay_y`, `second_unit_discount`, `quantity_price` — é MVP-E2-07,
 * com coluna própria que ainda não existe; até lá, exibir o texto íntegro é mais honesto
 * que derivar um tipo por leitura de string.
 */
export function PromotionCondition({ condicao }: { condicao: string | null }) {
  if (condicao === null || condicao.trim().length === 0) return null;
  return (
    // R3.3B §8 aliviou o peso, sem tirar a informação: era uma caixa com filete lateral e texto
    // de 14 px, e num card cuja hierarquia é produto → preço → mercado ela competia com o preço.
    // Continua sempre visível e sempre junto do preço — promoção sem condição é promessa que o
    // produto não pode cumprir —, agora como nota, que é o que ela é.
    <p className="bg-caution/25 text-caution-foreground rounded-md px-2 py-1 text-xs">
      <span className="font-semibold">Condição:</span> {condicao}
    </p>
  );
}
