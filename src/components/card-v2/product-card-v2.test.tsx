import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { ProductCardV2, ProductCardV2Skeleton } from "./index";
import { AGORA_DEMO, OFERTA_PRECO_GRANDE, VARIANTES } from "./fixtures";
import type { OfertaCardV2 } from "@/lib/card-v2";

/**
 * R3.2 — o Card v2, RENDERIZADO.
 *
 * `card-v2.test.ts` prova a regra; este arquivo prova que a regra chega ao HTML. São
 * perguntas diferentes e as duas precisam de resposta: uma condição correta escrita em
 * cima de um elemento que nunca é renderizado passa no primeiro e falha aqui.
 *
 * =============================================================================
 * O ROTEADOR É DE VERDADE, E ISSO É O PONTO
 * =============================================================================
 *
 * O CTA é um `<Link>` do TanStack Router — o mesmo idioma do `AchadoCard`. Renderizá-lo
 * fora de um `RouterProvider` explode, e havia dois caminhos: injetar o CTA por prop e
 * testar um `<a>` qualquer, ou montar um roteador mínimo e testar o CTA de verdade.
 *
 * O primeiro passaria sempre, inclusive se o link do produto estivesse quebrado. Então é o
 * segundo: um roteador em memória com a rota `/produto/$productId` de destino, e o `href`
 * gerado é conferido.
 */
function comRouter(no: React.ReactElement): Promise<string> {
  const raiz = createRootRoute();
  const indice = createRoute({ getParentRoute: () => raiz, path: "/", component: () => no });
  const produto = createRoute({
    getParentRoute: () => raiz,
    path: "/produto/$productId",
    component: () => null,
  });
  const router = createRouter({
    routeTree: raiz.addChildren([indice, produto]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return router.load().then(() => renderToStaticMarkup(<RouterProvider router={router} />));
}

const cardDe = (oferta: OfertaCardV2, extras: { avisoParcial?: string } = {}) =>
  comRouter(
    <ProductCardV2 oferta={oferta} now={AGORA_DEMO} avisoParcial={extras.avisoParcial ?? null} />,
  );

/** As variantes que de fato têm oferta — `G` é o esqueleto e não tem. */
const COM_OFERTA = VARIANTES.flatMap((v) =>
  v.oferta === null ? [] : [{ chave: v.chave, oferta: v.oferta, avisoParcial: v.avisoParcial }],
);

// ---------------------------------------------------------------------------------
// As oito variantes
// ---------------------------------------------------------------------------------

describe("as variantes obrigatórias renderizam", () => {
  it.each(COM_OFERTA.map((v) => [v.chave, v] as const))("%s renderiza o card", async (_, v) => {
    const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
    expect(html).toContain("<article");
    expect(html).toContain(v.oferta.product.name);
    expect(html).toContain(v.oferta.market.name);
  });

  it("G — o esqueleto renderiza e some da árvore de acessibilidade", () => {
    const html = renderToStaticMarkup(<ProductCardV2Skeleton />);
    expect(html).toContain("animate-pulse");
    // Cada retângulo é `aria-hidden`; o anúncio é da região, uma vez, e não um por retângulo.
    expect(html).not.toContain("aria-live");
    expect((html.match(/aria-hidden="true"/g) ?? []).length).toBeGreaterThan(5);
  });

  it("H — o campo indisponível é NOMEADO, e o card continua compreensível", async () => {
    const h = COM_OFERTA.find((v) => v.chave === "H");
    expect(h).toBeDefined();
    const html = await cardDe(h!.oferta, { avisoParcial: h!.avisoParcial });
    expect(html).toContain("Contagem de mercados indisponível");
    // O resto do card sobrevive: identidade, preço e procedência continuam lá.
    expect(html).toContain(h!.oferta.product.name);
    expect(html).toContain("observado em");
  });
});

// ---------------------------------------------------------------------------------
// Campo ausente some — não vira traço
// ---------------------------------------------------------------------------------

describe("ausência é ausência, e nunca um traço", () => {
  it("sem quantidade aprovada, nenhum preço unitário aparece", async () => {
    const e = COM_OFERTA.find((v) => v.chave === "E");
    const html = await cardDe(e!.oferta);
    for (const proibido of ["por kg", "por L", "por unidade"]) {
      expect(html, `a variante E mostrou "${proibido}"`).not.toContain(proibido);
    }
  });

  it("mas o texto livre da embalagem é preservado", async () => {
    const e = COM_OFERTA.find((v) => v.chave === "E");
    const html = await cardDe(e!.oferta);
    expect(html).toContain("peso variável");
  });

  it("com quantidade aprovada, o unitário aparece — o guarda não come tudo", async () => {
    // Controle positivo. Sem ele, "nunca aparece" passaria por vacuidade se o componente
    // tivesse deixado de renderizar o unitário em qualquer situação.
    const a = COM_OFERTA.find((v) => v.chave === "A");
    expect(await cardDe(a!.oferta)).toContain("por kg");
  });

  it("nenhum card renderiza um traço solto no lugar de dado", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
      // `—` como conteúdo inteiro de um elemento é o padrão que comunica ausência como se
      // fosse dado. Traço dentro de frase é outra coisa e continua permitido.
      expect(html, `a variante ${v.chave} tem um elemento cujo conteúdo é só um traço`).not.toMatch(
        />\s*[—–-]\s*</,
      );
    }
  });
});

// ---------------------------------------------------------------------------------
// Validade e promoção
// ---------------------------------------------------------------------------------

describe("validade e promoção", () => {
  it("F — a ausência de validade é DITA, e nenhuma data é inventada", async () => {
    const f = COM_OFERTA.find((v) => v.chave === "F");
    const html = await cardDe(f!.oferta);
    expect(html).toContain("validade não informada");
    expect(html).not.toContain("válido até");
  });

  it("A — quando há validade, ela aparece com a data", async () => {
    const a = COM_OFERTA.find((v) => v.chave === "A");
    const html = await cardDe(a!.oferta);
    expect(html).toContain("válido até");
    expect(html).not.toContain("validade não informada");
  });

  it("B — a condição da promoção fica visível, com o requisito por extenso", async () => {
    const b = COM_OFERTA.find((v) => v.chave === "B");
    const html = await cardDe(b!.oferta);
    expect(html).toContain("Condição:");
    expect(html).toContain("Limite de 2 unidades por cliente");
  });

  it("nenhum card cria urgência", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
      for (const proibido of ["últimas unidades", "corra", "agora mesmo", "faltam", "só hoje"]) {
        expect(html.toLowerCase(), `a variante ${v.chave} diz "${proibido}"`).not.toContain(
          proibido,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------------
// Estado da oferta
// ---------------------------------------------------------------------------------

describe("oferta desatualizada não aparenta ser vigente", () => {
  it("D1 — validade vencida: rótulo em TEXTO, antes do preço", async () => {
    const d1 = COM_OFERTA.find((v) => v.chave === "D1");
    const html = await cardDe(d1!.oferta);
    expect(html).toContain("Oferta expirada");
    // O preço é localizado pela sua versão falada, que é única e não depende da ordem em
    // que as classes de estilo saem no HTML. Ancorar num prefixo de `class` faria o teste
    // reprovar por uma reordenação de classes, que não é o que ele quer proteger.
    const falado = "9 reais e 90 centavos";
    expect(html).toContain(falado);
    expect(html.indexOf("Oferta expirada")).toBeLessThan(html.indexOf(falado));
  });

  it("D2 — observação antiga sem validade: diz `desatualizado`, não `expirada`", async () => {
    const d2 = COM_OFERTA.find((v) => v.chave === "D2");
    const html = await cardDe(d2!.oferta);
    expect(html).toContain("Preço desatualizado");
    expect(html).not.toContain("Oferta expirada");
  });

  it("o preço perde ênfase, sem que a cor seja o único sinal", async () => {
    const d1 = COM_OFERTA.find((v) => v.chave === "D1");
    const html = await cardDe(d1!.oferta);
    expect(html).toContain("text-muted-foreground font-bold");
    // E o texto do estado continua lá — a atenuação acompanha a palavra, não a substitui.
    expect(html).toContain("Oferta expirada");
  });

  it("e o CTA passa a oferecer os preços atuais", async () => {
    const d1 = COM_OFERTA.find((v) => v.chave === "D1");
    expect(await cardDe(d1!.oferta)).toContain("Ver preços atuais por mercado");
  });

  it("oferta ativa não ganha rótulo de estado nenhum", async () => {
    const a = COM_OFERTA.find((v) => v.chave === "A");
    const html = await cardDe(a!.oferta);
    for (const rotulo of ["Oferta expirada", "Preço desatualizado", "Oferta encerrada"]) {
      expect(html).not.toContain(rotulo);
    }
  });
});

// ---------------------------------------------------------------------------------
// Imagem
// ---------------------------------------------------------------------------------

describe("imagem", () => {
  it("A — correspondência exata aprovada: a imagem entra, com `alt` factual", async () => {
    const a = COM_OFERTA.find((v) => v.chave === "A");
    const html = await cardDe(a!.oferta);
    expect(html).toContain("<img");
    expect(html).toContain("alt=");
    expect(html).toContain("silhueta genérica");
  });

  it("C — correspondência aproximada: placeholder, e o `<img>` não existe", async () => {
    const c = COM_OFERTA.find((v) => v.chave === "C");
    const html = await cardDe(c!.oferta);
    expect(html).not.toContain("<img");
    // O placeholder é decorativo: sem `alt`, fora da árvore de acessibilidade.
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("<svg");
  });

  it("só o destaque carrega o LCP", async () => {
    const a = COM_OFERTA.find((v) => v.chave === "A");
    const destaque = await comRouter(
      <ProductCardV2 oferta={a!.oferta} now={AGORA_DEMO} variant="destaque" />,
    );
    const secundario = await cardDe(a!.oferta);
    expect(destaque).toContain('fetchPriority="high"');
    expect(secundario).toContain('loading="lazy"');
  });
});

// ---------------------------------------------------------------------------------
// Acessibilidade
// ---------------------------------------------------------------------------------

describe("acessibilidade", () => {
  it("o card é um `article` rotulado pelo próprio título", async () => {
    const html = await cardDe(COM_OFERTA[0].oferta);
    expect(html).toMatch(/<article[^>]*aria-labelledby="[^"]+"/);
    expect(html).toMatch(/<h2 id="[^"]+"/);
  });

  it("o `aria-labelledby` aponta para o `id` que existe de fato", async () => {
    const html = await cardDe(COM_OFERTA[0].oferta);
    const alvo = /aria-labelledby="([^"]+)"/.exec(html)?.[1];
    expect(alvo).toBeDefined();
    expect(html).toContain(`<h2 id="${alvo}"`);
  });

  it("o preço composto sai da árvore e `spokenPrice()` entra no lugar", async () => {
    const html = await cardDe(COM_OFERTA[0].oferta);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("12 reais e 90 centavos");
  });

  it("a tarja temporal é decorativa", async () => {
    const html = await cardDe(COM_OFERTA[0].oferta);
    expect(html).toMatch(/<div aria-hidden="true" style="height:var\(--vp-time-bar/);
  });

  it("o CTA tem nome acessível e alvo de toque de 48 px", async () => {
    const html = await cardDe(COM_OFERTA[0].oferta);
    expect(html).toContain("btn-touch-48");
    expect(html).toContain("Comparar em 4 mercados");
  });

  it("o CTA aponta para a comparação daquele produto", async () => {
    const a = COM_OFERTA.find((v) => v.chave === "A");
    const html = await cardDe(a!.oferta);
    expect(html).toContain(`href="/produto/${a!.oferta.product.id}"`);
  });

  it("o aviso de erro parcial é associado ao CTA por `aria-describedby`", async () => {
    const h = COM_OFERTA.find((v) => v.chave === "H");
    const html = await cardDe(h!.oferta, { avisoParcial: h!.avisoParcial });
    const id = /aria-describedby="([^"]+)"/.exec(html)?.[1];
    expect(id).toBeDefined();
    expect(html).toContain(`id="${id}"`);
  });

  it("sem aviso, não sobra um `aria-describedby` apontando para o nada", async () => {
    const html = await cardDe(COM_OFERTA[0].oferta);
    expect(html).not.toContain("aria-describedby");
  });

  it("todo estado exibido tem palavra, e não só cor", async () => {
    for (const chave of ["D1", "D2"]) {
      const v = COM_OFERTA.find((x) => x.chave === chave);
      const html = await cardDe(v!.oferta);
      expect(html).toMatch(/Oferta expirada|Preço desatualizado/);
    }
  });
});

// ---------------------------------------------------------------------------------
// Conteúdo: nada real entra
// ---------------------------------------------------------------------------------

describe("nenhum dado real, nenhum identificador", () => {
  it("nenhum GTIN chega ao HTML", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
      // O card não exibe identificador, e o fixture não guarda nenhum. Uma sequência de 8
      // a 14 dígitos seguidos seria a assinatura de um.
      const texto = html.replace(/<[^>]*>/g, " ");
      expect(texto, `a variante ${v.chave} tem uma sequência com cara de GTIN`).not.toMatch(
        /\b\d{8,14}\b/,
      );
    }
  });

  it("nenhum nome de rede real — nem os ilustrativos do North Star", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
      for (const rede of ["Bom Preço", "Mix Mateus", "Assaí", "Atacadão", "Carrefour"]) {
        expect(html, `a variante ${v.chave} cita ${rede}`).not.toContain(rede);
      }
    }
  });

  it("nenhum bairro ou cidade de verdade", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
      for (const lugar of ["Artemis", "Piracicaba", "Jardim Atlântico", "São Luís"]) {
        expect(html, `a variante ${v.chave} cita ${lugar}`).not.toContain(lugar);
      }
    }
  });

  it("nenhuma promessa absoluta de menor preço", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial }).then((h) =>
        h.toLowerCase(),
      );
      for (const promessa of ["menor preço", "mais barato do bairro", "o melhor preço"]) {
        expect(html, `a variante ${v.chave} promete "${promessa}"`).not.toContain(promessa);
      }
    }
  });

  it("nenhuma imagem externa — só o desenho embutido", async () => {
    for (const v of COM_OFERTA) {
      const html = await cardDe(v.oferta, { avisoParcial: v.avisoParcial });
      expect(html, `a variante ${v.chave} carrega imagem de fora`).not.toMatch(/src="https?:/);
    }
  });
});

// ---------------------------------------------------------------------------------
// Nada remoto
// ---------------------------------------------------------------------------------

describe("o Card v2 não conhece o mundo lá fora", () => {
  const ARQUIVOS = readdirSync(join(process.cwd(), "src/components/card-v2"))
    .filter((n) => (n.endsWith(".ts") || n.endsWith(".tsx")) && !n.includes(".test."))
    .map((n) => [n, readFileSync(join(process.cwd(), "src/components/card-v2", n), "utf-8")]);

  const DOMINIO = readFileSync(join(process.cwd(), "src/lib/card-v2.ts"), "utf-8");

  it.each([...ARQUIVOS, ["src/lib/card-v2.ts", DOMINIO]] as [string, string][])(
    "%s não importa serviço, cliente de banco nem fixture de demonstração",
    (_, fonte) => {
      for (const proibido of [
        "@/services",
        "@/integrations",
        "supabase",
        "demo-opportunities",
        "fetch(",
      ]) {
        expect(fonte).not.toContain(proibido);
      }
    },
  );

  it("e não duplica a normalização de busca dentro do componente", () => {
    // `pa_normalize_text()` e `normalize.ts` são o contrato único. Uma segunda
    // implementação aqui seria uma segunda verdade sobre o mesmo dado.
    for (const [, fonte] of ARQUIVOS) {
      expect(fonte).not.toContain("normalizeSearchText");
    }
    expect(DOMINIO).not.toContain("normalizeSearchText");
  });

  it("e não infere quantidade a partir de texto em tempo de apresentação", () => {
    // `parseSizeText` é ferramenta de curadoria de backfill, com revisão humana por cima.
    // Chamá-la no render é exatamente o que o `MVP-DATA-CONTRACT.md` §2 proíbe.
    for (const [, fonte] of ARQUIVOS) {
      expect(fonte).not.toContain("parseSizeText");
    }
    expect(DOMINIO).not.toContain("parseSizeText");
  });

  it("e não conhece ordenação — a lista orgânica é de `comparison.ts`", () => {
    for (const [, fonte] of ARQUIVOS) {
      expect(fonte).not.toContain("@/lib/comparison");
    }
    expect(DOMINIO).not.toContain("@/lib/comparison");
  });
});

// ---------------------------------------------------------------------------------
// Limites de layout
// ---------------------------------------------------------------------------------

describe("nomes longos e preço grande", () => {
  it("o preço de quatro dígitos renderiza inteiro", async () => {
    const html = await cardDe(OFERTA_PRECO_GRANDE);
    expect(html).toContain("1.234,56");
    expect(html).toContain("1234 reais e 56 centavos");
  });

  it("o nome pode truncar em duas linhas — a QUANTIDADE não", async () => {
    const c = COM_OFERTA.find((v) => v.chave === "C");
    const html = await cardDe(c!.oferta);
    expect(html).toContain("line-clamp-2");
    // A gramatura é o que separa dois SKUs; cortá-la para caber apaga a comparação. R3.3B
    // trocou a monoespaçada por `tabular-nums` — a regra do design system reserva a mono a dado
    // tabular de fato, e "1 L · Caixa" é texto corrido. O que este teste guarda é o
    // `break-words`: a garantia de não truncar, que é a que importa.
    expect(html).toMatch(/break-words[^"]*tabular-nums/);
    expect(html).toContain("1 L");
  });
});

// ---------------------------------------------------------------------------------
// A Home e o ranking continuam intocados
// ---------------------------------------------------------------------------------

/**
 * O QUE ESTE BLOCO GUARDAVA, E O QUE ELE GUARDA AGORA.
 *
 * Em R3.2 ele afirmava o isolamento da onda: o Card v2 vivia no laboratório, o `AchadoCard`
 * continuava sendo o card da Home, e a Home não importava nada daqui. Era a garantia certa
 * naquele momento — trocar os dois no mesmo PR misturaria "o card novo está certo?" com "a Home
 * continua certa?" num diff só.
 *
 * R3.3 levou o Card v2 ao destaque da Home e R3.3B levou a mesma visão à lista, com Gate próprio
 * para cada passo. O `AchadoCard` deixou de existir. A afirmação de isolamento não é mais
 * verdadeira, e um teste que afirma o que não é verdade não protege nada.
 *
 * O que sobrevive é a garantia que nunca dependeu do isolamento: **uma anatomia só**. As duas
 * composições da Home saem daqui, e nenhuma delas reimplementa as regras de exibição.
 */
describe("uma anatomia só (R3.3B)", () => {
  it("o `AchadoCard` não existe mais — a lista é composição do Card v2", () => {
    expect(existsSync(join(process.cwd(), "src/components/AchadoCard.tsx"))).toBe(false);
  });

  it("as duas composições da Home leem a MESMA visão", () => {
    // Se uma delas parar de chamar `montarVisaoDoCard`, ela passa a decidir por conta própria o
    // que mostrar — e é exatamente assim que uma regra some de um lado e sobrevive no outro.
    for (const arquivo of ["product-card-v2.tsx", "compact.tsx"]) {
      const fonte = readFileSync(join(process.cwd(), "src/components/card-v2", arquivo), "utf-8");
      expect(fonte, arquivo).toContain("montarVisaoDoCard");
    }
  });

  it("nenhuma das duas exibe histórico de preço (DL-030)", () => {
    for (const arquivo of ["product-card-v2.tsx", "compact.tsx"]) {
      const fonte = readFileSync(join(process.cwd(), "src/components/card-v2", arquivo), "utf-8");
      expect(fonte, arquivo).not.toContain("previous_price");
      expect(fonte, arquivo).not.toContain("PreviousPrice");
    }
  });
});
