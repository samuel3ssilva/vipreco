// R2.3 — regressão estática do gate do drill de schema.
//
// Duas coisas são vigiadas aqui, e as duas quebram em silêncio se ninguém olhar:
//
// 1. A DECISÃO do detector. Errar para o lado "relevante" custa um minuto de CI; errar
//    para o lado "irrelevante" deixa uma migration entrar na main sem ninguém
//    reconstruir o schema. Os casos abaixo exercitam o mesmo script que roda no CI.
//
// 2. O DESENHO do workflow. O required check da main é o nome de um job. Reintroduzir
//    o filtro `paths:`, renomear o job do gate ou tirar o `if: always()` não quebra
//    nenhum teste de produto — só faz o check exigido parar de ser reportado, e aí todo
//    PR fica pendente para sempre. Ver docs/evidence/r2/branch-protection.md.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts", "db-drill", "detect-relevant-changes.sh");
const WORKFLOW = readFileSync(
  join(process.cwd(), ".github", "workflows", "db-schema-drill.yml"),
  "utf-8",
);

/**
 * Roda o detector com uma lista de arquivos injetada e devolve o veredito.
 *
 * `GITHUB_OUTPUT` é apagado de propósito: quando a suíte roda dentro do Actions essa
 * variável existe, e o script escreveria `relevant=…` no arquivo de saída do job que
 * está rodando os testes.
 */
function classificar(changedFiles: string[] | null): string {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.GITHUB_OUTPUT;
  delete env.DRILL_BASE_SHA;
  delete env.DRILL_HEAD_SHA;
  if (changedFiles === null) {
    delete env.DRILL_CHANGED_FILES;
  } else {
    env.DRILL_CHANGED_FILES = changedFiles.join("\n");
  }
  return execFileSync("bash", [SCRIPT], {
    env,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

describe("detect-relevant-changes.sh — quando o drill pesado deve rodar", () => {
  it("roda quando uma migration muda", () => {
    expect(classificar(["supabase/migrations/20260803020000_gtin_integrity.sql"])).toBe("true");
  });

  it("roda quando o próprio drill muda", () => {
    expect(classificar(["scripts/db-drill/90-assertions.sql"])).toBe("true");
  });

  it("roda quando as ferramentas de R2 mudam (o drill executa os target-readiness)", () => {
    expect(classificar(["scripts/r2/target-readiness-pre.sql"])).toBe("true");
    expect(classificar(["scripts/r2/target-readiness-post.sql"])).toBe("true");
  });

  it("roda quando o seed ou a config do Supabase mudam", () => {
    expect(classificar(["supabase/seed.sql"])).toBe("true");
    expect(classificar(["supabase/config.toml"])).toBe("true");
  });

  it("roda quando o próprio workflow muda", () => {
    expect(classificar([".github/workflows/db-schema-drill.yml"])).toBe("true");
  });

  it("roda quando um único arquivo relevante aparece no meio de vários irrelevantes", () => {
    expect(
      classificar([
        "docs/INDEX.md",
        "README.md",
        "supabase/migrations/20260803010000_product_identity_quantity.sql",
        "src/lib/comparison.ts",
      ]),
    ).toBe("true");
  });
});

describe("detect-relevant-changes.sh — quando o drill pesado é dispensado", () => {
  it("dispensa PR só de documentação", () => {
    expect(classificar(["docs/INDEX.md", "docs/pmo/MVP-DECISION-LOG.md", "CLAUDE.md"])).toBe(
      "false",
    );
  });

  it("dispensa mudança de código de aplicação que não toca o schema", () => {
    expect(classificar(["src/lib/comparison.ts", "src/components/PriceCard.tsx"])).toBe("false");
  });

  it("dispensa mudança em outro workflow", () => {
    expect(classificar([".github/workflows/ci.yml", ".github/workflows/uptime-check.yml"])).toBe(
      "false",
    );
  });

  it("dispensa quando nada mudou", () => {
    expect(classificar([])).toBe("false");
  });

  // Prefixo é prefixo, não substring: um `docs/` que por acaso contenha o texto
  // "supabase/migrations/" no caminho não é uma migration.
  it("não confunde caminho que apenas contém o prefixo", () => {
    expect(
      classificar([
        "docs/data/supabase/migrations/exemplo.sql",
        "arquivo-scripts/r2/nota.md",
        "supabase/migrations-antigas/velho.sql",
      ]),
    ).toBe("false");
  });
});

describe("detect-relevant-changes.sh — falha para o lado seguro", () => {
  // Sem base de comparação (workflow_dispatch, primeiro push, force push) o detector
  // não tem como saber o que mudou. A resposta segura é rodar o drill.
  it("trata ausência de base de comparação como relevante", () => {
    expect(classificar(null)).toBe("true");
  });

  it("trata revisão inexistente como relevante, em vez de estourar o job", () => {
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.GITHUB_OUTPUT;
    delete env.DRILL_CHANGED_FILES;
    env.DRILL_BASE_SHA = "0000000000000000000000000000000000000000";
    env.DRILL_HEAD_SHA = "HEAD";
    const saida = execFileSync("bash", [SCRIPT], {
      env,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    expect(saida).toBe("true");
  });
});

describe("db-schema-drill.yml — o desenho que torna o check exigível", () => {
  // A razão de existir de todo este PR. Um `paths:` aqui faz o workflow não ser
  // reportado em PR documental, e um required check não reportado trava o PR.
  it("não tem filtro de paths em nenhum nível", () => {
    expect(WORKFLOW).not.toMatch(/^\s*paths(-ignore)?:/m);
  });

  it("dispara em todo pull request para a main e em todo push para a main", () => {
    expect(WORKFLOW).toMatch(/pull_request:\s*\n\s*branches:\s*\[main\]/);
    expect(WORKFLOW).toMatch(/push:\s*\n\s*branches:\s*\[main\]/);
  });

  it("expõe o job de gate com o nome exato exigido pela proteção da main", () => {
    expect(WORKFLOW).toContain("name: db-schema-drill-required");
  });

  it("faz o gate rodar sempre e depender do detector e do drill", () => {
    const gate = WORKFLOW.slice(WORKFLOW.indexOf("name: db-schema-drill-required"));
    expect(gate).toMatch(/needs:\s*\[detect,\s*drill\]/);
    expect(gate).toMatch(/if:\s*always\(\)/);
  });

  it("condiciona o job pesado ao veredito do detector", () => {
    expect(WORKFLOW).toMatch(/if:\s*needs\.detect\.outputs\.relevant == 'true'/);
  });

  it("preserva o nome histórico do job pesado", () => {
    expect(WORKFLOW).toContain("name: reconstruir schema e validar autorizacao");
  });

  it("clona o histórico completo no detector (merge-base não existe em clone raso)", () => {
    const detector = WORKFLOW.slice(
      WORKFLOW.indexOf("name: detectar mudanca relevante"),
      WORKFLOW.indexOf("name: reconstruir schema e validar autorizacao"),
    );
    expect(detector).toMatch(/fetch-depth:\s*0/);
  });

  it("continua sem secret nenhum e com permissão mínima", () => {
    expect(WORKFLOW).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(WORKFLOW).not.toContain("secrets.");
    expect(WORKFLOW).not.toContain("environment:");
  });
});
