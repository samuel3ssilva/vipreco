import { describe, expect, it } from "vitest";
import {
  envFilePathFor,
  findCrossEnvironmentMismatch,
  findMalformedSupabaseUrls,
  findMissingVars,
  findSecretKeyInPublicVar,
  findServerPublicVarDrift,
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

describe("findMalformedSupabaseUrls", () => {
  it("não reporta nada para uma URL bem formada", () => {
    expect(findMalformedSupabaseUrls(completeVars)).toEqual([]);
  });

  it("detecta o sufixo /rest/v1/ copiado por engano do painel", () => {
    const withSuffix = {
      ...completeVars,
      SUPABASE_URL: "https://staging-ref-0000000000.supabase.co/rest/v1/",
    };
    const problems = findMalformedSupabaseUrls(withSuffix);
    expect(problems.some((p) => p.startsWith("SUPABASE_URL") && p.includes("/rest/v1"))).toBe(true);
  });

  it("detecta uma URL que não bate com o formato https://<ref>.supabase.co", () => {
    const wrongHost = { ...completeVars, VITE_SUPABASE_URL: "https://example.com" };
    const problems = findMalformedSupabaseUrls(wrongHost);
    expect(problems.some((p) => p.startsWith("VITE_SUPABASE_URL"))).toBe(true);
  });
});

describe("findSecretKeyInPublicVar", () => {
  it("não reporta nada quando nenhuma variável pública contém uma chave secreta", () => {
    expect(findSecretKeyInPublicVar(completeVars)).toEqual([]);
  });

  it("falha fechado quando uma chave sb_secret_ vaza para uma variável VITE_*", () => {
    const leaked = { ...completeVars, VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc123" };
    const problems = findSecretKeyInPublicVar(leaked);
    expect(problems.some((p) => p.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY"))).toBe(true);
  });

  it("não reporta uma chave sb_secret_ em uma variável não pública (sem prefixo VITE_)", () => {
    const serverOnly = { ...completeVars, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_abc123" };
    expect(findSecretKeyInPublicVar(serverOnly)).toEqual([]);
  });
});

describe("findServerPublicVarDrift", () => {
  it("não reporta nada quando o par VITE_* bate com o par server-side", () => {
    expect(findServerPublicVarDrift(completeVars)).toEqual([]);
  });

  it("detecta VITE_SUPABASE_PROJECT_ID divergindo de SUPABASE_PROJECT_ID (edição manual parcial)", () => {
    const drifted = { ...completeVars, VITE_SUPABASE_PROJECT_ID: "prod-ref-00000000000000" };
    const problems = findServerPublicVarDrift(drifted);
    expect(problems.some((p) => p.startsWith("VITE_SUPABASE_PROJECT_ID"))).toBe(true);
  });

  it("detecta VITE_SUPABASE_URL divergindo de SUPABASE_URL", () => {
    const drifted = {
      ...completeVars,
      VITE_SUPABASE_URL: "https://prod-ref-00000000000000.supabase.co",
    };
    const problems = findServerPublicVarDrift(drifted);
    expect(problems.some((p) => p.startsWith("VITE_SUPABASE_URL"))).toBe(true);
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
