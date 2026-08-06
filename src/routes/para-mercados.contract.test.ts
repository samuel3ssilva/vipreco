// Contrato da proposta para mercados (Parte 3) — o que o HTML renderizado não prova sozinho:
// o que a rota **não** importa, o que ela **não** consulta e os alvos de toque que dependem de
// duas camadas (a classe no componente e a definição em `src/styles.css`). Mesmo espírito de
// `sticky-cta.contract.test.ts` e `touch-targets.test.ts`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compararComMain } from "@/test-support/git-guard";

function ler(...caminho: string[]): string {
  return readFileSync(join(process.cwd(), ...caminho), "utf-8");
}

const rota = ler("src", "routes", "para-mercados.tsx");
const cta = ler("src", "components", "MarketWhatsAppCta.tsx");
const fixo = ler("src", "components", "StickyMarketCta.tsx");
const shell = ler("src", "components", "AppShell.tsx");
const shellB2B = ler("src", "components", "MarketShell.tsx");

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
    for (const fonte of [rota, cta, fixo]) {
      expect(fonte).not.toMatch(/\bfetch\s*\(|\baxios\b|XMLHttpRequest/);
    }
  });

  it("não grava nada no aparelho de quem visita", () => {
    for (const fonte of [rota, cta, fixo]) {
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
    for (const fonte of [rota, cta, fixo]) {
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

  it("a âncora não para o título atrás do header fixo", () => {
    expect(rota).toContain("scroll-mt-20");
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

/**
 * A ROTA B2B NÃO É UMA ABA DO APP DO CONSUMIDOR.
 *
 * O Gate visual de 06/08/2026 mostrou a captura com uma barra inferior de quatro abas
 * (Achados · Buscar · Ajuda · Mercados) encostada no polegar, e a aba "Mercados" marcada como
 * a página atual. Um dono de mercado lê isso como "entrei no aplicativo do consumidor".
 *
 * O contrato aprovado diz o contrário, com todas as letras: rota separada, **nunca** aba do
 * app B2C (`NORTH-STAR-V2-ASSESSMENT.md` §3, item 5). Estes testes são o que impede a volta.
 */
describe("o shell B2B é separado do app do consumidor", () => {
  it("a rota usa MarketShell, e não o AppShell", () => {
    expect(rota).toContain('import { MarketShell } from "@/components/MarketShell"');
    expect(rota).toContain("<MarketShell>");
    expect(rota).not.toContain("AppShell");
  });

  it("o shell B2B não tem barra inferior nenhuma", () => {
    // `fixed … bottom-0` é a assinatura da barra do AppShell. Nenhuma variação dela entra aqui.
    expect(shellB2B).not.toContain("bottom-0");
    expect(shellB2B).not.toContain("inset-x-0");
    // E nenhuma lista de abas: a barra do AppShell é um `NAV.map` dentro de um `<ul>`.
    expect(shellB2B).not.toContain("NAV");
    expect(shellB2B).not.toContain("<ul");
  });

  it("o shell B2B não oferece nenhuma aba do consumidor", () => {
    for (const aba of ["Achados", "Buscar", "Ajuda", "Mercados", "Como funciona"]) {
      expect(shellB2B, `o shell B2B oferece a aba "${aba}"`).not.toContain(`>${aba}<`);
    }
    // O botão principal "Buscar" do cabeçalho mobile também não vem junto.
    expect(shellB2B).not.toContain('to="/buscar"');
    expect(shellB2B).not.toContain("btn-primary");
  });

  it("o shell B2B tem marca, conteúdo, link discreto para o morador e rodapé", () => {
    expect(shellB2B).toContain("vipreco-simbolo.svg");
    expect(shellB2B).toContain('id="conteudo"');
    expect(shellB2B).toContain("<footer");
    expect(shellB2B).toContain("Ver a experiência do morador");
    // Discreto quer dizer texto, e não botão: um link no rodapé, não uma aba no polegar.
    const rodape = shellB2B.slice(shellB2B.indexOf("<footer"));
    expect(rodape).toContain("underline");
    expect(rodape).not.toContain("btn-base");
  });

  it("o shell B2B mantém a rota acessível pelo teclado desde o primeiro Tab", () => {
    expect(shellB2B).toContain('href="#conteudo"');
    expect(shellB2B).toContain("Pular para o conteúdo");
    // O banner de ambiente de teste continua: é a primeira coisa que diz que isto não é a
    // versão pública, e a decisão do Founder de tirar a frase do hero conta com ele.
    expect(shellB2B).toContain("StagingBanner");
  });

  it("o shell B2B não introduziu nenhuma cor nova", () => {
    // A marca usa um par tipografia+cor que já existe no AppShell, com a mesma justificativa
    // de contraste. Qualquer hex que apareça aqui e não lá seria valor solto fora dos tokens.
    const hex = (fonte: string) => new Set(fonte.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []);
    for (const cor of hex(shellB2B)) {
      expect(hex(shell), `${cor} não existe no AppShell — é cor nova`).toContain(cor);
    }
  });
});

/**
 * O guarda de `git`, e não inspeção de texto.
 *
 * O mandato exige que Home, busca, comparação e ranking fiquem inalterados. Uma lista de
 * `expect(fonte).toContain(...)` provaria que certas frases sobreviveram; `git diff` contra
 * `origin/main` prova que o arquivo inteiro é o mesmo. E quando a comparação é impossível o
 * guarda **lança**, em vez de responder "intacto" sem ter medido.
 */
describe("as rotas do consumidor não foram tocadas", () => {
  it.each([
    "src/routes/index.tsx",
    "src/routes/buscar.tsx",
    "src/routes/produto.$productId.tsx",
    "src/components/AppShell.tsx",
    "src/components/AchadoCard.tsx",
    "src/components/PriceCard.tsx",
    "src/components/PriceSummary.tsx",
    "src/lib/comparison.ts",
  ])("%s continua idêntico à main", (caminho) => {
    expect(compararComMain(caminho), `${caminho} mudou nesta branch`).toBe("intacto");
  });
});

describe("navegação sem circularidade", () => {
  it("a pill do header do AppShell continua sabendo de /para-mercados", () => {
    // Redundância deliberada. Desde que a rota ganhou shell próprio, este ramo do AppShell
    // não tem como ser alcançado por ela — mas o AppShell NÃO FOI TOCADO, de propósito:
    // mexer nele para remover um ramo agora ocioso quebraria a garantia de que a Home sai
    // byte a byte igual à da main, que é justamente o que o Gate precisa.
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

describe("o exemplo fictício não pode mostrar uma oferta que o produto esconderia", () => {
  /**
   * ESTE TESTE FOI FEITO PARA FICAR VERMELHO UM DIA, E ISSO É O DESENHO.
   *
   * O card vitrine da página tem data absoluta de observação e de validade. Em 06/08/2026 ele
   * dizia "válido até 05/08/2026": a página que apresenta o produto a um lojista exibia uma
   * oferta VENCIDA — exatamente o estado que `isValidPrice()` esconde no produto de verdade.
   *
   * A defesa da data absoluta continua correta contra o "ontem" congelado, que erra no dia
   * seguinte. O que faltava era o alarme: sem ele, a data apodrece em silêncio e ninguém olha.
   *
   * A contrapartida é real e está assumida: em algum momento este teste reprova um PR que não
   * tem nada a ver com ele. É o preço de a alternativa ser pior — uma proposta comercial que
   * mostra, para uma pessoa de verdade, um estado que o produto nunca mostraria. O conserto
   * está na mensagem da falha, e leva um minuto.
   */
  const datas = (nome: string) => {
    const achado = new RegExp(`${nome}: "([^"]+)"`).exec(rota);
    expect(achado, `não achei ${nome} no fixture do exemplo`).not.toBeNull();
    return new Date(achado![1]);
  };

  it("a validade do exemplo está no futuro", () => {
    const validoAte = datas("validoAte");
    expect(
      validoAte.getTime(),
      "O exemplo da página está VENCIDO. Empurre `observadoEm` e `validoAte` em " +
        "`src/routes/para-mercados.tsx` para datas à frente de hoje — o card vitrine não pode " +
        "exibir um estado que `isValidPrice()` esconderia no produto.",
    ).toBeGreaterThan(Date.now());
  });

  it("a observação do exemplo é anterior à validade", () => {
    // Uma oferta observada depois de vencer não é um caso raro: é dado impossível.
    expect(datas("observadoEm").getTime()).toBeLessThan(datas("validoAte").getTime());
  });
});
