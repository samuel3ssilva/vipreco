import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `scripts/r2/target-readiness-pre.sql` e `target-readiness-post.sql` rodam contra
 * staging e contra produção, com credencial que escreve, por decisão humana. É o momento
 * de menor margem para erro de todo o rollout de R2 — e é exatamente por isso que a
 * garantia de "read-only" não pode ser uma promessa no cabeçalho.
 *
 * Este arquivo lê os dois scripts e falha se qualquer verbo de escrita aparecer. Desde
 * R2.4 ele também prova a propriedade que motivou a separação: a parte PRE não pode
 * depender de nada que a migration cria.
 */
const PRE = readFileSync(new URL("./target-readiness-pre.sql", import.meta.url), "utf-8");
const POST = readFileSync(new URL("./target-readiness-post.sql", import.meta.url), "utf-8");

const ARQUIVOS = [
  ["target-readiness-pre.sql", PRE],
  ["target-readiness-post.sql", POST],
] as const;

/**
 * O script sem comentário nenhum.
 *
 * A verificação é sobre o que o SQL EXECUTA. O cabeçalho lista `UPDATE`, `INSERT` e
 * `DELETE` justamente para dizer que não faz nenhum deles, e casar em cima do texto
 * inteiro proibiria o script de explicar a própria garantia. Mesmo raciocínio de
 * `scripts/backfill-preview.test.ts`.
 */
function semComentario(sql: string): string {
  return sql
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("--"))
    .join("\n");
}

/**
 * O script sem comentário **e sem literal de texto**.
 *
 * A distinção é o coração do teste de circularidade abaixo. `column_name =
 * 'package_type'` é uma pergunta ao catálogo: ela responde `false` num banco onde a
 * coluna não existe. `WHERE package_type IS NOT NULL` é uma referência: ela aborta com
 * `42703`. As duas contêm a mesma sequência de caracteres, e só uma impede o script de
 * rodar antes da migration — então casar em cima do texto cru confundiria justamente o
 * que precisa ser distinguido.
 */
function soIdentificadores(sql: string): string {
  return semComentario(sql).replace(/'(?:[^']|'')*'/g, "''");
}

/** Todo verbo que muda dado, schema ou permissão. A lista é a do mandato R2.1 §9. */
const VERBOS_PROIBIDOS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "UPSERT",
  "TRUNCATE",
  "COPY",
  "ALTER",
  "CREATE",
  "DROP",
  "GRANT",
  "REVOKE",
  "REFRESH",
  "CALL",
  "DO",
] as const;

describe.each(ARQUIVOS)("scripts/r2/%s — read-only, e isso é verificável", (nome, script) => {
  const executavel = semComentario(script);

  it.each(VERBOS_PROIBIDOS)("não contém %s", (verbo) => {
    expect(executavel).not.toMatch(new RegExp(`\\b${verbo}\\b`, "i"));
  });

  it("e o guarda acima realmente reprova quando um verbo entra", () => {
    // Controle positivo. Um teste que só passa não distingue "o script está limpo" de "a
    // verificação não funciona" — e as duas coisas parecem iguais no log do CI.
    const hostil = `${executavel}\nUPDATE public.products SET gtin = NULL;`;
    const pegou = VERBOS_PROIBIDOS.some((v) => new RegExp(`\\b${v}\\b`, "i").test(hostil));
    expect(pegou).toBe(true);
  });

  it("só há SELECT e WITH sobre SELECT", () => {
    // Cada statement do arquivo precisa começar por um dos dois. Qualquer outra coisa é
    // uma construção que este script não deveria ter.
    const statements = executavel
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(
        statement,
        `${nome}: statement começa com algo que não é SELECT/WITH: ${statement.slice(0, 60)}`,
      ).toMatch(/^(SELECT|WITH)\b/i);
    }
  });

  it("não carrega credencial, host nem segredo", () => {
    for (const proibido of [
      /postgres:\/\//i,
      /supabase\.co/i,
      /password/i,
      /service[_-]?role[_-]?key/i,
      /\bsb_[a-z]/i,
      /\beyJ/,
    ]) {
      expect(script, `${nome} menciona ${proibido}`).not.toMatch(proibido);
    }
  });

  it("não devolve dado pessoal", () => {
    // `products` não tem coluna de dado pessoal, e o script não pode passar a consultar
    // outra tabela para procurar uma.
    for (const proibido of [/\bcpf\b/i, /telefone/i, /\bemail\b/i, /price_submissions/i]) {
      expect(executavel).not.toMatch(proibido);
    }
  });
});

// ---------------------------------------------------------------------------------
// A não-circularidade do G7
// ---------------------------------------------------------------------------------

describe("G7-PRE não pode depender de nada que a migration cria", () => {
  /**
   * Os objetos que R2-A e R2-B trazem ao mundo. Referenciar qualquer um deles na parte
   * PRE é reintroduzir a circularidade que R2.4 desfez: o gate voltaria a exigir, para
   * autorizar a aplicação, uma prova que só a aplicação pode produzir.
   */
  const OBJETOS_FUTUROS = [
    "package_type",
    "quantity_value",
    "quantity_unit",
    "units_per_package",
    "pa_is_valid_gtin",
    "pa_gtin_check_digit",
    "products_exact_identity_idx",
    "products_gtin_valid",
  ] as const;

  const preSemLiteral = soIdentificadores(PRE);
  const postSemLiteral = soIdentificadores(POST);

  it.each(OBJETOS_FUTUROS)("a parte PRE não referencia %s", (objeto) => {
    expect(
      preSemLiteral,
      `target-readiness-pre.sql referencia ${objeto}, que só existe depois da migration. ` +
        `Se a intenção era perguntar ao catálogo se ele já existe, use um literal de texto ` +
        `— 'column_name = ${objeto}' entre aspas — que responde false em vez de abortar.`,
    ).not.toMatch(new RegExp(`\\b${objeto}\\b`));
  });

  it("mas a parte PRE continua perguntando pelos objetos futuros ao catálogo", () => {
    // Sem isto, apagar a consulta 4 inteira faria o teste acima passar — e o gate perderia
    // exatamente a verificação de que R2 ainda não foi aplicada. "Não referencia" tem de
    // conviver com "continua perguntando", ou a prova vira a ausência de prova.
    for (const objeto of ["package_type", "quantity_value", "pa_is_valid_gtin"]) {
      expect(PRE, `a consulta 4 deixou de perguntar por ${objeto}`).toContain(`'${objeto}'`);
    }
  });

  it("e a parte POST referencia esses objetos — o filtro não come tudo", () => {
    // Controle positivo do `soIdentificadores`. Se ele estivesse apagando o arquivo
    // inteiro, o teste acima passaria por vacuidade e não provaria nada.
    for (const objeto of ["package_type", "quantity_value", "pa_is_valid_gtin"]) {
      expect(postSemLiteral, `o filtro apagou ${objeto} da parte POST`).toMatch(
        new RegExp(`\\b${objeto}\\b`),
      );
    }
  });

  it("o filtro de literais remove o conteúdo das aspas e preserva o resto", () => {
    expect(soIdentificadores("SELECT 'package_type' AS x, package_type FROM t")).toBe(
      "SELECT '' AS x, package_type FROM t",
    );
    // Aspas escapadas por duplicação não podem encerrar o literal cedo demais.
    expect(soIdentificadores("SELECT 'a''package_type''b', quantity_value")).toBe(
      "SELECT '', quantity_value",
    );
  });
});

describe("a aritmética GS1 duplicada não pode divergir", () => {
  /**
   * A consulta 2 reimplementa o dígito verificador em linha porque precisa rodar ANTES de
   * a migration criar `pa_is_valid_gtin()`. Algoritmo duplicado é algoritmo que diverge, e
   * a divergência perigosa não é a que reprova demais no `VALIDATE` — essa falha fechada.
   * É a que reprova um GTIN válido na auditoria e manda alguém "corrigir" dado bom.
   *
   * O drill (`scripts/db-drill/90-assertions.sql`) roda a MESMA expressão contra Postgres
   * vivo e compara vetor a vetor com a função. Este teste garante que a expressão que o
   * drill prova é a mesma que o script executa. E a consulta 8 da parte POST fecha o
   * círculo no ambiente real: lá as duas implementações são comparadas sobre os GTINs que
   * existem de fato.
   */
  const drill = readFileSync(new URL("../db-drill/90-assertions.sql", import.meta.url), "utf-8");

  const NUCLEO = ["(10 - (SUM(", "* CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END", ") % 10)) % 10"];

  it.each(NUCLEO)("o trecho %j aparece nos três arquivos", (trecho) => {
    expect(PRE, "trecho ausente em target-readiness-pre.sql").toContain(trecho);
    expect(POST, "trecho ausente em target-readiness-post.sql").toContain(trecho);
    expect(drill, "trecho ausente em 90-assertions.sql").toContain(trecho);
  });

  it("todos usam a mesma indexação sobre o código completo", () => {
    // `length(codigo) - 1 - i` é o que difere da função da migration, que recebe o corpo
    // já sem o dígito. Errar isto por um deslocaria todos os pesos.
    const indexacao = /substr\((\w+\.)?codigo, length\((\w+\.)?codigo\) - 1 - i, 1\)/;
    expect(PRE.replace(/c\.gtin/g, "codigo")).toMatch(indexacao);
    expect(POST.replace(/p\.gtin/g, "codigo")).toMatch(indexacao);
    expect(drill.replace(/v\.codigo/g, "codigo")).toMatch(indexacao);
  });
});
