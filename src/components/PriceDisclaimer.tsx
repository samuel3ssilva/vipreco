import { AlertBanner } from "@/components/AlertBanner";

export function PriceDisclaimer({ showDemoNotice }: { showDemoNotice?: boolean }) {
  return (
    <AlertBanner tone="neutro">
      {/* Frase aprovada na North Star v1.2.2. As condições especiais continuam escritas em cada
          card, junto do preço a que se aplicam — é lá que elas significam alguma coisa. */}
      <p>
        <strong>Os preços podem mudar.</strong> Confira a data e a fonte antes de comprar.
      </p>
      {showDemoNotice ? (
        <p className="mt-0.5 font-semibold">Ambiente de teste com preços fictícios.</p>
      ) : null}
    </AlertBanner>
  );
}
