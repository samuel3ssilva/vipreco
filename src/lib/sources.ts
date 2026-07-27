import type { SourceType } from "@/types/domain";

/**
 * Nível de evidência de cada fonte. É apenas informativo:
 * o produto não certifica nem garante nenhum preço.
 */
export type EvidenceLevel = "comprovado" | "verificado" | "informado" | "anunciado";

export interface SourceDescriptor {
  label: string;
  description: string;
  level: EvidenceLevel;
}

export const SOURCE_LABELS: Record<SourceType, SourceDescriptor> = {
  receipt: {
    label: "Comprovado por nota fiscal",
    description: "O preço foi conferido em um documento de compra.",
    level: "comprovado",
  },
  weekly_audit: {
    label: "Verificado em pesquisa",
    description: "O preço foi anotado durante uma visita de pesquisa.",
    level: "verificado",
  },
  shelf_photo: {
    label: "Foto da etiqueta",
    description: "O preço veio de uma foto da etiqueta na loja.",
    level: "verificado",
  },
  store_list: {
    label: "Informado pelo mercado",
    description: "O preço foi informado pelo próprio estabelecimento.",
    level: "informado",
  },
  community: {
    label: "Informado pela comunidade",
    description: "O preço foi enviado por um morador e conferido antes de publicar.",
    level: "informado",
  },
  social_media: {
    label: "Oferta anunciada",
    description: "O preço veio de um anúncio do mercado em rede social ou WhatsApp.",
    level: "anunciado",
  },
};

export function sourceLabel(source: SourceType): string {
  return SOURCE_LABELS[source]?.label ?? "Fonte não informada";
}
