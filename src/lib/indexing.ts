/**
 * Quem pode ser indexado — a decisão única de indexabilidade do produto.
 *
 * =============================================================================
 * A REGRA FOI INVERTIDA, E A INVERSÃO É O CONSERTO
 * =============================================================================
 *
 * Até aqui a pergunta era **"este host é técnico?"**: `*.workers.dev` recebia
 * `X-Robots-Tag: noindex`, e qualquer outro host era tratado como público. Isso é aberto por
 * omissão. Um domínio novo, um preview de outra plataforma, um host de teste com nome bonito —
 * todos passariam a ser indexáveis sem que ninguém tivesse decidido nada.
 *
 * A pergunta agora é **"este host foi declarado como o host público?"**. Um ambiente só é
 * indexável quando três coisas são verdadeiras ao mesmo tempo:
 *
 *   1. o build declara uma origem pública (`VITE_PUBLIC_SITE_URL`);
 *   2. o host que está servindo a resposta é exatamente o host dessa origem;
 *   3. esse host não é técnico (`*.workers.dev`) nem local.
 *
 * As condições 1 e 2 são a "configuração explícita de ambiente" que o lançamento vai exigir. A
 * condição 3 é o que impede a configuração de errar para o lado perigoso: staging **declara**
 * `VITE_PUBLIC_SITE_URL` — precisa declarar, é de onde saem as URLs absolutas de `og:image` —,
 * e mesmo assim continua bloqueado, porque a origem declarada dele termina em `.workers.dev`.
 *
 * O silêncio nunca abre nada. É o mesmo raciocínio de `app-mode.ts` e de `visual-lab.ts`: o
 * caminho aberto exige decisão de quem faz o build; a falta de decisão fecha.
 *
 * =============================================================================
 * DOIS TEMPOS, DUAS PERGUNTAS PARECIDAS
 * =============================================================================
 *
 * - `podeIndexarHost()` responde **por requisição**, no Worker, com o host real que chegou. É o
 *   que decide o `X-Robots-Tag` e o corpo do `robots.txt`.
 * - `buildEhPublico()` responde **por build**, a partir da variável fixada em compilação. É o
 *   que decide a `<meta name="robots">` e a existência do `sitemap.xml`.
 *
 * A `<meta>` precisa vir do build, e não do host: ela é renderizada no HTML do servidor e
 * reavaliada na hidratação. Se dependesse do hostname, o servidor e o navegador poderiam chegar
 * a valores diferentes e o React trocaria a marcação embaixo do documento. Fixada no build, os
 * dois lados chegam sempre ao mesmo valor — mesma razão pela qual `app-mode.ts` lê
 * `import.meta.env` e não a requisição.
 *
 * As duas são conservadoras na mesma direção: um build de staging nunca produz `<meta>`
 * indexável, e um host não declarado nunca produz header indexável. Para uma página ser
 * indexável, as duas portas precisam abrir.
 */

/** A diretiva de bloqueio, escrita uma vez e usada no header e no HTML. */
export const DIRETIVA_NAO_INDEXAR = "noindex, nofollow, noarchive";

/**
 * Hosts de infraestrutura do Cloudflare. Eles existem para o time, não para o público: a URL é
 * gerada pela plataforma, muda com o nome do Worker e não é o endereço que ninguém vai divulgar.
 */
const SUFIXOS_TECNICOS = [".workers.dev"] as const;

/** Hosts de desenvolvimento. Nunca indexáveis, e nunca alcançáveis por um rastreador. */
const HOSTS_LOCAIS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"] as const;

export function ehHostTecnico(hostname: string): boolean {
  return SUFIXOS_TECNICOS.some((sufixo) => hostname.endsWith(sufixo));
}

export function ehHostLocal(hostname: string): boolean {
  return (
    HOSTS_LOCAIS.includes(hostname as (typeof HOSTS_LOCAIS)[number]) ||
    hostname.endsWith(".localhost")
  );
}

/** O hostname de uma URL, ou `undefined` quando a URL não é analisável. Nunca lança. */
export function hostnameDe(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { hostname } = new URL(url);
    return hostname === "" ? undefined : hostname;
  } catch {
    return undefined;
  }
}

/** A origem pública declarada por este build, se houver. */
function origemConfigurada(): string | undefined {
  const valor = import.meta.env.VITE_PUBLIC_SITE_URL;
  return typeof valor === "string" && valor.trim() !== "" ? valor : undefined;
}

/**
 * Este **build** se apresenta como o site público?
 *
 * Falso em desenvolvimento (nenhuma origem declarada), falso em staging (a origem declarada é
 * um `.workers.dev`) e falso em qualquer build cuja variável esteja vazia ou malformada.
 */
export function buildEhPublico(origem: string | undefined = origemConfigurada()): boolean {
  const hostname = hostnameDe(origem);
  if (hostname === undefined) return false;
  return !ehHostTecnico(hostname) && !ehHostLocal(hostname);
}

/**
 * Esta **requisição** está sendo servida pelo host público declarado?
 *
 * `hostname` vem da URL da requisição; `origem` é a origem declarada pelo build. Os dois
 * precisam concordar: um build de produção servido por um endereço técnico continua bloqueado,
 * e um host de produção servido por um build que não o declarou também.
 */
export function podeIndexarHost(
  hostname: string,
  origem: string | undefined = origemConfigurada(),
): boolean {
  if (!buildEhPublico(origem)) return false;
  if (ehHostTecnico(hostname) || ehHostLocal(hostname)) return false;
  return hostname === hostnameDe(origem);
}

/** Atalho para quem tem a URL inteira da requisição, e não só o host. */
export function podeIndexarUrl(url: string, origem?: string): boolean {
  const hostname = hostnameDe(url);
  if (hostname === undefined) return false;
  return podeIndexarHost(hostname, origem);
}

/**
 * O corpo do `robots.txt`.
 *
 * **Bloqueado:** `Disallow: /` e nenhuma linha de `Sitemap`. Um rastreador obediente não busca
 * nada — nem as páginas, nem os assets estáticos, que são justamente os que não passam pelo
 * Worker e por isso não recebem `X-Robots-Tag` (ver `docs/security/EDGE-SECURITY-POLICY.md`).
 * É a única camada que cobre aquele caminho.
 *
 * A contrapartida honesta: quem não busca a página também não lê o `noindex` do header. Uma URL
 * divulgada por fora pode, em tese, aparecer listada sem conteúdo. Para uma demonstração privada
 * de entrevista, impedir a chegada vale mais do que impedir a listagem — e o header continua lá
 * para o rastreador que ignorar o `Disallow`. As duas camadas cobrem falhas diferentes.
 */
export function corpoRobotsTxt(podeIndexar: boolean, origem?: string): string {
  if (!podeIndexar) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  const base = origem?.replace(/\/+$/, "") ?? "";
  return ["User-agent: *", "Allow: /", `Sitemap: ${base}/sitemap.xml`, ""].join("\n");
}
