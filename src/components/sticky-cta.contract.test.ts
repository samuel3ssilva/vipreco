// Contrato do CTA fixo e do compartilhamento — o que não dá para provar só com a função pura.
// Regressão estática, no mesmo espírito de `touch-targets.test.ts`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function ler(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), ...caminho), "utf-8");
}

// O mecanismo (medição, faixa, espaçador, limpeza) e o convite do morador que o usa.
const fixo = ler("src", "components", "StickyCta.tsx");
const fixoMorador = ler("src", "components", "StickyWhatsAppCta.tsx");
const cta = ler("src", "components", "WhatsAppCta.tsx");
const compartilhar = ler("src", "components", "ShareAchadoButton.tsx");
const card = ler("src", "components", "AchadoCard.tsx");
const home = ler("src", "routes", "index.tsx");

describe("CTA fixo do mobile", () => {
  it("só existe no mobile e fica acima da barra de navegação", () => {
    expect(fixo).toContain("sm:hidden");
    expect(fixo).toContain("env(safe-area-inset-bottom");
    // A altura da barra virou parâmetro em 06/08/2026, para o shell B2B de `/para-mercados`,
    // que não tem barra nenhuma. O PADRÃO continua sendo os 56 px do `AppShell`, e o CTA do
    // morador não passa o parâmetro — então nada mudou para a Home.
    expect(fixo).toContain('alturaDaBarra = "3.5rem"');
    expect(fixo).toContain("calc(${alturaDaBarra} +");
    expect(fixoMorador).not.toContain("alturaDaBarra");
  });

  it("reserva espaço no fluxo para não cobrir o último conteúdo", () => {
    expect(fixo).toContain("RESERVA_INFERIOR");
    expect(fixo).toContain('aria-hidden="true"');
  });

  it("observa os CTAs equivalentes, sem depender de rolagem por pixel", () => {
    expect(fixo).toContain("IntersectionObserver");
    expect(fixo).toContain("document.querySelectorAll(`[${marcador}]`)");
    expect(fixo).toContain("observer.disconnect()");
  });

  it("usa exatamente o mesmo rótulo e o mesmo destino do CTA do fluxo", () => {
    expect(fixoMorador).toContain("WHATSAPP_CTA_LABEL");
    expect(fixoMorador).toContain("WHATSAPP_CTA_MARKER");
    expect(fixoMorador).toContain("consumerWhatsappLink()");
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
    for (const fonte of [fixo, fixoMorador, cta]) {
      expect(fonte).not.toMatch(/\b\d{10,15}\b/);
    }
  });
});

describe("nunca duas ações idênticas na mesma travessia de teclado", () => {
  it("a visibilidade do fixo é estado compartilhado, não estado privado do componente", () => {
    // Se voltar a ser `useState` local, o CTA do fluxo não tem como saber que precisa sair.
    expect(fixo).toContain("loja.set(");
    expect(fixo).not.toContain("setVisivel");
    expect(cta).toContain("useSyncExternalStore(");
  });

  it("o CTA do fluxo se apaga por inteiro enquanto o fixo está no ar", () => {
    expect(cta).toContain("hiddenCtaAttributes(duplicado)");
    expect(cta).toContain("{...container}");
    expect(cta).toContain("{...link}");
  });

  it("o fixo só assume o comando na faixa em que ele de fato aparece", () => {
    // No desktop o botão está oculto por `sm:hidden`. Sem esta guarda, o CTA do fluxo sairia da
    // ordem de foco sem nada para substituí-lo.
    expect(fixo).toContain("FAIXA_DO_CTA_FIXO");
    expect(fixo).toContain("(max-width: 639.98px)");
    expect(fixo).toContain("faixa.matches &&");
  });

  it("remede em rolagem, redimensionamento, rotação e mudança de faixa", () => {
    for (const gatilho of ["scroll", "resize", "orientationchange"]) {
      expect(fixo, `falta o gatilho "${gatilho}"`).toContain(
        `window.addEventListener("${gatilho}", medir`,
      );
      expect(fixo, `"${gatilho}" fica pendurado`).toContain(
        `window.removeEventListener("${gatilho}", medir)`,
      );
    }
    expect(fixo).toContain('faixa.addEventListener("change", medir)');
    expect(fixo).toContain('faixa.removeEventListener("change", medir)');
  });

  it("ao sair da página, devolve o comando ao CTA do fluxo", () => {
    const limpeza = fixo.slice(fixo.indexOf("observer.disconnect()"));
    expect(limpeza).toContain("loja.set(false)");
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
