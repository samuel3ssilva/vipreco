import { describe, expect, it } from "vitest";
import { montarVisaoDoCard } from "@/lib/card-v2";
import type { OfertaCardV2 } from "@/lib/card-v2";
import type { Market, Product } from "@/types/domain";

/**
 * R3.2 — as regras de exibição do Card v2, interrogadas sem DOM.
 *
 * Cada teste aqui responde à mesma pergunta com um dado diferente: **dado isto, o que o
 * card pode mostrar?** É a pergunta que o `CARD-V2-SPEC.md` faz item a item, e ela não
 * precisa de navegador para ser respondida.
 *
 * O teste de render (`components/card-v2/product-card-v2.test.tsx`) responde a outra
 * pergunta — o que chega ao HTML —, e as duas juntas cobrem o que importa: a regra está
 * certa, e a regra chega à tela.
 */

const AGORA = new Date("2026-08-06T15:00:00.000Z");
const dia = (delta: number) => new Date(AGORA.getTime() + delta * 86_400_000).toISOString();

/** Formatação previsível, para o teste falar de datas sem depender de `Intl`. */
const formatarData = (v: string) => v.slice(0, 10);

const MERCADO: Market = {
  id: "m1",
  name: "Mercado Exemplo A",
  neighborhood: "Bairro Exemplo",
  address: null,
  maps_url: null,
  is_active: true,
  is_demo: true,
};

function produto(campos: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Produto Demonstrativo",
    brand: "Marca Exemplo",
    variant: null,
    size_text: null,
    gtin: null,
    category: "Mercearia",
    is_active: true,
    is_demo: true,
    ...campos,
  };
}

function oferta(campos: Partial<OfertaCardV2> = {}): OfertaCardV2 {
  return {
    id: "o1",
    product_id: "p1",
    market_id: "m1",
    price: 10,
    source_type: "weekly_audit",
    observed_at: dia(-1),
    valid_until: dia(10),
    special_condition: null,
    source_reference: null,
    is_featured: false,
    is_active: true,
    is_demo: true,
    created_at: dia(-1),
    product: produto(),
    market: MERCADO,
    ...campos,
  };
}

const visao = (campos: Partial<OfertaCardV2> = {}) =>
  montarVisaoDoCard(oferta(campos), AGORA, formatarData);

// ---------------------------------------------------------------------------------
// Preço unitário — o campo condicional mais fácil de errar
// ---------------------------------------------------------------------------------

describe("preço unitário: permitido só com quantidade estruturada E aprovada", () => {
  const comQuantidade = {
    product: produto({ quantity_value: 500, quantity_unit: "g" as const }),
    price: 12.9,
  };

  it("aparece quando a quantidade é estruturada e `confirmed`", () => {
    const v = visao({ ...comQuantidade, quantity_provenance: "confirmed" });
    expect(v.unitario).not.toBeNull();
    expect(v.unitario?.basis).toBe("per_kg");
    expect(v.unitario?.display).toBe(25.8);
    expect(v.unitario?.rotulo).toBe("por kg");
  });

  it("NÃO aparece sem procedência declarada — ausência de aprovação não é aprovação", () => {
    // O default é `missing`, e é o lado seguro de propósito. Um `quantity_value` preenchido
    // sem ninguém ter dito quem o aprovou não é uma quantidade aprovada; é uma pergunta.
    expect(visao(comQuantidade).unitario).toBeNull();
  });

  it("NÃO aparece com procedência `parsed` — leitura de texto não é revisão", () => {
    expect(visao({ ...comQuantidade, quantity_provenance: "parsed" }).unitario).toBeNull();
  });

  it("NÃO aparece com procedência `ambiguous`", () => {
    expect(visao({ ...comQuantidade, quantity_provenance: "ambiguous" }).unitario).toBeNull();
  });

  it("NÃO aparece sem quantidade estruturada nenhuma", () => {
    const v = visao({ product: produto({ size_text: "aprox. 1,2 kg — peso variável" }) });
    expect(v.unitario).toBeNull();
  });

  it("NÃO aparece para pack contado em `un` sem conteúdo declarado", () => {
    // O único caso em que a base `per_un` mente: a unidade é o pack, não o item que o
    // consumidor compara.
    const v = visao({
      product: produto({
        quantity_value: 1,
        quantity_unit: "un",
        package_type: "pack",
      }),
      quantity_provenance: "confirmed",
    });
    expect(v.unitario).toBeNull();
  });

  it("o card não persiste nem reaproveita o cálculo — duas chamadas, dois objetos", () => {
    const entrada = oferta({ ...comQuantidade, quantity_provenance: "confirmed" });
    const a = montarVisaoDoCard(entrada, AGORA, formatarData);
    const b = montarVisaoDoCard(entrada, AGORA, formatarData);
    expect(a.unitario).toEqual(b.unitario);
    expect(a.unitario).not.toBe(b.unitario);
  });

  it("e a oferta de entrada não é mutada", () => {
    const entrada = oferta({ ...comQuantidade, quantity_provenance: "confirmed" });
    const copia = structuredClone(entrada);
    montarVisaoDoCard(entrada, AGORA, formatarData);
    expect(entrada).toEqual(copia);
  });
});

// ---------------------------------------------------------------------------------
// Quantidade exibida
// ---------------------------------------------------------------------------------

describe("quantidade exibida", () => {
  it("estruturada quando existe, com a unidade escrita", () => {
    const v = visao({ product: produto({ quantity_value: 1.5, quantity_unit: "kg" }) });
    expect(v.identidade.quantidade).toBe("1,5 kg");
    expect(v.identidade.quantidadeEstruturada).toBe(true);
  });

  it("`l` vira `L` — a minúscula se confunde com 1 em fonte tabular", () => {
    const v = visao({ product: produto({ quantity_value: 1, quantity_unit: "l" }) });
    expect(v.identidade.quantidade).toBe("1 L");
  });

  it("pack declara quantos itens tem dentro, em campo separado da gramatura", () => {
    // Separados de propósito: só a gramatura recebe peso tipográfico. Numa string única,
    // "2.100 ml · 6 unidades" herdava o peso inteiro, quebrava em duas linhas a 320 px e
    // pesava mais que o título do produto.
    const v = visao({
      product: produto({ quantity_value: 2100, quantity_unit: "ml", units_per_package: 6 }),
    });
    expect(v.identidade.quantidade).toBe("2.100 ml");
    expect(v.identidade.complemento).toBe("6 unidades");
  });

  it("pack de um item não inventa complemento", () => {
    const v = visao({
      product: produto({ quantity_value: 500, quantity_unit: "g", units_per_package: 1 }),
    });
    expect(v.identidade.complemento).toBeNull();
  });

  it("sem estrutura, o `size_text` é preservado COMO ESTÁ ESCRITO", () => {
    // É a única pista de gramatura que sobra. Apagá-la por não ser estruturada tiraria do
    // leitor a informação que distingue o SKU.
    const v = visao({ product: produto({ size_text: "12 rolos" }) });
    expect(v.identidade.quantidade).toBe("12 rolos");
    expect(v.identidade.quantidadeEstruturada).toBe(false);
  });

  it("sem nada, é ausência — e não string vazia nem traço", () => {
    expect(visao().identidade.quantidade).toBeNull();
  });

  it("a embalagem some quando ela só repete a variante", () => {
    // "Marca Exemplo · Sachê" seguido de "250 g · sache" não acrescenta nada e ainda
    // parece defeito de dado, porque `package_type` chega cru do banco. A comparação
    // ignora caixa e acento; ignorar acento é o que faz `Sachê` casar com `sache`.
    const v = visao({ product: produto({ variant: "Sachê", package_type: "sache" }) });
    expect(v.identidade.embalagem).toBeNull();
  });

  it("a embalagem fica quando ela diz outra coisa, e vem com inicial maiúscula", () => {
    const v = visao({ product: produto({ variant: "Tradicional", package_type: "vidro" }) });
    expect(v.identidade.embalagem).toBe("Vidro");
  });

  it("embalagem vazia é ausência, e não uma string em branco", () => {
    for (const cru of [null, "", "   "]) {
      const v = visao({ product: produto({ package_type: cru }) });
      expect(v.identidade.embalagem).toBeNull();
    }
  });

  it("quantidade zero ou negativa não vira quantidade estruturada", () => {
    for (const valor of [0, -1]) {
      const v = visao({ product: produto({ quantity_value: valor, quantity_unit: "g" }) });
      expect(v.identidade.quantidadeEstruturada).toBe(false);
    }
  });

  it("o nome NUNCA é lido para inferir quantidade", () => {
    // `size-text.ts` é ferramenta de curadoria de backfill, com revisão humana. O contrato
    // proíbe inferência em tempo de apresentação, e o nome aqui está cheio de números.
    const v = visao({ product: produto({ name: "Produto Demonstrativo 500 g 6 x 350 ml" }) });
    expect(v.identidade.quantidade).toBeNull();
    expect(v.unitario).toBeNull();
  });
});

// ---------------------------------------------------------------------------------
// Histórico de preço — removido em 06/08/2026 (DL-030)
// ---------------------------------------------------------------------------------

describe("o card não conhece histórico de preço", () => {
  /**
   * A regra que existia aqui estava certa: frase em vez de "−12%" colorido, data ao lado
   * do percentual, corte de 1% aplicado sobre o valor estabilizado. O que faltava era o
   * contrato — **P-01**, qual observação anterior conta, nunca foi decidida —, e sem ele
   * dois cards com o mesmo dado exibem percentuais diferentes e os dois estão "certos".
   *
   * Estes dois testes não são cerimônia de despedida. Eles são o que impede a volta
   * silenciosa: um campo `previous_price` reintroduzido no fixture, ou um bloco de
   * histórico ressuscitado no componente, reprova aqui em vez de aparecer numa captura que
   * ninguém leu com atenção.
   */
  it("a visão não tem nenhum campo de preço anterior", () => {
    const chaves = Object.keys(visao());
    for (const proibida of ["precoAnterior", "previousPrice", "variacao"]) {
      expect(chaves, `a visão voltou a expor ${proibida}`).not.toContain(proibida);
    }
  });

  it("campo de histórico na entrada não produz saída nenhuma", () => {
    // O tipo já não os aceita; um objeto vindo de JSON, sim. A garantia precisa valer no
    // dado, e não só no compilador.
    const comHistorico = { price: 12.9, previous_price: 14.9, previous_observed_at: dia(-12) };
    const v = visao(comHistorico as Partial<OfertaCardV2>);
    expect(JSON.stringify(v)).not.toContain("14.9");
    expect(JSON.stringify(v)).not.toMatch(/mais (barato|caro) que em/);
  });
});

// ---------------------------------------------------------------------------------
// Imagem
// ---------------------------------------------------------------------------------

describe("imagem: as duas portas precisam abrir", () => {
  const img = {
    src: "data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E",
    alt: "Imagem de demonstração",
    review_status: "approved" as const,
    variant_match: "exact" as const,
  };

  it("aprovada e exata: aparece", () => {
    expect(visao({ image: img })?.imagem).not.toBeNull();
  });

  it("aprovada mas APROXIMADA: placeholder — imagem errada é pior que ausência", () => {
    expect(visao({ image: { ...img, variant_match: "approximate" } }).imagem).toBeNull();
  });

  it("exata mas não revisada: placeholder", () => {
    expect(visao({ image: { ...img, review_status: "pending" } }).imagem).toBeNull();
  });

  it("recusada na revisão: placeholder", () => {
    expect(visao({ image: { ...img, review_status: "rejected" } }).imagem).toBeNull();
  });

  it("`src` vazio: placeholder, e não uma imagem quebrada", () => {
    expect(visao({ image: { ...img, src: "  " } }).imagem).toBeNull();
  });

  it("sem imagem nenhuma: placeholder", () => {
    expect(visao().imagem).toBeNull();
  });
});

// ---------------------------------------------------------------------------------
// Estado da oferta
// ---------------------------------------------------------------------------------

describe("estado da oferta", () => {
  it("ativa não produz rótulo — o estado normal não precisa de nome", () => {
    const v = visao();
    expect(v.estado).toBeNull();
    expect(v.naListaOrganica).toBe(true);
  });

  it("validade vencida é `expired`, pelo relógio", () => {
    const v = visao({ valid_until: dia(-3), observed_at: dia(-14) });
    expect(v.estado?.chave).toBe("expired");
    expect(v.estado?.rotulo).toBe("Oferta expirada");
    expect(v.naListaOrganica).toBe(false);
  });

  it("observação antiga SEM validade é `desatualizada`, não `expired`", () => {
    // Dizer "expirada" onde validade nenhuma foi informada é inventar uma validade só para
    // poder anunciar que ela venceu.
    const v = visao({ valid_until: null, observed_at: dia(-21) });
    expect(v.estado?.chave).toBe("desatualizada");
    expect(v.estado?.rotulo).toBe("Preço desatualizado");
    expect(v.naListaOrganica).toBe(false);
  });

  it.each(["ended", "sold_out"] as const)("`%s` declarado manda sobre o relógio", (estado) => {
    const v = visao({ offer_state: estado, valid_until: dia(10) });
    expect(v.estado?.chave).toBe(estado);
    expect(v.naListaOrganica).toBe(false);
  });

  it("todo estado exibido vem escrito — cor nunca é o único canal", () => {
    // WCAG 2.2 SC 1.4.1. Um estado sem palavra seria cor sozinha, e cor sozinha não
    // comunica. A frase explicativa que acompanhava o rótulo saiu em 06/08/2026 — ela
    // repetia, dentro do card, o que a linha de procedência já provava três linhas abaixo.
    // O rótulo, esse, é obrigatório e continua sendo.
    for (const campos of [
      { valid_until: dia(-1) },
      { valid_until: null, observed_at: dia(-30) },
      { offer_state: "ended" as const },
      { offer_state: "sold_out" as const },
    ]) {
      const v = visao(campos);
      expect(v.estado?.rotulo.length).toBeGreaterThan(0);
      expect(Object.keys(v.estado ?? {})).not.toContain("explicacao");
    }
  });
});

// ---------------------------------------------------------------------------------
// Validade e procedência
// ---------------------------------------------------------------------------------

describe("validade e procedência", () => {
  it("validade informada é formatada; ausente é `null` e será DITA pelo componente", () => {
    expect(visao({ valid_until: dia(5) }).procedencia.validoAte).toBe("2026-08-11");
    expect(visao({ valid_until: null }).procedencia.validoAte).toBeNull();
  });

  it("nenhuma data é inventada quando a validade falta", () => {
    const v = visao({ valid_until: null });
    expect(v.procedencia.validoAte).toBeNull();
    expect(v.procedencia.observadoEm).toBe("2026-08-05");
  });

  it("fonte vem com rótulo e nível de evidência", () => {
    const v = visao({ source_type: "receipt" });
    expect(v.procedencia.origem).toBe("Comprovado por nota fiscal");
    expect(v.procedencia.nivel).toBe("comprovado");
  });

  it("a data relativa usa o instante recebido, e não o relógio do processo", () => {
    expect(visao({ observed_at: dia(-1) }).procedencia.relativo).toBe("ontem");
    expect(visao({ observed_at: dia(-3) }).procedencia.relativo).toBe("há 3 dias");
  });
});

// ---------------------------------------------------------------------------------
// Preço, condição e CTA
// ---------------------------------------------------------------------------------

describe("preço", () => {
  it("é partido em símbolo e número, com a versão falada ao lado", () => {
    const v = visao({ price: 26.49 });
    expect(v.preco.simbolo).toBe("R$");
    expect(v.preco.numero).toBe("26,49");
    expect(v.preco.falado).toBe("26 reais e 49 centavos");
  });
});

describe("condição de promoção", () => {
  it("é devolvida como o mercado informou, junto do preço", () => {
    const texto = "Limite de 2 unidades por cliente";
    expect(visao({ special_condition: texto }).condicao).toBe(texto);
  });

  it("ausente é ausente", () => {
    expect(visao().condicao).toBeNull();
  });
});

describe("CTA", () => {
  it("declara a contagem quando ela é conhecida e maior que um", () => {
    const v = visao({ markets_with_valid_price: 4 });
    expect(v.cta.rotulo).toBe("Comparar em 4 mercados");
    expect(v.cta.mercados).toBe(4);
  });

  it("com um mercado só, não promete comparação", () => {
    expect(visao({ markets_with_valid_price: 1 }).cta.rotulo).toBe("Ver preços por mercado");
  });

  it("sem contagem, não inventa número", () => {
    const v = visao();
    expect(v.cta.rotulo).toBe("Ver preços por mercado");
    expect(v.cta.mercados).toBeNull();
  });

  it("oferta fora da lista orgânica oferece os preços ATUAIS", () => {
    const v = visao({ valid_until: dia(-1), markets_with_valid_price: 3 });
    expect(v.cta.rotulo).toBe("Ver preços atuais por mercado");
  });

  it("contagem inválida é tratada como desconhecida", () => {
    for (const n of [0, -2, 1.5, Number.NaN]) {
      expect(visao({ markets_with_valid_price: n }).cta.mercados).toBeNull();
    }
  });
});

describe("mercado", () => {
  it("nome e bairro passam adiante", () => {
    const v = visao();
    expect(v.mercado.nome).toBe("Mercado Exemplo A");
    expect(v.mercado.bairro).toBe("Bairro Exemplo");
  });

  it("mercado sem bairro cadastrado não ganha um inventado", () => {
    const v = visao({ market: { ...MERCADO, neighborhood: null } });
    expect(v.mercado.bairro).toBeNull();
  });
});

// ---------------------------------------------------------------------------------
// Determinismo
// ---------------------------------------------------------------------------------

describe("determinismo — o card não pode desenhar diferente a cada render", () => {
  it("mesma entrada, mesma saída", () => {
    const entrada = oferta({
      valid_until: dia(2),
      markets_with_valid_price: 3,
      quantity_provenance: "confirmed",
    });
    expect(montarVisaoDoCard(entrada, AGORA, formatarData)).toEqual(
      montarVisaoDoCard(entrada, AGORA, formatarData),
    );
  });

  it("o instante vem por parâmetro — nada aqui lê o relógio sozinho", () => {
    // Se `Date.now()` fosse lido internamente, "ontem" mudaria entre o render do servidor e
    // o do navegador, e a hidratação divergiria. Duas referências diferentes têm de produzir
    // resultados diferentes de forma previsível.
    const entrada = oferta({ observed_at: dia(-1), valid_until: null });
    const hoje = montarVisaoDoCard(entrada, AGORA, formatarData);
    const daquiUmMes = montarVisaoDoCard(
      entrada,
      new Date(AGORA.getTime() + 30 * 86_400_000),
      formatarData,
    );
    expect(hoje.estado).toBeNull();
    expect(daquiUmMes.estado?.chave).toBe("desatualizada");
  });
});
