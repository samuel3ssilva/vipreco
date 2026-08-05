import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildSitemapXml } from "@/lib/indexing";

/**
 * Sitemap coerente com o host que responde: vazio em demonstração e em host técnico, absoluto e
 * completo no domínio público. Os `loc` vêm da própria requisição — nunca de uma constante que
 * envelhece com a troca de domínio. Ver `@/lib/indexing`.
 */
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(buildSitemapXml(request.url), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        }),
    },
  },
});
