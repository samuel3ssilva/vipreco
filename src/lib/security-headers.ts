import { NOINDEX_DIRECTIVE, shouldBlockIndexing } from "@/lib/indexing";

// Cabecalhos de seguranca aplicados a toda resposta do Worker (src/server.ts).
// CSP nasce do inventario real de origens do app (Onda 3):
// - script/style precisam de 'unsafe-inline' porque o bootstrap de hidratacao
//   SSR do TanStack Start injeta um script inline com estado por requisicao
//   (nao pode ser fixado por hash) e componentes Radix aplicam `style="..."`
//   inline via DOM para posicionamento de overlay/popover; nenhum nonce e
//   threaded pelo framework nesta versao. unsafe-eval nunca e usado.
// - fonts.googleapis.com/fonts.gstatic.com: unica origem externa real (Google
//   Fonts, preconectada em src/routes/__root.tsx).
// - *.supabase.co: unica origem de dados do app (staging e producao usam
//   projetos Supabase distintos, ambos sob esse dominio).
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
];

export const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

/**
 * Retorna os headers de seguranca a aplicar a uma resposta, derivados da URL
 * da requisicao (hoje, apenas para decidir X-Robots-Tag em hosts que nao sao o
 * produto publico: `*.workers.dev` e o host de demonstracao). A regra de quem
 * e publico mora em `@/lib/indexing`.
 */
export function buildSecurityHeaders(requestUrl: string): Headers {
  const headers = new Headers({
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-Frame-Options": "DENY",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  });

  if (shouldBlockIndexing(requestUrl)) {
    headers.set("X-Robots-Tag", NOINDEX_DIRECTIVE);
  }

  return headers;
}

/** Aplica os headers de seguranca a uma Response existente, sem substitui-la. */
export function withSecurityHeaders(response: Response, requestUrl: string): Response {
  const securityHeaders = buildSecurityHeaders(requestUrl);
  const headers = new Headers(response.headers);
  securityHeaders.forEach((value, key) => headers.set(key, value));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
