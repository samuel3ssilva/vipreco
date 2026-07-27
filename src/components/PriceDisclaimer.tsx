import { AlertBanner } from "@/components/AlertBanner";

export function PriceDisclaimer({ showDemoNotice }: { showDemoNotice?: boolean }) {
  return (
    <AlertBanner tone="neutro">
      <p>
        <strong>Os preços podem mudar.</strong> Confira a data, a fonte e as condições antes de
        comprar.
      </p>
      {showDemoNotice ? (
        <p className="mt-0.5 font-semibold">Ambiente de teste com preços fictícios.</p>
      ) : null}
    </AlertBanner>
  );
}
