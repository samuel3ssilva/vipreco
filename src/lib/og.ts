/**
 * Prévia de link (Open Graph / Twitter Card).
 *
 * A primeira dobra real de um produto distribuído por WhatsApp é a prévia do link. Fase inicial
 * da North Star v1.2.2 (Assets §3): **og:image estática**, com asset de demonstração
 * inequivocamente fictício. O gerador dinâmico por Achado é fase futura e depende de ofertas
 * reais e de autorização — não entra aqui.
 *
 * O asset (`public/og/vipreco-og-demo.png`, 1200×630) carrega uma faixa inferior fixa
 * "EXEMPLO FICTÍCIO — demonstração do formato do ViPreço, sem preço real": nenhum preço de
 * demonstração circula sem essa marcação, e nenhum mercado real aparece como participante.
 * O fonte vetorial fica ao lado, em `public/og/vipreco-og-demo.svg`.
 */
export const OG_IMAGE_PATH = "/og/vipreco-og-demo.png";
export const OG_IMAGE_WIDTH = "1200";
export const OG_IMAGE_HEIGHT = "630";

/**
 * URL absoluta do asset quando o ambiente informa a sua origem pública
 * (`VITE_PUBLIC_SITE_URL`), relativa caso contrário.
 *
 * Rastreadores de prévia exigem URL absoluta. Como a origem muda por ambiente e o domínio
 * definitivo ainda não está decidido, ela vem de configuração — nunca fixada no código.
 */
export function absoluteAssetUrl(
  path: string,
  siteUrl: string | undefined = typeof import.meta.env.VITE_PUBLIC_SITE_URL === "string"
    ? import.meta.env.VITE_PUBLIC_SITE_URL
    : undefined,
): string {
  if (!siteUrl) return path;
  try {
    return new URL(path, siteUrl).toString();
  } catch {
    return path;
  }
}

/** Metadados de prévia de link comuns a todas as rotas. */
export function ogImageMeta(): Array<{ property?: string; name?: string; content: string }> {
  return [
    { property: "og:image", content: absoluteAssetUrl(OG_IMAGE_PATH) },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: OG_IMAGE_WIDTH },
    { property: "og:image:height", content: OG_IMAGE_HEIGHT },
    {
      property: "og:image:alt",
      content:
        "ViPreço — Achados de Artemis. Exemplo fictício de como um preço aparece, com faixa de demonstração.",
    },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
