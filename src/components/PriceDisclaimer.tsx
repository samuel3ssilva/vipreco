export function PriceDisclaimer({ showDemoNotice }: { showDemoNotice?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-sm text-surface-foreground">
      <p>
        <strong>Atenção:</strong> os preços podem mudar. Confira a data, a fonte e as condições antes de
        comprar.
      </p>
      {showDemoNotice ? <p className="mt-1 font-semibold">Ambiente de teste com preços fictícios.</p> : null}
    </div>
  );
}
