import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACOUGUE_MOTA,
  DEMO_MARKETS,
  DEMO_NATUREZA_DO_DADO,
  DEMO_PRODUCTS,
  MERCADO_EXEMPLO,
  PRODUTO_FILE_DE_PEITO,
  construirOfertasDemo,
  imagemDoProdutoDemo,
} from "@/lib/demo-catalog";
import { buscarNoCatalogoDemo, compararNoCatalogoDemo } from "@/services/demo-source";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";

/**
 * =============================================================================
 * O CONTRATO DA CONVERGÊNCIA B2C — §20 DO MANDATO
 * =============================================================================
 *
 * A instrução é curta e vale mais que a lista: **"testar contrato, não pixel específico. Não
 * criar testes que impeçam refinamento visual futuro."**
 *
 * Então nada aqui afirma um tamanho, uma cor, uma margem ou uma classe. Cada asserção é uma
 * promessa que o produto faz a quem olha para ele — e que, se quebrar, quebra na frente de uma
 * pessoa real numa entrevista. O desenho pode mudar amanhã inteiro; estas frases não.
 */

const ROTAS = join(process.cwd(), "src/routes");

/**
 * A FONTE SEM COMENTÁRIO — e não é preciosismo, é o que o teste mede.
 *
 * Estas rotas explicam, por escrito, POR QUE não usam "melhor preço", "melhores ofertas" ou
 * "preço anterior". As explicações contêm as frases proibidas, e a primeira versão deste
 * arquivo reprovou por causa delas: o guarda acusava a documentação de fazer a promessa que a
 * documentação existe para recusar.
 *
 * É a mesma armadilha que `scripts/r2/apply/apply.test.ts` já tinha encontrado no SQL, e a
 * resposta é a mesma: um teste que lê comentário mede o texto, não o programa. Aqui só entra o
 * que pode chegar à tela.
 */
const semComentario = (fonte: string) =>
  fonte
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .split("\n")
    .filter((linha) => !linha.trimStart().startsWith("//"))
    .join("\n");

const ler = (arquivo: string) => semComentario(readFileSync(join(ROTAS, arquivo), "utf-8"));

const HOME = ler("index.tsx");
const BUSCA = ler("buscar.tsx");
const COMPARACAO = ler("produto.$productId.tsx");
const DETALHE = ler("produto_.$productId.oferta.$priceId.tsx");
const WHATSAPP = ler("whatsapp.tsx");
const SHELL = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf-8");

const TELAS = { HOME, BUSCA, COMPARACAO, DETALHE, WHATSAPP };

describe("as cinco telas existem, e são cinco", () => {
  it("cada uma é uma rota do produto", () => {
    // Anti-vacuidade antes de tudo: se uma delas sumir, os `describe` abaixo passariam a
    // verificar quatro telas em silêncio.
    for (const [nome, fonte] of Object.entries(TELAS)) {
      expect(fonte.length, `${nome} está vazia`).toBeGreaterThan(500);
    }
  });
});

describe("§10 — duas abas, e o North Star não muda isso", () => {
  it("a navegação principal tem exatamente Achados e Buscar", () => {
    const rotas = [...SHELL.matchAll(/\{\s*to:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(rotas).toEqual(["/", "/buscar"]);
  });

  it("comparação, detalhe e WhatsApp NÃO viram aba", () => {
    // A referência desenha cinco abas — Achados, Buscar, Comparar, Favoritos, Mais. As três
    // últimas são as que o contrato funcional recusa: comparar é fluxo depois do produto,
    // favoritos não existe, e "mais" é um menu para funcionalidades que não temos.
    const nav = SHELL.slice(SHELL.indexOf("const NAV"), SHELL.indexOf("] as const"));
    for (const proibida of ["Comparar", "Favoritos", "Mais", "WhatsApp"]) {
      expect(nav, `"${proibida}" virou aba`).not.toContain(proibida);
    }
  });
});

describe("§13 e §17 — nenhuma promessa que o piloto não sustenta", () => {
  const PROIBIDAS = [
    "melhor preço",
    "melhores preços",
    "melhores ofertas",
    "mais barato da cidade",
    "mais barato perto de você",
    "o melhor preço perto de você",
    "preços próximos",
    "ofertas reais",
    "tempo real",
    "estoque garantido",
    "cobertura total",
    "todos os dias",
    "todos os mercados",
    "parceiro oficial",
    "destaque garantido",
  ];

  it.each(Object.keys(TELAS))("%s não faz nenhuma promessa proibida", (nome) => {
    const fonte = TELAS[nome as keyof typeof TELAS].toLowerCase();
    for (const frase of PROIBIDAS) {
      expect(fonte, `${nome} contém "${frase}"`).not.toContain(frase);
    }
  });

  it("a tela de WhatsApp não promete frequência nenhuma", () => {
    // O risco específico do §6: a referência escreve "As melhores ofertas todos os dias".
    // Nenhuma das duas metades é sustentável — nem o superlativo, nem o ritmo.
    for (const frase of ["por dia", "diariamente", "toda semana", "sempre que"]) {
      expect(WHATSAPP.toLowerCase(), `promete "${frase}"`).not.toContain(frase);
    }
  });
});

describe("§12 — a geografia é Artemis, e só", () => {
  const ANTIGAS = ["São Luís", "Sao Luis", "Cohab", "Cohama", "Jardim Atlântico", "Jd. Atlântico"];

  it.each(Object.keys(TELAS))("%s não cita geografia da referência antiga", (nome) => {
    for (const lugar of ANTIGAS) {
      expect(TELAS[nome as keyof typeof TELAS], `${nome} cita ${lugar}`).not.toContain(lugar);
    }
  });

  /**
   * A ASSERÇÃO MUDOU DE CAMPO, E FICOU MAIS HONESTA.
   *
   * Ela lia `address`, que nos mercados inventados era "Rua Exemplo, N - Artemis". O Açougue Mota
   * é uma loja de verdade e eu **não conferi o endereço dela** — escrever um só para o teste
   * passar seria inventar dado sobre um lugar que existe, e endereço errado na tela de quem
   * conhece a própria loja é pior do que endereço nenhum.
   *
   * O que a demonstração de fato afirma sobre geografia é o BAIRRO da loja coletada, e é isso que
   * passa a ser medido. O mercado de exemplo não afirma bairro nenhum, e não pode mesmo: ele não
   * fica em lugar algum.
   */
  it("a loja coletada é de Artemis, e o exemplo não afirma lugar nenhum", () => {
    expect(ACOUGUE_MOTA.neighborhood).toBe("Artemis");
    expect(MERCADO_EXEMPLO.neighborhood).toBeNull();
    expect(MERCADO_EXEMPLO.address).toBeNull();
    expect(DEMO_MARKETS).toHaveLength(2);
  });
});

describe("§16 — o dado da demonstração", () => {
  it("todo produto tem GTIN nulo e `is_demo`", () => {
    // Corte fatiado no balcão não carrega código de barras de fabricante; inventar um seria
    // afirmação falsa sobre um identificador global.
    expect(DEMO_PRODUCTS).toHaveLength(5);
    for (const p of DEMO_PRODUCTS) {
      expect(p.gtin, `${p.name} tem GTIN`).toBeNull();
      expect(p.is_demo, `${p.name} não é demo`).toBe(true);
    }
  });

  it("nenhuma marca real no catálogo", () => {
    const REAIS = [
      "Camil",
      "Pilão",
      "Italac",
      "Liza",
      "Ypê",
      "Neve",
      "Tio João",
      "Melitta",
      "3 Corações",
      "Qualy",
      "Piracanjuba",
      "Parmalat",
    ];
    for (const p of DEMO_PRODUCTS) {
      expect(REAIS, `marca real: ${p.brand}`).not.toContain(p.brand);
    }
  });

  it("toda oferta é demo nas três entidades", () => {
    const ofertas = construirOfertasDemo(new Date("2026-08-08T12:00:00Z"));
    expect(ofertas).toHaveLength(10);
    for (const o of ofertas) {
      expect(o.is_demo && o.product.is_demo && o.market.is_demo, o.id).toBe(true);
    }
  });

  /**
   * AS DUAS NATUREZAS DE PREÇO ESTÃO SEPARADAS NO DADO, E NÃO NA LEMBRANÇA DE QUEM MONTOU A TELA.
   *
   * Cinco preços foram observados no balcão; cinco são exemplo. Se a distinção existisse só no
   * comentário, a lista inteira passaria a afirmar observação onde não houve nenhuma — e essa é
   * a única mentira que esta demonstração tem como contar.
   */
  it("as ofertas de exemplo se declaram, e as observadas não se disfarçam de exemplo", () => {
    const ofertas = construirOfertasDemo(new Date("2026-08-08T12:00:00Z"));
    const exemplo = ofertas.filter((o) => o.exemplo_ilustrativo === true);
    const observadas = ofertas.filter((o) => o.exemplo_ilustrativo !== true);
    expect(exemplo).toHaveLength(5);
    expect(observadas).toHaveLength(5);
    for (const o of exemplo) {
      expect(o.market_id, o.id).toBe(MERCADO_EXEMPLO.id);
      // Sem imagem: dar a mesma ilustração ao exemplo faria as duas linhas parecerem
      // igualmente observadas, que é exatamente a confusão a evitar.
      expect(o.image, o.id).toBeNull();
    }
    for (const o of observadas) {
      expect(o.market_id, o.id).toBe(ACOUGUE_MOTA.id);
      expect(o.image, o.id).not.toBeNull();
      expect(o.source_type, o.id).toBe("shelf_photo");
    }
  });

  it("o indicador de demonstração existe, e é o mesmo em todas as telas", () => {
    // A frase deixou de ser literal aqui e passou a vir de `demo-catalog`, junto do dado que ela
    // descreve: quando a coleta mudar de data ou de loja, ela muda num lugar só.
    const nota = readFileSync(join(process.cwd(), "src/components/DemoNote.tsx"), "utf-8");
    expect(nota).toContain("DEMO_NATUREZA_DO_DADO");
    expect(DEMO_NATUREZA_DO_DADO).toContain("Açougue Mota");
    expect(DEMO_NATUREZA_DO_DADO).toContain("exemplo ilustrativo");
    for (const tela of [BUSCA, COMPARACAO, DETALHE, WHATSAPP]) {
      expect(tela).toContain("DemoNote");
    }
  });
});

describe("§8 — a embalagem é do produto, e não da tela", () => {
  it("todo produto do catálogo tem imagem, e o mapa é a única fonte dela", () => {
    for (const p of DEMO_PRODUCTS) {
      const imagem = imagemDoProdutoDemo(p.id);
      expect(imagem, `${p.name} não tem imagem`).not.toBeNull();
      expect(imagem!.src).toMatch(/^\/img\/demo\/acougue\/.+\.jpg$/);
      // Declarada como ilustrativa: ela mostra o CORTE, nunca a peça que estava no balcão.
      expect(imagem!.ilustrativa, p.name).toBe(true);
    }
  });

  it("cada produto tem uma embalagem PRÓPRIA — nenhuma é reaproveitada", () => {
    // Se dois produtos compartilhassem o arquivo, a gramatura ou a marca desenhada
    // contradiria o texto ao lado em pelo menos uma das telas.
    const arquivos = DEMO_PRODUCTS.map((p) => imagemDoProdutoDemo(p.id)!.src);
    expect(new Set(arquivos).size).toBe(arquivos.length);
  });

  it("todo arquivo referenciado existe em disco", () => {
    const naPasta = new Set(readdirSync(join(process.cwd(), "public/img/demo/acougue")));
    for (const p of DEMO_PRODUCTS) {
      const arquivo = imagemDoProdutoDemo(p.id)!.src.replace("/img/demo/acougue/", "");
      expect(naPasta, `${arquivo} não existe`).toContain(arquivo);
    }
  });

  it("a Home mostra a MESMA embalagem que a comparação", () => {
    const agora = new Date("2026-08-08T12:00:00Z");
    for (const achado of buildDemoOpportunities(agora)) {
      const naComparacao = imagemDoProdutoDemo(achado.product_id);
      expect(achado.image?.src, `${achado.product.name} diverge entre Home e comparação`).toBe(
        naComparacao?.src,
      );
    }
  });
});

describe("§9 — o golden path é navegável de ponta a ponta", () => {
  const agora = new Date("2026-08-08T12:00:00Z");

  it("1. a Home abre pelo filé de peito do golden path", () => {
    const [primeiro] = buildDemoOpportunities(agora);
    expect(primeiro.product_id).toBe(PRODUTO_FILE_DE_PEITO.id);
  });

  it("2. buscar 'frango' devolve os dois cortes de frango, e nada de bovino", () => {
    const achados = buscarNoCatalogoDemo("frango");
    expect(achados.map((p) => p.name).sort()).toEqual([
      "Coxa e sobrecoxa de frango",
      "Filé de peito de frango",
    ]);
  });

  it("3. a comparação do filé tem dois mercados, ordenados por preço", () => {
    const comparacao = compararNoCatalogoDemo(PRODUTO_FILE_DE_PEITO.id, agora);
    expect(comparacao).not.toBeNull();
    expect(comparacao!.entries).toHaveLength(2);
    const precos = comparacao!.entries.map((e) => e.price);
    expect([...precos].sort((a, b) => a - b)).toEqual(precos);
  });

  /**
   * A ORDEM CAI DO PREÇO, E NÃO DE UM CAMPO QUE PROMOVA A LOJA — princípio 4.
   *
   * O Açougue Mota abre as cinco comparações. É consequência de ele ser mais barato nas cinco, e
   * a asserção diz isso na ordem certa: primeiro confere que ele é o menor preço, depois que é o
   * primeiro. Inverter a leitura — "ele é o primeiro, logo está certo" — seria escrever um teste
   * que aprovaria exatamente o favorecimento que o princípio proíbe.
   */
  it("3a. a loja coletada vem primeiro PORQUE é a mais barata, e não por ser a loja", () => {
    for (const produto of DEMO_PRODUCTS) {
      const { entries } = compararNoCatalogoDemo(produto.id, agora)!;
      const menor = Math.min(...entries.map((e) => e.price));
      const doMota = entries.find((e) => e.market_id === ACOUGUE_MOTA.id)!;
      expect(doMota.price, produto.name).toBe(menor);
      expect(entries[0].market_id, produto.name).toBe(ACOUGUE_MOTA.id);
    }
  });

  it("3b. nenhum mercado aparece duas vezes na mesma comparação", () => {
    const comparacao = compararNoCatalogoDemo(PRODUTO_FILE_DE_PEITO.id, agora)!;
    const mercados = comparacao.entries.map((e) => e.market_id);
    expect(new Set(mercados).size).toBe(mercados.length);
  });

  it("3c. nenhum outro corte entra na comparação do filé de peito", () => {
    // Princípio 1: a comparação usa um único `product_id`, e nada parecido entra nela.
    const comparacao = compararNoCatalogoDemo(PRODUTO_FILE_DE_PEITO.id, agora)!;
    for (const entry of comparacao.entries) {
      expect(entry.product_id).toBe(PRODUTO_FILE_DE_PEITO.id);
    }
  });

  it("4. cada linha da comparação leva a uma oferta que existe", () => {
    const comparacao = compararNoCatalogoDemo(PRODUTO_FILE_DE_PEITO.id, agora)!;
    const todas = new Set(construirOfertasDemo(agora).map((o) => o.id));
    for (const entry of comparacao.entries) {
      expect(todas, `a oferta ${entry.id} não existe no catálogo`).toContain(entry.id);
    }
  });

  it("5. o detalhe oferece a saída para a tela de WhatsApp", () => {
    expect(DETALHE).toContain('to="/whatsapp"');
  });

  it("cada tela tem um caminho de volta", () => {
    for (const [nome, fonte] of Object.entries({ BUSCA, COMPARACAO, DETALHE, WHATSAPP })) {
      expect(fonte, `${nome} não tem seta de volta`).toContain("ArrowLeft");
    }
  });
});

describe("§5 — o detalhe não copia o que a referência não pode sustentar", () => {
  it("não existe preço riscado", () => {
    // "Preço anterior: ~~R$ 20,49~~" está na referência. A decisão P-01 — qual observação
    // anterior conta como "antes" — nunca foi tomada, e um preço riscado sem critério é uma
    // afirmação de queda sobre nada.
    for (const proibido of ["line-through", "Preço anterior", "previous_price", "de R$"]) {
      expect(DETALHE, `o detalhe usa "${proibido}"`).not.toContain(proibido);
    }
  });

  it("não existe logotipo de mercado", () => {
    for (const proibido of ["logo", "market_logo", "brandmark"]) {
      expect(DETALHE.toLowerCase(), `o detalhe usa "${proibido}"`).not.toContain(proibido);
    }
  });

  it("a hierarquia do §5 está na ordem do DOM", () => {
    // A ordem é medida por âncoras de CONTEÚDO — o que chega à tela —, e não por marcadores
    // de comentário: os comentários são removidos antes da leitura, e uma asserção sobre eles
    // passaria sem medir nada.
    const ancoras = [
      "<h1",
      "Preço observado neste mercado",
      'aria-label="Mercado"',
      "Condição desta oferta",
      "Receber achados no WhatsApp",
      "Confiança da informação",
    ];
    const ordem = ancoras.map((a) => DETALHE.indexOf(a));
    for (const [i, pos] of ordem.entries()) {
      expect(pos, `âncora ausente: ${ancoras[i]}`).toBeGreaterThan(-1);
    }
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });
});

describe("§4 — a comparação não inventa a contagem", () => {
  it("o número de mercados vem do tamanho da lista, nunca de um literal", () => {
    expect(COMPARACAO).toContain("`Comparação em ${entries.length} mercados`");
    // Nenhum número escrito à mão ao lado da palavra "mercados".
    expect(COMPARACAO).not.toMatch(/Comparação em \d+ mercados/);
  });

  it("nada reordena a lista além do preço", () => {
    for (const proibido of ["is_featured", "patrocinado", "parceiro", "boost"]) {
      expect(COMPARACAO, `a comparação usa "${proibido}"`).not.toContain(proibido);
    }
  });
});
