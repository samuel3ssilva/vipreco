import type { SourceType } from "@/types/domain";

export interface SourceDescriptor {
  label: string;
  description: string;
  /** Nível de evidência apenas informativo — não é uma certificação. */
  tone: "documento" | "estabelecimento" | "pesquisa" | "comunidade";
}

export const SOURCE_LABELS: Record<SourceType, SourceDescriptor> = {
  receipt: {
    label: "Confirmado por nota fiscal",
    description: "O preço foi conferido em um documento de compra.",
    tone: "documento",
  },
  store_list: {
    label: "Enviado pelo supermercado",
    description: "O preço foi informado pelo próprio estabelecimento.",
    tone: "estabelecimento",
  },
  weekly_audit: {
    label: "Pesquisa semanal",
    description: "O preço foi anotado durante uma visita de pesquisa.",
    tone: "pesquisa",
  },
  shelf_photo: {
    label: "Foto da etiqueta",
    description: "O preço veio de uma foto da etiqueta na loja.",
    tone: "documento",
  },
  community: {
    label: "Informado pela comunidade",
    description: "O preço foi enviado por um morador e conferido antes de publicar.",
    tone: "comunidade",
  },
  social_media: {
    label: "Oferta anunciada",
    description: "O preço veio de um anúncio do mercado em rede social ou WhatsApp.",
    tone: "estabelecimento",
  },
};

export function sourceLabel(source: SourceType): string {
  return SOURCE_LABELS[source]?.label ?? "Fonte não informada";
}
