// Cabecalhos de seguranca aplicados a toda resposta do Worker (src/server.ts).
// CSP nasce do inventario real de origens do app (Onda 3):
// - script/style precisam de 'unsafe-inline' porque o bootstrap de hidratacao
//   SSR do TanStack Start injeta um script inline com estado por requisicao
//   (nao pode ser fixado por hash) e componentes Radix aplicam `style="..."`
//   inline via DOM para posicionamento de overlay/popover; nenhum nonce e
//   threaded pelo framework nesta versao. unsafe-eval nunca e usado.
// - fonte: NENHUMA origem externa. As tres familias de marca passaram a ser servidas
//   pelo proprio build (@fontsource, importado em src/styles.css) na R3.1A, entao
//   fonts.googleapis.com e fonts.gstatic.com sairam do CSP. Uma origem externa a menos
//   e uma origem a menos para confiar -- e a unica que restava para conteudo estatico.
// - *.supabase.co: unica origem de dados do app (staging e producao usam
//   projetos Supabase distintos, ambos sob esse dominio).
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
];

export const CONTENT_SECURITY_POLICY = CSP_DIRECTIVES.join("; ");

const TECHNICAL_HOST_SUFFIXES = [".workers.dev"];

function isTechnicalHost(hostname: string): boolean {
  return TECHNICAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * Retorna os headers de seguranca a aplicar a uma resposta, derivados da URL
 * da requisicao (hoje, apenas para decidir X-Robots-Tag em hosts tecnicos
 * ainda nao lancados publicamente, ex.: *.workers.dev).
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

  let hostname = "";
  try {
    hostname = new URL(requestUrl).hostname;
  } catch {
    hostname = "";
  }

  if (isTechnicalHost(hostname)) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
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
