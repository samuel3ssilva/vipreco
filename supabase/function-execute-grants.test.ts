// Onda 3 - achado ao vivo no rollout de staging (2026-07-30): "REVOKE ALL ... FROM PUBLIC" nao
// remove o EXECUTE que o Supabase concede explicitamente a anon/authenticated na criacao de toda
// funcao no schema public (via ALTER DEFAULT PRIVILEGES da propria plataforma, fora do nosso
// versionamento). Esse grant e direto, nao mediado pelo pseudo-role PUBLIC. Confirmado ao vivo em
// staging: anon/authenticated apareciam com EXECUTE nas tres funcoes auxiliares mesmo depois da
// migration 20260729210000 (que so revogava de PUBLIC).
//
// Esta regressao assume, de proposito, o oposto do que o teste de INSERT em tabelas assume: aqui
// o estado inicial de cada funcao x role e GRANTED (nao REVOKED), porque e isso que o Supabase
// realmente faz por padrao. Uma migration que so revoga de PUBLIC nao muda esse estado inicial --
// e exatamente o bug que este teste existe para nunca deixar passar batido de novo.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SECURITY_SENSITIVE_FUNCTIONS = [
  "pa_normalize_text",
  "pa_set_updated_at",
  "pa_products_search_text",
  "approve_submission",
] as const;
const PUBLIC_ROLES = ["anon", "authenticated"] as const;

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function migrationFilesInOrder(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function granteeClause(statement: string, upper: string): string {
  const keyword = upper.startsWith("GRANT") ? "TO" : "FROM";
  const match = new RegExp(`\\b${keyword}\\b([^;]+)$`, "i").exec(statement);
  return match ? match[1] : "";
}

/**
 * Resolve se `role` tem EXECUTE em `functionName` ao final de todas as migrations. Estado
 * inicial GRANTED (não REVOKED) — reflete o default real do Supabase (ALTER DEFAULT PRIVILEGES
 * da plataforma concede EXECUTE a anon/authenticated na criação de toda função), não o default
 * SQL-padrão (só PUBLIC). Um REVOKE que só nomeia PUBLIC não muda esse estado.
 */
function resolveFunctionExecuteGrant(functionName: string, role: string): boolean {
  let granted = true;
  for (const file of migrationFilesInOrder()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    for (const rawStatement of sql.split(";")) {
      const statement = rawStatement.replace(/--.*$/gm, "").trim();
      if (!statement) continue;
      const upper = statement.toUpperCase();
      if (!upper.startsWith("GRANT") && !upper.startsWith("REVOKE")) continue;

      const mentionsFunction = new RegExp(`\\bFUNCTION\\b[^;]*\\b${functionName}\\b`, "i").test(
        statement,
      );
      if (!mentionsFunction) continue;

      const grantees = granteeClause(statement, upper);
      // Diferente do teste de tabelas: aqui PUBLIC NÃO conta como equivalente a anon/authenticated
      // para fins de REVOKE — é exatamente o oposto que este teste prova. PUBLIC continua contando
      // para GRANT (um GRANT ... TO PUBLIC reabriria para todo mundo, inclusive anon/authenticated).
      const grantsToRole = new RegExp(`\\b(${role}|PUBLIC)\\b`, "i").test(grantees);
      const revokesFromRole = new RegExp(`\\b${role}\\b`, "i").test(grantees);

      if (upper.startsWith("GRANT") && grantsToRole) granted = true;
      if (upper.startsWith("REVOKE") && revokesFromRole) granted = false;
    }
  }
  return granted;
}

describe("EXECUTE de funções sensíveis não fica com anon/authenticated (achado do rollout)", () => {
  for (const fn of SECURITY_SENSITIVE_FUNCTIONS) {
    for (const role of PUBLIC_ROLES) {
      it(`${role} não tem EXECUTE em ${fn} ao final de todas as migrations`, () => {
        expect(resolveFunctionExecuteGrant(fn, role)).toBe(false);
      });
    }
  }

  it("service_role continua com EXECUTE nas quatro funções", () => {
    for (const fn of SECURITY_SENSITIVE_FUNCTIONS) {
      expect(resolveFunctionExecuteGrant(fn, "service_role")).toBe(true);
    }
  });

  it("um REVOKE que só nomeia PUBLIC não é suficiente (prova o bug ao vivo)", () => {
    // Sem a migration corretiva, um REVOKE ALL ... FROM PUBLIC isolado deixaria
    // resolveFunctionExecuteGrant retornando true (ainda concedido) para anon/authenticated,
    // porque o estado inicial assumido é GRANTED e PUBLIC não é tratado como equivalente ao papel
    // nomeado em um REVOKE. Isso é o oposto do teste de INSERT em tabelas de propósito.
    const onlyPublicRevoke = "REVOKE ALL ON FUNCTION public.exemplo() FROM PUBLIC";
    const upper = onlyPublicRevoke.toUpperCase();
    const grantees = granteeClause(onlyPublicRevoke, upper);
    expect(new RegExp(`\\banon\\b`, "i").test(grantees)).toBe(false);
  });

  it("a migration corretiva existe e revoga explicitamente anon e authenticated nas quatro funções", () => {
    const files = migrationFilesInOrder();
    const fixFile = files.find((f) => f.includes("fix_function_grants_explicit_revoke"));
    expect(fixFile).toBeDefined();

    const sql = readFileSync(join(MIGRATIONS_DIR, fixFile!), "utf-8");
    for (const fn of SECURITY_SENSITIVE_FUNCTIONS) {
      const pattern = new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated`,
      );
      expect(sql).toMatch(pattern);
    }
    // não destrutiva: nenhuma alteração de definição de função, tabela ou dado
    expect(sql).not.toMatch(/DROP\s+FUNCTION/i);
    expect(sql).not.toMatch(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
  });
});
