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
    <span className="text-muted-foreground font-data inline-flex items-center gap-1 text-xs">
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
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <SourceBadge source={sourceType} />
        <ValidityLabel validoAte={procedencia.validoAte} />
      </div>
      <p className="font-data text-muted-foreground text-xs leading-snug">
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
 * `Badge` é cor **mais** texto, e a explicação logo abaixo diz o que o rótulo significa
 * sem inventar pressa.
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
    // vermelha sangrada, com o peso visual de um banner de alerta. O mandato §10 pede o
    // contrário — nada de cinco cores competindo, nada de badge dominando a composição.
    // O defeito só apareceu ao OLHAR o PNG; nenhum teste de texto o pegaria.
    <div className="flex flex-col items-start gap-0.5">
      <Badge tom={estado.chave === "desatualizada" ? "atencao" : "critico"}>{estado.rotulo}</Badge>
      <p className="text-muted-foreground text-xs leading-snug">{estado.explicacao}</p>
    </div>
  );
}
