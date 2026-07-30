// Onda 3 (checkpoint PMO 2026-07-29): regressão estática garantindo que a rota de produto não
// importa nem renderiza os três controles públicos ligados às tabelas fechadas
// (price_submissions, product_watch_requests, decision_feedback). Não há harness de renderização
// React neste projeto (vitest roda em ambiente "node", sem jsdom/Testing Library, e adicionar essa
// infraestrutura não é a menor correção possível para este checkpoint) — este teste cobre o que é
// verificável sem ela: o código-fonte da rota e do PriceCard, lidos como texto, não referenciam os
// componentes/rótulos/callbacks das ações fechadas. Complementa, sem substituir,
// supabase/close-public-write-surfaces.test.ts (prova o bloqueio de INSERT no banco).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_FILE = join(process.cwd(), "src", "routes", "produto.$productId.tsx");
const PRICE_CARD_FILE = join(process.cwd(), "src", "components", "PriceCard.tsx");
const CLOSED_COMPONENT_FILES = [
  join(process.cwd(), "src", "components", "SubmitPriceForm.tsx"),
  join(process.cwd(), "src", "components", "DecisionFeedback.tsx"),
];

const routeSource = readFileSync(ROUTE_FILE, "utf-8");
const priceCardSource = readFileSync(PRICE_CARD_FILE, "utf-8");

describe("rota /produto/$productId não renderiza os controles fechados (checkpoint PMO)", () => {
  it("não importa nem renderiza SubmitPriceForm (price_submissions)", () => {
    expect(routeSource).not.toMatch(/from ["']@\/components\/SubmitPriceForm["']/);
    expect(routeSource).not.toMatch(/<SubmitPriceForm\b/);
  });

  it("não importa nem renderiza DecisionFeedback (decision_feedback)", () => {
    expect(routeSource).not.toMatch(/from ["']@\/components\/DecisionFeedback["']/);
    expect(routeSource).not.toMatch(/<DecisionFeedback\b/);
  });

  it("não chama registerWatchRequest (product_watch_requests)", () => {
    expect(routeSource).not.toMatch(/registerWatchRequest/);
  });

  it("não contém os rótulos das ações fechadas em nenhum dos dois arquivos", () => {
    for (const label of ["Informar preço", "Quero acompanhar", "Informar atualização"]) {
      expect(routeSource).not.toContain(label);
      expect(priceCardSource).not.toContain(label);
    }
  });

  it("PriceCard não expõe mais onReport (caminho alternativo que abria o formulário fechado)", () => {
    expect(priceCardSource).not.toMatch(/onReport/);
  });

  it("os componentes fechados continuam no repositório, sem exclusão destrutiva", () => {
    for (const file of CLOSED_COMPONENT_FILES) {
      const source = readFileSync(file, "utf-8");
      expect(source).toMatch(/export function/);
    }
  });
});
