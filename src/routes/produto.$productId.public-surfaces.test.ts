// Onda 3 (checkpoint PMO 2026-07-29): regressão estática garantindo que nenhuma rota pública
// importa, renderiza ou escreve diretamente nas três tabelas fechadas (price_submissions,
// product_watch_requests, decision_feedback). Não há harness de renderização React neste projeto
// (vitest roda em ambiente "node", sem jsdom/Testing Library, e adicionar essa infraestrutura não
// é a menor correção possível para este checkpoint) — este teste cobre o que é verificável sem
// ela: o código-fonte de todo `src/`, lido como texto, não referencia os componentes/callbacks das
// ações fechadas em nenhum arquivo (não só nos dois tocados pela correção original), e nenhum
// arquivo fora de `src/services/catalog.ts` chama `.insert(...)` nessas três tabelas. Complementa,
// sem substituir, supabase/close-public-write-surfaces.test.ts (prova o bloqueio de INSERT no
// banco).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC_DIR = join(process.cwd(), "src");
const CLOSED_COMPONENT_FILES = [
  join(SRC_DIR, "components", "SubmitPriceForm.tsx"),
  join(SRC_DIR, "components", "DecisionFeedback.tsx"),
];
// Único ponto de acesso a dados do projeto (ver CLAUDE.md) — é o único arquivo autorizado a
// conter as chamadas .insert(...) nessas três tabelas (a função existe e continua correta; só não
// pode ser chamada, direta ou indiretamente, por nenhuma rota pública).
const CATALOG_SERVICE_FILE = join(SRC_DIR, "services", "catalog.ts");
const THIS_TEST_FILE = join(SRC_DIR, "routes", "produto.$productId.public-surfaces.test.ts");

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listSourceFiles(full));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && full !== THIS_TEST_FILE) files.push(full);
  }
  return files;
}

const allSourceFiles = listSourceFiles(SRC_DIR);
const sources = new Map(allSourceFiles.map((file) => [file, readFileSync(file, "utf-8")]));

describe("nenhuma rota pública renderiza os controles fechados (checkpoint PMO)", () => {
  it("nenhum arquivo de src/ importa ou renderiza SubmitPriceForm (price_submissions)", () => {
    for (const [file, source] of sources) {
      if (CLOSED_COMPONENT_FILES.includes(file)) continue;
      expect(source, relative(process.cwd(), file)).not.toMatch(
        /from ["']@\/components\/SubmitPriceForm["']/,
      );
      expect(source, relative(process.cwd(), file)).not.toMatch(/<SubmitPriceForm\b/);
    }
  });

  it("nenhum arquivo de src/ importa ou renderiza DecisionFeedback (decision_feedback)", () => {
    for (const [file, source] of sources) {
      if (CLOSED_COMPONENT_FILES.includes(file)) continue;
      expect(source, relative(process.cwd(), file)).not.toMatch(
        /from ["']@\/components\/DecisionFeedback["']/,
      );
      expect(source, relative(process.cwd(), file)).not.toMatch(/<DecisionFeedback\b/);
    }
  });

  it("nenhum arquivo de src/ chama registerWatchRequest (product_watch_requests)", () => {
    for (const [file, source] of sources) {
      if (file === CATALOG_SERVICE_FILE) continue; // definição da função, não uma chamada pública
      expect(source, relative(process.cwd(), file)).not.toMatch(/registerWatchRequest\s*\(/);
    }
  });

  it("PriceCard não expõe mais onReport (caminho alternativo que abria o formulário fechado)", () => {
    const priceCard = sources.get(join(SRC_DIR, "components", "PriceCard.tsx"));
    expect(priceCard).toBeDefined();
    expect(priceCard).not.toMatch(/onReport/);
  });

  it("só src/services/catalog.ts escreve diretamente nas três tabelas fechadas", () => {
    const closedTables = ["price_submissions", "product_watch_requests", "decision_feedback"];
    for (const [file, source] of sources) {
      if (file === CATALOG_SERVICE_FILE) continue;
      for (const table of closedTables) {
        const pattern = new RegExp(`\\.insert\\([^)]*\\b${table}\\b|from\\(["']${table}["']\\)`);
        expect(
          source,
          `${relative(process.cwd(), file)} não deve referenciar ${table}`,
        ).not.toMatch(pattern);
      }
    }
  });

  it("os componentes fechados continuam no repositório, sem exclusão destrutiva", () => {
    for (const file of CLOSED_COMPONENT_FILES) {
      const source = readFileSync(file, "utf-8");
      expect(source).toMatch(/export function/);
    }
  });
});
