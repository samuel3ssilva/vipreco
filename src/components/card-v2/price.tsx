import { VisuallyHidden } from "@/components/primitives";
import type { ClubeExibido, PrecoExibido, UnitarioExibido } from "@/lib/card-v2";
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
          // O destaque escalona POR FAIXA DE LARGURA: ele divide a coluna com a imagem, e o
          // teto de cada faixa é o que a coluna comporta. V4 §4 acrescentou o sufixo "/kg" ao
          // número — ~30 px a mais na pior linha —, então a escala desceu meio degrau em cada
          // faixa (2 → 2.25 → 2.5 → 2.75rem). Um único `text-[3rem]` caberia no desktop e
          // estouraria no aparelho mais estreito que o produto atende — e é o estreito que manda.
          destaque
            ? "text-[2rem] min-[360px]:text-[2.25rem] min-[430px]:text-[2.5rem] sm:text-[2.75rem]"
            : "text-[1.625rem]",
        )}
      >
        <span className="text-[62%] font-bold">{preco.simbolo}</span>
        <span className="ml-1">{preco.numero}</span>
        {/* A UNIDADE COLADA NO NÚMERO (V4 §4): "R$ 7,99" + "/kg". Menor e mais leve — ela
            qualifica o preço, não compete com ele. Solta numa linha própria, deixaria de ser
            lida junto e "R$ 7,99" voltaria a poder ser lido como o preço de uma peça. */}
        {preco.quantidade !== null ? (
          <span className="text-muted-foreground ml-0.5 text-[45%] font-bold whitespace-nowrap">
            {preco.quantidade}
          </span>
        ) : null}
      </p>
      {/* V4.3 §1 — venda só em pack obrigatório: o número grande é o desembolso mínimo, e
          estas duas linhas dizem a que pack ele se refere e quanto é o por-unidade
          anunciado. Coladas no número pela mesma razão do "/kg": separadas, "R$ 45,48"
          voltaria a poder ser lido como o preço de uma lata. */}
      {preco.embalagemMinima !== null ? (
        <p aria-hidden="true" className="text-muted-foreground text-xs font-bold">
          {preco.embalagemMinima}
        </p>
      ) : null}
      {preco.porUnidade !== null ? (
        <p aria-hidden="true" className="text-muted-foreground text-xs tabular-nums">
          {preco.porUnidade}
        </p>
      ) : null}
      <VisuallyHidden>{preco.falado}</VisuallyHidden>
    </>
  );
}

/**
 * A simulação de quantidade do peso variável — "500 g ≈ R$ 4,00" (V4 §4).
 *
 * Sempre SECUNDÁRIA, nunca o número grande: o que foi observado é o R$/kg, e é ele o
 * protagonista. O "≈" carrega a ressalva da balança sem gastar uma frase. `aria-hidden`
 * porque o leitor de tela já ouve o cálculo por extenso dentro de `preco.falado`.
 */
export function SimulacaoDePeso({
  simulacao,
  className = "text-muted-foreground text-sm tabular-nums",
}: {
  simulacao: string | null;
  className?: string;
}) {
  if (simulacao === null) return null;
  return (
    <p aria-hidden="true" className={className}>
      {simulacao}
    </p>
  );
}

/**
 * O preço de clube/cartão — SEMPRE ao lado do preço cheio, nunca no lugar dele (§8).
 *
 * Três informações, inseparáveis: que existe um preço condicionado, quanto ele é, e qual é
 * a condição. O preço cheio continua sendo o número grande e continua sendo o que ordena a
 * lista — promoção não reordena nada (`CLAUDE.md`, princípio 4). Substituir o cheio pelo
 * condicionado em silêncio é exatamente o que este componente existe para impedir.
 */
export function ClubPrice({ clube }: { clube: ClubeExibido | null }) {
  if (clube === null) return null;
  return (
    <p className="bg-secondary text-secondary-foreground w-fit max-w-full rounded-md px-2 py-1 text-xs">
      <span aria-hidden="true">
        <span className="font-bold tabular-nums">R$ {clube.precoTexto}</span> {clube.condicao}
      </span>
      <VisuallyHidden>{clube.falado}</VisuallyHidden>
    </p>
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
    // R$ 24,99 por kg é meio número, meio frase — e a regra do design system reserva a mono
    // a dado tabular DE FATO. Na demo v2 esta linha passou a aparecer em toda a Home, e em
    // mono ela devolvia ao card o ar de terminal que o mandato §18 manda evitar.
    // `tabular-nums` preserva o dígito de largura fixa, que é o que importava.
    <p className="text-muted-foreground text-sm tabular-nums">
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
    //
    // DEMO FREEZE §4: `w-fit`. Um `<p>` é bloco, então a nota atravessava o card de ponta a
    // ponta como uma faixa âmbar — a largura de um banner de alerta para o que é uma ressalva de
    // uma linha. Encolhida ao próprio texto ela vira etiqueta, que é o peso certo. `max-w-full`
    // porque condição é texto livre do mercado e pode ser longa: encolher não pode virar estouro.
    <p className="bg-caution/25 text-caution-foreground w-fit max-w-full rounded-md px-2 py-1 text-xs">
      <span className="font-semibold">Condição:</span> {condicao}
    </p>
  );
}
