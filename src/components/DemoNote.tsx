import { isDemoMode } from "@/lib/app-mode";

/**
 * O indicador discreto de demonstração (§16 do mandato).
 *
 * "Discreto" é a palavra do mandato, e ela resolve uma tensão real: a honestidade sobre o dado
 * ser fictício não pode depender de o aviso ser feio, e também não pode sumir porque a tela
 * ficou bonita. Uma linha, no fim do conteúdo, sem caixa, sem cor de alerta.
 *
 * Ele NÃO substitui a faixa "AMBIENTE DE TESTE" do topo — aquela fala do ambiente, esta fala do
 * dado. As duas dizem coisas diferentes, e é por isso que as duas ficam.
 *
 * Fora do modo demo não renderiza nada: um aviso de dado fictício ao lado de preço real seria
 * pior do que aviso nenhum.
 */
export function DemoNote({ className = "" }: { className?: string }) {
  if (!isDemoMode()) return null;
  return (
    <p className={`text-muted-foreground pt-1 text-xs ${className}`}>
      Demonstração — produtos e preços ilustrativos.
    </p>
  );
}
