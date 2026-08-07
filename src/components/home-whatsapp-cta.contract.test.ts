// Contrato do convite de WhatsApp da Home e do compartilhamento do Achado.
//
// =============================================================================
// ESTE ARQUIVO ERA `sticky-cta.contract.test.ts`, E O QUE ELE PROVAVA DEIXOU DE EXISTIR
// =============================================================================
//
// Até R3.3 a Home tinha DOIS convites de WhatsApp: um no fluxo da página e um fixo, colado no
// rodapé desde a primeira dobra. A metade maior deste arquivo existia por causa disso — provava
// a máquina de anti-duplicação (loja compartilhada, marcador no DOM, `IntersectionObserver`,
// `inert` no convite do fluxo) que impedia os dois de aparecerem juntos para o teclado e para o
// leitor de tela.
//
// R3.3A removeu o CTA fixo da Home. O convite passou a ser um só, inline, depois dos Achados —
// e o problema que a máquina resolvia deixou de existir aqui. O mecanismo continua íntegro e
// testado em `sticky-market-cta.contract.test.ts`, que é onde ele ainda roda: `/para-mercados`
// tem CTA fixo, e lá a duplicação é real.
//
// O que este arquivo prova agora é o inverso do que provava: que a Home tem **um** convite, que
// ele **não** é fixo, e que ele continua falhando fechado sem destino configurado.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function ler(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), ...caminho), "utf-8");
}

/**
 * O código, sem os comentários. As proibições abaixo são sobre o que o componente FAZ, e um
 * arquivo que explica por escrito qual mecanismo ele deixou de usar cita o nome do mecanismo —
 * o que reprovaria uma busca ingênua por texto. A explicação é a parte que mais importa manter.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const cta = ler("src", "components", "WhatsAppCta.tsx");
const ctaCodigo = semComentarios(cta);
const compartilhar = ler("src", "components", "ShareAchadoButton.tsx");
const card = ler("src", "components", "AchadoCard.tsx");
const home = ler("src", "routes", "index.tsx");

describe("um convite de WhatsApp na Home, e um só", () => {
  it("a Home monta o CTA do fluxo exatamente uma vez", () => {
    expect(home.match(/<WhatsAppCta\s*\/>/g) ?? []).toHaveLength(1);
  });

  it("nenhum CTA fixo de WhatsApp na Home", () => {
    // Nem o componente, nem o mecanismo, nem a loja que o alimentava.
    expect(home).not.toContain("StickyWhatsAppCta");
    expect(home).not.toContain("StickyCta");
    expect(home).not.toContain("consumerCtaStore");
    expect(ctaCodigo).not.toContain("StickyCta");
  });

  it("o convite não flutua: nada de `fixed`, `sticky` ou área segura no CTA", () => {
    for (const proibido of ["fixed", "sticky", "safe-area-inset", "z-40", "z-50"]) {
      expect(ctaCodigo, `o CTA do WhatsApp não pode conter "${proibido}"`).not.toContain(proibido);
    }
  });

  it("o convite vem DEPOIS dos Achados — opt-in não se pede antes de entregar nada", () => {
    const achados = home.indexOf("<HomeAchados");
    const convite = home.indexOf("<WhatsAppCta");
    expect(achados).toBeGreaterThan(-1);
    expect(convite).toBeGreaterThan(achados);
  });

  it("o rótulo nomeia o bairro e a microcopy diz como sair", () => {
    expect(cta).toContain(
      'export const WHATSAPP_CTA_LABEL = "Receber Achados de Artemis no WhatsApp"',
    );
    expect(cta).toContain("Só achados de Artemis. Você pode sair quando quiser.");
  });

  it("sem a máquina de anti-duplicação, que não tem mais o que resolver aqui", () => {
    for (const proibido of [
      "useSyncExternalStore",
      "hiddenCtaAttributes",
      "WHATSAPP_CTA_MARKER",
      "IntersectionObserver",
    ]) {
      expect(ctaCodigo, `sobrou "${proibido}" no CTA da Home`).not.toContain(proibido);
    }
  });

  it("tem 48 px de alvo de toque e usa o verde oficial da ação", () => {
    expect(cta).toContain("btn-touch-48");
    expect(cta).toContain("btn-primary");
    expect(cta).not.toMatch(/#25d366/i);
  });

  it("falha fechado: sem destino configurado, nada é renderizado", () => {
    expect(cta).toContain("if (!href) return null;");
  });

  it("não carrega nenhum número escrito no código", () => {
    expect(cta).not.toMatch(/\b\d{10,15}\b/);
  });

  it("abre em aba nova sem entregar a referência da janela", () => {
    expect(cta).toContain('rel="noopener noreferrer"');
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
