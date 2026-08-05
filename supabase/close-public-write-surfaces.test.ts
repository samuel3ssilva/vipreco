// Onda 3 (checkpoint PMO 2026-07-29) — regressão estática que falha se qualquer migration,
// presente ou futura, deixar anon/authenticated com INSERT em price_submissions,
// product_watch_requests ou decision_feedback. Não substitui uma verificação de banco vivo
// (feita manualmente no rollout, ver docs/security/REMOTE-MIGRATION-PLAN-ONDA-3.md) — cobre o
// que é possível cobrir sem infraestrutura de banco neste ambiente: que o texto das migrations,
// lidas em ordem cronológica, resolve para "sem INSERT público" nas três tabelas fechadas.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLOSED_TABLES = ["price_submissions", "product_watch_requests", "decision_feedback"] as const;
const PUBLIC_ROLES = ["anon", "authenticated"] as const;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function migrationFilesInOrder(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort(); // nomes são prefixados por timestamp — ordem alfabética == ordem cronológica
}

/**
 * Extrai só a lista de grantees de um GRANT ("... TO a, b") ou REVOKE ("... FROM a, b"),
 * nunca o statement inteiro — senão o prefixo de schema "public.<tabela>" faria qualquer
 * statement "mencionar" o pseudo-role PUBLIC por engano.
 */
function granteeClause(statement: string, upper: string): string {
  const keyword = upper.startsWith("GRANT") ? "TO" : "FROM";
  const match = new RegExp(`\\b${keyword}\\b([^;]+)$`, "i").exec(statement);
  return match ? match[1] : "";
}

/**
 * Resolve, lendo todas as migrations em ordem, se `role` tem INSERT em `table` ao final.
 *
 * PUBLIC É ASSIMÉTRICO, e a versão anterior desta função tratava os dois lados igual — o que
 * a fazia encodar exatamente a crença que causou o achado crítico da Onda 3.
 *
 *   GRANT   ... TO PUBLIC    -> vale para todo mundo, inclusive papéis nomeados.
 *   REVOKE  ... FROM PUBLIC  -> remove SÓ o grant a PUBLIC. Não desfaz grant direto.
 *
 * `docs/security/THREAT-MODEL-ONDA-3.md` §5.3 é o registro do dia em que essa diferença
 * custou caro: `REVOKE ALL ... FROM PUBLIC` nas funções passou por correção completa, e
 * `anon` continuou com EXECUTE porque tinha grant direto.
 *
 * Modelar isso exige dois estados, e não um: o grant direto ao papel e o grant a PUBLIC. O
 * efetivo é a união. Com um único booleano, um `REVOKE ... FROM PUBLIC` apagava o grant
 * direto de `service_role` — foi assim que 20260803007500 fez este teste reprovar, apontando
 * o defeito do modelo e não da migration.
 */
function resolveInsertGrant(table: string, role: string): boolean {
  let concedidoDiretamente = false;
  let concedidoViaPublic = false;

  for (const file of migrationFilesInOrder()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    for (const rawStatement of sql.split(";")) {
      const statement = rawStatement.replace(/--.*$/gm, "").trim();
      if (!statement) continue;
      const upper = statement.toUpperCase();
      if (!upper.startsWith("GRANT") && !upper.startsWith("REVOKE")) continue;

      const mentionsTable = new RegExp(`\\b${table}\\b`, "i").test(statement);
      if (!mentionsTable) continue;
      if (!/\bINSERT\b|\bALL\b/i.test(statement)) continue;

      const grantees = granteeClause(statement, upper);
      const atingePapel = new RegExp(`\\b${role}\\b`, "i").test(grantees);
      const atingePublic = /\bPUBLIC\b/i.test(grantees);

      if (upper.startsWith("GRANT")) {
        if (atingePapel) concedidoDiretamente = true;
        if (atingePublic) concedidoViaPublic = true;
      } else {
        if (atingePapel) concedidoDiretamente = false;
        if (atingePublic) concedidoViaPublic = false;
      }
    }
  }

  return concedidoDiretamente || concedidoViaPublic;
}

describe("superfícies de escrita pública fechadas na Onda 3", () => {
  for (const table of CLOSED_TABLES) {
    for (const role of PUBLIC_ROLES) {
      it(`${role} não tem INSERT em ${table} ao final de todas as migrations`, () => {
        expect(resolveInsertGrant(table, role)).toBe(false);
      });
    }
  }

  it("service_role continua com GRANT ALL nas três tabelas (backoffice/aprovação não afetados)", () => {
    for (const table of CLOSED_TABLES) {
      expect(resolveInsertGrant(table, "service_role")).toBe(true);
    }
  });

  it("resolveInsertGrant trataria um GRANT futuro para PUBLIC como reabertura (não passaria despercebido)", () => {
    // Simula, sem tocar nos arquivos reais, o cenário que uma revisão adversarial apontou como
    // ponto cego: uma migration futura hipotética que reabrisse a tabela via `TO PUBLIC` em vez
    // de nomear anon/authenticated explicitamente. grantee só é extraído depois de "TO"/"FROM",
    // então o prefixo de schema "public.price_submissions" não conta como grantee PUBLIC.
    const hypotheticalStatement = "GRANT INSERT ON public.price_submissions TO PUBLIC";
    const upper = hypotheticalStatement.toUpperCase();
    const grantees = granteeClause(hypotheticalStatement, upper);
    expect(grantees.toUpperCase()).toContain("PUBLIC");
    expect(new RegExp(`\\b(anon|PUBLIC)\\b`, "i").test(grantees)).toBe(true);
  });

  it("REVOKE ... FROM PUBLIC não apaga o grant direto de um papel nomeado", () => {
    // Controle da assimetria que o resolvedor passou a modelar em R2.6. `service_role` tem
    // `GRANT ALL` direto nas três tabelas desde a migration inicial, e
    // 20260803007500 revoga tudo de PUBLIC nas mesmas três. Se o resolvedor voltasse a tratar
    // "PUBLIC" como sinônimo de "qualquer papel" no REVOKE, este teste passaria a dizer que o
    // backoffice perdeu acesso — que é justamente a leitura errada que o achado da Onda 3
    // custou caro para desfazer.
    const revogaDePublic = readFileSync(
      join(MIGRATIONS_DIR, "20260803007500_contribution_table_privilege_hardening.sql"),
      "utf-8",
    );
    for (const table of CLOSED_TABLES) {
      expect(revogaDePublic).toMatch(
        new RegExp(`REVOKE ALL PRIVILEGES ON public\\.${table}\\s+FROM PUBLIC;`),
      );
      expect(resolveInsertGrant(table, "service_role")).toBe(true);
    }
  });

  it("a migration de fechamento existe e revoga exatamente as três tabelas", () => {
    const files = migrationFilesInOrder();
    const closingFile = files.find((f) => f.includes("close_public_write_surfaces"));
    expect(closingFile).toBeDefined();

    const sql = readFileSync(join(MIGRATIONS_DIR, closingFile!), "utf-8");
    for (const table of CLOSED_TABLES) {
      expect(sql).toMatch(
        new RegExp(`REVOKE INSERT ON public\\.${table} FROM anon, authenticated`),
      );
    }
    // não destrutiva: nenhum DROP TABLE, DROP POLICY ou ALTER TABLE ... DROP COLUMN
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/DROP\s+POLICY/i);
    expect(sql).not.toMatch(/DROP\s+COLUMN/i);
  });
});
