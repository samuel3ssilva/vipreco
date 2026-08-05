#!/usr/bin/env bun
/**
 * Camada A da guarda de read-only do preflight remoto (R2.3 §6.A).
 *
 * Lê os `.sql` que o workflow executa contra staging e falha se qualquer verbo de
 * escrita aparecer fora de comentário. Roda em dois lugares, de propósito:
 *
 *   1. em `bun run test`, via `preflight.test.ts` — pega o problema no PR;
 *   2. dentro do próprio workflow, ANTES de abrir conexão — pega o problema mesmo que
 *      alguém tenha mergeado sem rodar a suíte, ou editado o arquivo direto na branch.
 *
 * O ponto 2 é o que importa: um teste que só roda no CI protege o repositório, não o
 * banco. Esta verificação roda no mesmo job, segundos antes do `psql`, e um `exit 1`
 * aqui significa que nenhuma conexão chega a ser aberta.
 *
 * As outras duas camadas são independentes desta: a transação é `READ ONLY`
 * (`_prologue.sql`) e o banco confirma isso na primeira consulta (`00-structure.sql`).
 * Três camadas porque a suposição perigosa é justamente a de que a credencial é
 * read-only — ela não é.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

/** Todo verbo que muda dado, schema ou permissão. A lista é a do mandato R2.3 §6.A. */
export const VERBOS_PROIBIDOS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "UPSERT",
  "ALTER",
  "CREATE",
  "DROP",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "CALL",
  "DO",
  "REFRESH",
  "VACUUM",
  "ANALYZE",
  "REINDEX",
  "CLUSTER",
] as const;

/**
 * Arquivos de auditoria: cada statement precisa começar por `SELECT` ou `WITH`.
 *
 * Regra mais forte do que "não tem verbo proibido", porque a lista de verbos é
 * enumerada e o SQL não é. Exigir a forma positiva fecha o que a lista negativa
 * deixaria passar.
 *
 * LIMITE CONHECIDO desta checagem: o corte em statements é um `split(";")` ingênuo, que
 * não entende literal de string. Um `;` dentro de aspas parte o statement ao meio e
 * produz falso positivo — foi o que aconteceu ao escrever `20-content.sql`, e por isso
 * os `format()` de lá separam campos com vírgula.
 *
 * O limite é aceitável porque esta não é a defesa principal. Um `;` dentro de literal
 * não esconde escrita de ninguém: o verbo continuaria visível para a lista acima, e a
 * transação continuaria `READ ONLY` no banco. Um parser de SQL de verdade aqui seria
 * mais código para errar do que garantia adicional.
 */
export const ARQUIVOS_DE_AUDITORIA = [
  "00-structure.sql",
  "10-migration-history.sql",
  "20-content.sql",
  "30-quantity-input.sql",
  "40-watch-requests.sql",
] as const;

/**
 * `.sql` de auditoria que rodam contra staging pela mesma credencial e pelas mesmas três
 * camadas, mas que **não** pertencem ao preflight.
 *
 * Guardados aqui, e não por uma segunda ferramenta: uma guarda paralela teria a própria
 * lista de verbos, e duas listas divergem — sempre na direção de a mais nova esquecer um
 * verbo. É a mesma razão pela qual R2.3D recusou manter dois caminhos de autenticação.
 *
 * Lista separada, e não a mesma, porque `ARQUIVOS_DE_AUDITORIA` sustenta um invariante
 * próprio: ela é exatamente o conjunto que `preflight/run.sh` executa. Misturar os dois
 * conjuntos apagaria esse invariante em silêncio.
 */
export const ARQUIVOS_DE_AUDITORIA_EXTERNOS = ["../equivalence/fingerprint.sql"] as const;

/** Todo `.sql` que a guarda cobre, venha de onde vier. */
export const TODOS_OS_ARQUIVOS_DE_AUDITORIA: readonly string[] = [
  ...ARQUIVOS_DE_AUDITORIA,
  ...ARQUIVOS_DE_AUDITORIA_EXTERNOS,
];

/**
 * Prólogo e epílogo. Não são consultas: abrem e fecham a transação read-only. Por isso
 * a regra "só SELECT" não se aplica a eles — mas a lista de verbos proibidos, sim, e o
 * conjunto de comandos que podem aparecer é fechado.
 */
export const ARQUIVOS_DE_TRANSACAO = ["_prologue.sql", "_epilogue.sql"] as const;

const COMANDOS_DE_TRANSACAO_PERMITIDOS = /^(BEGIN|SET TRANSACTION READ ONLY|SET LOCAL |ROLLBACK)/i;

/** O arquivo sem comentário nenhum. A verificação é sobre o que o SQL EXECUTA. */
export function semComentarios(sql: string): string {
  return sql
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("--"))
    .join("\n");
}

export interface Achado {
  arquivo: string;
  problema: string;
}

export function auditar(arquivos: readonly { nome: string; conteudo: string }[]): Achado[] {
  const achados: Achado[] = [];

  for (const { nome, conteudo } of arquivos) {
    const executavel = semComentarios(conteudo);

    for (const verbo of VERBOS_PROIBIDOS) {
      if (new RegExp(`\\b${verbo}\\b`, "i").test(executavel)) {
        achados.push({ arquivo: nome, problema: `contém o verbo proibido ${verbo}` });
      }
    }

    const statements = executavel
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (statements.length === 0) {
      achados.push({ arquivo: nome, problema: "não contém statement nenhum" });
      continue;
    }

    const ehAuditoria = TODOS_OS_ARQUIVOS_DE_AUDITORIA.includes(nome);
    for (const statement of statements) {
      const inicio = statement.slice(0, 60).replace(/\s+/g, " ");
      if (ehAuditoria) {
        if (!/^(SELECT|WITH)\b/i.test(statement)) {
          achados.push({
            arquivo: nome,
            problema: `statement não começa com SELECT nem WITH: "${inicio}"`,
          });
        }
      } else if (!COMANDOS_DE_TRANSACAO_PERMITIDOS.test(statement)) {
        achados.push({
          arquivo: nome,
          problema: `comando de transação fora da lista permitida: "${inicio}"`,
        });
      }
    }

    for (const [rotulo, padrao] of [
      ["connection string", /postgres(ql)?:\/\//i],
      ["host de banco", /supabase\.(co|com)/i],
      ["senha", /password/i],
      ["chave de service role", /service[_-]?role[_-]?key/i],
      ["chave Supabase", /\bsb_[a-z]/i],
      ["JWT", /\beyJ/],
    ] as const) {
      if (padrao.test(conteudo)) {
        achados.push({ arquivo: nome, problema: `menciona ${rotulo}` });
      }
    }
  }

  return achados;
}

export function lerArquivos(): { nome: string; conteudo: string }[] {
  return [...TODOS_OS_ARQUIVOS_DE_AUDITORIA, ...ARQUIVOS_DE_TRANSACAO].map((nome) => ({
    nome,
    conteudo: readFileSync(new URL(`./${nome}`, import.meta.url), "utf-8"),
  }));
}

if (import.meta.main) {
  const achados = auditar(lerArquivos());
  if (achados.length > 0) {
    for (const a of achados) {
      console.error(`::error file=scripts/r2/preflight/${basename(a.arquivo)}::${a.problema}`);
    }
    console.error(
      `guarda de read-only REPROVOU: ${achados.length} problema(s). Nenhuma conexão será aberta.`,
    );
    process.exit(1);
  }
  console.log(
    `guarda de read-only aprovou os ${TODOS_OS_ARQUIVOS_DE_AUDITORIA.length + ARQUIVOS_DE_TRANSACAO.length} arquivos SQL.`,
  );
}
