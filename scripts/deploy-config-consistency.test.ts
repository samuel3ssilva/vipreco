// Onda 3 — regressão estática que falha se o nome do Worker de um workflow de deploy
// divergir do registrado em config/environments.json, ou se um workflow apontar para o
// ambiente/URL de smoke test errado. Não depende de infraestrutura viva: lê apenas os
// arquivos versionados, então roda em qualquer PR antes de qualquer deploy real acontecer.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { EnvironmentsFile } from "./verify-env";

const environments = JSON.parse(
  readFileSync(join(process.cwd(), "config", "environments.json"), "utf-8"),
) as EnvironmentsFile;

function readWorkflow(name: string): string {
  return readFileSync(join(process.cwd(), ".github", "workflows", name), "utf-8");
}

describe("deploy-staging.yml", () => {
  const workflow = readWorkflow("deploy-staging.yml");

  it("declara o GitHub Environment 'staging'", () => {
    expect(workflow).toMatch(/environment:\s*staging/);
  });

  it("faz deploy com o nome de Worker registrado para staging", () => {
    expect(workflow).toContain(`--name ${environments.staging.workerName}`);
    expect(workflow).not.toContain(`--name ${environments.production.workerName}`);
  });

  it("roda o smoke test contra a URL do Worker de staging", () => {
    expect(workflow).toContain(`https://${environments.staging.workerName}.`);
    expect(workflow).not.toContain(`https://${environments.production.workerName}.`);
  });

  it("chama verify-env:staging antes do deploy", () => {
    expect(workflow).toContain("verify-env:staging");
  });

  // `VITE_*` é resolvida em tempo de build: se o valor não entrar no `.env` antes de
  // `bun run build`, o CTA do WhatsApp simplesmente não é renderizado no Worker.
  it("injeta VITE_WHATSAPP_NUMBER no .env antes do build", () => {
    expect(workflow).toContain("VITE_WHATSAPP_NUMBER=${{ secrets.VITE_WHATSAPP_NUMBER }}");
    const escreveEnv = workflow.indexOf("Write .env for staging");
    const build = workflow.indexOf("run: bun run build");
    expect(escreveEnv).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(escreveEnv);
  });

  // O valor é público por construção, mas só como *secret* o GitHub o mascara sozinho em todo o
  // log — inclusive nos blocos `env:`, que `vars.*` não mascara. Ler de `vars` seria uma
  // regressão silenciosa: o deploy continuaria funcionando, o número voltaria a aparecer no log.
  it("lê o número de secrets, nunca de vars", () => {
    expect(workflow).not.toContain("vars.VITE_WHATSAPP_NUMBER");
  });

  it("não carrega nenhum número de telefone escrito no arquivo", () => {
    // Token isolado de 10 a 15 dígitos — o formato de um telefone internacional. As bordas
    // `\b` evitam falso positivo nos SHAs das actions fixadas, onde os dígitos vêm colados a
    // letras hexadecimais.
    expect(workflow).not.toMatch(/\b\d{10,15}\b/);
  });
});

describe("deploy-production.yml", () => {
  const workflow = readWorkflow("deploy-production.yml");

  it("declara o GitHub Environment 'production'", () => {
    expect(workflow).toMatch(/environment:\s*production/);
  });

  it("faz deploy com o nome de Worker registrado para produção", () => {
    expect(workflow).toContain(`--name ${environments.production.workerName}`);
    expect(workflow).not.toContain(`--name ${environments.staging.workerName}`);
  });

  it("builda com CF_WORKER_NAME igual ao Worker de produção registrado", () => {
    expect(workflow).toContain(`CF_WORKER_NAME: ${environments.production.workerName}`);
  });

  it("roda o smoke test contra a URL do Worker de produção", () => {
    expect(workflow).toContain(`https://${environments.production.workerName}.`);
    expect(workflow).not.toContain(`https://${environments.staging.workerName}.`);
  });

  it("chama verify-env:production antes do deploy", () => {
    expect(workflow).toContain("verify-env:production");
  });

  it("nunca referencia SUPABASE_SERVICE_ROLE_KEY (nenhum secret administrativo no build do cliente)", () => {
    expect(workflow).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
