// Regressão estática, no mesmo espírito de `produto.$productId.public-surfaces.test.ts`: garante
// que a Home continua servida pelo loader e que ninguém reintroduz, por engano, a busca no
// cliente ou o texto de carregamento que este PR eliminou.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HOME_ROUTE = join(process.cwd(), "src", "routes", "index.tsx");
const home = readFileSync(HOME_ROUTE, "utf-8");

/**
 * O mesmo arquivo, sem os comentários. As proibições de R3.3A são sobre o que a Home RENDERIZA,
 * e o cabeçalho da rota explica por escrito o que saiu dela — citando, necessariamente, o nome
 * do que saiu. A explicação vale mais do que a conveniência de uma busca ingênua por texto.
 */
const homeCodigo = home.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("Home servida pelo loader (SSR)", () => {
  it("resolve os Achados no loader da rota", () => {
    expect(home).toMatch(/loader:\s*async\s*\(\)\s*=>/);
    expect(home).toContain("loadHomeOpportunities(appMode())");
  });

  it("usa uma única resolução de modo", () => {
    expect(home.match(/\bappMode\(\)/g) ?? []).toHaveLength(1);
  });

  it("não resolve mais a lista de mercados — o seletor saiu da Home em R3.3A", () => {
    // A lista existia só para o `UsualMarketPicker` da Home. Sem o seletor, resolvê-la no
    // loader seria trabalho de servidor a cada visita para um dado que ninguém renderiza.
    expect(homeCodigo).not.toContain("loadHomeMarkets");
    expect(homeCodigo).not.toContain("home-markets");
  });

  it("lê os Achados do loader, não de um useQuery no cliente", () => {
    expect(home).toContain("Route.useLoaderData()");
    expect(home).not.toMatch(/\buseQuery\s*\(/);
    expect(home).not.toContain("@tanstack/react-query");
  });

  it("não busca as oportunidades nem os mercados direto no catálogo", () => {
    expect(home).not.toContain("getWeeklyOpportunities");
    expect(home).not.toContain("getMarkets");
    expect(home).not.toContain("@/services/catalog");
  });

  it("não tem mais estado de carregamento dos Achados", () => {
    expect(home).not.toContain("Carregando oportunidades");
    expect(home).not.toMatch(/variant="loading"/);
  });
});

/**
 * R3.3A — o que saiu da Home, e que não pode voltar por descuido.
 *
 * As três regressões abaixo são estáticas de propósito: um componente reintroduzido aparece no
 * arquivo antes de aparecer em qualquer HTML, e é aqui que ele deve ser pego.
 */
describe("a Home não personaliza e não pede opt-in cedo (R3.3A)", () => {
  it("nenhum seletor de mercado habitual na Home", () => {
    // O seletor continua existindo — em `/produto/$productId`, onde a preferência tem
    // consequência imediata na linha de "quanto você economiza". Na Home ele era uma pergunta
    // sem resposta visível, e declarava uma personalização que o MVP não tem.
    expect(homeCodigo).not.toContain("UsualMarketPicker");
    expect(homeCodigo).not.toContain("local-preferences");
    expect(homeCodigo).not.toContain("mercado habitual");
  });

  it("um único CTA de WhatsApp, e nenhum fixo", () => {
    expect(home.match(/<WhatsAppCta\s*\/>/g) ?? []).toHaveLength(1);
    expect(homeCodigo).not.toContain("StickyWhatsAppCta");
    expect(homeCodigo).not.toContain("StickyCta");
  });

  it("o CTA de WhatsApp vem depois dos Achados", () => {
    expect(home.indexOf("<WhatsAppCta")).toBeGreaterThan(home.indexOf("<HomeAchados"));
  });

  it("vazio real e sem ofertas vigentes vêm da mesma fonte de copy, resolvida por dado", () => {
    // Sem isto, as duas telas voltam a ser escritas à mão em lugares diferentes — que é
    // exatamente como elas acabaram idênticas antes de R3.3A.
    expect(home).toContain("estadoSemAchados(opportunities.length)");
    expect(homeCodigo).not.toContain("Estamos começando a mapear");
    expect(homeCodigo).not.toContain("Nenhuma oferta vigente");
  });
});
