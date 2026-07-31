import { isDemoMode } from "@/lib/app-mode";

/**
 * Faixa de ambiente, acima do header (North Star v1.2.2 §"Faixa de staging").
 *
 * Só existe no modo DEMO e **não pode ser removida** enquanto o Teste MVP estiver no ar: é o
 * primeiro elemento da página e a garantia de que ninguém confunde a demonstração com a versão
 * pública. No modo piloto ela simplesmente não é renderizada — nenhum resquício no HTML.
 *
 * `role="status"` porque é um aviso de contexto persistente, não um alerta de erro: leitores de
 * tela anunciam sem interromper.
 */
export function StagingBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      role="status"
      className="flex min-h-11 items-center justify-center border-b-2 px-4 py-1.5"
      style={{
        background: "var(--vp-staging-bg)",
        color: "var(--vp-staging-fg)",
        borderBottomColor: "var(--vp-staging-border)",
      }}
    >
      {/* Texto corrido (não itens de flex): no celular ele quebra como frase, sem virar colunas. */}
      <p className="text-center text-xs font-semibold leading-snug tracking-wide">
        AMBIENTE DE TESTE{" "}
        <span aria-hidden="true" className="font-data">
          ·
        </span>{" "}
        <span className="font-normal">esta não é a versão pública do ViPreço</span>
      </p>
    </div>
  );
}
