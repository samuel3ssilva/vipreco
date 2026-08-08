// Alvo de toque de 48 px nos elementos interativos introduzidos ou alterados pela North Star
// v1.2.2 (checkpoint do PMO). Regressão estática, no mesmo espírito de
// `index.demo-source.test.ts`: o valor mora em duas camadas (a classe no componente e a
// definição em `styles.css`) e este teste amarra as duas, para que ninguém baixe o alvo mexendo
// só num lado.
//
// Elementos **pré-existentes** continuam no mínimo histórico de 44 px de `btn-base`/`btn-sm` —
// só sobem para 48 px quando forem tocados, no PR que os tocar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(join(process.cwd(), "src", "styles.css"), "utf-8");
const appShell = readFileSync(join(process.cwd(), "src", "components", "AppShell.tsx"), "utf-8");
const whatsappCta = readFileSync(
  join(process.cwd(), "src", "components", "WhatsAppCta.tsx"),
  "utf-8",
);

describe("alvo de toque de 48 px", () => {
  it("a utilitária btn-touch-48 vale 48 px (3rem)", () => {
    expect(styles).toMatch(/@utility btn-touch-48 \{\s*min-height: 3rem;\s*\}/);
  });

  it("btn-touch-48 é declarada depois de btn-base e btn-sm, para vencer o min-height delas", () => {
    const base = styles.indexOf("@utility btn-base");
    const sm = styles.indexOf("@utility btn-sm");
    const touch = styles.indexOf("@utility btn-touch-48");
    expect(base).toBeGreaterThan(-1);
    expect(sm).toBeGreaterThan(-1);
    expect(touch).toBeGreaterThan(sm);
    expect(touch).toBeGreaterThan(base);
  });

  it("os links da navegação do header têm 48 px de altura mínima", () => {
    expect(appShell).toContain("flex min-h-12 items-center rounded-md px-3 py-2");
    expect(appShell).not.toContain("min-h-11");
  });

  it('a pill "Tenho um mercado" tem 48 px de altura mínima', () => {
    const pill = appShell.slice(appShell.indexOf('to="/para-mercados"'));
    expect(pill.slice(0, 400)).toContain("btn-touch-48");
  });

  it("a barra inferior de navegação mantém 56 px", () => {
    expect(appShell).toContain("flex min-h-14 flex-col items-center");
  });

  it("o CTA do WhatsApp tem 48 px de altura mínima", () => {
    expect(whatsappCta).toContain("btn-touch-48");
  });

  it('o link "Buscar" do header mobile não existe mais — R3.3 o removeu', () => {
    // Ele foi a TERCEIRA forma de buscar no mesmo viewport de 390 px, ao lado do campo na
    // primeira dobra e da aba na barra inferior. O alvo de 48 px continua valendo para os dois
    // que ficaram; o teste mudou de "tem 48 px" para "não está lá" porque o controle sumiu.
    expect(appShell).not.toContain('aria-label="Buscar produto"');
    const abas = appShell.slice(appShell.indexOf("const NAV = ["), appShell.indexOf("] as const;"));
    expect(abas).toContain('label: "Buscar produto"');
    expect(appShell).toContain("min-h-14"); // a aba, no polegar
  });

  // A partir da Parte 2, todo controle interativo novo ou alterado nasce com 48 px. O varrimento
  // abaixo cobre os arquivos tocados: se um `btn-sm` entrar sem `btn-touch-48`, o alvo cai para
  // os 44 px históricos sem ninguém perceber.
  it("o CTA de mercado tem 48 px de altura mínima, no fluxo e na versão fixa", () => {
    for (const arquivo of ["MarketWhatsAppCta.tsx", "StickyCta.tsx"]) {
      const fonte = readFileSync(join(process.cwd(), "src", "components", arquivo), "utf-8");
      expect(fonte, arquivo).toContain("btn-touch-48");
    }
  });

  it("nenhum controle das telas da Parte 2 usa btn-sm sem o alvo de 48 px", () => {
    const arquivos = [
      // `AchadoCard.tsx` saiu da lista em R3.3B porque saiu do repositório: a lista da Home
      // passou a ser uma composição do Card v2 (`card-v2/compact.tsx`), cuja linha inteira é o
      // alvo e passa dos 88 px de altura — não há `btn-sm` nela para varrer.
      "HomeAchados.tsx",
      "HomeContexto.tsx",
      "TrustSection.tsx",
      "LocalStory.tsx",
      "ShareAchadoButton.tsx",
      // `StickyWhatsAppCta.tsx` saiu da lista em R3.3A porque saiu do repositório: a Home não
      // tem mais CTA fixo de WhatsApp. O `StickyCta` abaixo é o mecanismo, e continua em uso em
      // `/para-mercados`.
      "MarketWhatsAppCta.tsx",
      "StickyCta.tsx",
      "StickyMarketCta.tsx",
    ];
    for (const arquivo of arquivos) {
      const fonte = readFileSync(join(process.cwd(), "src", "components", arquivo), "utf-8");
      for (const classe of fonte.match(/className="[^"]*btn-sm[^"]*"/g) ?? []) {
        expect(classe, `${arquivo}: ${classe}`).toContain("btn-touch-48");
      }
    }
  });
});
