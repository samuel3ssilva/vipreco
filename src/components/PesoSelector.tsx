import { PESOS_DO_SELETOR, rotuloDoPeso, type PesoSelecionado } from "@/lib/peso-variavel";
import { cn } from "@/lib/utils";

/**
 * O seletor de quantidade dos produtos de peso variável — mandato v2 §3.
 *
 * Três opções fixas (250 g · 500 g · 1 kg), padrão 500 g. Ele muda APENAS o preço
 * calculado exibido; o R$/kg observado de cada mercado não se move, e a ordem da lista
 * também não — a posição vem do R$/kg, que é o mesmo denominador para qualquer quantidade.
 *
 * Botões com `aria-pressed`, e não um `<select>`: são três valores, sempre visíveis, e a
 * comparação entre eles é o ponto — esconder dois atrás de um dropdown esconderia a
 * própria ideia de escolher quanto levar. Área de toque ≥ 44 px (princípio 10).
 */
export function PesoSelector({
  gramas,
  onChange,
}: {
  gramas: PesoSelecionado;
  onChange: (gramas: PesoSelecionado) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Quantidade aproximada"
      className="bg-surface flex rounded-full p-1"
    >
      {PESOS_DO_SELETOR.map((peso) => {
        const ativo = peso === gramas;
        return (
          <button
            key={peso}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(peso)}
            className={cn(
              "min-h-11 flex-1 rounded-full px-3 text-sm font-semibold transition-colors",
              ativo
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {rotuloDoPeso(peso)}
          </button>
        );
      })}
    </div>
  );
}
