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
    <div className="space-y-1">
      <button
        type="button"
        onClick={compartilhar}
        className="btn-base btn-quiet btn-sm btn-touch-48 w-full border-border"
      >
        <Share2 aria-hidden="true" className="size-4" />
        Compartilhar este achado
      </button>
      <p role="status" aria-live="polite" className="meta-text min-h-4">
        {mensagem}
      </p>
    </div>
  );
}
