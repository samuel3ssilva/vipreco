import { isDemoMode } from "@/lib/app-mode";
import { DEMO_NATUREZA_DO_DADO } from "@/lib/demo-catalog";

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
 * Fora do modo demo não renderiza nada: um aviso sobre a natureza do dado da demonstração ao
 * lado de preço de piloto seria pior do que aviso nenhum.
 *
 * A FRASE SAIU DAQUI EM 09/08/2026. Ela dizia "produtos e preços ilustrativos", e deixou de ser
 * verdade quando a demonstração passou a carregar preços observados de verdade num açougue. O
 * texto agora vem de `demo-catalog`, junto do dado que ele descreve — se a coleta mudar de data
 * ou de loja, a frase muda no mesmo arquivo, e não em três telas separadas.
 */
export function DemoNote({ className = "" }: { className?: string }) {
  if (!isDemoMode()) return null;
  return (
    <p className={`text-muted-foreground pt-1 text-xs ${className}`}>{DEMO_NATUREZA_DO_DADO}</p>
  );
}
