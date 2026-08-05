/**
 * R2.6 — leitura dos fatos medidos pelos `.sql` do preflight.
 *
 * Os `.sql` são a fonte única de medição: o runner de aplicação usa exatamente os mesmos
 * arquivos que a auditoria read-only. Duas medições do mesmo fato divergem, e quando
 * divergirem, a que decide se pode escrever não pode ser a que ninguém olhou.
 *
 * Formato: uma linha por fato, `chave|valor`. Chaves se repetem (`history.version`,
 * `schema.column`), então `um()` pega a primeira e `todos()` pega a lista.
 */
import { readFileSync } from "node:fs";

export type Fatos = ReadonlyMap<string, readonly string[]>;

export function lerFatos(caminho: string): Fatos {
  const mapa = new Map<string, string[]>();
  for (const linha of readFileSync(caminho, "utf-8").split("\n")) {
    const corte = linha.indexOf("|");
    if (corte <= 0) continue;
    const chave = linha.slice(0, corte);
    const valor = linha.slice(corte + 1);
    const atual = mapa.get(chave);
    if (atual) atual.push(valor);
    else mapa.set(chave, [valor]);
  }
  return mapa;
}

export function um(fatos: Fatos, chave: string): string | null {
  return fatos.get(chave)?.[0] ?? null;
}

export function todos(fatos: Fatos, chave: string): readonly string[] {
  return fatos.get(chave) ?? [];
}

/** `a=1,b=2` → `{a: 1, b: 2}`. Só números; qualquer outra coisa vira `undefined`. */
export function campos(valor: string | null): Record<string, number | undefined> {
  const saida: Record<string, number | undefined> = {};
  if (!valor) return saida;
  for (const par of valor.split(",")) {
    const [nome, bruto] = par.split("=");
    if (!nome) continue;
    const numero = Number(bruto);
    saida[nome] = Number.isFinite(numero) ? numero : undefined;
  }
  return saida;
}

export interface Medicao {
  readonly historicoRemoto: number;
  readonly gtinsInvalidos: number;
  readonly gtinsDuplicados: number;
  readonly linhas: Readonly<Record<string, number | null>>;
  /** `null` = a consulta não pôde ser lida. Diferente de `0`, e a diferença decide o gate. */
  readonly leuConteudo: boolean;
}

const TABELAS_CONTADAS = [
  "markets",
  "products",
  "prices",
  "price_submissions",
  "product_watch_requests",
  "decision_feedback",
] as const;

/**
 * `20-content.sql` emite as contagens em DOIS formatos, e a diferença não é cosmética.
 *
 *   count.markets            → `total=4,demo=4,real=0,ativos=4`   (composto)
 *   count.price_submissions  → `0`                                (número puro)
 *
 * As tabelas de catálogo precisam da discriminação demo/real para a classificação
 * EMPTY / DEMO ONLY / MIXED; as de contribuição só precisam do número, e o mandato proíbe
 * ler mais do que o necessário nelas.
 *
 * A primeira versão desta função só entendia o número puro, e o resultado foi silencioso do
 * pior jeito: `markets`, `products` e `prices` viravam `null`, `null` significava "não
 * lido", e a comparação de contagem em `check-after.ts` PULAVA justamente as três tabelas
 * cujo total importa. A guarda parecia existir e não existia — foi o primeiro `plan` contra
 * staging que mostrou isso, e por isso ele rodou antes de qualquer escrita.
 */
function contagem(bruto: string | null): number | null {
  if (bruto === null) return null;
  const direto = Number(bruto);
  if (Number.isFinite(direto)) return direto;
  return campos(bruto).total ?? null;
}

export function medir(fatos: Fatos): Medicao {
  const gtin = campos(um(fatos, "gtin.resumo"));
  const linhas: Record<string, number | null> = {};
  for (const tabela of TABELAS_CONTADAS) {
    linhas[tabela] = contagem(um(fatos, `count.${tabela}`));
  }

  // `history.count` só existe quando a tabela de histórico existe. Ausente é 0 versões —
  // que é exatamente o estado de staging antes da adoção, e não um erro de leitura.
  const historico = Number(um(fatos, "history.count") ?? "0");

  return {
    historicoRemoto: Number.isFinite(historico) ? historico : 0,
    gtinsInvalidos: gtin.invalidos ?? 0,
    gtinsDuplicados: gtin.duplicados ?? 0,
    linhas,
    leuConteudo: um(fatos, "gtin.resumo") !== null,
  };
}
