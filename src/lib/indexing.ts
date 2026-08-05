/**
 * Quem pode ser indexado, e quem não pode.
 *
 * O ViPreço passa a ter três endereços com propósitos diferentes:
 *
 * - `vipreco.com.br` — o produto público, quando existir. **Indexável.**
 * - `demo.vipreco.com.br` — a demonstração que o Founder mostra a moradores e a donos de
 *   mercado. Conteúdo fictício, piloto em preparação. **Nunca indexável.**
 * - `*.workers.dev` — contingência técnica. Não se divulga, não se compartilha, não se indexa.
 *
 * A decisão é tomada em duas camadas independentes, de propósito:
 *
 * 1. **por host, a cada requisição** (`shouldBlockIndexing`), que vira `X-Robots-Tag` e o
 *    `robots.txt` servido. Não depende de como o build foi feito: mesmo bundle, hosts
 *    diferentes, respostas diferentes.
 * 2. **por build** (`shouldBlockIndexingForSite`), que vira a meta `robots` do HTML. Depende de
 *    o build declarar para qual endereço público ele foi feito, em `VITE_PUBLIC_SITE_URL`.
 *
 * Sem declaração, a camada 2 responde "não indexar". É o lado seguro do erro: um build sem
 * endereço declarado não é o produto público, e produção sair do noindex tem que ser uma decisão
 * escrita, não um efeito colateral.
 */

/** O que a demonstração diz a rastreadores. `noarchive` também barra o cache do buscador. */
export const NOINDEX_DIRECTIVE = "noindex, nofollow, noarchive";

/** Sufixos de host que nunca são o produto público. */
const SUFIXOS_NAO_PUBLICOS = [".workers.dev"];

/** Hosts nominais que existem para demonstração, não para o público encontrar sozinho. */
const HOSTS_DE_DEMONSTRACAO = ["demo.vipreco.com.br"];

/** O endereço oficial da demonstração — o que o Founder manda em conversa. */
export const DEMO_HOST = "demo.vipreco.com.br";

function ehHostNaoPublico(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    HOSTS_DE_DEMONSTRACAO.includes(host) ||
    SUFIXOS_NAO_PUBLICOS.some((sufixo) => host.endsWith(sufixo))
  );
}

function hostname(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Este host pode aparecer em buscador?
 *
 * URL impossível de interpretar responde "bloqueia": no Worker a URL vem sempre da própria
 * requisição, então o caso não acontece na prática — e, se acontecesse, errar para o lado de
 * não indexar é o que não tem volta.
 */
export function shouldBlockIndexing(requestUrl: string): boolean {
  const host = hostname(requestUrl);
  if (host === null) return true;
  return ehHostNaoPublico(host);
}

/** Este build foi feito para um endereço público indexável? */
export function shouldBlockIndexingForSite(siteUrl: string | undefined): boolean {
  const host = hostname(siteUrl);
  if (host === null) return true;
  return ehHostNaoPublico(host);
}

/** O endereço declarado por este build, quando existe. */
export function configuredSiteUrl(): string | undefined {
  return typeof import.meta.env.VITE_PUBLIC_SITE_URL === "string"
    ? import.meta.env.VITE_PUBLIC_SITE_URL
    : undefined;
}

/**
 * O endereço que pode circular em `canonical` e `og:url`.
 *
 * `demo.vipreco.com.br` entra: é justamente o endereço que o Founder compartilha. `workers.dev`
 * não: é contingência técnica e não deve aparecer em nada que alguém possa copiar.
 */
export function shareableSiteUrl(siteUrl: string | undefined = configuredSiteUrl()): string | null {
  const host = hostname(siteUrl);
  if (host === null) return null;
  if (SUFIXOS_NAO_PUBLICOS.some((sufixo) => host.toLowerCase().endsWith(sufixo))) return null;
  return siteUrl ?? null;
}

/** As rotas que um buscador deveria conhecer, quando houver produto público. */
const ROTAS_PUBLICAS = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/buscar", changefreq: "weekly", priority: "0.8" },
  { path: "/como-funciona", changefreq: "monthly", priority: "0.5" },
  { path: "/para-mercados", changefreq: "monthly", priority: "0.5" },
] as const;

/**
 * O `robots.txt` deste host. Decidido a cada requisição, não por arquivo estático: o mesmo bundle
 * serve a demonstração e, um dia, a produção.
 */
export function buildRobotsTxt(requestUrl: string): string {
  if (shouldBlockIndexing(requestUrl)) return "User-agent: *\nDisallow: /\n";

  const origem = new URL(requestUrl).origin;
  return `User-agent: *\nAllow: /\n\nSitemap: ${origem}/sitemap.xml\n`;
}

/**
 * O sitemap deste host. Em demonstração ele sai **vazio**: entregar uma lista de endereços para
 * indexar, num host que pede `Disallow: /`, é dar instrução contraditória a rastreador.
 */
export function buildSitemapXml(requestUrl: string): string {
  const bloqueado = shouldBlockIndexing(requestUrl);
  const origem = bloqueado ? "" : new URL(requestUrl).origin;
  const entradas = bloqueado ? [] : ROTAS_PUBLICAS;

  const urls = entradas.map((e) =>
    [
      `  <url>`,
      `    <loc>${origem}${e.path}</loc>`,
      `    <changefreq>${e.changefreq}</changefreq>`,
      `    <priority>${e.priority}</priority>`,
      `  </url>`,
    ].join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

/** URL absoluta de um caminho da aplicação, ou `null` quando não há endereço compartilhável. */
export function canonicalUrl(
  path: string,
  siteUrl: string | undefined = configuredSiteUrl(),
): string | null {
  const base = shareableSiteUrl(siteUrl);
  if (!base) return null;
  try {
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}
