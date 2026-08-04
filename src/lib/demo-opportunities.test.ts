import { describe, expect, it } from "vitest";
import {
  DEMO_FIXTURE_REFERENCE,
  DEMO_MARKETS,
  HOME_OPPORTUNITY_COUNT,
  buildDemoOpportunities,
} from "@/lib/demo-opportunities";
import { isValidPrice } from "@/lib/comparison";
import { isGtinWellFormed } from "@/lib/gtin";
import { normalizeSearchText } from "@/lib/normalize";
import { formatDate, formatRelativeDay } from "@/lib/format";

const NOW = new Date("2026-07-31T02:30:00.000Z"); // 30/07 23:30 em America/Sao_Paulo

describe("fixture de demonstração da Home", () => {
  it("entrega exatamente três Achados", () => {
    expect(buildDemoOpportunities(NOW)).toHaveLength(HOME_OPPORTUNITY_COUNT);
    expect(HOME_OPPORTUNITY_COUNT).toBe(3);
  });

  it("marca preço, produto e mercado como demonstração", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry.is_demo).toBe(true);
      expect(entry.product.is_demo).toBe(true);
      expect(entry.market.is_demo).toBe(true);
      expect(entry.source_reference).toBe(DEMO_FIXTURE_REFERENCE);
      expect(entry.id).toMatch(/^demo-fixture-/);
    }
  });

  it("não apresenta nenhum mercado real como participante", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry.market.name).toMatch(/^Mercado (principal|local \d)$/);
    }
  });

  it("não carrega segredo, telefone nem dado pessoal", () => {
    // Os campos livres são onde um dado pessoal poderia entrar sem querer. Identificadores
    // (GTIN, UUID) ficam de fora de propósito: são sequências de dígitos legítimas e disparariam
    // qualquer heurística de telefone.
    const camposLivres = buildDemoOpportunities(NOW)
      .flatMap((entry) => [
        entry.market.name,
        entry.market.neighborhood,
        entry.market.address,
        entry.market.maps_url,
        entry.product.name,
        entry.product.brand,
        entry.product.variant,
        entry.special_condition,
        entry.source_reference,
      ])
      .filter(Boolean)
      .join(" | ");

    expect(camposLivres).not.toMatch(/\(\d{2}\)/); // (19) …
    expect(camposLivres).not.toMatch(/\d{4,5}-\d{4}/); // 99999-9999
    expect(camposLivres).not.toMatch(/wa\.me|whatsapp|tel:/i);
    expect(camposLivres).not.toMatch(/@[\w.-]+\.\w+/); // e-mail
    expect(camposLivres).not.toMatch(/eyJ|sb_|sbp_|service_role|secret|token|password/i);
    expect(camposLivres).not.toMatch(/\bCPF\b/i);
  });

  it("produz apenas preços válidos pela regra de domínio", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(isValidPrice(entry, NOW)).toBe(true);
    }
  });

  it("mantém a data exibida coerente com o texto relativo", () => {
    const [arroz, cafe] = buildDemoOpportunities(NOW);
    expect(formatRelativeDay(arroz.observed_at, NOW)).toBe("ontem");
    expect(formatDate(arroz.observed_at)).toBe("29/07/2026");
    expect(formatRelativeDay(cafe.observed_at, NOW)).toBe("há 2 dias");
    expect(formatDate(cafe.observed_at)).toBe("28/07/2026");
  });

  it("trata preço anterior como campo opcional — presente em um item, ausente nos outros", () => {
    const comPrecoAnterior = buildDemoOpportunities(NOW).filter(
      (entry) => entry.previous_price !== undefined,
    );
    expect(comPrecoAnterior).toHaveLength(1);
    expect(comPrecoAnterior[0].previous_price).toBeGreaterThan(comPrecoAnterior[0].price);
  });

  it("oferece os mesmos mercados fictícios do seed, em ordem alfabética como o catálogo", () => {
    expect(DEMO_MARKETS.map((market) => market.name)).toEqual([
      "Mercado local 2",
      "Mercado local 3",
      "Mercado local 4",
      "Mercado principal",
    ]);
    for (const market of DEMO_MARKETS) {
      expect(market.is_demo).toBe(true);
      expect(market.is_active).toBe(true);
      expect(market.name).toMatch(/^Mercado (principal|local \d)$/);
    }
  });

  it("todo mercado de um Achado também está no seletor", () => {
    const idsNoSeletor = new Set(DEMO_MARKETS.map((market) => market.id));
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(idsNoSeletor.has(entry.market.id)).toBe(true);
    }
  });

  it("é reconstruído a cada chamada, sem estado compartilhado entre requisições", () => {
    const primeiro = buildDemoOpportunities(NOW);
    const segundo = buildDemoOpportunities(NOW);
    expect(primeiro).not.toBe(segundo);
    expect(primeiro[0]).not.toBe(segundo[0]);
    expect(primeiro).toEqual(segundo);
  });
});

describe("fixture de demonstração — GTIN", () => {
  it("nenhum GTIN do fixture reprova no dígito verificador", () => {
    // O fixture espelha o seed. Um código inválido aqui é o mesmo defeito adiado: no dia
    // em que a validação existir, o dado de demonstração deixa de passar.
    for (const achado of buildDemoOpportunities(new Date("2026-08-03T12:00:00Z"))) {
      const gtin = achado.product.gtin;
      if (gtin === null) continue;
      expect(isGtinWellFormed(gtin), `GTIN ${gtin} reprova a validação GS1`).toBe(true);
    }
  });

  it("produto sem GTIN continua sendo um produto normal, não um produto quebrado", () => {
    const achados = buildDemoOpportunities(new Date("2026-08-03T12:00:00Z"));
    const semGtin = achados.filter((achado) => achado.product.gtin === null);
    expect(semGtin.length).toBeGreaterThan(0);
    for (const achado of semGtin) {
      // GTIN é opcional: nome, marca e tamanho seguem exibíveis e a busca por texto,
      // que é como o usuário realmente chega ao produto, não depende do código.
      expect(achado.product.name).toBeTruthy();
      expect(achado.product.brand).toBeTruthy();
      expect(achado.product.size_text).toBeTruthy();
      expect(normalizeSearchText(achado.product.name).length).toBeGreaterThan(0);
    }
  });
});
