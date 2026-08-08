import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { caminhosAlterados, foraDoEscopo, mainDisponivel } from "@/test-support/git-guard";

/**
 * R3.3 — o Gate de escopo.
 *
 * =============================================================================
 * A HOME PODE MUDAR. TUDO O RESTO, NÃO.
 * =============================================================================
 *
 * Até R3.2 o guarda era uma lista de caminhos que não podiam mudar, e a Home estava nela. R3.3
 * é a onda que mexe na Home — então a lista de proibidos precisaria perder três entradas, e um
 * guarda que perde entradas a cada onda vira decoração.
 *
 * A inversão é o conserto: **listar o que pode mudar, e reprovar todo o resto.** Um arquivo
 * novo fora do allowlist reprova sem que ninguém precise se lembrar de proibi-lo.
 *
 * O que continua protegido, por não estar na lista: busca, comparação, detalhe, ranking,
 * `services/catalog.ts`, banco, migrations, Worker, RLS e `/para-mercados`.
 */

/**
 * O conjunto explicitamente necessário para R3.3, e nada além.
 *
 * Cada entrada tem um porquê:
 * - a Home e os dois componentes novos são a entrega;
 * - `AppShell` porque a navegação passa de quatro abas para duas;
 * - `AchadoCard` e `demo-opportunities` porque o histórico de preço sai daqui (DL-030);
 * - `git-guard` porque este próprio guarda ganhou a comparação por escopo;
 * - os testes e as evidências que provam tudo isso.
 */
const PERMITIDOS = [
  "src/routes/index.tsx",
  "src/routes/index.ssr.test.ts",
  "src/routes/index.demo-source.test.ts",
  "src/routes/index.escopo.test.ts",
  "src/components/HomeAchados.tsx",
  "src/components/HomeContexto.tsx",
  "src/components/HomeHero.tsx", // removido nesta onda; o diff registra a exclusão
  "src/components/AppShell.tsx",
  "src/components/AppShell.contract.test.ts",
  "src/components/AchadoCard.tsx",
  "src/components/product-search.copy.test.ts",
  "src/components/touch-targets.test.ts",
  "src/lib/demo-opportunities.ts",
  "src/lib/demo-opportunities.test.ts",
  "src/test-support/git-guard.ts",
  "src/test-support/git-guard.test.ts",
  "src/routes/laboratorio-visual.contract.test.ts",
  "src/routes/laboratorio-card-v2.contract.test.ts",
  "src/routes/para-mercados.contract.test.ts",
  // Ele cita o H1 da Home para provar que a rota vizinha continua renderizando. O guarda pegou
  // este arquivo sozinho, e a entrada só entrou aqui depois — que é a ordem certa.
  "src/routes/para-mercados.ssr.test.ts",
  // A rota interna que produz `home-achados-states.png`, e o contrato dela. Os sete estados da
  // seção de Achados não existem numa página do produto — a Home renderiza um por vez —, então
  // a evidência exige uma tela que os mostre lado a lado. Ela é interna, fechada por padrão e
  // responde 404 em staging e em produção.
  "src/routes/laboratorio-home-estados.tsx",
  "src/routes/laboratorio-home-estados.contract.test.ts",
  // Gerado pelo próprio TanStack Router ao registrar a rota acima. Não é edição manual, mas o
  // guarda mede o diff e não a intenção — e é bom que seja assim: uma rota nova aparecendo aqui
  // sem que ninguém a tenha declarado é exatamente o que a lista precisa pegar.
  "src/routeTree.gen.ts",
  "scripts/visual/screenshot-home.ts",
  "scripts/visual/screenshot-home-estados.ts",
  "scripts/visual/comparison-board-home.ts",
  "docs/evidence/visual/r33/",
  "docs/product/",
  "docs/pmo/",

  // ===========================================================================
  // R3.3A — a remediação visual menor pedida pelo Founder depois de rever as capturas.
  // ===========================================================================
  // O guarda pegou cada um destes antes de eles entrarem aqui, e é essa a ordem certa: a
  // entrada existe porque a mudança foi feita e justificada, não para autorizar mudança futura.
  //
  // 1. WhatsApp — o CTA fixo saiu da Home, e o convite do fluxo ficou sozinho.
  "src/components/WhatsAppCta.tsx",
  "src/components/StickyWhatsAppCta.tsx", // removido nesta rodada; o diff registra a exclusão
  "src/components/home-whatsapp-cta.contract.test.ts", // era `sticky-cta.contract.test.ts`
  "src/components/sticky-cta.contract.test.ts", // o nome antigo, que o diff registra saindo
  "src/components/sticky-market-cta.contract.test.ts", // um comentário que ficou falso
  "src/lib/whatsapp.test.ts", // renderiza o CTA e afirmava o rótulo e a microcopy antigos
  // Com um só CTA fixo no produto, a loja do morador virou estado sem escritor.
  "src/lib/cta-visibility.ts",
  "src/lib/cta-visibility.test.ts",
  //
  // 2. Mercado habitual — o seletor saiu da Home (e SÓ da Home: continua em `/produto`).
  "src/services/home-markets.ts",
  //
  // 3 e 4. Procedência e piloto — os dois blocos longos do rodapé viraram blocos compactos, e as
  // três regras de confiança foram para `/como-funciona`, que é a rota da explicação. A rota de
  // destino entra no allowlist porque a redução da Home dependia de o texto existir lá.
  "src/components/TrustSection.tsx",
  "src/components/LocalStory.tsx",
  "src/routes/como-funciona.tsx",
  //
  // 5. Vazio real ≠ sem ofertas vigentes. A copy virou dado, num módulo que a Home e o
  // laboratório de estados compartilham, e `StateMessage` ganhou um slot de ação.
  "src/lib/home-states.ts",
  "src/lib/home-states.test.ts",
  "src/components/StateMessage.tsx",
  //
  // Os dois documentos da Parte 2 que descreviam a Home como ela era: o CTA fixo e o seletor
  // deixaram de existir nela, e um documento marcado "continua vinculante" que descreve código
  // apagado é pior do que documento nenhum.
  "docs/mvp/HOME-NORTH-STAR.md",
  "docs/mvp/WHATSAPP-ENTRY.md",

  // ===========================================================================
  // R3.3B — o polimento visual final, pedido depois de o Founder reprovar a DIREÇÃO VISUAL.
  // ===========================================================================
  // O guarda reprovou os treze caminhos abaixo antes de eles entrarem aqui, numa lista só, e é
  // essa a ordem certa. O que os une é uma frase do mandato: "NÃO FAZER MAIS BACKEND NESTA
  // MISSÃO. CONCENTRAR O ESFORÇO EM DESIGN, UX E POLIMENTO VISUAL." Nenhum deles toca dado real,
  // schema, Worker, ranking ou comparação.
  //
  // 1. Os assets genéricos (§5) — a mudança de maior efeito visual da rodada. Desenhos planos
  //    de categoria, versionados, sem embalagem, marca, logotipo ou trade dress de terceiro.
  "public/img/demo/",
  //
  // 2. O contrato de imagem e o fixture que passou a carregá-la. `card-v2.ts` ganhou a bandeira
  //    `ilustrativa`, que é a proibição do §5 ("não tratar imagem ilustrativa como
  //    correspondência real de SKU") virando dado verificável em vez de prosa.
  "src/lib/card-v2.ts",
  "src/lib/demo-opportunities.ilustrativas.test.ts",
  //
  // 3. O loader passou a declarar `OfertaCardV2`. Os dois tipos compilariam — todo campo do
  //    Card v2 é opcional —, e era justamente isso o perigoso: a imagem atravessaria a Home
  //    invisível para o compilador.
  "src/services/home-opportunities.ts",
  //
  // 4. A composição de lista, derivada da MESMA visão do destaque (§6). Com ela, o
  //    `AchadoCard` deixou de existir e o produto passou a ter uma anatomia só.
  "src/components/card-v2/compact.tsx",
  "src/components/card-v2/index.ts",
  "src/components/card-v2/identity.tsx",
  "src/components/card-v2/price.tsx",
  "src/components/card-v2/provenance.tsx",
  "src/components/card-v2/product-card-v2.tsx",
  "src/components/card-v2/product-card-v2.test.tsx",
  //
  // 5. A busca como protagonista da primeira dobra (§6): variante de destaque do campo, com
  //    rótulo e instrução apenas para leitor de tela. `/buscar` não muda — a prop é opt-in.
  "src/components/ProductSearch.tsx",
  //
  // 6. A política de imagem, porque R3.3B acrescentou uma distinção a ela. O adendo diz o que
  //    NÃO foi afrouxado — as duas portas continuam sendo revisão aprovada e correspondência
  //    exata — e o que passou a existir: `ilustrativa`, para que "exata" e "ilustrativa" não se
  //    confundam quando houver fotografia de verdade. Este foi o único caminho que o guarda
  //    reprovou depois do primeiro commit, e no CI, não aqui: o `bun run test` local rodou
  //    antes do commit de documentação. A ordem certa continua sendo a mesma — o guarda pega,
  //    e a entrada entra depois, com o motivo escrito.
  "docs/data/IMAGE-POLICY.md",

  // ===========================================================================
  // R3.3C — a convergência visual final, pedida depois de o Founder aprovar o diagnóstico de
  // R3.3B e ainda assim segurar o merge por uma última rodada de estética.
  // ===========================================================================
  // Quase tudo o que R3.3C mexeu já estava autorizado acima: as três ilustrações, os arquivos
  // de `card-v2/`, a Home, os blocos de confiança e piloto. O guarda reprovou UM caminho novo,
  // e ele entra aqui depois de reprovado, com o motivo:
  //
  // O botão de compartilhar era de largura inteira e ficava colado abaixo do CTA verde do card.
  // Duas caixas empilhadas na mesma largura leem como formulário — o defeito que o §14 nomeia
  // em "cards sem aparência de formulário". A mudança encolhe a pegada e alinha à direita; a
  // borda de `btn-quiet-bordered` NÃO saiu, porque ela é a correção de contraste de elemento
  // não textual (SC 1.4.11) feita na Parte 2, e desfazê-la seria trocar estética por
  // acessibilidade — que é a única troca que esta missão não pode fazer.
  "src/components/ShareAchadoButton.tsx",
] as const;

/**
 * O que R3.3 **não** pode encostar. Redundante com o allowlist de propósito: se alguém
 * afrouxar a lista de permitidos por engano, esta lista ainda reprova o que importa.
 */
const INTOCAVEIS = [
  "src/routes/buscar.tsx",
  "src/routes/produto.$productId.tsx",
  "src/routes/para-mercados.tsx",
  "src/components/MarketShell.tsx",
  "src/components/PriceCard.tsx",
  "src/components/PriceSummary.tsx",
  "src/lib/comparison.ts",
  "src/services/catalog.ts",
  "supabase/",
  "wrangler.jsonc",
  ".github/workflows/",
] as const;

describe("R3.3 muda a Home, e só o que foi autorizado junto", () => {
  it("nenhum caminho alterado está fora do allowlist", () => {
    const fora = foraDoEscopo(PERMITIDOS);
    expect(fora, `mudou fora do escopo de R3.3:\n  ${fora.join("\n  ")}`).toEqual([]);
  });

  it.each(INTOCAVEIS)("%s não aparece entre os alterados", (protegido) => {
    const alterados = caminhosAlterados();
    const tocados = alterados.filter((c) => c === protegido || c.startsWith(protegido));
    expect(tocados, `${protegido} foi alterado por R3.3`).toEqual([]);
  });

  it("a Home mudou de verdade — o guarda não passa por vacuidade", () => {
    // Sem isto, um allowlist correto e um diff vazio dariam o mesmo verde. R3.3 tem de ter
    // mexido na Home; se não mexeu, esta onda não aconteceu.
    expect(caminhosAlterados()).toContain("src/routes/index.tsx");
  });
});

/**
 * CONTROLE POSITIVO — o guarda precisa REPROVAR quando deve.
 *
 * As três provas que o mandato pede, e nenhuma delas pode ser feita por inspeção do código do
 * guarda: elas exigem exercitar o detector contra o repositório de verdade.
 */
describe("controle positivo do guarda de escopo", () => {
  const temporarios: string[] = [];

  afterAll(() => {
    for (const caminho of temporarios) rmSync(caminho, { force: true });
  });

  it("mudança autorizada na Home é detectada E permitida", () => {
    const alterados = caminhosAlterados();
    expect(alterados).toContain("src/routes/index.tsx");
    expect(foraDoEscopo(PERMITIDOS)).not.toContain("src/routes/index.tsx");
  });

  it("mudança fora do allowlist reprova", () => {
    // Arquivo real, criado agora, num caminho que ninguém autorizou. Se o guarda não o
    // enxergar, ele não está enxergando nada.
    const intruso = join(process.cwd(), "src", "lib", `__intruso-do-guarda-${process.pid}.ts`);
    writeFileSync(intruso, "export const naoAutorizado = true;\n");
    temporarios.push(intruso);
    try {
      const fora = foraDoEscopo(PERMITIDOS);
      expect(fora.some((c) => c.includes("__intruso-do-guarda"))).toBe(true);
    } finally {
      rmSync(intruso, { force: true });
    }
    // E some da lista assim que o arquivo some — o detector mede o presente, não um cache.
    expect(foraDoEscopo(PERMITIDOS).some((c) => c.includes("__intruso-do-guarda"))).toBe(false);
  });

  it("impossibilidade de medir REPROVA, em vez de responder 'nada fora do escopo'", () => {
    // Um repositório de verdade, recém-criado, sem `origin/main` nenhuma. É o cenário exato do
    // CI com clone raso — onde o guarda antigo passava por vacuidade.
    const vazio = mkdtempSync(join(tmpdir(), "vipreco-guarda-"));
    const git = (args: string[]) => execFileSync("git", args, { cwd: vazio, stdio: "ignore" });
    git(["init", "--quiet"]);
    const anterior = process.cwd();
    try {
      process.chdir(vazio);
      expect(mainDisponivel()).toBe(false);
      expect(() => caminhosAlterados()).toThrow(/origin\/main/);
      expect(() => foraDoEscopo(PERMITIDOS)).toThrow(/origin\/main/);
    } finally {
      process.chdir(anterior);
      rmSync(vazio, { recursive: true, force: true });
    }
  });
});
