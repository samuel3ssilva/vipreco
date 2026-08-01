// Contrato da proposta para mercados (Parte 3) — o que o HTML renderizado não prova sozinho:
// o que a rota **não** importa, o que ela **não** consulta e os alvos de toque que dependem de
// duas camadas (a classe no componente e a definição em `src/styles.css`). Mesmo espírito de
// `sticky-cta.contract.test.ts` e `touch-targets.test.ts`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function ler(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), ...caminho), "utf-8");
}

const rota = ler("src", "routes", "para-mercados.tsx");
const cta = ler("src", "components", "MarketWhatsAppCta.tsx");
const shell = ler("src", "components", "AppShell.tsx");

describe("a página não consulta nada", () => {
  it("a rota não tem loader — nada é buscado para renderizá-la", () => {
    expect(rota).not.toMatch(/\bloader\s*:/);
  });

  it("não importa serviço de dados, cliente do Supabase nem TanStack Query", () => {
    expect(rota).not.toMatch(/@\/services\//);
    expect(rota).not.toMatch(/@\/integrations\/supabase/);
    expect(rota).not.toMatch(/useQuery|QueryClient/);
    expect(cta).not.toMatch(/@\/services\/|@\/integrations\/supabase|useQuery/);
  });

  it("não faz requisição nenhuma por conta própria", () => {
    for (const fonte of [rota, cta]) {
      expect(fonte).not.toMatch(/\bfetch\s*\(|\baxios\b|XMLHttpRequest/);
    }
  });

  it("não grava nada no aparelho de quem visita", () => {
    for (const fonte of [rota, cta]) {
      expect(fonte).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    }
  });
});

describe("nenhum dado de contato coletado", () => {
  it("não existe formulário, campo, máscara de telefone ou envio", () => {
    expect(rota).not.toMatch(/<form\b|<input\b|<textarea\b|<select\b/);
    expect(rota).not.toMatch(/react-hook-form|zodResolver|onSubmit/);
  });

  it("o convite é um link wa.me, não uma automação", () => {
    expect(cta).toContain("marketWhatsappLink()");
    expect(cta).not.toMatch(/chat\.whatsapp\.com/);
    expect(cta).not.toMatch(/graph\.facebook|business_management|twilio|whatsapp-web/i);
  });

  it("falha fechado: sem destino configurado, nada é renderizado", () => {
    expect(cta).toContain("if (!href) return null;");
  });

  it("nenhum número de telefone escrito no código", () => {
    for (const fonte of [rota, cta]) {
      expect(fonte).not.toMatch(/wa\.me\/\d/);
      expect(fonte).not.toMatch(/\b\d{10,15}\b/);
    }
  });
});

describe("alvo de toque e link externo", () => {
  it("todo controle da página nasce com 48 px", () => {
    for (const classe of rota.match(/className="[^"]*btn-base[^"]*"/g) ?? []) {
      expect(classe, `sem alvo de 48 px: ${classe}`).toContain("btn-touch-48");
    }
    expect(cta).toContain("btn-touch-48");
  });

  it("o link que sai do site abre em outra aba, sem entregar a página de origem", () => {
    expect(cta).toContain('target="_blank"');
    expect(cta).toContain('rel="noopener noreferrer"');
  });

  it("o link externo é anunciado como tal para quem usa leitor de tela", () => {
    expect(cta).toContain("(abre o WhatsApp)");
  });

  it("a âncora interna leva o foco junto, não só a rolagem", () => {
    expect(rota).toContain('href="#como-funciona"');
    expect(rota).toContain('id="como-funciona"');
    expect(rota).toContain("tabIndex={-1}");
  });
});

describe("hierarquia de títulos", () => {
  it("um h1 só, e nenhum h3 fora das dúvidas frequentes", () => {
    expect(rota.match(/<h1\b/g) ?? []).toHaveLength(1);
    // O único `h3` da rota é o da pergunta, dentro do bloco de dúvidas.
    expect(rota.match(/<h3\b/g) ?? []).toHaveLength(1);
    const duvidas = rota.slice(rota.indexOf("DUVIDAS.map"));
    expect(duvidas).toContain("<h3");
  });

  it("cada seção é anunciada pelo próprio título", () => {
    const seccoes = rota.match(/aria-labelledby="([^"]+)"/g) ?? [];
    expect(seccoes.length).toBeGreaterThanOrEqual(7);
    for (const attr of seccoes) {
      const id = attr.replace(/aria-labelledby="|"/g, "");
      expect(rota, `nenhum título com id="${id}"`).toContain(`id="${id}"`);
    }
  });
});

describe("navegação sem circularidade", () => {
  it("a pill do header some quando já se está em /para-mercados", () => {
    expect(shell).toContain('state.location.pathname === "/para-mercados"');
    expect(shell).toContain("naPaginaDeMercados ? null : (");
  });

  it("o caminho de volta para os Achados existe na própria página", () => {
    expect(rota).toContain('<Link to="/"');
    expect(rota).toContain("Ver os Achados de Artemis");
  });
});

describe("visual dentro do sistema já aprovado", () => {
  it("usa os tokens do produto, sem cor solta no arquivo", () => {
    expect(rota).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(cta).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("não usa o amarelo de contribuição para promoção nem para urgência", () => {
    expect(rota).not.toMatch(/--vp-yellow|--vp-contribute|bg-caution|text-warning/);
  });

  it("não entra com animação nem cria movimento novo", () => {
    expect(rota).not.toMatch(/animate-|transition-/);
  });
});
