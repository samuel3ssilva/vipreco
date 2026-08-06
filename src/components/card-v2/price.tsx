import { VisuallyHidden } from "@/components/primitives";
import type { PrecoAnteriorExibido, PrecoExibido, UnitarioExibido } from "@/lib/card-v2";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * R3.2 — preço, preço anterior, preço unitário e condição de promoção.
 *
 * Os quatro moram no mesmo arquivo porque são a mesma pergunta vista de ângulos
 * diferentes: **quanto custa, e o que é preciso saber para que esse número não engane.**
 * Separá-los em quatro arquivos daria a impressão de que um pode ser usado sem os outros.
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
          destaque ? "text-[2rem]" : "text-[1.625rem]",
        )}
      >
        <span className="text-[62%] font-bold">{preco.simbolo}</span>
        <span className="ml-1">{preco.numero}</span>
      </p>
      <VisuallyHidden>{preco.falado}</VisuallyHidden>
    </>
  );
}

/**
 * Preço anterior e variação.
 *
 * O rótulo é uma FRASE — "12% mais barato que em 28/07" —, e não um "−12%" colorido. Cor e
 * sinal sozinhos são informação para quem enxerga a cor e informação nenhuma para o resto
 * (WCAG 2.2 SC 1.4.1), e a data junto é o que separa um percentual de um boato.
 *
 * O componente não calcula nada. Quando a regra não permite exibir — sem data, variação
 * abaixo de 1% —, `montarVisaoDoCard` já devolveu `null` e aqui não há o que desenhar.
 */
export function PreviousPrice({ anterior }: { anterior: PrecoAnteriorExibido | null }) {
  if (anterior === null) return null;
  return (
    <p className="text-muted-foreground text-sm">
      antes <s>{formatPrice(anterior.valor)}</s> · {anterior.rotulo}
    </p>
  );
}

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
    <p className="border-caution bg-caution/15 rounded-md border-l-2 px-2 py-1 text-sm">
      <span className="font-semibold">Condição:</span> {condicao}
    </p>
  );
}
