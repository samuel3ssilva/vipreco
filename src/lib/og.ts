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

/** Texto alternativo do asset padrão — o do consumidor. */
export const OG_IMAGE_ALT =
  "ViPreço — Achados de Artemis. Exemplo fictício de como um preço aparece, com faixa de demonstração.";

/**
 * Asset da proposta para mercados (Parte 3). Também estático, também 1200×630, também sem
 * gerador dinâmico — e sem número, métrica, depoimento ou promessa de venda: só a promessa da
 * página e o estado real do piloto. Fonte vetorial ao lado, em
 * `public/og/vipreco-og-para-mercados.svg`.
 */
export const OG_IMAGE_MARKETS_PATH = "/og/vipreco-og-para-mercados.png";

export const OG_IMAGE_MARKETS_ALT =
  "ViPreço para mercados de Artemis — seu mercado mais perto de quem compra no bairro. Piloto em preparação.";

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

/**
 * Metadados de prévia de link. Sem argumento, entrega o asset do consumidor — é o padrão da raiz
 * e de toda rota que não pede outro. Uma rota com asset próprio passa o seu; as demais não mudam.
 */
export function ogImageMeta({ path, alt }: { path?: string; alt?: string } = {}): Array<{
  property?: string;
  name?: string;
  content: string;
}> {
  return [
    { property: "og:image", content: absoluteAssetUrl(path ?? OG_IMAGE_PATH) },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: OG_IMAGE_WIDTH },
    { property: "og:image:height", content: OG_IMAGE_HEIGHT },
    { property: "og:image:alt", content: alt ?? OG_IMAGE_ALT },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
