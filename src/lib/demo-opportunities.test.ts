import { describe, expect, it } from "vitest";
import {
  DEMO_FIXTURE_REFERENCE,
  DEMO_MARKETS,
  HOME_OPPORTUNITY_COUNT,
  buildDemoOpportunities,
} from "@/lib/demo-opportunities";
import { ACOUGUE_MOTA } from "@/lib/demo-catalog";
import { isValidPrice } from "@/lib/comparison";
import { isGtinWellFormed } from "@/lib/gtin";
import { normalizeSearchText } from "@/lib/normalize";
import { formatDate, formatRelativeDay } from "@/lib/format";

const NOW = new Date("2026-07-31T02:30:00.000Z"); // 30/07 23:30 em America/Sao_Paulo

describe("fixture de demonstração da Home", () => {
  it("entrega exatamente cinco Achados — o destaque e os outros quatro", () => {
    expect(buildDemoOpportunities(NOW)).toHaveLength(HOME_OPPORTUNITY_COUNT);
    expect(HOME_OPPORTUNITY_COUNT).toBe(5);
  });

  it("marca preço, produto e mercado como demonstração", () => {
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry.is_demo).toBe(true);
      expect(entry.product.is_demo).toBe(true);
      expect(entry.market.is_demo).toBe(true);
      expect(entry.source_reference).toBe(DEMO_FIXTURE_REFERENCE);
      // O prefixo mudou de `demo-fixture-` para `demo-price-` quando a Home deixou de ter
      // fixture próprio e passou a SELECIONAR do catálogo único (`@/lib/demo-catalog`). O
      // que a asserção protege é o mesmo: nenhum id daqui pode se passar por id de banco.
      expect(entry.id).toMatch(/^demo-price-/);
    }
  });

  /**
   * A REGRA VIROU DO AVESSO EM 09/08/2026, POR DECISÃO DO FOUNDER.
   *
   * Ela dizia "nenhum mercado real como participante", e o padrão `Mercado local N` era a forma
   * de garantir isso. A demonstração agora existe para o dono do Açougue Mota ver a **própria
   * loja** na tela, com os preços que eu fui ler no balcão dele — sem nome real, ela não prova
   * nada e não interessa a ninguém.
   *
   * O que continua proibido é o que sempre esteve por trás da regra: **nomear rede de
   * supermercado que existe**. Uma coisa é a loja que participou da coleta; outra é pendurar o
   * nome de uma rede num preço que ela nunca informou. A asserção passa a medir isso, que é a
   * proibição de verdade, em vez do formato do nome.
   */
  it("nenhuma rede de supermercado real é nomeada", () => {
    const REDES = ["Assaí", "Carrefour", "Pão de Açúcar", "Extra", "Atacadão", "Dia", "Tenda"];
    for (const entry of buildDemoOpportunities(NOW)) {
      for (const rede of REDES) {
        expect(entry.market.name, `${entry.id} cita ${rede}`).not.toContain(rede);
      }
    }
  });

  it("todo Achado da Home veio da loja que foi visitada", () => {
    // A Home anuncia observação. Enquanto só existe uma loja coletada, todo Achado é dela — e a
    // linha do Mercado 2, que é exemplo, não pode se infiltrar aqui.
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry.market.id, entry.id).toBe(ACOUGUE_MOTA.id);
      expect(entry.exemplo_ilustrativo, entry.id).toBeUndefined();
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
    // A COLETA FOI UMA SÓ, NUM DIA SÓ — então as cinco datas são a mesma, e é isso que se
    // verifica. Escalonar as observações em dias diferentes seria simular um histórico de
    // monitoramento que não existe: eu fui ao balcão uma vez.
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(formatRelativeDay(entry.observed_at, NOW), entry.id).toBe("ontem");
      expect(formatDate(entry.observed_at), entry.id).toBe("29/07/2026");
    }
  });

  it("o destaque é o filé de peito, porque é por ele que a conversa começa", () => {
    const [primeiro] = buildDemoOpportunities(NOW);
    expect(primeiro.product.name).toBe("Filé de peito de frango");
    expect(primeiro.price).toBe(20.99);
  });

  it("nenhum Achado carrega preço anterior — o campo saiu em R3.3", () => {
    // Ele existia, e um item do fixture o usava. Saiu junto com o que o exibia: sem P-01
    // decidida (MVP-DOCS-02), não há critério escrito para QUAL observação anterior conta.
    // Deixar o número no dado mantém vivo o componente que o mostra — é adiar, não decidir.
    for (const entry of buildDemoOpportunities(NOW)) {
      expect(entry).not.toHaveProperty("previous_price");
      expect(entry).not.toHaveProperty("previous_observed_at");
    }
  });

  it("oferece dois mercados: a loja visitada e o exemplo", () => {
    expect(DEMO_MARKETS.map((market) => market.name)).toEqual(["Açougue Mota", "Mercado 2"]);
    for (const market of DEMO_MARKETS) {
      expect(market.is_demo).toBe(true);
      expect(market.is_active).toBe(true);
    }
  });

  it("o mercado de exemplo não afirma endereço, bairro nem mapa", () => {
    // Cada campo vazio aqui é uma afirmação que a tela não vai poder fazer sobre um lugar que
    // não existe. Preenchê-los "para ficar completo" seria inventar uma loja.
    const exemplo = DEMO_MARKETS.find((m) => m.name === "Mercado 2");
    expect(exemplo).toBeDefined();
    expect(exemplo!.neighborhood).toBeNull();
    expect(exemplo!.address).toBeNull();
    expect(exemplo!.maps_url).toBeNull();
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
      // CORTE DE AÇOUGUE NÃO TEM GTIN, NÃO TEM MARCA E NÃO TEM GRAMATURA — e mesmo assim é um
      // produto inteiro. O que ele precisa ter é NOME, porque é por texto que a pessoa chega
      // nele. Exigir marca e `size_text`, como esta asserção fazia quando o catálogo era
      // mercearia embalada, obrigaria a preencher os dois com invenção.
      expect(achado.product.name).toBeTruthy();
      expect(normalizeSearchText(achado.product.name).length).toBeGreaterThan(0);
    }
  });
});
