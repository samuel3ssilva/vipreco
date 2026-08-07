// Prova de que o conteúdo da Home chega no HTML renderizado no servidor, antes de qualquer
// hidratação: o router é montado em memória, o loader da rota "/" é executado e a árvore é
// renderizada com `renderToString` (nenhum navegador, nenhum JavaScript de cliente envolvido).
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";
import { beforeAll, describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";

async function renderRoute(path: string): Promise<string> {
  const router = createRouter({
    routeTree,
    context: { queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return renderToString(createElement(RouterProvider, { router }));
}

let html = "";

beforeAll(async () => {
  html = await renderRoute("/");
});

describe("HTML inicial da Home (SSR)", () => {
  it("contém os três produtos e mercados do fixture antes da hidratação", () => {
    const fixture = buildDemoOpportunities();
    expect(fixture).toHaveLength(3);
    for (const entry of fixture) {
      expect(html).toContain(entry.product.name);
      expect(html).toContain(entry.market.name);
    }
  });

  it("contém os três preços do fixture antes da hidratação", () => {
    for (const entry of buildDemoOpportunities()) {
      expect(html).toContain(entry.price.toFixed(2).replace(".", ","));
    }
  });

  it("mantém os links de cada Achado para a página do produto", () => {
    for (const entry of buildDemoOpportunities()) {
      expect(html).toContain(`href="/produto/${entry.product.id}"`);
    }
  });

  it("não tem nenhum carregamento visível", () => {
    expect(html).not.toContain("Carregando");
    expect(html).not.toContain("Estamos começando a mapear preços");
    expect(html).not.toContain("Não conseguimos carregar as oportunidades");
    expect(html).not.toContain("Não conseguimos carregar a lista de mercados");
  });

  it("abre com a faixa de ambiente, antes de qualquer outro conteúdo", () => {
    expect(html).toContain("AMBIENTE DE TESTE");
    expect(html).toContain("esta não é a versão pública do ViPreço");
    expect(html.indexOf("AMBIENTE DE TESTE")).toBeLessThan(
      html.indexOf("Você está vendo ofertas de Artemis"),
    );
  });

  it("marca os Achados com o selo de dados fictícios", () => {
    expect(html).toContain("dados fictícios · exemplos para demonstrar o formato");
    expect(html).toContain("dados fictícios · exemplos para demonstrar o formato");
  });

  it("não repete o aviso de ambiente dentro da página — a faixa é o único lugar", () => {
    expect(html).not.toContain("Ambiente de teste com preços fictícios");
  });

  it("traz a navegação 'Achados' e a entrada de mercado no header", () => {
    expect(html).toContain(">Achados<");
    expect(html).toContain("Tenho um mercado");
    expect(html).not.toContain(">Início<");
  });

  it("não contém copy operacional do piloto (guardrails da North Star)", () => {
    for (const termo of ["Mande a oferta", "resumo semanal", "Achado de hoje", "cashback"]) {
      expect(html, `HTML inicial não deve conter "${termo}"`).not.toContain(termo);
    }
  });

  it("sem destino de WhatsApp configurado, nenhum CTA e nenhum link quebrado", () => {
    // O ambiente de teste não define VITE_WHATSAPP_NUMBER — é exatamente o estado de staging
    // enquanto o número real não for cadastrado.
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("Receber os Achados no WhatsApp");
  });

  it("não apresenta nenhum mercado real como participante", () => {
    for (const entry of buildDemoOpportunities()) {
      expect(entry.market.name).toMatch(/^Mercado (principal|local \d)$/);
    }
  });
});

describe("primeira dobra e ordem da Home (North Star v1.2.2)", () => {
  it("abre com o contexto: eyebrow → H1 → o que estes preços são", () => {
    const eyebrow = html.indexOf("Artemis · Piracicaba, SP");
    const h1 = html.indexOf("Você está vendo ofertas de Artemis");
    const subtexto = html.indexOf("Preços observados nos mercados monitorados do bairro");
    expect(eyebrow).toBeGreaterThan(-1);
    expect(h1).toBeGreaterThan(eyebrow);
    expect(subtexto).toBeGreaterThan(h1);
  });

  it("R3.3 INVERTEU: a busca vem ANTES dos Achados", () => {
    // Decisão D2 (MVP-E2-02, MVP-DESIGN-05). A comparação é o núcleo e a busca é a porta dela;
    // quem já sabe o que procura não deveria rolar por uma vitrine antes de poder perguntar.
    // Achados continuam logo abaixo — são descoberta, não a única forma de chegar ao produto.
    const busca = html.indexOf("Procurando um produto específico?");
    const primeiroAchado = html.indexOf("Achados</h2>");
    expect(busca).toBeGreaterThan(-1);
    expect(primeiroAchado).toBeGreaterThan(busca);
  });

  it("a ordem do DOM é a ordem visual: contexto, busca, Achados, outros", () => {
    // Teclado e leitor de tela seguem o DOM. No alvo primário — mobile — ele precisa bater com
    // o que o olho vê, senão o foco pula do topo para o rodapé da seção e volta.
    const h1 = html.indexOf("Você está vendo ofertas de Artemis");
    const busca = html.indexOf("Procurando um produto específico?");
    const primeiroAchado = html.indexOf("Achados</h2>");
    const outros = html.indexOf("Outros Achados");
    expect(busca).toBeGreaterThan(h1);
    expect(primeiroAchado).toBeGreaterThan(busca);
    expect(outros).toBeGreaterThan(primeiroAchado);
  });

  it("o destaque usa o Card v2 e os secundários continuam compactos", () => {
    // O Card v2 é a unidade de produto exato, aprovada em R3.2. Numa lista ele vira textura —
    // 400 px de CSS por card, medidos lá. Por isso o destaque é dele e a lista não é.
    expect(html).toContain("Outros Achados");
    expect(html.match(/text-\[1\.625rem\]/g) ?? []).toHaveLength(2);
  });

  it("segue a ordem completa: contexto, busca, Achados, procedência, piloto", () => {
    const posicoes = [
      "Você está vendo ofertas de Artemis",
      "Procurando um produto específico?",
      "Outros Achados",
      "Preço com procedência",
      "Feito para começar por Artemis",
    ].map((trecho) => {
      const posicao = html.indexOf(trecho);
      expect(posicao, `"${trecho}" precisa estar no HTML inicial`).toBeGreaterThan(-1);
      return posicao;
    });
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
  });

  it("em DEMO, diz que os preços são fictícios e o que muda no piloto", () => {
    expect(html).toContain(
      "Nesta demonstração, os preços são fictícios. No piloto, cada preço será publicado com origem identificada.",
    );
  });

  it("fala do piloto sem expor nenhuma pessoa", () => {
    expect(html).toContain("Estamos testando com poucos mercados e produtos antes de ampliar.");
    for (const termo of ["Samuel", "fundador", "minha mãe", "moradores", "mercados participando"]) {
      expect(html, `o bloco do piloto não deve conter "${termo}"`).not.toContain(termo);
    }
  });

  it("não promete disponibilidade em tempo real em lugar nenhum", () => {
    for (const termo of ["Achados de hoje", "atualizado às", "publicado agora", "em tempo real"]) {
      expect(html, `HTML inicial não deve conter "${termo}"`).not.toContain(termo);
    }
  });
});

/**
 * R3.3A — a remediação visual menor, verificada no HTML de verdade.
 *
 * Cada item aqui corresponde a um dos cinco pedidos do Founder, e todos são medidos no mesmo
 * `html` que a Home renderiza no servidor — não no código-fonte. O que o teste estático de
 * `index.demo-source.test.ts` prova é que o componente não está importado; o que estes provam é
 * que o **texto não chega ao usuário**, que é a garantia que interessa.
 */
describe("R3.3A — o que a Home deixou de mostrar", () => {
  it("nenhum seletor de mercado habitual", () => {
    expect(html).not.toContain("Seu mercado habitual");
    expect(html).not.toContain("Remover mercado habitual");
    expect(html).not.toContain("mercado habitual");
  });

  it("nenhum CTA fixo de WhatsApp — e no ambiente de teste, nenhum CTA de WhatsApp", () => {
    // Sem `VITE_WHATSAPP_NUMBER`, o convite inline falha fechado e não é renderizado. Isso não
    // enfraquece a prova de "um só": a contagem estática está em `index.demo-source.test.ts`.
    // O que este teste garante é que nada FIXO sobrou no HTML inicial.
    expect(html).not.toContain("wa.me");
    expect(html).not.toContain("safe-area-inset-bottom");
    expect(html.match(/class="[^"]*\bfixed\b[^"]*"/g) ?? []).toHaveLength(1); // só a barra de abas
  });

  it("o bloco de procedência é compacto: título, uma frase e uma porta", () => {
    expect(html).toContain("Preço com procedência");
    expect(html).toContain("Cada preço mostra mercado, fonte, atualização e validade.");
    expect(html).toContain("Entender como funciona");
    // Os quatro cartões de atributo e as três regras saíram para `/como-funciona`.
    expect(html).not.toContain("Nenhum preço aparece sozinho");
    expect(html).not.toContain("Onde o preço foi visto.");
    expect(html).not.toContain("De onde veio a informação.");
    expect(html).not.toContain("Você compra na loja");
    expect(html).not.toContain("A ordem não é vendida");
  });

  it("o bloco do piloto é compacto e não duplica a entrada B2B da Home", () => {
    expect(html).toContain("Feito para começar por Artemis");
    expect(html).toContain("Como funciona o piloto");
    expect(html).not.toContain("Começou em Artemis");
    expect(html).not.toContain("Tem um mercado no bairro?");
    expect(html).not.toContain("Conhecer a proposta");
  });

  it("exatamente duas abas de consumidor, e as mesmas nas duas barras", () => {
    // "Achados" e "Buscar". `Ajuda` e `Mercados` vivem no rodapé desde R3.3 — aba declara
    // "esta é uma das coisas principais que você faz aqui", e há duas.
    const barraInferior = html.slice(html.indexOf("data-barra-inferior"));
    expect(barraInferior.match(/<a\b/g) ?? []).toHaveLength(2);
    const cabecalho = html.slice(
      html.indexOf('aria-label="Navegação principal do cabeçalho"'),
      html.indexOf("</nav>"),
    );
    expect(cabecalho.match(/<a\b/g) ?? []).toHaveLength(2);
  });

  it("as três regras de confiança continuam públicas — em /como-funciona", async () => {
    // A neutralidade do ranking é princípio inviolável, não copy de apoio. Encolher a Home só
    // foi possível porque o texto passou a existir do outro lado; este teste amarra as duas
    // pontas para que a redução não vire remoção silenciosa numa próxima rodada.
    const comoFunciona = await renderRoute("/como-funciona");
    expect(comoFunciona).toContain("O que o ViPreço não faz");
    expect(comoFunciona).toContain("Você compra na loja");
    expect(comoFunciona).toContain("O estoque é do mercado");
    expect(comoFunciona).toContain("A ordem não é vendida");
  });
});

// A anatomia é verificada no HTML de verdade, com o fixture de verdade — não em classes CSS.
// O fixture cobre naturalmente a matriz que importa:
//   Arroz  store_list    validade sim   preço anterior sim   gôndola não
//   Café   social_media  validade sim   preço anterior não   gôndola não
//   Leite  weekly_audit  validade não   preço anterior não   gôndola sim
describe("anatomia do card oficial de Achado", () => {
  const [arroz, cafe, leite] = buildDemoOpportunities();

  it("mostra produto e embalagem em campos separados", () => {
    // O DESTAQUE usa o Card v2, que separa nome, marca e variante — deixaram de ser um título
    // concatenado (CARD-V2-SPEC itens 2, 3 e 4). Os secundários seguem no card compacto, que
    // concatena. É por isso que "Arroz Camil Tipo 1" some daqui e "Café Pilão Tradicional" fica.
    expect(html).toContain("Arroz");
    expect(html).toContain("Camil");
    expect(html).toContain("5 kg");
    expect(html).toContain("Café Pilão Tradicional");
    expect(html).toContain("500 g");
  });

  it("compõe o preço com o símbolo menor que o valor", () => {
    expect(html).toContain(">R$</span>");
    expect(html).toContain(">26,49</span>");
  });

  it("oferece o preço por extenso a quem usa leitor de tela", () => {
    expect(html).toContain("26 reais e 49 centavos");
    expect(html).toContain("5 reais e 29 centavos");
  });

  it("mostra o mercado junto da localidade do piloto", () => {
    expect(html).toContain("Mercado local 3");
    expect(html).toContain("· Artemis");
  });

  it("traz a linha de procedência com data e origem", () => {
    // Os secundários usam o card compacto, que escreve a origem em minúscula na linha mono.
    expect(html).toContain("verificado em pesquisa");
    // O DESTAQUE usa o Card v2, que a escreve num selo, com maiúscula inicial. Duas grafias da
    // mesma informação porque são duas composições — não porque alguém esqueceu de padronizar.
    expect(html).toContain("Informado pelo mercado");
    expect(html).toContain("observado em 05/08/2026");
  });

  it("mostra validade só quando o mercado informou", () => {
    expect(arroz.valid_until).not.toBeNull();
    expect(leite.valid_until).toBeNull();
    // Duas validades informadas no fixture, dois chips — nem um a mais.
    expect(html.match(/válido até/g) ?? []).toHaveLength(2);
  });

  it("não mostra preço anterior em Achado nenhum, e nem carrega o dado", () => {
    // O card exibia "antes R$ 29,90". DL-030 tirou isso do Card v2 em 06/08/2026 e a Home
    // continuou exibindo, porque o caminho estava protegido naquela branch. R3.3 fecha.
    for (const entry of [arroz, cafe, leite]) {
      expect(entry).not.toHaveProperty("previous_price");
    }
    expect(html).not.toContain("antes <s>");
    expect(html).not.toMatch(/antes\s*R\$/);
    expect(html).not.toContain("29,90");
  });

  it("só afirma gôndola observada na origem que de fato observou a gôndola", () => {
    expect(leite.source_type).toBe("weekly_audit");
    expect(html.match(/Preço de gôndola observado, sem remarcação\./g) ?? []).toHaveLength(1);
  });

  it("não pula nível na hierarquia de títulos", () => {
    // Um `h1` só, e nenhum nível pulado. R3.3 introduziu um `h3` legítimo — "Outros Achados",
    // aninhado sob o `h2` "Achados". A regra nunca foi "nenhum h3"; era "nenhum h3 órfão", e a
    // diferença passou a importar quando a seção ganhou uma subdivisão de verdade.
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
    const niveis = [...html.matchAll(/<h([1-6])/g)].map(([, n]) => Number(n));
    for (let i = 1; i < niveis.length; i++) {
      expect(niveis[i], `h${niveis[i]} depois de h${niveis[i - 1]} pula nível`).toBeLessThanOrEqual(
        niveis[i - 1] + 1,
      );
    }
  });

  it("não cria urgência artificial em nenhum Achado", () => {
    for (const termo of ["Faltam", "Termina em", "restam", "agora mesmo", "última chance"]) {
      expect(html, `HTML inicial não deve conter "${termo}"`).not.toContain(termo);
    }
  });
});

describe("rotas vizinhas continuam renderizando (regressão do loader)", () => {
  it("/buscar continua funcionando", async () => {
    const busca = await renderRoute("/buscar");
    expect(busca).toContain("Buscar produto");
    expect(busca).toContain('type="search"');
  });

  it("/como-funciona continua funcionando", async () => {
    expect(await renderRoute("/como-funciona")).toContain("Como funciona");
  });

  it("/para-mercados continua funcionando", async () => {
    expect(await renderRoute("/para-mercados")).toContain("mercado");
  });
});
