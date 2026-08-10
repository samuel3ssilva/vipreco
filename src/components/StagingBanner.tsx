import { isDemoMode } from "@/lib/app-mode";

/**
 * Identificação de ambiente, acima do header.
 *
 * Só existe no modo DEMO e **não pode ser removida** enquanto o Teste MVP estiver no ar: é o
 * primeiro elemento da página e a garantia de que ninguém confunde a demonstração com a versão
 * pública. No modo piloto ela simplesmente não é renderizada — nenhum resquício no HTML.
 *
 * §16 do mandato de polish (10/08/2026): a faixa cheia de 44 px em amarelo competia com o
 * conteúdo — era o elemento mais chamativo da primeira dobra de todas as telas. Virou uma pill
 * compacta, com os mesmos tokens de staging e a mesma informação. O `noindex` técnico não mora
 * aqui (é `src/lib/indexing.ts` + headers) e não mudou.
 *
 * `role="status"` porque é um aviso de contexto persistente, não um alerta de erro: leitores de
 * tela anunciam sem interromper.
 */
export function StagingBanner() {
  if (!isDemoMode()) return null;

  return (
    <div role="status" className="flex justify-center px-4 pt-2">
      <p
        className="rounded-full border px-3 py-1 text-center text-[0.6875rem] leading-snug font-semibold tracking-wide"
        style={{
          background: "var(--vp-staging-bg)",
          color: "var(--vp-staging-fg)",
          borderColor: "var(--vp-staging-border)",
        }}
      >
        AMBIENTE DE TESTE <span className="font-normal">· não é a versão pública</span>
      </p>
    </div>
  );
}
