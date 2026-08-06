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
