import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhatsAppCta } from "@/components/WhatsAppCta";
import { MarketWhatsAppCta } from "@/components/MarketWhatsAppCta";
import {
  WHATSAPP_CONSUMER_MESSAGE,
  WHATSAPP_MARKET_MESSAGE,
  consumerWhatsappLink,
  marketWhatsappLink,
  normalizeWhatsappNumber,
  whatsappLink,
} from "@/lib/whatsapp";

describe("normalização do número", () => {
  it("aceita formato internacional, com ou sem pontuação", () => {
    expect(normalizeWhatsappNumber("5519999999999")).toBe("5519999999999");
    expect(normalizeWhatsappNumber("+55 (19) 99999-9999")).toBe("5519999999999");
    expect(normalizeWhatsappNumber("  +55 19 9999 9999  ")).toBe("551999999999");
  });

  it("recusa configuração malformada em vez de gerar link errado", () => {
    expect(normalizeWhatsappNumber(undefined)).toBeNull();
    expect(normalizeWhatsappNumber("")).toBeNull();
    expect(normalizeWhatsappNumber("   ")).toBeNull();
    expect(normalizeWhatsappNumber("meu-numero")).toBeNull();
    expect(normalizeWhatsappNumber("99999-9999")).toBeNull(); // sem DDI
    expect(normalizeWhatsappNumber("0551999999999")).toBeNull(); // DDI não começa em zero
    expect(normalizeWhatsappNumber("5519999999999999999")).toBeNull(); // além de E.164
  });
});

describe("link de conversa individual", () => {
  it("aponta para wa.me com a mensagem aprovada, codificada", () => {
    expect(whatsappLink("+55 (19) 99999-9999")).toBe(
      "https://wa.me/5519999999999?text=Quero%20receber%20os%20Achados%20de%20Artemis",
    );
  });

  it("usa exatamente a mensagem aprovada pelo PMO", () => {
    expect(WHATSAPP_CONSUMER_MESSAGE).toBe("Quero receber os Achados de Artemis");
  });

  it("codifica acento e espaço — a mensagem chega legível do outro lado", () => {
    const link = whatsappLink("5519999999999", "Olá, ç & preço?");
    expect(link).toContain("text=Ol%C3%A1%2C%20%C3%A7%20%26%20pre%C3%A7o%3F");
    expect(decodeURIComponent(new URL(link!).searchParams.get("text")!)).toBe("Olá, ç & preço?");
  });

  it("sem destino configurado não existe link", () => {
    expect(whatsappLink(undefined)).toBeNull();
    expect(consumerWhatsappLink(undefined)).toBeNull();
    expect(consumerWhatsappLink("")).toBeNull();
  });

  it("com destino configurado, um único destino", () => {
    expect(consumerWhatsappLink("5519999999999")).toBe(
      "https://wa.me/5519999999999?text=Quero%20receber%20os%20Achados%20de%20Artemis",
    );
  });
});

describe("link de quem tem um mercado (Parte 3)", () => {
  it("usa exatamente a mensagem aprovada pelo PMO", () => {
    expect(WHATSAPP_MARKET_MESSAGE).toBe(
      "Tenho um mercado e quero conhecer o piloto do ViPreço em Artemis",
    );
  });

  it("é o mesmo número do consumidor, com outro texto", () => {
    const mercado = marketWhatsappLink("5519999999999");
    const consumidor = consumerWhatsappLink("5519999999999");
    expect(new URL(mercado!).pathname).toBe(new URL(consumidor!).pathname);
    expect(decodeURIComponent(new URL(mercado!).searchParams.get("text")!)).toBe(
      WHATSAPP_MARKET_MESSAGE,
    );
    expect(mercado).not.toBe(consumidor);
  });

  it("sem destino configurado não existe link", () => {
    expect(marketWhatsappLink(undefined)).toBeNull();
    expect(marketWhatsappLink("")).toBeNull();
    expect(marketWhatsappLink("meu-numero")).toBeNull();
  });
});

describe("CTA de mercado renderizado", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não renderiza nada enquanto o destino não estiver configurado", () => {
    expect(
      renderToString(createElement(MarketWhatsAppCta, { microcopy: "Conversa inicial." })),
    ).toBe("");
  });

  it("com destino injetado, entrega um único link para wa.me e a microcopy", () => {
    const html = renderToString(
      createElement(MarketWhatsAppCta, {
        microcopy: "Conversa inicial.",
        href: marketWhatsappLink("5519999999999"),
      }),
    );

    expect(html).toContain("Quero conhecer o piloto");
    expect(html).toContain("Conversa inicial.");
    expect(html.match(/https:\/\/wa\.me\//g) ?? []).toHaveLength(1);
    expect(html).toContain(encodeURIComponent(WHATSAPP_MARKET_MESSAGE));
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("btn-primary");
    expect(html).toContain("btn-touch-48");
  });
});

describe("CTA renderizado", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não renderiza nada enquanto o destino não estiver configurado", () => {
    expect(renderToString(createElement(WhatsAppCta))).toBe("");
  });

  it("com destino configurado, entrega um único link para wa.me", () => {
    vi.stubEnv("VITE_WHATSAPP_NUMBER", "5519999999999");
    const html = renderToString(createElement(WhatsAppCta));

    expect(html).toContain("Receber os Achados no WhatsApp");
    expect(html.match(/https:\/\/wa\.me\//g) ?? []).toHaveLength(1);
    expect(html).toContain("Quero%20receber%20os%20Achados%20de%20Artemis");
    expect(html).toContain("Só achados de Artemis, com preço e mercado. Sair quando quiser.");
    expect(html).toContain('rel="noopener noreferrer"');
    // Verde oficial da ação (btn-primary), não a variante verde-WhatsApp.
    expect(html).toContain("btn-primary");
  });
});

describe("nenhum telefone no código", () => {
  const fontes = [
    "src/lib/whatsapp.ts",
    "src/components/WhatsAppCta.tsx",
    "src/components/MarketWhatsAppCta.tsx",
    "src/routes/index.tsx",
    "src/routes/para-mercados.tsx",
  ];

  it("nenhum arquivo de produção carrega um número real", () => {
    for (const caminho of fontes) {
      const conteudo = readFileSync(join(process.cwd(), caminho), "utf-8");
      expect(conteudo, `${caminho} não deve conter número`).not.toMatch(/wa\.me\/\d/);
      expect(conteudo, `${caminho} não deve conter telefone`).not.toMatch(/\b55\d{10,11}\b/);
    }
  });

  it("o destino vem de configuração, não de constante", () => {
    const modulo = readFileSync(join(process.cwd(), "src", "lib", "whatsapp.ts"), "utf-8");
    expect(modulo).toContain("import.meta.env.VITE_WHATSAPP_NUMBER");
  });

  it("nenhum SDK, nenhuma automação de mensagens, nenhum Canal", () => {
    const componente = readFileSync(
      join(process.cwd(), "src", "components", "WhatsAppCta.tsx"),
      "utf-8",
    );
    expect(componente).not.toMatch(/whatsapp-web|twilio|graph\.facebook|business_management/i);
    expect(componente).not.toMatch(/chat\.whatsapp\.com/); // convite de Canal/grupo
    expect(componente).not.toMatch(/fetch\(|axios/);
  });
});
