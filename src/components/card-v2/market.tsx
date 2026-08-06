import { MapPin, Store } from "lucide-react";

/**
 * R3.2 — mercado e bairro, em texto.
 *
 * =============================================================================
 * SEM LOGOTIPO. NÃO É UMA ESCOLHA ESTÉTICA
 * =============================================================================
 *
 * O North Star mostra logotipos de rede. Nenhuma dessas redes é parceira, nenhum direito
 * de uso foi obtido, e um logotipo num card de comparação de preços comunica exatamente o
 * que não é verdade: que aquele mercado participa do produto.
 *
 * Até haver autorização registrada, o mercado é identificado por **texto**
 * (`R3-COMPONENT-INVENTORY.md`, `MarketBadge`). O ícone genérico ao lado é decorativo e
 * não identifica marca nenhuma.
 *
 * O bairro é âncora de proximidade — "é aqui perto" é metade da razão de alguém confiar
 * num preço local. Quando o mercado não tem bairro cadastrado, a linha simplesmente não
 * aparece: inventar um bairro seria inventar a proximidade.
 */

export function MarketBadge({ nome, destaque }: { nome: string; destaque: boolean }) {
  return (
    <p className={destaque ? "text-base font-semibold" : "text-sm font-semibold"}>
      <Store aria-hidden="true" className="mr-1 inline-block size-4 shrink-0 align-[-0.15em]" />
      {nome}
    </p>
  );
}

export function NeighborhoodLabel({ bairro }: { bairro: string | null }) {
  if (bairro === null || bairro.trim().length === 0) return null;
  return (
    <p className="text-muted-foreground text-sm">
      <MapPin aria-hidden="true" className="mr-1 inline-block size-3.5 shrink-0 align-[-0.1em]" />
      {bairro}
    </p>
  );
}
