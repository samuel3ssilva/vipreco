import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { corpoRobotsTxt, podeIndexarUrl } from "@/lib/indexing";

/**
 * `robots.txt`, agora servido pelo Worker — e não mais como arquivo estático.
 *
 * =============================================================================
 * POR QUE ELE SAIU DE `public/`
 * =============================================================================
 *
 * Um arquivo em `public/` é servido pelo binding `ASSETS` do Cloudflare, que tem precedência de
 * roteamento sobre o `fetch` de `src/server.ts` (ver `docs/security/EDGE-SECURITY-POLICY.md`).
 * Duas consequências, as duas ruins:
 *
 *   1. o conteúdo é o mesmo em todo ambiente — era `Allow: /`, inclusive em staging;
 *   2. a resposta nem passa pelos headers do Worker; medido em staging, `/robots.txt` era a
 *      única rota que voltava **sem** `X-Robots-Tag`.
 *
 * Como rota, ele decide pelo host da requisição e volta a receber os headers de borda. É o
 * mesmo arquivo público de sempre — só que agora sabe em que ambiente está.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const indexavel = podeIndexarUrl(request.url);
        const origem = indexavel ? new URL(request.url).origin : undefined;

        return new Response(corpoRobotsTxt(indexavel, origem), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            // Igual ao que a camada de assets servia antes: revalidar sempre. Uma regra de
            // rastreamento errada em cache é cara de corrigir.
            "Cache-Control": "public, max-age=0, must-revalidate",
          },
        });
      },
    },
  },
});
