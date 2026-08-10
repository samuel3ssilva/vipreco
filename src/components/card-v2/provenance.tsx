import { CalendarClock, CalendarOff } from "lucide-react";
import { Badge } from "@/components/primitives";
import type { EstadoExibido, ProcedenciaExibida } from "@/lib/card-v2";
import { SourceBadge } from "@/components/SourceBadge";
import type { SourceType } from "@/types/domain";

/**
 * R3.2 — procedência, validade e estado da oferta.
 *
 * =============================================================================
 * O BLOCO É INSEPARÁVEL
 * =============================================================================
 *
 * `R3-SCREEN-SPEC.md`, convenção que vale para todas as telas: **preço, mercado, fonte,
 * data e validade aparecem juntos ou não aparecem. Não existe card com preço e sem data.**
 *
 * Por isso `ProvenanceBlock` recebe os três de uma vez e os renderiza numa unidade só. Um
 * card que compusesse fonte aqui, data ali e validade em outro canto poderia perder um dos
 * três numa refatoração sem que nada quebrasse — e um preço sem data é boato.
 */

/**
 * Validade.
 *
 * Os dois caminhos são explícitos, e o segundo é o que costuma faltar: quando o mercado
 * **não** informou validade, o card diz isso. Não escrever nada deixaria o leitor supor
 * que o preço vale indefinidamente, e supor é exatamente o que o produto não pode induzir.
 *
 * Nenhuma data é inventada e nenhuma urgência é fabricada: não há contagem regressiva,
 * não há "faltam X horas", não há "últimas unidades".
 */
export function ValidityLabel({ validoAte }: { validoAte: string | null }) {
  if (validoAte === null) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <CalendarOff aria-hidden="true" className="size-3.5 shrink-0" />
        validade não informada
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs tabular-nums">
      <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
      válido até {validoAte}
    </span>
  );
}

export function ProvenanceBlock({
  procedencia,
  sourceType,
}: {
  procedencia: ProcedenciaExibida;
  sourceType: SourceType;
}) {
  return (
    // =========================================================================================
    // DEMO FREEZE §4 — O FIO SAIU, E A PROCEDÊNCIA VIROU UMA FAIXA QUE FLUI
    // =========================================================================================
    //
    // Havia aqui um `border-t` — o único fio do card — separando "o que é e quanto custa" de
    // "de onde veio". A separação é real, mas depois de R3.3C ela já é feita pela própria
    // composição: identidade e preço vivem numa coluna ao lado da imagem, e tudo o que vem
    // abaixo é outra coisa por construção. O fio virou o que o §14 chama de divisor a mais, e o
    // §4 é explícito: **reduzir o peso visual de metadata, fonte, datas e selos secundários.**
    //
    // NENHUMA INFORMAÇÃO SAIU. Fonte, validade e observação continuam as três, juntas, no bloco
    // inseparável do `R3-SCREEN-SPEC.md`. O que mudou é que elas param de ocupar três linhas
    // empilhadas e passam a fluir numa faixa só: a 390 px o selo e a validade cabem lado a lado
    // e a observação desce sozinha — duas linhas onde antes eram três, sem tirar uma palavra.
    //
    // O `flex-col` abaixo de `sm` que existia aqui foi escrito para consertar um defeito que já
    // não existe: o selo esticava para a largura inteira porque faltava `items-start`. Com
    // `items-center` num `flex-wrap`, a largura estreita quebra sozinha, e nas larguras em que
    // cabe lado a lado ela economiza a linha em vez de gastá-la por precaução.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {/* O rótulo é o que `montarVisaoDoCard` resolveu — o declarado pela coleta quando há
          um, o do enum quando não há. O nível de evidência continua sendo o do enum. */}
      <SourceBadge source={sourceType} label={procedencia.origem} />
      <ValidityLabel validoAte={procedencia.validoAte} />
      {/* R3.3B tirou o `font-data` desta linha e da validade. "observado em 05/08/2026 · ontem"
          é texto corrido, e a própria regra do design system reserva a monoespaçada a dado
          tabular de fato. Em mono, ela era o elemento que mais fazia o card parecer log de
          sistema — o defeito exato que o mandato §7 mandou reduzir. `tabular-nums` preserva a
          largura fixa do dígito, que é a única coisa que a mono acrescentava. */}
      <p className="text-muted-foreground text-xs leading-snug tabular-nums">
        {`observado em ${procedencia.observadoEm} · ${procedencia.relativo}`}
      </p>
    </div>
  );
}

/**
 * Estado da oferta, em texto.
 *
 * `active` não chega aqui — `montarVisaoDoCard` devolve `null`, e o estado normal não
 * precisa de rótulo. O que chega é sempre uma exceção, e toda exceção vem escrita:
 * `Badge` é cor **mais** texto.
 *
 * =============================================================================
 * DUAS COISAS SAÍRAM DAQUI EM 06/08/2026, E AS DUAS ERAM PESO
 * =============================================================================
 *
 * **A frase explicativa.** "A validade informada pelo mercado já passou." convivia, três
 * linhas abaixo, com "válido até 03/08/2026" — a própria prova do que a frase dizia.
 * Repetir custa duas linhas em cada card de uma lista, e não acrescenta nada que o rótulo
 * mais a linha de procedência já não digam.
 *
 * **O vermelho cheio.** O selo sólido era o elemento de maior croma do card, colado na
 * identidade, mais chamativo que o nome e que o preço — e com a tarja temporal no topo, o
 * vermelho aparecia duas vezes antes de o leitor saber que produto é aquele. O par suave
 * diz exatamente a mesma coisa, com 5.34:1 de contraste, sem dominar a composição.
 *
 * A oferta fora da lista orgânica continua distinguível por três canais independentes: o
 * rótulo escrito, o preço atenuado e a tarja no topo do card.
 *
 * `role="status"` não é usado de propósito. O estado é uma característica estática do card
 * na lista, não um evento que acabou de acontecer — anunciá-lo como atualização faria o
 * leitor de tela interromper a leitura a cada card de uma lista inteira.
 */
export function OfferStatus({ estado }: { estado: EstadoExibido | null }) {
  if (estado === null) return null;
  return (
    // `items-start`, e não o `stretch` que um `flex-col` dá por padrão. Sem isto o selo
    // esticava para a largura inteira do card e deixava de ser selo: virava uma tarja
    // sangrada, com o peso visual de um banner de alerta. O mandato §10 pede o contrário —
    // nada de cinco cores competindo, nada de badge dominando a composição. O defeito só
    // apareceu ao OLHAR o PNG; nenhum teste de texto o pegaria.
    <div className="flex flex-col items-start">
      <Badge tom={estado.chave === "desatualizada" ? "atencao" : "critico-suave"}>
        {estado.rotulo}
      </Badge>
    </div>
  );
}
