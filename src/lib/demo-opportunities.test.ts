import { describe, expect, it } from "vitest";
import {
  DEMO_MARKETS,
  HOME_OPPORTUNITY_COUNT,
  buildDemoOpportunities,
} from "@/lib/demo-opportunities";
import { ACOUGUE_MOTA, custoUnitarioDaOferta, grupoDoProduto } from "@/lib/demo-catalog";
import { isValidPrice } from "@/lib/comparison";
import { normalizeSearchText } from "@/lib/normalize";
import { formatDate, formatRelativeDay } from "@/lib/format";

/**
 * Dentro da janela real da coleta: tudo observado (08–09/08), nada vencido (encartes valem
 * até 23:59 de 09/08; tabloide Safra até 12/08). As datas do catálogo são as REAIS — fora
 * da janela, as ofertas de encarte expiram como o produto manda, e há teste para isso.
 */
const NOW = new Date("2026-08-09T18:00:00-03:00");

describe("fixture de demonstração da Home — demo v2", () => {
  it("entrega exatamente dez Achados — o herói e a vitrine da V3", () => {
    expect(buildDemoOpportunities(NOW)).toHaveLength(HOME_OPPORTUNITY_COUNT);
    expect(HOME_OPPORTUNITY_COUNT).toBe(10);
  });

  it("marca preço, produto e mercado como demonstração", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry.is_demo).toBe(true);
      expect(entry.product.is_demo).toBe(true);
      expect(entry.market.is_demo).toBe(true);
      // Cada oferta declara a coleta de onde veio — encarte, tabloide, foto ou painel. Um
      // texto único para todas seria mais simples e menos verdadeiro: as coletas foram
      // quatro, em dias e materiais diferentes.
      expect(entry.source_reference, entry.id).toBeTruthy();
      // Nenhum id daqui pode se passar por id de banco.
      expect(entry.id).toMatch(/^demo-v[23]-/);
    }
  });

  /**
   * A REGRA DOS NOMES REAIS VIROU DO AVESSO DUAS VEZES, E AGORA TEM A SUA FORMA FINAL.
   *
   * Primeiro era "nenhum mercado real" (mercearia fictícia). Depois, "a loja da coleta pode
   * ter nome real" (Açougue Mota). Com a planilha do Founder, os CINCO mercados são reais —
   * e o que a regra sempre protegeu fica explícito: **nenhum mercado é nomeado sem que o
   * preço tenha vindo de material dele** (encarte publicado, tabloide, placa fotografada).
   * Pendurar preço em rede que nunca o anunciou continua proibido — e agora é testável:
   * toda oferta declara a coleta de origem.
   */
  it("todo mercado nomeado tem oferta vinda de material dele próprio", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry.source_reference, `${entry.market.name} sem coleta declarada`).toMatch(
        /Encarte|Tabloide|Foto|Painel|Cartaz/i,
      );
    }
  });

  it("não carrega segredo, telefone nem dado pessoal", () => {
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
      expect(isValidPrice(entry, NOW), entry.id).toBe(true);
    }
  });

  it("as datas exibidas são as reais da coleta, e o relativo bate com elas", () => {
    // Mota foi fotografado em 08/08; encartes e loja do Safra são de 09/08. Nada de datas
    // escalonadas para simular histórico: a coleta foi a que foi.
    for (const entry of buildDemoOpportunities(NOW)) {
      const data = formatDate(entry.observed_at);
      expect(["08/08/2026", "09/08/2026"], entry.id).toContain(data);
      expect(formatRelativeDay(entry.observed_at, NOW), entry.id).toBe(
        data === "08/08/2026" ? "ontem" : "hoje",
      );
      if (entry.market.id === ACOUGUE_MOTA.id) {
        expect(data, `${entry.id}: a foto do balcão do Mota é de 08/08`).toBe("08/08/2026");
      }
    }
  });

  it("o herói da V3 é o frango inteiro do Safra — porque o Safra tem o menor R$/kg dele", () => {
    const [primeiro] = buildDemoOpportunities(NOW);
    expect(primeiro.product.name).toBe("Frango inteiro");
    expect(primeiro.price).toBe(7.99);
    expect(primeiro.price_unit).toBe("kg");
    // A escolha do GRUPO é curadoria editorial declarada (V3 §4: universal, comparação de
    // 25%, imagem clara); a escolha do MERCADO não é de ninguém: 7,99 < 9,99. Se o Mota
    // baixar o preço, o herói mostra o Mota.
    const grupo = grupoDoProduto(primeiro.product_id)!;
    const menor = Math.min(...grupo.sementes.map((s) => s.price));
    expect(primeiro.price).toBe(menor);
  });

  it("a vitrine da V3: dez grupos, oito categorias, com o bucho revisado ainda dentro", () => {
    const nomes = buildDemoOpportunities(NOW).map((o) => o.product.name);
    expect(nomes).toEqual([
      "Frango inteiro",
      "Bisteca bovina",
      "Bucho bovino",
      "Cebola",
      "Cerveja",
      "Lasanha",
      "Óleo de soja",
      "Desodorante aerossol",
      "Petisco para gatos",
      "Lava-roupas em pó",
    ]);
    // O bucho continua na vitrine (V3 §5 — revisado, com a foto correta), mostrando o Mota.
    const bucho = buildDemoOpportunities(NOW).find((o) => o.product.name === "Bucho bovino");
    expect(bucho!.market.id).toBe(ACOUGUE_MOTA.id);
  });

  it("o representante do grupo de embalagens diferentes é o de melhor custo unitário", () => {
    // Dreamies na vitrine: o card mostra o Atacadão de 80 g (R$ 98,75/kg), e não o menor
    // desembolso (R$ 5,95 por 40 g) — porque o critério declarado do grupo é custo/kg, e o
    // card da vitrine não pode contar uma história diferente da tela de comparação.
    const dreamies = buildDemoOpportunities(NOW).find((o) => o.product.brand === "Dreamies");
    expect(dreamies).toBeDefined();
    expect(dreamies!.product.size_text).toBe("80 g");
    expect(dreamies!.price).toBe(7.9);
    expect(custoUnitarioDaOferta(dreamies!)).toBe(98.75);
  });

  it("nenhum Achado carrega preço anterior — o campo saiu em R3.3", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry).not.toHaveProperty("previous_price");
      expect(entry).not.toHaveProperty("previous_observed_at");
    }
  });

  it("oferece os cinco mercados da planilha, e só eles", () => {
    expect(DEMO_MARKETS.map((market) => market.name)).toEqual([
      "Açougue Mota",
      "Safra",
      "Savegnago",
      "Atacadão",
      "Pague Menos",
    ]);
    for (const market of DEMO_MARKETS) {
      expect(market.is_demo).toBe(true);
      expect(market.is_active).toBe(true);
    }
  });

  it("bairro só existe onde a planilha valida um — e distância não existe em lugar nenhum", () => {
    // Mota é de Artemis; Safra é loja única com endereço no Leia-me da planilha. Os outros
    // três são preços de rede/tabloide regional: bairro nulo, porque afirmar um seria
    // inventar proximidade (§16).
    const porNome = new Map(DEMO_MARKETS.map((m) => [m.name, m]));
    expect(porNome.get("Açougue Mota")!.neighborhood).toBe("Artemis");
    expect(porNome.get("Safra")!.neighborhood).toBe("Mário Dedini");
    for (const nome of ["Savegnago", "Atacadão", "Pague Menos"]) {
      expect(porNome.get(nome)!.neighborhood, nome).toBeNull();
      expect(porNome.get(nome)!.address, nome).toBeNull();
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

  it("depois do vencimento dos encartes a Home continua inteira — snapshot histórico (§18)", () => {
    // Em 13/08 os encartes de 09/08 e o tabloide de 12/08 já venceram, e a demo NÃO apaga
    // as ofertas: ela é um snapshot de preços OBSERVADOS em agosto de 2026, e some com uma
    // oferta seria destruir a demonstração dias depois da coleta. O que a honestidade exige
    // é o tempo verbal: `validadePassada` fica true nas vencidas e a tela escreve "valeu
    // até", nunca vigência. O caminho do piloto continua expirando pelo princípio 2.
    const depois = buildDemoOpportunities(new Date("2026-08-13T12:00:00-03:00"));
    expect(depois).toHaveLength(HOME_OPPORTUNITY_COUNT);
    const vencidas = depois.filter(
      (o) =>
        o.valid_until !== null &&
        Date.parse(o.valid_until) < Date.parse("2026-08-13T12:00:00-03:00"),
    );
    expect(vencidas.length).toBeGreaterThan(0);
    // E a ordem/vencedor por grupo não muda com o relógio: preço não muda ao vencer.
    expect(depois.map((o) => o.id)).toEqual(buildDemoOpportunities(NOW).map((o) => o.id));
  });
});

describe("fixture de demonstração — GTIN", () => {
  it("nenhum produto da demonstração tem GTIN", () => {
    // Nenhum código de barras foi coletado nas fontes; inventar um seria afirmação falsa
    // sobre um identificador global, e emprestar um real colide com um produto de alguém.
    for (const achado of buildDemoOpportunities(NOW)) {
      expect(achado.product.gtin, achado.product.name).toBeNull();
    }
  });

  it("produto sem GTIN continua sendo um produto normal, encontrável por texto", () => {
    for (const achado of buildDemoOpportunities(NOW)) {
      expect(achado.product.name).toBeTruthy();
      expect(normalizeSearchText(achado.product.name).length).toBeGreaterThan(0);
    }
  });
});
