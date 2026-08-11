import { MapPin, Store } from "lucide-react";
import { MarketAvatar } from "@/components/MarketAvatar";
import type { Market } from "@/types/domain";

/**
 * R3.2 — mercado e bairro; V3 — com o avatar do mercado quando há logo fornecido.
 *
 * =============================================================================
 * LOGO É IDENTIFICAÇÃO, E A REGRA MUDOU POR DECISÃO DO FOUNDER (V3 §2)
 * =============================================================================
 *
 * A R3.2 tinha proibido logotipo aqui porque nenhum direito de uso havia sido obtido. No
 * mandato da V3 o Founder FORNECEU os logos (Safra, Savegnago, Atacadão, Pague Menos) e
 * mandou aplicá-los — a decisão registrada é essa, e vale para a demonstração. O que a
 * mudança NÃO muda: logo não implica parceria (o ambiente se declara demonstração), não
 * reordena nada, e o nome por extenso continua obrigatório ao lado. Quem não tem logo
 * (Açougue Mota) recebe monograma no mesmo quadro — ver `MarketAvatar`.
 *
 * Sem `market` (caminho do piloto, ou chamador antigo) o desenho continua o de sempre:
 * texto com o ícone genérico decorativo.
 *
 * O bairro é âncora de proximidade — "é aqui perto" é metade da razão de alguém confiar
 * num preço local. Quando o mercado não tem bairro cadastrado, a linha simplesmente não
 * aparece: inventar um bairro seria inventar a proximidade.
 */

export function MarketBadge({
  nome,
  destaque,
  market,
}: {
  nome: string;
  destaque: boolean;
  market?: Market;
}) {
  const texto = destaque ? "text-base font-semibold" : "text-sm font-semibold";
  if (market !== undefined) {
    return (
      <p className={`flex items-center gap-1.5 ${texto}`}>
        <MarketAvatar market={market} tamanho="sm" />
        <span className="min-w-0">{nome}</span>
      </p>
    );
  }
  return (
    <p className={texto}>
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
