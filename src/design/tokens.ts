/**
 * R3.1 — a superfície de tokens da fundação visual.
 *
 * =============================================================================
 * O QUE ESTE ARQUIVO **NÃO** É
 * =============================================================================
 *
 * Não é uma segunda definição dos tokens. Os valores vivem em `src/styles.css`, como
 * custom properties `--vp-*`, desde a instalação do Brand System v2 — e continuam
 * vivendo lá. Duplicar valor de design em dois lugares é a forma clássica de a marca
 * divergir de si mesma: alguém ajusta o CSS, ninguém ajusta o TypeScript, e a partir daí
 * o laboratório mostra uma paleta que o produto não usa.
 *
 * Este arquivo é o **catálogo**: diz quais tokens existem, a que grupo pertencem, o que
 * cada um significa e qual valor se espera encontrar. `tokens.test.ts` lê `styles.css` e
 * falha se qualquer entrada daqui divergir do CSS — então o catálogo não pode envelhecer
 * em silêncio, que é a única forma de ele ser útil.
 *
 * Serve a dois consumidores:
 *
 *   1. o laboratório visual (`/laboratorio-visual`), que precisa renderizar a paleta e a
 *      escala sem alguém transcrever hex a mão;
 *   2. os testes de acessibilidade, que precisam calcular contraste sobre valores reais.
 *
 * =============================================================================
 * POR QUE R3.1 NÃO CRIA TOKEN NOVO
 * =============================================================================
 *
 * A camada `--vp-*` já cobre cor, tipografia, espaço, raio, sombra, ícone, largura,
 * breakpoint, foco, estado desabilitado e movimento. Acrescentar uma segunda escala por
 * cima seria abstração excessiva — o mandato §13.C avisa contra isso, e vale igual para
 * token. A fundação visual aqui é tornar a camada existente **verificável** e
 * **consumível**, não inventar outra.
 */

export type GrupoDeToken =
  | "cor-base"
  | "cor-texto"
  | "cor-superficie"
  | "cor-acao"
  | "cor-estado"
  | "cor-tempo"
  | "tipografia-familia"
  | "tipografia-tamanho"
  | "tipografia-peso"
  | "espaco"
  | "raio"
  | "sombra"
  | "medida"
  | "movimento"
  | "icone";

export interface Token {
  /** Nome da custom property, sem o `var()`. */
  nome: string;
  /** Valor exatamente como declarado em `src/styles.css`. */
  valor: string;
  grupo: GrupoDeToken;
  /** Para que serve — e, quando importa, para que **não** serve. */
  nota?: string;
}

/**
 * As cores da marca.
 *
 * O amarelo aparece aqui uma vez só, e com a restrição escrita junto. O princípio 4 do
 * contrato visual não é estético: amarelo abundante vira alarme, e alarme falso é o
 * começo da desconfiança.
 */
const CORES: Token[] = [
  {
    nome: "--vp-green",
    valor: "#0e5c3c",
    grupo: "cor-base",
    nota: "verde-escuro: marca, CTA primário, ênfase estrutural",
  },
  { nome: "--vp-green-hover", valor: "#0a3f29", grupo: "cor-base" },
  {
    nome: "--vp-green-soft",
    valor: "#2f7a56",
    grupo: "cor-base",
    nota: "estados positivos — nunca urgência",
  },
  { nome: "--vp-green-pale", valor: "#8cc7ab", grupo: "cor-base" },
  { nome: "--vp-ink", valor: "#10231c", grupo: "cor-base" },
  {
    nome: "--vp-yellow",
    valor: "#f5c24b",
    grupo: "cor-base",
    nota: "RESTRITO a contribuição e aviso de condição. Sem contribuição pública nesta fase, fica sem uso decorativo",
  },
  { nome: "--vp-cream", valor: "#fbf7ec", grupo: "cor-base", nota: "a base não é branca" },
  { nome: "--vp-green-surface", valor: "#e7f1ea", grupo: "cor-superficie" },

  { nome: "--vp-bg-page", valor: "var(--vp-cream)", grupo: "cor-superficie" },
  { nome: "--vp-bg-surface", valor: "#ffffff", grupo: "cor-superficie" },
  { nome: "--vp-bg-subtle", valor: "#f1efe4", grupo: "cor-superficie" },
  { nome: "--vp-bg-inverse", valor: "var(--vp-ink)", grupo: "cor-superficie" },

  { nome: "--vp-text-strong", valor: "var(--vp-ink)", grupo: "cor-texto" },
  { nome: "--vp-text-muted", valor: "#5b6b63", grupo: "cor-texto" },
  {
    nome: "--vp-text-faint",
    valor: "#7a8880",
    grupo: "cor-texto",
    nota: "NÃO atinge AA em texto normal — só elemento grande ou decorativo",
  },
  { nome: "--vp-text-inverse", valor: "var(--vp-cream)", grupo: "cor-texto" },
  { nome: "--vp-border", valor: "#e2ded2", grupo: "cor-superficie" },
  { nome: "--vp-border-strong", valor: "#c9c4b2", grupo: "cor-superficie" },

  { nome: "--vp-action", valor: "var(--vp-green)", grupo: "cor-acao" },
  { nome: "--vp-action-hover", valor: "var(--vp-green-hover)", grupo: "cor-acao" },
  {
    nome: "--vp-action-disabled",
    valor: "#c9d6cf",
    grupo: "cor-acao",
    nota: "estado desabilitado — nunca é o único sinal, sempre acompanha `disabled` no DOM",
  },
  { nome: "--vp-focus", valor: "var(--vp-green)", grupo: "cor-acao", nota: "anel de foco visível" },

  { nome: "--vp-success", valor: "#14764c", grupo: "cor-estado" },
  { nome: "--vp-success-bg", valor: "#e7f1ea", grupo: "cor-estado" },
  { nome: "--vp-warning", valor: "#8a6412", grupo: "cor-estado" },
  { nome: "--vp-warning-bg", valor: "#fbf3d3", grupo: "cor-estado" },
  { nome: "--vp-danger", valor: "#b3311f", grupo: "cor-estado" },
  { nome: "--vp-danger-bg", valor: "#fbeae6", grupo: "cor-estado" },
  { nome: "--vp-info", valor: "#1b5e8a", grupo: "cor-estado" },
  { nome: "--vp-info-bg", valor: "#e7f0f7", grupo: "cor-estado" },

  { nome: "--vp-time-now", valor: "#0e5c3c", grupo: "cor-tempo" },
  { nome: "--vp-time-today", valor: "#10231c", grupo: "cor-tempo" },
  { nome: "--vp-time-soon", valor: "#8a4b12", grupo: "cor-tempo" },
  { nome: "--vp-time-critical", valor: "#b3311f", grupo: "cor-tempo" },
  {
    nome: "--vp-time-expired",
    valor: "#656e69",
    grupo: "cor-tempo",
    nota: "escurecido na Onda 3: o valor original media 4.45:1 contra o creme",
  },
];

const TIPOGRAFIA: Token[] = [
  {
    nome: "--vp-font-display",
    valor:
      '"Bricolage Grotesque Variable", "Bricolage Grotesque", "Public Sans", system-ui, sans-serif',
    grupo: "tipografia-familia",
    nota: "self-hosted (@fontsource-variable, OFL-1.1); o nome com sufixo Variable é o que o pacote declara",
  },
  {
    nome: "--vp-font-body",
    valor: '"Public Sans Variable", "Public Sans", system-ui, "Segoe UI", Roboto, sans-serif',
    grupo: "tipografia-familia",
    nota: "self-hosted; a variável reproduz exatamente o que o Google servia — a estática, não",
  },
  {
    nome: "--vp-font-data",
    valor: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
    grupo: "tipografia-familia",
    nota: "só dado tabular — preço, contagem. Nunca texto corrido",
  },

  { nome: "--vp-fs-display", valor: "2.5rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-h1", valor: "1.875rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-h2", valor: "1.375rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-h3", valor: "1.125rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-body", valor: "1rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-small", valor: "0.875rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-label", valor: "0.8125rem", grupo: "tipografia-tamanho" },
  {
    nome: "--vp-fs-price-xl",
    valor: "2.125rem",
    grupo: "tipografia-tamanho",
    nota: "o preço é o dado que o usuário procura — mas só depois de reconhecer o produto",
  },
  { nome: "--vp-fs-price-l", valor: "1.625rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-price-m", valor: "1.25rem", grupo: "tipografia-tamanho" },
  { nome: "--vp-fs-meta", valor: "0.8125rem", grupo: "tipografia-tamanho" },

  { nome: "--vp-fw-regular", valor: "400", grupo: "tipografia-peso" },
  { nome: "--vp-fw-medium", valor: "500", grupo: "tipografia-peso" },
  { nome: "--vp-fw-semi", valor: "600", grupo: "tipografia-peso" },
  { nome: "--vp-fw-bold", valor: "700", grupo: "tipografia-peso" },
  { nome: "--vp-fw-black", valor: "800", grupo: "tipografia-peso" },
];

const FORMA: Token[] = [
  { nome: "--vp-sp-1", valor: "4px", grupo: "espaco" },
  { nome: "--vp-sp-2", valor: "8px", grupo: "espaco" },
  { nome: "--vp-sp-3", valor: "12px", grupo: "espaco" },
  { nome: "--vp-sp-4", valor: "16px", grupo: "espaco" },
  { nome: "--vp-sp-5", valor: "20px", grupo: "espaco" },
  { nome: "--vp-sp-6", valor: "24px", grupo: "espaco" },
  { nome: "--vp-sp-8", valor: "32px", grupo: "espaco" },
  { nome: "--vp-sp-10", valor: "40px", grupo: "espaco" },
  { nome: "--vp-sp-12", valor: "48px", grupo: "espaco" },
  { nome: "--vp-sp-16", valor: "64px", grupo: "espaco" },

  { nome: "--vp-r-sm", valor: "6px", grupo: "raio" },
  { nome: "--vp-r-md", valor: "10px", grupo: "raio" },
  { nome: "--vp-r-lg", valor: "14px", grupo: "raio" },
  { nome: "--vp-r-xl", valor: "20px", grupo: "raio" },
  { nome: "--vp-r-full", valor: "999px", grupo: "raio" },

  { nome: "--vp-shadow-0", valor: "none", grupo: "sombra" },
  { nome: "--vp-shadow-1", valor: "0 1px 2px rgb(16 35 28 / 6%)", grupo: "sombra" },
  {
    nome: "--vp-shadow-2",
    valor: "0 4px 14px rgb(16 35 28 / 10%)",
    grupo: "sombra",
    nota: "elevação para separar, não para decorar",
  },
  { nome: "--vp-shadow-3", valor: "0 10px 34px rgb(16 35 28 / 16%)", grupo: "sombra" },

  { nome: "--vp-content-max", valor: "1160px", grupo: "medida" },
  { nome: "--vp-pricecard-max", valor: "560px", grupo: "medida" },
  {
    nome: "--vp-tap-min",
    valor: "48px",
    grupo: "medida",
    nota: "alvo de toque mínimo de todo elemento interativo novo",
  },
  { nome: "--vp-bp-tablet", valor: "768px", grupo: "medida" },
  { nome: "--vp-bp-desktop", valor: "1024px", grupo: "medida" },

  { nome: "--vp-ease", valor: "cubic-bezier(0.2, 0.8, 0.2, 1)", grupo: "movimento" },
  { nome: "--vp-dur-fast", valor: "200ms", grupo: "movimento" },
  { nome: "--vp-dur-base", valor: "250ms", grupo: "movimento" },

  { nome: "--vp-icon-grid", valor: "24px", grupo: "icone" },
  { nome: "--vp-icon-stroke", valor: "2px", grupo: "icone" },
  { nome: "--vp-icon-stroke-dense", valor: "1.5px", grupo: "icone" },
];

export const TOKENS: readonly Token[] = [...CORES, ...TIPOGRAFIA, ...FORMA];

export function tokensDoGrupo(grupo: GrupoDeToken): Token[] {
  return TOKENS.filter((t) => t.grupo === grupo);
}

/**
 * Resolve `var(--outro-token)` até chegar num valor literal.
 *
 * Existe porque metade da paleta é definida por referência — `--vp-bg-page` é
 * `var(--vp-cream)` —, e cálculo de contraste precisa do hex de verdade. Sem isto, o
 * teste de acessibilidade compararia a string `"var(--vp-cream)"` consigo mesma e
 * passaria sem medir nada.
 */
export function resolverValor(nome: string, profundidade = 0): string | null {
  if (profundidade > 8) return null;
  const token = TOKENS.find((t) => t.nome === nome);
  if (token === undefined) return null;
  const referencia = /^var\((--[\w-]+)\)$/.exec(token.valor.trim());
  if (referencia === null) return token.valor;
  return resolverValor(referencia[1]!, profundidade + 1);
}

// ---------------------------------------------------------------------------------
// Contraste (WCAG 2.x)
// ---------------------------------------------------------------------------------

/** `#rrggbb` → `[r, g, b]` em 0–255. Devolve `null` para o que não for hex de 6 dígitos. */
export function hexParaRgb(hex: string): [number, number, number] | null {
  const casado = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (casado === null) return null;
  const inteiro = Number.parseInt(casado[1]!, 16);
  return [(inteiro >> 16) & 255, (inteiro >> 8) & 255, inteiro & 255];
}

/** Luminância relativa, fórmula do WCAG 2.x. */
export function luminancia(rgb: [number, number, number]): number {
  const canais = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

/** Razão de contraste entre dois hex. `null` quando algum dos dois não é hex literal. */
export function contraste(hexA: string, hexB: string): number | null {
  const a = hexParaRgb(hexA);
  const b = hexParaRgb(hexB);
  if (a === null || b === null) return null;
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const escuro = Math.min(la, lb);
  return (claro + 0.05) / (escuro + 0.05);
}

/**
 * Os pares que a fundação visual precisa garantir.
 *
 * `minimo` segue o WCAG 2.2: 4.5:1 para texto normal (SC 1.4.3) e 3:1 para componente de
 * interface e contorno de campo (SC 1.4.11). Um par que não atinge o mínimo não é um
 * ajuste de estética — é um defeito, e o princípio 19 do contrato diz o que cede.
 */
export interface ParDeContraste {
  frente: string;
  fundo: string;
  minimo: number;
  onde: string;
}

export const PARES_DE_CONTRASTE: readonly ParDeContraste[] = [
  {
    frente: "--vp-text-strong",
    fundo: "--vp-bg-page",
    minimo: 4.5,
    onde: "texto principal sobre o creme",
  },
  {
    frente: "--vp-text-strong",
    fundo: "--vp-bg-surface",
    minimo: 4.5,
    onde: "texto principal sobre card",
  },
  { frente: "--vp-text-muted", fundo: "--vp-bg-page", minimo: 4.5, onde: "metadado sobre o creme" },
  { frente: "--vp-text-muted", fundo: "--vp-bg-surface", minimo: 4.5, onde: "metadado sobre card" },
  { frente: "--vp-text-inverse", fundo: "--vp-action", minimo: 4.5, onde: "texto do CTA primário" },
  { frente: "--vp-success", fundo: "--vp-success-bg", minimo: 4.5, onde: "estado positivo" },
  { frente: "--vp-warning", fundo: "--vp-warning-bg", minimo: 4.5, onde: "aviso de condição" },
  { frente: "--vp-danger", fundo: "--vp-danger-bg", minimo: 4.5, onde: "erro" },
  { frente: "--vp-info", fundo: "--vp-info-bg", minimo: 4.5, onde: "informação" },
  { frente: "--vp-time-expired", fundo: "--vp-bg-page", minimo: 4.5, onde: "preço expirado" },
  { frente: "--vp-focus", fundo: "--vp-bg-page", minimo: 3, onde: "anel de foco sobre o creme" },
  { frente: "--vp-focus", fundo: "--vp-bg-surface", minimo: 3, onde: "anel de foco sobre card" },
  {
    frente: "--vp-text-muted",
    fundo: "--vp-bg-surface",
    minimo: 3,
    onde: "contorno de campo em repouso",
  },
];
