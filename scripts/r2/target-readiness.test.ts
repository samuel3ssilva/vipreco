import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `scripts/r2/target-readiness.sql` roda contra staging e contra produção, com credencial
 * de service_role, por decisão humana e sob janela de manutenção. É o momento de menor
 * margem para erro de todo o rollout de R2 — e é exatamente por isso que a garantia de
 * "read-only" não pode ser uma promessa no cabeçalho.
 *
 * Este arquivo lê o script e falha se qualquer verbo de escrita aparecer.
 */
const script = readFileSync(new URL("./target-readiness.sql", import.meta.url), "utf-8");

/**
 * O script sem comentário nenhum.
 *
 * A verificação é sobre o que o SQL EXECUTA. O cabeçalho lista `UPDATE`, `INSERT` e
 * `DELETE` justamente para dizer que não faz nenhum deles, e casar em cima do texto
 * inteiro proibiria o script de explicar a própria garantia. Mesmo raciocínio de
 * `scripts/backfill-preview.test.ts`.
 */
const executavel = script
  .split("\n")
  .filter((linha) => !linha.trimStart().startsWith("--"))
  .join("\n");

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

describe("scripts/r2/target-readiness.sql — read-only, e isso é verificável", () => {
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
        `statement começa com algo que não é SELECT/WITH: ${statement.slice(0, 60)}`,
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
      expect(script, `o script menciona ${proibido}`).not.toMatch(proibido);
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

describe("a aritmética GS1 duplicada não pode divergir", () => {
  /**
   * A consulta 2 reimplementa o dígito verificador em linha porque precisa rodar ANTES de
   * a migration criar `pa_is_valid_gtin()`. Algoritmo duplicado é algoritmo que diverge, e
   * a divergência perigosa não é a que reprova demais no `VALIDATE` — essa falha fechada.
   * É a que reprova um GTIN válido na auditoria e manda alguém "corrigir" dado bom.
   *
   * O drill (`scripts/db-drill/90-assertions.sql`) roda a MESMA expressão contra Postgres
   * vivo e compara vetor a vetor com a função. Este teste garante que a expressão que o
   * drill prova é a mesma que o script executa.
   */
  const drill = readFileSync(new URL("../db-drill/90-assertions.sql", import.meta.url), "utf-8");

  const NUCLEO = ["(10 - (SUM(", "* CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END", ") % 10)) % 10"];

  it.each(NUCLEO)("o trecho %j aparece nos dois arquivos", (trecho) => {
    expect(script, "trecho ausente em target-readiness.sql").toContain(trecho);
    expect(drill, "trecho ausente em 90-assertions.sql").toContain(trecho);
  });

  it("os dois usam a mesma indexação sobre o código completo", () => {
    // `length(codigo) - 1 - i` é o que difere da função da migration, que recebe o corpo
    // já sem o dígito. Errar isto por um deslocaria todos os pesos.
    const indexacao = /substr\((\w+\.)?codigo, length\((\w+\.)?codigo\) - 1 - i, 1\)/;
    expect(script.replace(/c\.gtin/g, "codigo")).toMatch(indexacao);
    expect(drill.replace(/v\.codigo/g, "codigo")).toMatch(indexacao);
  });
});
