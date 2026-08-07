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
import { formatDate } from "@/lib/format";

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
    expect(html.indexOf("AMBIENTE DE TESTE")).toBeLessThan(html.indexOf("Achados em Artemis"));
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
    const h1 = html.indexOf("Achados em Artemis");
    const subtexto = html.indexOf("Preços observados nos mercados do bairro");
    expect(eyebrow).toBeGreaterThan(-1);
    expect(h1).toBeGreaterThan(eyebrow);
    expect(subtexto).toBeGreaterThan(h1);
  });

  it("R3.3 INVERTEU: a busca vem ANTES dos Achados", () => {
    // Decisão D2 (MVP-E2-02, MVP-DESIGN-05). A comparação é o núcleo e a busca é a porta dela;
    // quem já sabe o que procura não deveria rolar por uma vitrine antes de poder perguntar.
    // Achados continuam logo abaixo — são descoberta, não a única forma de chegar ao produto.
    //
    // R3.3B tirou o cabeçalho visível da seção de busca (§7). A âncora passou a ser o rótulo do
    // campo, que continua no HTML — `sr-only`, associado ao `input` — e é a marca mais estável
    // que existe aqui: se ele sumir, o campo perde o nome acessível, e é isso que se quer pegar.
    const busca = html.indexOf("Busque um produto exato");
    const primeiroAchado = html.indexOf("Achados</h2>");
    expect(busca).toBeGreaterThan(-1);
    expect(primeiroAchado).toBeGreaterThan(busca);
  });

  it("a ordem do DOM é a ordem visual: contexto, busca, Achados, outros", () => {
    // Teclado e leitor de tela seguem o DOM. No alvo primário — mobile — ele precisa bater com
    // o que o olho vê, senão o foco pula do topo para o rodapé da seção e volta.
    const h1 = html.indexOf("Achados em Artemis");
    const busca = html.indexOf("Busque um produto exato");
    const primeiroAchado = html.indexOf("Achados</h2>");
    const outros = html.indexOf("Outros Achados");
    expect(busca).toBeGreaterThan(h1);
    expect(primeiroAchado).toBeGreaterThan(busca);
    expect(outros).toBeGreaterThan(primeiroAchado);
  });

  it("uma anatomia, duas composições: um destaque e o resto em linha (R3.3B)", () => {
    // O destaque é o único preço no tamanho de destaque; os secundários usam o tamanho de lista.
    // Se a lista voltar a ser Card v2 completo, o primeiro número muda e este teste reprova —
    // que é a regressão de densidade que R3.3 mediu e R3.3B manteve.
    expect(html).toContain("Outros Achados");
    expect(html.match(/text-\[2\.625rem\]/g) ?? []).toHaveLength(1);
    expect(html.match(/text-\[1\.375rem\]/g) ?? []).toHaveLength(2);
    // E as duas composições saem do mesmo domínio: nenhum card sem procedência.
    expect(html.match(/Mercado (principal|local \d)/g) ?? []).toHaveLength(3);
  });

  it("segue a ordem completa: contexto, busca, Achados, procedência, piloto", () => {
    const posicoes = [
      "Achados em Artemis",
      "Busque um produto exato",
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

  it("mostra produto, marca e gramatura em campos separados", () => {
    // As DUAS composições separam nome, marca e variante (CARD-V2-SPEC itens 2, 3 e 4). Em
    // R3.3 só o destaque fazia isso, porque a lista era outro componente e concatenava tudo num
    // título. Com a lista derivada da mesma visão, o título concatenado deixou de existir — e é
    // isso que este teste passou a exigir: nome e marca inteiros, gramatura inteira, e nenhuma
    // frase costurada onde deveria haver campos.
    expect(html).toContain("Arroz");
    expect(html).toContain("Ouro do Campo");
    expect(html).toContain("5 kg");
    expect(html).toContain("Serra Alta");
    expect(html).toContain("500 g");
    expect(html).not.toContain("Café Serra Alta Tradicional");
  });

  it("nenhuma marca real aparece no fixture de demonstração", () => {
    // O assessment da North Star V2 já tinha rejeitado marcas reais nas telas; R3.3B fechou a
    // ponta que faltava, que era o dado. Uma ilustração genérica ao lado do nome de uma marca
    // existente representa a embalagem daquela marca por mais genérico que seja o traço.
    for (const marca of ["Camil", "Pilão", "Italac", "Tio João", "Melitta", "3 Corações"]) {
      expect(html, `o fixture não pode citar a marca real "${marca}"`).not.toContain(marca);
    }
  });

  it("compõe o preço com o símbolo menor que o valor", () => {
    expect(html).toContain(">R$</span>");
    expect(html).toContain(">26,49</span>");
  });

  it("oferece o preço por extenso a quem usa leitor de tela", () => {
    expect(html).toContain("26 reais e 49 centavos");
    expect(html).toContain("5 reais e 29 centavos");
  });

  it("mostra o mercado e o bairro, e a localidade do piloto no cabeçalho", () => {
    // R3.3B trocou o sufixo "· Artemis" repetido em cada card pelo BAIRRO, que é o dado mais
    // específico e o que de fato ancora proximidade. A localidade continua dita uma vez, onde
    // vale para a página inteira: o eyebrow da primeira dobra.
    expect(html).toContain("Mercado local 3");
    expect(html).toContain("Vila Antiga");
    expect(html).toContain("Jardim Novo");
    expect(html).toContain("Artemis · Piracicaba, SP");
  });

  it("traz a linha de procedência com origem, atualização e validade", () => {
    // Uma grafia só, desde R3.3B: as duas composições leem `sourceLabel()`. Antes o card da
    // lista escrevia a mesma origem em minúscula, numa linha mono própria — duas grafias do
    // mesmo dado, que é o sintoma de duas anatomias.
    expect(html).toContain("Verificado em pesquisa");
    expect(html).toContain("Informado pelo mercado");
    expect(html).toContain("Oferta anunciada");
    // A data vem do fixture, que é relativa ao instante em que o loader roda. Fixá-la em texto
    // fazia o teste passar no dia em que foi escrito e reprovar no dia seguinte.
    expect(html).toContain(`observado em ${formatDate(arroz.observed_at)}`);
    // E a ausência de validade é DITA, nunca omitida — senão o leitor supõe prazo indefinido.
    expect(html).toContain("validade não informada");
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

  it("a natureza da origem é dita pelo selo, e por ele só", () => {
    // Até R3.3A o card da lista escrevia à mão "Preço de gôndola observado, sem remarcação."
    // para duas das seis origens. A frase estava certa e a regra também — mas era um SEGUNDO
    // canal para o que o selo de origem já diz, com a sua descrição, e manter dois canais para
    // o mesmo dado é manter duas chances de eles discordarem.
    //
    // Com a lista derivada do Card v2, sobrou um canal: o selo. O que este teste guarda é que
    // ele continua completo — rótulo visível mais descrição para leitor de tela — e que nenhuma
    // origem recebe a descrição de outra.
    // Cada Achado nomeia a SUA origem, e nenhuma origem aparece mais vezes do que existe no
    // fixture — que é como se pega uma composição herdando o rótulo da outra.
    expect(arroz.source_type).toBe("store_list");
    expect(cafe.source_type).toBe("social_media");
    expect(leite.source_type).toBe("weekly_audit");
    expect(html.match(/Informado pelo mercado/g) ?? []).toHaveLength(1);
    expect(html.match(/Oferta anunciada/g) ?? []).toHaveLength(1);
    expect(html.match(/Verificado em pesquisa/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("Preço de gôndola observado, sem remarcação.");
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

/**
 * R3.3B — o polimento visual final, medido no HTML de verdade.
 *
 * O mandato §13 pediu regressões que impeçam a estrutura de andar para trás, e avisou contra o
 * oposto: "não transformar pixel perfection em testes frágeis". Nada aqui afirma um pixel. Cada
 * item é uma decisão de produto que só se percebe olhando — e que, uma vez percebida, precisa de
 * um guarda que não dependa de alguém olhar de novo.
 */
describe("R3.3B — o que a Home passou a mostrar", () => {
  it("todo Achado tem imagem, e nenhuma se apresenta como foto do produto", () => {
    const imgs = html.match(/<img[^>]*src="\/img\/demo\/[^"]*"[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(3);
    for (const img of imgs) {
      expect(img).toContain("Ilustração genérica");
      expect(img).toContain("não é a embalagem do produto");
    }
  });

  it("o destaque carrega o LCP e os da lista não", () => {
    // Três imagens, uma só com prioridade. Se a lista virar `eager`, a primeira pintura passa a
    // esperar por imagens que estão abaixo da dobra. A contagem é sobre os `<img>` — o `<link
    // rel="preload">` que o roteador emite para a mesma imagem também carrega o atributo, e
    // contá-lo junto faria o teste medir duas coisas diferentes com o mesmo número.
    const imgs = html.match(/<img[^>]*src="\/img\/demo\/[^"]*"[^>]*>/g) ?? [];
    expect(imgs.filter((i) => i.includes('fetchPriority="high"'))).toHaveLength(1);
    expect(imgs.filter((i) => i.includes('loading="lazy"'))).toHaveLength(2);
  });

  it("a linha de lista inteira é o link, e leva ao produto", () => {
    // O botão repetido a cada item saiu; o alvo cresceu para a linha. O que não pode acontecer é
    // a linha deixar de ser clicável — aí o card vira decoração.
    for (const entry of buildDemoOpportunities().slice(1)) {
      expect(html).toMatch(
        new RegExp(`<a href="/produto/${entry.product.id}"[^>]*class="[^"]*grid[^"]*"`),
      );
    }
  });

  it("nada na Home se apresenta como rótulo de fixture ou de debug", () => {
    // §7: "remover labels de fixture no meio da experiência" e "elementos que pareçam debug". A
    // frase sobre dados fictícios CONTINUA — o que saiu foi a moldura tracejada em monoespaçada
    // que a fazia parecer anotação de laboratório.
    expect(html).toContain("dados fictícios · exemplos para demonstrar o formato");
    expect(html).not.toContain("border-dashed");
    expect(html).not.toContain("◌");
  });

  it("a monoespaçada não é usada em texto corrido de card", () => {
    // A regra é do próprio design system: mono só em dado tabular de fato. Em "observado em
    // 06/08/2026 · ontem" ela não alinhava coluna nenhuma e emprestava ao card ar de terminal.
    const secao = html.slice(
      html.indexOf('aria-labelledby="achados-titulo"'),
      html.indexOf('aria-labelledby="confianca-titulo"'),
    );
    expect(secao).not.toContain("font-data");
  });

  it("a hierarquia visual do preço é uma só por composição", () => {
    // Um preço em tamanho de destaque, dois em tamanho de lista, e o de destaque é o maior.
    // Se os três empatarem, não há hierarquia — que foi exatamente o diagnóstico do §8.
    expect(html.match(/text-\[2\.625rem\]/g) ?? []).toHaveLength(1);
    expect(html.match(/text-\[1\.375rem\]/g) ?? []).toHaveLength(2);
  });

  it("continua sem personalização, sem prova social e sem parceiro", () => {
    for (const termo of [
      "mercado habitual",
      "vizinhos já recebem",
      "Parceiro Oficial",
      "patrocinado",
      "km de você",
      "mais barato da cidade",
    ]) {
      expect(html, `a Home não pode conter "${termo}"`).not.toContain(termo);
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
