import { useState } from "react";
import { Share2 } from "lucide-react";
import { SHARE_MESSAGE, shareAchado, type ShareAchadoPayload } from "@/lib/share";

/**
 * "Compartilhar este achado" — só no card de destaque (North Star v1.2.2, seção G).
 *
 * Web Share API quando existe, WhatsApp quando não, copiar o link como último recurso. Sem SDK,
 * sem dependência de terceiros, sem gerador dinâmico de imagem.
 *
 * Fechar a folha de compartilhamento é cancelamento, não erro: nada aparece na tela.
 */
export function ShareAchadoButton({ payload }: { payload: ShareAchadoPayload }) {
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function compartilhar() {
    const resultado = await shareAchado(payload, {
      share:
        typeof navigator !== "undefined" && typeof navigator.share === "function"
          ? (data) => navigator.share(data)
          : undefined,
      copy:
        typeof navigator !== "undefined" && navigator.clipboard
          ? (texto) => navigator.clipboard.writeText(texto)
          : undefined,
      openWhatsapp: (url) => {
        window.open(url, "_blank", "noopener,noreferrer");
      },
    });
    setMensagem(SHARE_MESSAGE[resultado]);
  }

  return (
    // R3.3C §14 ENCOLHEU A PEGADA, E SÓ ELA.
    //
    // O botão era de largura inteira e ficava colado logo abaixo do CTA verde do card. Duas
    // caixas empilhadas ocupando a mesma largura leem como formulário — o defeito que o mandato
    // nomeia em "cards sem aparência de formulário" —, e a segunda delas é uma ação secundária
    // que não deveria ter o mesmo tamanho da principal.
    //
    // A BORDA FICOU. Ela não é decoração: `btn-quiet` tem borda transparente, e
    // `btn-quiet-bordered` foi a correção de contraste de elemento não textual (SC 1.4.11) feita
    // na Parte 2 depois de o botão ficar sem limite visível. Encolher a largura resolve a
    // aparência de formulário sem desfazer isso; tirar a borda desfaria.
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={compartilhar}
        className="btn-base btn-quiet btn-quiet-bordered size-12 shrink-0 rounded-full p-0"
      >
        <Share2 aria-hidden="true" className="size-[18px]" />
        <span className="sr-only">Compartilhar este achado</span>
      </button>
      <p role="status" aria-live="polite" className="meta-text sr-only">
        {mensagem}
      </p>
    </div>
  );
}
