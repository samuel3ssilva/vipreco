#!/usr/bin/env bun
/**
 * R2.4 §5 — compara dois fingerprints de schema e classifica a equivalência.
 *
 * De um lado, um Postgres efêmero com as **oito** migrations anteriores a R2 aplicadas —
 * o estado que o repositório afirma. Do outro, staging lido em transação `READ ONLY` — o
 * estado que existe. A pergunta é uma só: dá para adotar as oito versões como baseline
 * histórico sem inventar procedência?
 *
 * A DECISÃO MORA AQUI, E NÃO NO SHELL, pelo mesmo motivo de `render-summary.ts`: o shell
 * abre conexão e move arquivo, o TypeScript decide — e decisão sem teste é palpite.
 *
 * O QUE PODE SER NORMALIZADO, E POR QUÊ (mandato §5)
 *
 *   espaço em branco        já colapsado no SQL; refeito aqui por garantia.
 *   qualificação equivalente `public.f()` e `f()` designam a mesma função quando o
 *                           schema está no `search_path`. A renderização do Postgres
 *                           varia com o `search_path` de quem lê, e o leitor é diferente
 *                           dos dois lados — `postgres` no drill, `postgres.<ref>` pelo
 *                           pooler em staging. Normalizar prefixo é o que impede essa
 *                           diferença de leitor de virar drift de schema.
 *
 * O QUE NÃO PODE, E TAMBÉM POR QUÊ
 *
 *   Tudo o mais. Expressão, policy, grant, coluna a mais ou a menos, default,
 *   nulabilidade, função, índice, predicado, RLS. Cada um desses é exatamente o tipo de
 *   diferença que a comparação existe para achar, e "normalizar" qualquer um deles seria
 *   escrever um comparador que não pode reprovar.
 */
import { readFileSync } from "node:fs";

export interface Objeto {
  categoria: string;
  identidade: string;
  assinatura: string;
}

/** `fp.coluna|products.gtin|pos=7,tipo=text,...` → categoria, identidade, assinatura. */
export function lerFingerprint(texto: string): Map<string, Objeto> {
  const objetos = new Map<string, Objeto>();
  for (const linha of texto.split("\n")) {
    const bruto = linha.trim();
    if (bruto.length === 0) continue;
    const p1 = bruto.indexOf("|");
    if (p1 <= 0) continue;
    const categoria = bruto.slice(0, p1).trim();
    if (!categoria.startsWith("fp.")) continue;
    const resto = bruto.slice(p1 + 1);
    const p2 = resto.indexOf("|");
    const identidade = (p2 < 0 ? resto : resto.slice(0, p2)).trim();
    const assinatura = p2 < 0 ? "" : resto.slice(p2 + 1).trim();
    /**
     * Colisão de chave NÃO pode descartar um fato.
     *
     * Se duas linhas compartilham categoria e identidade, `set` sobrescreveria a primeira
     * e ela sumiria da comparação sem deixar rastro — e o que sumiria em silêncio seria
     * justamente um dos dois grants, uma das duas policies, um dos dois objetos que
     * alguém precisava ver. Desempatar pela assinatura preserva os dois; linha
     * integralmente repetida continua sendo uma só, que é o correto.
     */
    const chave = `${categoria} ${identidade}`;
    const existente = objetos.get(chave);
    objetos.set(
      existente === undefined || existente.assinatura === assinatura
        ? chave
        : `${chave} ${assinatura}`,
      { categoria, identidade, assinatura },
    );
  }
  return objetos;
}

/**
 * Prefixos de schema que designam a mesma coisa dos dois lados. Lista FECHADA: qualquer
 * outro schema continua aparecendo, e uma função que tivesse migrado para um schema
 * inesperado apareceria como drift, que é o comportamento certo.
 */
const QUALIFICACAO_EQUIVALENTE = /\b(?:public|extensions|pg_catalog)\./g;

export function normalizar(assinatura: string): string {
  return assinatura.replace(QUALIFICACAO_EQUIVALENTE, "").replace(/\s+/g, " ").trim();
}

export type Classificacao = "EXACT EQUIVALENT" | "MATERIAL DRIFT" | "UNKNOWN";

export type TipoDeDiferenca = "só no esperado" | "só no ambiente" | "assinatura diferente";

export interface Diferenca {
  categoria: string;
  identidade: string;
  tipo: TipoDeDiferenca;
  esperado: string | null;
  encontrado: string | null;
}

export interface Comparacao {
  classificacao: Classificacao;
  motivo: string;
  diferencas: Diferenca[];
  objetosComparados: number;
  versaoEsperada: string | null;
  versaoEncontrada: string | null;
}

function versaoMaior(v: string | null): string | null {
  return v === null ? null : (v.split(".")[0] ?? null);
}

/**
 * Linhas de contexto (`fp.db.version`, `fp.guard.read_only`) chegam sem `|` interno, então
 * o valor cai em `identidade` e não em `assinatura`. Procurar pela chave montada não
 * funcionaria — a chave inclui o próprio valor.
 */
function contexto(mapa: Map<string, Objeto>, categoria: string): string | null {
  for (const o of mapa.values()) if (o.categoria === categoria) return o.identidade;
  return null;
}

export function comparar(esperadoTexto: string, encontradoTexto: string): Comparacao {
  const esperado = lerFingerprint(esperadoTexto);
  const encontrado = lerFingerprint(encontradoTexto);

  const versaoEsperada = contexto(esperado, "fp.db.version");
  const versaoEncontrada = contexto(encontrado, "fp.db.version");

  const base = {
    diferencas: [] as Diferenca[],
    objetosComparados: 0,
    versaoEsperada,
    versaoEncontrada,
  };

  if (esperado.size === 0 || encontrado.size === 0) {
    return {
      ...base,
      classificacao: "UNKNOWN",
      motivo:
        "um dos dois fingerprints veio vazio. Comparar contra o nada devolveria 'tudo diferente' ou 'tudo igual' dependendo do lado — as duas respostas seriam invenções.",
    };
  }

  const guardaEncontrado = contexto(encontrado, "fp.guard.read_only");
  if (guardaEncontrado !== null && guardaEncontrado !== "on") {
    return {
      ...base,
      classificacao: "UNKNOWN",
      motivo: `a leitura do ambiente não aconteceu em transação read-only (transaction_read_only='${guardaEncontrado}'). O fingerprint pode estar correto, mas a garantia sob a qual ele foi colhido não vale — e o gate depende das duas coisas.`,
    };
  }

  // As linhas de contexto não são objetos de schema: comparar a versão do Postgres como
  // se fosse um objeto reprovaria toda execução em que os dois lados não fossem o mesmo
  // patch, o que não tem nada a ver com equivalência de schema.
  const CONTEXTO = new Set(["fp.guard.read_only", "fp.db.version"]);

  const chaves = new Set<string>();
  for (const k of esperado.keys()) chaves.add(k);
  for (const k of encontrado.keys()) chaves.add(k);

  const diferencas: Diferenca[] = [];
  let comparados = 0;

  for (const chave of [...chaves].sort()) {
    const a = esperado.get(chave);
    const b = encontrado.get(chave);
    const categoria = (a ?? b)!.categoria;
    if (CONTEXTO.has(categoria)) continue;
    const identidade = (a ?? b)!.identidade;
    comparados += 1;

    if (a === undefined) {
      diferencas.push({
        categoria,
        identidade,
        tipo: "só no ambiente",
        esperado: null,
        encontrado: b!.assinatura,
      });
      continue;
    }
    if (b === undefined) {
      diferencas.push({
        categoria,
        identidade,
        tipo: "só no esperado",
        esperado: a.assinatura,
        encontrado: null,
      });
      continue;
    }
    if (normalizar(a.assinatura) !== normalizar(b.assinatura)) {
      diferencas.push({
        categoria,
        identidade,
        tipo: "assinatura diferente",
        esperado: a.assinatura,
        encontrado: b.assinatura,
      });
    }
  }

  const resultado = { ...base, diferencas, objetosComparados: comparados };

  if (diferencas.length === 0) {
    return {
      ...resultado,
      classificacao: "EXACT EQUIVALENT",
      motivo: `os ${comparados} objetos de \`public\` têm assinatura idêntica dos dois lados. Isso não afirma que os arquivos versionados foram os comandos executados neste ambiente — afirma que o resultado semântico é o mesmo.`,
    };
  }

  /**
   * A ressalva de versão só entra quando HÁ diferença.
   *
   * `pg_get_functiondef` e `pg_get_indexdef` são renderizadores, e renderizador muda
   * entre versões maiores do Postgres. Com majors diferentes e diferenças na saída, não
   * dá para distinguir "o schema divergiu" de "o renderizador mudou" — e chamar isso de
   * MATERIAL DRIFT seria afirmar mais do que se mediu.
   *
   * Zero diferenças com majors diferentes continua sendo EXACT EQUIVALENT, e é uma prova
   * mais forte, não mais fraca: sobreviveu inclusive à troca de renderizador.
   */
  if (
    versaoEsperada !== null &&
    versaoEncontrada !== null &&
    versaoMaior(versaoEsperada) !== versaoMaior(versaoEncontrada)
  ) {
    return {
      ...resultado,
      classificacao: "UNKNOWN",
      motivo: `há ${diferencas.length} diferença(s), mas os dois lados rodam versões maiores diferentes do PostgreSQL (${versaoEsperada} contra ${versaoEncontrada}). As definições vêm de renderizadores do próprio Postgres, que mudam entre versões maiores — então não dá para separar drift de schema de mudança de renderização. Rode o lado efêmero na mesma versão maior e repita.`,
    };
  }

  return {
    ...resultado,
    classificacao: "MATERIAL DRIFT",
    motivo: `${diferencas.length} de ${comparados} objetos divergem. Nenhuma delas é diferença de espaço em branco nem de qualificação de schema — essas já foram normalizadas antes da comparação.`,
  };
}

// ---------------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------------

const SIMBOLO: Record<Classificacao, string> = {
  "EXACT EQUIVALENT": "✅",
  "MATERIAL DRIFT": "❌",
  UNKNOWN: "⚠️",
};

/** Corta uma assinatura longa preservando o começo, que é onde a diferença costuma estar. */
function resumir(valor: string | null, limite = 160): string {
  if (valor === null) return "_(ausente)_";
  const limpo = valor.replace(/\|/g, "\\|");
  return limpo.length <= limite ? `\`${limpo}\`` : `\`${limpo.slice(0, limite)}…\``;
}

export function renderizar(c: Comparacao): string {
  const linhas: string[] = [];

  linhas.push("# Equivalência de schema — staging contra as oito migrations anteriores a R2");
  linhas.push("");
  linhas.push(`## ${SIMBOLO[c.classificacao]} ${c.classificacao}`);
  linhas.push("");
  linhas.push(c.motivo);
  linhas.push("");
  linhas.push(
    `| | |\n| --- | --- |\n| Objetos comparados | ${c.objetosComparados} |\n| Diferenças | ${c.diferencas.length} |\n| PostgreSQL (efêmero) | ${c.versaoEsperada ?? "?"} |\n| PostgreSQL (staging) | ${c.versaoEncontrada ?? "?"} |`,
  );
  linhas.push("");

  if (c.diferencas.length > 0) {
    linhas.push("## Diferenças, objeto por objeto");
    linhas.push("");
    const porCategoria = new Map<string, Diferenca[]>();
    for (const d of c.diferencas) {
      const lista = porCategoria.get(d.categoria) ?? [];
      lista.push(d);
      porCategoria.set(d.categoria, lista);
    }
    for (const [categoria, lista] of [...porCategoria].sort()) {
      linhas.push(`### \`${categoria}\` — ${lista.length}`);
      linhas.push("");
      linhas.push("| Objeto | Diferença | Esperado (repositório) | Encontrado (staging) |");
      linhas.push("| --- | --- | --- | --- |");
      for (const d of lista) {
        linhas.push(
          `| \`${d.identidade}\` | ${d.tipo} | ${resumir(d.esperado)} | ${resumir(d.encontrado)} |`,
        );
      }
      linhas.push("");
    }
  }

  linhas.push("## O que esta classificação autoriza");
  linhas.push("");
  if (c.classificacao === "EXACT EQUIVALENT") {
    linhas.push(
      "Autoriza **adotar** as oito versões anteriores a R2 como baseline histórico, e só isso. Não autoriza aplicar R2-A nem R2-B: os demais gates continuam valendo, e a aplicação é passo próprio, com registro próprio.",
    );
    linhas.push("");
    linhas.push(
      "E vale dizer o que a adoção **não** afirma: que os arquivos versionados foram os comandos originalmente executados neste banco. Essa procedência não existe mais e não é recuperável. O que foi comprovado é que o estado final é semanticamente equivalente ao que esses arquivos produzem a partir do zero.",
    );
  } else if (c.classificacao === "MATERIAL DRIFT") {
    linhas.push(
      "**Não autoriza nada.** Com drift material, `migration repair` carimbaria como aplicadas migrations cujo efeito não é o que está no banco — trocaria uma incerteza conhecida por uma certeza falsa. O caminho é documentar as diferenças e decidir sobre cada uma, não reparar.",
    );
  } else {
    linhas.push(
      "**Não autoriza nada**, e por um motivo diferente de reprovar: a comparação não foi conclusiva. Falhar por fato medido é informação; isto aqui é a ausência dela, e a diferença importa na hora de decidir o próximo passo.",
    );
  }
  linhas.push("");
  linhas.push("---");
  linhas.push("");
  linhas.push(
    "Nada foi escrito em ambiente nenhum para produzir este relatório: os dois lados foram lidos, o de staging em transação `READ ONLY` com `ROLLBACK` ao final. O banco de produção não foi contatado.",
  );

  return linhas.join("\n");
}

if (import.meta.main) {
  const [, , caminhoEsperado, caminhoEncontrado] = process.argv;
  if (caminhoEsperado === undefined || caminhoEncontrado === undefined) {
    console.error("uso: bun compare.ts <fingerprint-efemero.txt> <fingerprint-staging.txt>");
    process.exit(2);
  }
  const c = comparar(
    readFileSync(caminhoEsperado, "utf-8"),
    readFileSync(caminhoEncontrado, "utf-8"),
  );
  console.log(renderizar(c));
  // Código de saída para o shell: 0 só quando equivalente. O runner usa isto para decidir
  // se o passo seguinte pode nascer.
  process.exit(c.classificacao === "EXACT EQUIVALENT" ? 0 : 1);
}
