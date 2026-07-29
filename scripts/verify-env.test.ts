import { describe, expect, it } from "vitest";
import {
  envFilePathFor,
  findCrossEnvironmentMismatch,
  findMissingVars,
  parseEnvFile,
  type EnvironmentsFile,
} from "./verify-env";

const environments: EnvironmentsFile = {
  staging: {
    label: "Staging legado",
    supabaseProjectId: "staging-ref-0000000000",
    workerName: "samuel3ssilva-vipreco",
  },
  production: {
    label: "Produção",
    supabaseProjectId: "prod-ref-00000000000000",
    workerName: "vipreco-production",
  },
};

const completeVars = {
  SUPABASE_URL: "https://staging-ref-0000000000.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "anything",
  SUPABASE_PROJECT_ID: "staging-ref-0000000000",
  VITE_SUPABASE_URL: "https://staging-ref-0000000000.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "anything",
  VITE_SUPABASE_PROJECT_ID: "staging-ref-0000000000",
};

describe("parseEnvFile", () => {
  it("lê pares chave=valor, ignora comentários e linhas em branco", () => {
    const parsed = parseEnvFile(
      ["# comentário", "", "FOO=bar", 'QUOTED="valor com espaço"', "SINGLE='outro'"].join("\n"),
    );
    expect(parsed).toEqual({ FOO: "bar", QUOTED: "valor com espaço", SINGLE: "outro" });
  });
});

describe("envFilePathFor", () => {
  it("staging usa .env, production usa .env.production", () => {
    expect(envFilePathFor("staging")).toBe(".env");
    expect(envFilePathFor("production")).toBe(".env.production");
  });
});

describe("findMissingVars", () => {
  it("não reporta nada quando todas as variáveis obrigatórias estão presentes", () => {
    expect(findMissingVars(completeVars)).toEqual([]);
  });

  it("lista as variáveis obrigatórias ausentes", () => {
    const { SUPABASE_URL: _omit, ...rest } = completeVars;
    expect(findMissingVars(rest)).toEqual(["SUPABASE_URL"]);
  });
});

describe("findCrossEnvironmentMismatch", () => {
  it("não reporta nada quando o projeto bate com o ambiente alvo", () => {
    expect(findCrossEnvironmentMismatch("staging", completeVars, environments)).toBeNull();
  });

  it("detecta falha segura quando staging usa o project id de production", () => {
    const swapped = {
      ...completeVars,
      SUPABASE_PROJECT_ID: environments.production.supabaseProjectId!,
    };
    const result = findCrossEnvironmentMismatch("staging", swapped, environments);
    expect(result).toMatch(/igual ao registrado para "production"/);
  });

  it("detecta falha segura quando production usa o project id de staging", () => {
    const swapped = {
      ...completeVars,
      SUPABASE_PROJECT_ID: environments.staging.supabaseProjectId!,
    };
    const result = findCrossEnvironmentMismatch("production", swapped, environments);
    expect(result).toMatch(/igual ao registrado para "staging"/);
  });

  it("detecta um project id desconhecido (nem staging nem production)", () => {
    const wrong = { ...completeVars, SUPABASE_PROJECT_ID: "algum-outro-ref" };
    const result = findCrossEnvironmentMismatch("staging", wrong, environments);
    expect(result).toMatch(/não bate com o esperado/);
  });

  it("não falha quando production ainda não foi criado (supabaseProjectId null)", () => {
    const notYetCreated: EnvironmentsFile = {
      ...environments,
      production: { ...environments.production, supabaseProjectId: null },
    };
    expect(findCrossEnvironmentMismatch("staging", completeVars, notYetCreated)).toBeNull();
  });
});
