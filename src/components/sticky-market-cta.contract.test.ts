// Contrato do CTA fixo de `/para-mercados` (revisão do Founder, item 1).
//
// Duas camadas: o comportamento da decisão de visibilidade, exercido de verdade sobre a loja da
// rota, e a regressão estática do que só existe no código — faixa de mobile, área segura, altura
// da barra inferior, ausência de animação, destino e mensagem.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hiddenCtaAttributes, marketCtaStore } from "@/lib/cta-visibility";
import { shouldShowStickyCta } from "@/lib/sticky-cta";
import { WHATSAPP_MARKET_MESSAGE, marketWhatsappLink } from "@/lib/whatsapp";

function ler(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), ...caminho), "utf-8");
}

const fixo = ler("src", "components", "StickyMarketCta.tsx");
const mecanismo = ler("src", "components", "StickyCta.tsx");
const cta = ler("src", "components", "MarketWhatsAppCta.tsx");
const rota = ler("src", "routes", "para-mercados.tsx");

/**
 * Uma medição da página: os dois convites do fluxo (o da primeira dobra e o do fechamento) e a
 * faixa de largura. É o que o componente calcula a cada rolagem.
 */
function medir({
  inicialNaTela,
  finalNaTela,
  abaixoDe640,
}: {
  inicialNaTela: boolean;
  finalNaTela: boolean;
  abaixoDe640: boolean;
}): boolean {
  const visivel =
    abaixoDe640 &&
    shouldShowStickyCta([{ isIntersecting: inicialNaTela }, { isIntersecting: finalNaTela }]);
  marketCtaStore.set(visivel);
  return visivel;
}

afterEach(() => {
  marketCtaStore.set(false);
});

describe("visibilidade do CTA fixo em /para-mercados", () => {
  it("CTA inicial visível: o fixo fica escondido", () => {
    expect(medir({ inicialNaTela: true, finalNaTela: false, abaixoDe640: true })).toBe(false);
  });

  it("CTA final visível: o fixo fica escondido", () => {
    expect(medir({ inicialNaTela: false, finalNaTela: true, abaixoDe640: true })).toBe(false);
  });

  it("nenhum dos dois no viewport: o fixo aparece", () => {
    expect(medir({ inicialNaTela: false, finalNaTela: false, abaixoDe640: true })).toBe(true);
  });

  it("nunca dois convites equivalentes ao mesmo tempo", () => {
    // Exaustivo: para qualquer combinação, ou existe um CTA do fluxo na tela, ou existe o fixo.
    for (const inicialNaTela of [false, true]) {
      for (const finalNaTela of [false, true]) {
        const fixoNoAr = medir({ inicialNaTela, finalNaTela, abaixoDe640: true });
        expect(fixoNoAr && (inicialNaTela || finalNaTela)).toBe(false);
      }
    }
  });
});

describe("breakpoint", () => {
  it("acima de 640 px o fixo não assume o comando, nem com a página rolada", () => {
    expect(medir({ inicialNaTela: false, finalNaTela: false, abaixoDe640: false })).toBe(false);
    expect(marketCtaStore.get()).toBe(false);
  });

  it("a faixa medida é a mesma do `sm:hidden` que esconde o botão", () => {
    expect(mecanismo).toContain("(max-width: 639.98px)");
    expect(mecanismo).toContain("faixa.matches &&");
    expect(mecanismo).toContain("sm:hidden");
  });
});

describe("navegação acessível", () => {
  it("com o fixo no ar, os convites do fluxo saem do foco e da árvore acessível", () => {
    medir({ inicialNaTela: false, finalNaTela: false, abaixoDe640: true });
    const { container, link } = hiddenCtaAttributes(marketCtaStore.get());
    expect(container.inert).toBe(true);
    expect(container["aria-hidden"]).toBe("true");
    expect(link.tabIndex).toBe(-1);
  });

  it("sem o fixo no ar, os convites do fluxo são links normais", () => {
    medir({ inicialNaTela: true, finalNaTela: false, abaixoDe640: true });
    expect(hiddenCtaAttributes(marketCtaStore.get())).toEqual({ container: {}, link: {} });
  });

  it("o convite do fluxo lê a loja da própria rota e se apaga por inteiro", () => {
    expect(cta).toContain("marketCtaStore.subscribe");
    expect(cta).toContain("hiddenCtaAttributes(duplicado)");
    expect(cta).toContain("{...container}");
    expect(cta).toContain("{...link}");
  });

  it("o link externo continua anunciado para quem usa leitor de tela", () => {
    expect(fixo).toContain("(abre o WhatsApp)");
  });
});

describe("destino e mensagem", () => {
  it("é o mesmo link e a mesma mensagem dos convites do fluxo", () => {
    expect(fixo).toContain("marketWhatsappLink()");
    expect(cta).toContain("marketWhatsappLink()");
    expect(marketWhatsappLink("5519999999999")).toBe(
      `https://wa.me/5519999999999?text=${encodeURIComponent(WHATSAPP_MARKET_MESSAGE)}`,
    );
    expect(WHATSAPP_MARKET_MESSAGE).toBe(
      "Tenho um mercado e quero conhecer o piloto do ViPreço em Artemis",
    );
  });

  it("é o mesmo rótulo do convite do fluxo, de uma constante só", () => {
    expect(fixo).toContain("MARKET_CTA_LABEL");
    expect(cta).toContain('export const MARKET_CTA_LABEL = "Quero conversar sobre o piloto"');
  });

  it("falha fechado: sem destino configurado, nada é renderizado", () => {
    expect(marketWhatsappLink(undefined)).toBeNull();
    expect(mecanismo).toContain("if (!href || !montado) return null;");
  });

  it("nenhum número escrito no código", () => {
    for (const fonte of [fixo, cta, mecanismo]) {
      expect(fonte).not.toMatch(/\b\d{10,15}\b/);
    }
  });
});

describe("sem acoplar as duas rotas", () => {
  it("cada convite tem o seu marcador: um fixo nunca observa o CTA da outra rota", () => {
    expect(cta).toContain('export const MARKET_CTA_MARKER = "data-market-cta"');
    expect(fixo).toContain("MARKET_CTA_MARKER");
    expect(fixo).not.toContain("WHATSAPP_CTA_MARKER");
    expect(fixo).toContain("marketCtaStore");
    expect(fixo).not.toContain("consumerCtaStore");
  });

  it("a rota monta o fixo, e só ela", () => {
    expect(rota).toContain("<StickyMarketCta />");
    expect(rota).not.toContain("StickyWhatsAppCta");
    expect(ler("src", "routes", "index.tsx")).not.toContain("StickyMarketCta");
  });
});

describe("posição, alvo de toque e movimento", () => {
  it("fica acima da barra inferior, respeitando a área segura do aparelho", () => {
    expect(mecanismo).toContain("env(safe-area-inset-bottom");
    expect(mecanismo).toContain("calc(${alturaDaBarra} +");
    // AQUI A BARRA NÃO EXISTE. `/para-mercados` passou a ter shell próprio, sem barra
    // inferior: o CTA fixo desce até a área segura em vez de flutuar 56 px acima de nada.
    // O padrão de 3.5 rem continua sendo o do `AppShell`, para a próxima rota que tiver os dois
    // — desde R3.3A não há nenhuma: a Home perdeu o CTA fixo, e este é o único que existe.
    expect(fixo).toContain('alturaDaBarra="0rem"');
  });

  it("não cobre o último conteúdo da página", () => {
    expect(mecanismo).toContain("RESERVA_INFERIOR");
  });

  it("tem 48 px de altura mínima", () => {
    expect(mecanismo).toContain("btn-touch-48");
  });

  it("não entra com animação", () => {
    for (const fonte of [fixo, mecanismo]) {
      expect(fonte).not.toContain("animate-");
      expect(fonte).not.toContain("transition-");
    }
  });
});
