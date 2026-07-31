/**
 * Compartilhamento de um Achado (North Star v1.2.2, seção G do mandato da Parte 2).
 *
 * Duas regras inegociáveis moram aqui:
 *
 * 1. **Nenhum preço fictício circula sem aviso.** Em DEMO, o texto começa obrigatoriamente por
 *    `DEMO_SHARE_PREFIX`. Quem receber a mensagem no WhatsApp lê a marcação antes do preço.
 * 2. **Nenhum dado pessoal entra no conteúdo.** O texto é montado só com produto, preço,
 *    mercado, validade quando informada e a URL pública — nada de identificador de sessão,
 *    telefone ou qualquer coisa sobre quem compartilhou.
 *
 * Sem SDK, sem dependência de terceiros, sem gerador dinâmico de imagem: o compartilhamento é
 * texto e link. A ordem de tentativa é Web Share API → WhatsApp → copiar o link.
 */
import { formatDate, formatPrice } from "@/lib/format";
import { PILOT_LOCALITY } from "@/lib/pilot";

export const DEMO_SHARE_PREFIX = "EXEMPLO FICTÍCIO — demonstração do formato do ViPreço";

export interface ShareAchadoPayload {
  produto: string;
  preco: number;
  mercado: string;
  validUntil: string | null;
  url: string;
  isDemo: boolean;
}

/**
 * Resultado de uma tentativa de compartilhamento.
 *
 * `compartilhado` e `whatsapp-aberto` são estados diferentes de propósito. A Web Share API só
 * resolve depois que o sistema aceitou o compartilhamento; abrir o WhatsApp apenas leva o
 * visitante até a tela de envio — ele ainda pode escolher ninguém e fechar. Anunciar
 * "Achado compartilhado" nos dois casos afirmaria um envio que não aconteceu.
 */
export type ShareOutcome =
  "compartilhado" | "whatsapp-aberto" | "link-copiado" | "cancelado" | "erro";

/** Mensagem mostrada ao visitante depois da tentativa. Cancelar é silencioso, de propósito. */
export const SHARE_MESSAGE: Record<ShareOutcome, string | null> = {
  compartilhado: "Achado compartilhado",
  "whatsapp-aberto": "WhatsApp aberto para compartilhar",
  "link-copiado": "Link copiado",
  cancelado: null,
  erro: "Não foi possível compartilhar. Link copiado como alternativa.",
};

export function buildShareText(payload: ShareAchadoPayload): string {
  const linhas: string[] = [];

  if (payload.isDemo) linhas.push(DEMO_SHARE_PREFIX, "");

  linhas.push(payload.produto);
  linhas.push(`${formatPrice(payload.preco)} — ${payload.mercado} · ${PILOT_LOCALITY}`);
  if (payload.validUntil) linhas.push(`Válido até ${formatDate(payload.validUntil)}`);
  linhas.push("", payload.url, "via ViPreço");

  return linhas.join("\n");
}

/** Endereço de compartilhamento do WhatsApp — sem número: quem recebe é escolhido na hora. */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export interface ShareDeps {
  /** `navigator.share`, quando existe. */
  share?: (data: { title?: string; text: string }) => Promise<void>;
  /** `navigator.clipboard.writeText`, quando existe. */
  copy?: (text: string) => Promise<void>;
  /** Abre o WhatsApp com o texto pronto. */
  openWhatsapp?: (url: string) => void;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export async function shareAchado(
  payload: ShareAchadoPayload,
  deps: ShareDeps,
): Promise<ShareOutcome> {
  const text = buildShareText(payload);

  if (deps.share) {
    try {
      await deps.share({ title: payload.produto, text });
      return "compartilhado";
    } catch (error) {
      // Fechar a folha de compartilhamento não é falha de nada — não vira erro na tela.
      if (isAbort(error)) return "cancelado";
      if (deps.copy) {
        try {
          await deps.copy(text);
        } catch {
          // Se nem copiar deu, ainda assim a mensagem de erro é a mesma: não há terceira via.
        }
      }
      return "erro";
    }
  }

  if (deps.openWhatsapp) {
    // Abrir o WhatsApp não é prova de envio: daqui em diante quem decide é o visitante, dentro
    // do aplicativo, e a página não tem como saber o desfecho.
    deps.openWhatsapp(whatsappShareUrl(text));
    return "whatsapp-aberto";
  }

  if (deps.copy) {
    try {
      await deps.copy(text);
      return "link-copiado";
    } catch {
      return "erro";
    }
  }

  return "erro";
}
