import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { buildRobotsTxt } from "@/lib/indexing";

/**
 * `robots.txt` decidido por host, não por arquivo estático.
 *
 * O mesmo bundle serve três endereços com propósitos diferentes (ver `@/lib/indexing`), e um
 * arquivo em `public/` responderia a mesma coisa nos três. A demonstração precisa pedir para não
 * ser indexada; a produção futura, o contrário — e nenhuma das duas pode depender de alguém
 * lembrar de trocar o arquivo na hora do lançamento.
 *
 * O `X-Robots-Tag` do Worker continua sendo a garantia forte: `robots.txt` é um pedido, o header
 * é uma instrução que o rastreador lê junto com o conteúdo.
 */
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        new Response(buildRobotsTxt(request.url), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        }),
    },
  },
});
