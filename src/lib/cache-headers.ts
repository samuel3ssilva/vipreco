/**
 * Política de cache das respostas que passam pelo Worker (src/server.ts).
 *
 * O problema real observado: o documento HTML do SSR saía **sem** `Cache-Control`. Sem diretiva
 * explícita, cliente e intermediários aplicam heurística própria e podem servir um documento
 * antigo depois de um deploy — o HTML velho referencia bundles com hash que já não existem, e a
 * página fica presa numa versão anterior até o cache expirar sozinho.
 *
 * Regra adotada:
 * - **Documento HTML** (`text/html`): `no-cache` — pode ser armazenado, mas **nunca** é usado sem
 *   revalidar com o servidor. Todo request depois de um deploy recebe a versão nova.
 * - **Qualquer outra resposta**: intocada. Os assets versionados por hash continuam com o
 *   `public, max-age=31536000, immutable` que a camada de assets do Cloudflare já aplica, e os
 *   estáticos sem hash (favicon, logo, robots.txt) continuam com `max-age=0, must-revalidate`.
 *   Nada aqui desabilita cache de forma indiscriminada.
 *
 * `no-store` foi descartado de propósito: além de proibir o armazenamento, desativa o cache de
 * navegação (voltar/avançar) nos navegadores baseados em Chromium, degradando a navegação sem
 * ganho nenhum de frescor sobre `no-cache`.
 */
export const HTML_CACHE_CONTROL = "no-cache";

function isHtmlDocument(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").toLowerCase().includes("text/html");
}

/**
 * Retorna o `Cache-Control` a aplicar, ou `null` quando a resposta não deve ser tocada.
 * Um `Cache-Control` já definido pela origem é respeitado — esta camada só preenche a lacuna.
 */
export function cacheControlFor(response: Response): string | null {
  if (response.headers.has("cache-control")) return null;
  return isHtmlDocument(response) ? HTML_CACHE_CONTROL : null;
}

/** Aplica a política de cache a uma resposta existente, sem substituí-la. */
export function withCacheHeaders(response: Response): Response {
  const cacheControl = cacheControlFor(response);
  if (cacheControl === null) return response;

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
