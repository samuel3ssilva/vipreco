// Contrato do CTA fixo e do compartilhamento — o que não dá para provar só com a função pura.
// Regressão estática, no mesmo espírito de `touch-targets.test.ts`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function ler(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), ...caminho), "utf-8");
}

const fixo = ler("src", "components", "StickyWhatsAppCta.tsx");
const cta = ler("src", "components", "WhatsAppCta.tsx");
const compartilhar = ler("src", "components", "ShareAchadoButton.tsx");
const card = ler("src", "components", "AchadoCard.tsx");
const home = ler("src", "routes", "index.tsx");

describe("CTA fixo do mobile", () => {
  it("só existe no mobile e fica acima da barra de navegação", () => {
    expect(fixo).toContain("sm:hidden");
    expect(fixo).toContain("env(safe-area-inset-bottom");
    expect(fixo).toContain("calc(3.5rem +");
  });

  it("reserva espaço no fluxo para não cobrir o último conteúdo", () => {
    expect(fixo).toContain("RESERVA_INFERIOR");
    expect(fixo).toContain('aria-hidden="true"');
  });

  it("observa os CTAs equivalentes, sem depender de rolagem por pixel", () => {
    expect(fixo).toContain("IntersectionObserver");
    expect(fixo).toContain("WHATSAPP_CTA_MARKER");
    expect(fixo).toContain("observer.disconnect()");
  });

  it("usa exatamente o mesmo rótulo e o mesmo destino do CTA do fluxo", () => {
    expect(fixo).toContain("WHATSAPP_CTA_LABEL");
    expect(fixo).toContain("consumerWhatsappLink()");
    expect(cta).toContain('export const WHATSAPP_CTA_LABEL = "Receber os Achados no WhatsApp"');
  });

  it("usa o verde oficial da ação, nunca o verde nativo do WhatsApp", () => {
    expect(fixo).toContain("btn-primary");
    expect(fixo).not.toMatch(/#25d366/i);
    expect(cta).not.toMatch(/#25d366/i);
  });

  it("não entra com animação", () => {
    expect(fixo).not.toContain("animate-");
    expect(fixo).not.toContain("transition-");
  });

  it("falha fechado: sem destino configurado, nada é renderizado", () => {
    expect(fixo).toContain("if (!href || !montado) return null;");
  });

  it("não carrega nenhum número escrito no código", () => {
    expect(fixo).not.toMatch(/\b\d{10,15}\b/);
    expect(cta).not.toMatch(/\b\d{10,15}\b/);
  });
});

describe("compartilhamento do Achado", () => {
  it("só aparece no card de destaque", () => {
    expect(card).toContain("{destaque ? shareSlot : null}");
  });

  it("a Home passa a ação de compartilhar apenas para o primeiro Achado", () => {
    expect(home).toContain("const [destaque] = validOpportunities;");
    expect(home).toContain("<ShareAchadoButton");
    expect(home.match(/<ShareAchadoButton/g) ?? []).toHaveLength(1);
  });

  it("tenta Web Share, depois WhatsApp, depois copiar — sem SDK", () => {
    expect(compartilhar).toContain("navigator.share");
    expect(compartilhar).toContain("navigator.clipboard");
    expect(compartilhar).toContain("openWhatsapp");
    expect(compartilhar).not.toContain("script");
    expect(compartilhar).not.toContain("sdk");
  });

  it("anuncia o resultado sem interromper quem usa leitor de tela", () => {
    expect(compartilhar).toContain('aria-live="polite"');
    expect(compartilhar).not.toContain('role="alert"');
  });
});
