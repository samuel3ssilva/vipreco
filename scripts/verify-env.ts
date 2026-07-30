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

const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;
const URL_VARS_TO_CHECK = ["SUPABASE_URL", "VITE_SUPABASE_URL"] as const;

// Onda 3 — codifica o achado da Onda 2 (campo "REST API" do painel do Supabase copiado por
// engano para SUPABASE_URL, deixando o sufixo /rest/v1/) como regressão automatizada.
export function findMalformedSupabaseUrls(vars: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const name of URL_VARS_TO_CHECK) {
    const value = vars[name];
    if (!value) continue; // já reportado por findMissingVars
    if (value.includes("/rest/v1")) {
      problems.push(`${name} contém "/rest/v1" — use a Project URL, não o campo "REST API".`);
      continue;
    }
    if (!SUPABASE_URL_PATTERN.test(value)) {
      problems.push(`${name} não bate com o formato esperado https://<project-ref>.supabase.co`);
    }
  }
  return problems;
}

const SECRET_KEY_PREFIX = "sb_secret_";
const PUBLIC_VAR_PREFIX = "VITE_";

// Onda 3 — falha fechado se uma chave administrativa (formato novo do Supabase,
// sb_secret_...) acabar atribuída a uma variável VITE_* (inlined no bundle do cliente).
export function findSecretKeyInPublicVar(vars: Record<string, string>): string[] {
  return Object.entries(vars)
    .filter(
      ([name, value]) => name.startsWith(PUBLIC_VAR_PREFIX) && value.startsWith(SECRET_KEY_PREFIX),
    )
    .map(
      ([name]) =>
        `${name} contém uma chave no formato ${SECRET_KEY_PREFIX}... — nunca deve ir em variável VITE_*.`,
    );
}

const SERVER_TO_PUBLIC_PAIRS = [
  ["SUPABASE_URL", "VITE_SUPABASE_URL"],
  ["SUPABASE_PROJECT_ID", "VITE_SUPABASE_PROJECT_ID"],
] as const;

// Onda 3 — achado de revisão adversarial: findCrossEnvironmentMismatch só comparava
// SUPABASE_PROJECT_ID (a variável não-VITE_*), mas o bundle do navegador é montado a partir
// de VITE_SUPABASE_URL/VITE_SUPABASE_PROJECT_ID (src/integrations/supabase/client.ts prioriza
// import.meta.env.VITE_*). Uma edição manual de .env.production que atualizasse só o par
// server-side deixaria o frontend publicado apontando para o ambiente errado sem que nenhuma
// checagem anterior detectasse isso. Falha fechado se os dois pares divergirem entre si.
export function findServerPublicVarDrift(vars: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const [serverName, publicName] of SERVER_TO_PUBLIC_PAIRS) {
    const serverValue = vars[serverName];
    const publicValue = vars[publicName];
    if (!serverValue || !publicValue) continue; // já reportado por findMissingVars
    if (serverValue !== publicValue) {
      problems.push(
        `${publicName} ("${publicValue}") não bate com ${serverName} ("${serverValue}") — o bundle do navegador usaria um valor diferente do resto do deploy.`,
      );
    }
  }
  return problems;
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

  const malformedUrls = findMalformedSupabaseUrls(vars);
  if (malformedUrls.length > 0) {
    console.error(`FALHA SEGURA — ${malformedUrls.join(" ")}`);
    process.exit(1);
  }

  const leakedSecrets = findSecretKeyInPublicVar(vars);
  if (leakedSecrets.length > 0) {
    console.error(`FALHA SEGURA — ${leakedSecrets.join(" ")}`);
    process.exit(1);
  }

  const drift = findServerPublicVarDrift(vars);
  if (drift.length > 0) {
    console.error(`FALHA SEGURA — ${drift.join(" ")}`);
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
