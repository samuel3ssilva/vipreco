import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { podeIndexarUrl } from "@/lib/indexing";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const ENTRADAS: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/buscar", changefreq: "weekly", priority: "0.8" },
  { path: "/como-funciona", changefreq: "monthly", priority: "0.5" },
  { path: "/para-mercados", changefreq: "monthly", priority: "0.5" },
];

/**
 * `sitemap.xml` — existe só onde há o que indexar.
 *
 * Fora do host público declarado, a resposta é **404**: um sitemap é um convite para rastrear, e
 * publicar um convite num ambiente que pede `noindex` é contradizer a si mesmo em duas respostas
 * do mesmo servidor. Sitemap vazio seria pior ainda — um documento válido dizendo "sou um site
 * indexável, só que sem páginas".
 *
 * A outra correção é a URL absoluta. O `BASE_URL` era uma constante vazia com um TODO, e o XML
 * saía com `<loc>/</loc>` — que não é uma URL e invalida o documento inteiro. Agora ela vem da
 * origem da própria requisição, que só chega aqui quando já é a origem pública declarada.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        if (!podeIndexarUrl(request.url)) {
          return new Response("Not Found\n", {
            status: 404,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }

        const base = new URL(request.url).origin;
        const urls = ENTRADAS.map((e) =>
          [
            `  <url>`,
            `    <loc>${base}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
