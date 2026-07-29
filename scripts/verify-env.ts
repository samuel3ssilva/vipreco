// Valida que as variáveis de ambiente resolvidas para um alvo (staging|production) estão
// completas e não foram trocadas com as do outro ambiente. Falha com saída != 0 nesse caso —
// nunca deixa passar em silêncio uma credencial de staging usada para deploy de produção, ou
// vice-versa. Não lê nem imprime nenhum valor de segredo (chave, token) — só compara o
// identificador público do projeto Supabase (SUPABASE_PROJECT_ID), que já é público (aparece
// na URL da API/app) e por isso também pode ficar em config/environments.json versionado.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type EnvName = "staging" | "production";

export interface EnvironmentSpec {
  label: string;
  supabaseProjectId: string | null;
  workerName: string;
}

export interface EnvironmentsFile {
  staging: EnvironmentSpec;
  production: EnvironmentSpec;
}

const REQUIRED_VARS = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_ID",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
] as const;

export function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function envFilePathFor(target: EnvName): string {
  return target === "production" ? ".env.production" : ".env";
}

export function findMissingVars(vars: Record<string, string>): string[] {
  return REQUIRED_VARS.filter((name) => !vars[name]);
}

export function findCrossEnvironmentMismatch(
  target: EnvName,
  vars: Record<string, string>,
  environments: EnvironmentsFile,
): string | null {
  const expected = environments[target];
  const otherName = target === "staging" ? "production" : "staging";
  const other = environments[otherName];
  const actualProjectId = vars.SUPABASE_PROJECT_ID;

  if (!actualProjectId) return null; // já reportado por findMissingVars

  if (other.supabaseProjectId && actualProjectId === other.supabaseProjectId) {
    return (
      `SUPABASE_PROJECT_ID resolvido para "${target}" é igual ao registrado para ` +
      `"${otherName}" (${other.label}). Isso indica uso cruzado de credencial entre ambientes.`
    );
  }

  if (expected.supabaseProjectId && actualProjectId !== expected.supabaseProjectId) {
    return `SUPABASE_PROJECT_ID resolvido não bate com o esperado para "${target}" (${expected.label}).`;
  }

  return null;
}

function main() {
  const target = process.argv[2];
  if (target !== "staging" && target !== "production") {
    console.error("Uso: bun scripts/verify-env.ts <staging|production>");
    process.exit(1);
  }

  const environmentsPath = join(process.cwd(), "config", "environments.json");
  const environments = JSON.parse(readFileSync(environmentsPath, "utf-8")) as EnvironmentsFile;

  const envPath = envFilePathFor(target);
  if (!existsSync(envPath)) {
    console.error(`Arquivo ${envPath} não encontrado para o ambiente "${target}".`);
    process.exit(1);
  }

  const vars = parseEnvFile(readFileSync(envPath, "utf-8"));

  const missing = findMissingVars(vars);
  if (missing.length > 0) {
    console.error(`Variáveis faltando em ${envPath}: ${missing.join(", ")}`);
    process.exit(1);
  }

  const mismatch = findCrossEnvironmentMismatch(target, vars, environments);
  if (mismatch) {
    console.error(`FALHA SEGURA — ${mismatch}`);
    process.exit(1);
  }

  console.log(
    `OK: ${envPath} resolve corretamente para o ambiente "${target}" (${environments[target].label}).`,
  );
}

if (import.meta.main) {
  main();
}
