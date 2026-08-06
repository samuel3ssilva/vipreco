import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compararComMain } from "@/test-support/git-guard";
import { VARIANTES } from "@/components/card-v2/fixtures";

/**
 * R3.2 — o contrato do laboratório do Card v2.
 *
 * =============================================================================
 * ELE É MAIS ESTRITO QUE O DA R3.1, E NÃO MAIS FROUXO
 * =============================================================================
 *
 * O contrato de `/laboratorio-visual` proíbe qualquer valor em reais que não seja
 * `R$ 00,00`, e proíbe nome de mercado. Esta rota precisa dos dois — é o Card v2 com
 * conteúdo. A tentação era mover o card para lá e afrouxar aquele teste; seria contornar
 * um guarda em vez de escrever o segundo.
 *
 * Então aqui a regra muda de forma, não de força: preço e mercado podem existir, e **só**
 * podem vir do fixture fictício versionado. Nada remoto, nenhum nome de rede, nenhum
 * bairro real, nenhum logotipo, nenhum GTIN.
 */
const ROTA = readFileSync(join(process.cwd(), "src/routes/laboratorio-card-v2.tsx"), "utf-8");
const FIXTURES = readFileSync(join(process.cwd(), "src/components/card-v2/fixtures.ts"), "utf-8");
const SITEMAP = readFileSync(join(process.cwd(), "src/routes/sitemap[.]xml.ts"), "utf-8");

/** O arquivo sem os comentários — o que a página de fato executa e renderiza. */
function semComentario(fonte: string): string {
  return fonte
    .split("\n")
    .filter((linha) => {
      const t = linha.trimStart();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
}

const ROTA_EXECUTAVEL = semComentario(ROTA);
const FIXTURES_EXECUTAVEL = semComentario(FIXTURES);

describe("nada real entra no laboratório do Card v2", () => {
  it.each([
    ["a rota", ROTA_EXECUTAVEL],
    ["o fixture", FIXTURES_EXECUTAVEL],
  ])("%s não cita nenhuma rede de mercado", (_, fonte) => {
    // Os três primeiros são os ilustrativos do North Star. Nenhum é parceiro, nenhum
    // autorizou nada, e um card com o nome de um deles é indistinguível de um card real
    // assim que sai da página em que nasceu.
    for (const rede of ["Bom Preço", "Mix Mateus", "Assaí", "Atacadão", "Carrefour", "Pão de "]) {
      expect(fonte, `cita ${rede}`).not.toContain(rede);
    }
  });

  it.each([
    ["a rota", ROTA_EXECUTAVEL],
    ["o fixture", FIXTURES_EXECUTAVEL],
  ])("%s não cita bairro nem cidade de verdade", (_, fonte) => {
    for (const lugar of ["Artemis", "Piracicaba", "Jardim Atlântico", "São Luís"]) {
      expect(fonte, `cita ${lugar}`).not.toContain(lugar);
    }
  });

  it("o fixture usa os nomes neutros combinados", () => {
    // O oposto do teste acima. Sem esta metade, apagar todos os nomes faria o anterior
    // passar por vacuidade — e um laboratório sem conteúdo nenhum não prova card nenhum.
    for (const neutro of ["Mercado Exemplo", "Bairro Exemplo", "Produto Demonstrativo"]) {
      expect(FIXTURES).toContain(neutro);
    }
  });

  it("nenhum GTIN — nem exibido, nem guardado", () => {
    // O card não mostra identificador, e o fixture não carrega nenhum: `gtin` é sempre
    // `null`. Uma sequência de 8 a 14 dígitos seguidos seria a assinatura de um.
    expect(FIXTURES_EXECUTAVEL).not.toMatch(/\b\d{8,14}\b/);
    expect(FIXTURES).toContain("gtin: null");
  });

  it("nenhum logotipo de terceiro, nem por URL nem por arquivo", () => {
    for (const fonte of [ROTA_EXECUTAVEL, FIXTURES_EXECUTAVEL]) {
      expect(fonte).not.toMatch(/logo/i);
    }
  });

  it("nenhuma imagem externa — a única é um desenho embutido", () => {
    expect(FIXTURES_EXECUTAVEL).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(FIXTURES).toContain("data:image/svg+xml");
  });

  it("nenhum histórico de preço — não há contrato que o sustente", () => {
    // DL-030. O card exibia "antes R$ 14,90 · 13% mais barato que em 25/07/2026" com a
    // regra certa; o que faltava era **P-01**, a janela da observação anterior, que nunca
    // foi decidida. Sem ela, dois cards com o mesmo dado exibem percentuais diferentes e
    // os dois estão "certos".
    //
    // Este teste olha a ROTA e o FIXTURE, e não a função de domínio: o risco real não é
    // alguém reescrever a regra, é alguém devolver um `previous_price` ao fixture e a
    // demonstração voltar a mostrar o que não pode mostrar.
    for (const fonte of [ROTA_EXECUTAVEL, FIXTURES_EXECUTAVEL]) {
      for (const sinal of ["previous_price", "previous_observed_at", "precoAnterior"]) {
        expect(fonte, `há sinal de histórico: ${sinal}`).not.toContain(sinal);
      }
      expect(fonte.toLowerCase()).not.toMatch(/mais (barato|caro) que em/);
    }
  });

  it("nenhuma LEGENDA do laboratório promete histórico de preço", () => {
    // A LEGENDA É EVIDÊNCIA, E ENGANA TÃO BEM QUANTO O COMPONENTE.
    //
    // O teste acima olha o dado e a regra. Ele passou o tempo todo, e mesmo assim a
    // captura do laboratório mostrava, logo acima da variante A, a frase "há observação
    // anterior com data, então o percentual aparece". O card abaixo não mostrava
    // percentual nenhum. Quem lê uma captura lê as duas coisas juntas, e acredita na
    // legenda.
    //
    // Por isso a asserção é sobre o TEXTO RENDERIZADO das variantes, e não sobre o
    // arquivo: é o que chega aos olhos de quem revisa o Gate.
    const legendas = VARIANTES.map((v) => `${v.titulo} ${v.proposito}`.toLowerCase());
    for (const legenda of legendas) {
      for (const promessa of [
        "percentual",
        "preço anterior",
        "observação anterior",
        "economia",
        "queda",
        "antes r$",
      ]) {
        expect(legenda, `uma legenda do laboratório promete "${promessa}"`).not.toContain(promessa);
      }
    }
  });

  it("nenhuma promessa absoluta de menor preço", () => {
    for (const promessa of ["menor preço", "o mais barato", "melhor preço", "imperdível"]) {
      expect(ROTA.toLowerCase(), `a rota promete "${promessa}"`).not.toContain(promessa);
    }
  });
});

describe("o laboratório não fala com o mundo lá fora", () => {
  it("não importa serviço, cliente de banco nem fixture de demonstração do produto", () => {
    for (const proibido of ["@/services", "@/integrations", "supabase", "demo-opportunities"]) {
      expect(ROTA_EXECUTAVEL, `a rota importa ${proibido}`).not.toContain(proibido);
    }
  });

  it("não faz chamada de rede nenhuma", () => {
    for (const proibido of ["fetch(", "XMLHttpRequest", "useQuery", "loader:"]) {
      expect(ROTA_EXECUTAVEL, `a rota usa ${proibido}`).not.toContain(proibido);
    }
  });

  it("o instante de referência é fixo — nenhum relógio no render", () => {
    // `Date.now()` produziria HTML diferente no servidor e no cliente (divergência de
    // hidratação) e faria a evidência mudar sozinha entre duas capturas.
    for (const fonte of [ROTA_EXECUTAVEL, FIXTURES_EXECUTAVEL]) {
      expect(fonte).not.toContain("Date.now()");
      expect(fonte).not.toContain("Math.random");
    }
    expect(FIXTURES).toContain('new Date("2026-08-06T15:00:00.000Z")');
  });
});

describe("o laboratório do Card v2 não é público", () => {
  it("tem o mesmo portão, que decide se a rota existe", () => {
    expect(ROTA).toContain("isVisualLabEnabled");
    expect(ROTA).toContain("notFound()");
  });

  it("e também pede `noindex` — as duas coisas, não uma", () => {
    expect(ROTA).toMatch(/name:\s*"robots",\s*content:\s*"noindex, nofollow"/);
  });

  it("não entra no sitemap", () => {
    expect(SITEMAP).not.toContain("laboratorio");
  });

  it("não é alcançável pela navegação do produto", () => {
    const shell = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf-8");
    expect(shell).not.toContain("laboratorio");
  });
});

describe("as oito variantes obrigatórias estão no laboratório", () => {
  it("A a H, sem faltar nenhuma", () => {
    // A ordem e o conteúdo saem do mandato §9. `D` aparece em duas leituras porque
    // "desatualizada" tem duas causas distintas no domínio.
    for (const chave of ["A", "B", "C", "D1", "D2", "E", "F", "G", "H"]) {
      expect(FIXTURES, `falta a variante ${chave}`).toContain(`chave: "${chave}"`);
    }
  });

  it("nenhuma variante patrocinada — não há contrato normativo para ela", () => {
    // Conteúdo pago vive em seção separada e rotulada, e **jamais** reordena a lista
    // orgânica. Enquanto não houver contrato aprovado na main, desenhar a variante seria
    // decidir o assunto pelo desenho.
    for (const fonte of [ROTA_EXECUTAVEL, FIXTURES_EXECUTAVEL]) {
      for (const proibido of ["patrocinad", "is_featured: true", "destaque pago", "sponsor"]) {
        expect(fonte.toLowerCase(), `há sinal de patrocínio: ${proibido}`).not.toContain(
          proibido.toLowerCase(),
        );
      }
    }
  });
});

describe("R3.2 não toca em nada que já está no ar", () => {
  /**
   * `git diff` contra a `main` é a única forma de dar esta garantia sem depender de alguém
   * lembrar de olhar. Um teste que afirmasse isto por inspeção de texto provaria bem menos.
   *
   * =============================================================================
   * "NÃO CONSEGUI MEDIR" DEIXOU DE SER UM RESULTADO ACEITÁVEL
   * =============================================================================
   *
   * A comparação vive agora em `@/test-support/git-guard`, e ela **lança** quando não
   * consegue comparar. A versão que morava aqui tinha um terceiro estado, `"indisponivel"`,
   * e as asserções abaixo apenas exigiam "nunca `mudou`" — o que fazia o arquivo inteiro
   * passar por vacuidade num ambiente incapaz de comparar. E esse ambiente era o CI:
   * `actions/checkout` clonava com profundidade 1, e `origin/main` não existia lá.
   *
   * Corrigido em duas metades, nenhuma suficiente sozinha: `fetch-depth: 0` no workflow,
   * para que a comparação seja possível; e o guarda que falha alto quando ela não for,
   * para que a impossibilidade nunca mais possa ser lida como "está tudo intacto".
   *
   * O controle positivo do detector vive junto do guarda, em
   * `src/test-support/git-guard.test.ts`, e não aqui — lá ele é feito com um arquivo
   * temporário, o que o torna independente de qual branch está sendo testada. A versão
   * anterior usava `src/lib/card-v2.ts`, que esta branch cria: ela provava o detector hoje
   * e viraria uma falha na `main` no dia em que este PR fosse mergeado.
   */
  const PROTEGIDOS = [
    "src/routes/index.tsx",
    "src/routes/buscar.tsx",
    "src/routes/produto.$productId.tsx",
    "src/components/AchadoCard.tsx",
    "src/components/PriceCard.tsx",
    "src/components/PriceSummary.tsx",
    "src/components/AppShell.tsx",
    "src/lib/comparison.ts",
    "src/services/catalog.ts",
    "supabase/migrations",
    "wrangler.jsonc",
  ] as const;

  it.each(PROTEGIDOS)("%s não foi alterado por R3.2", (caminho) => {
    expect(compararComMain(caminho), `${caminho} mudou nesta branch`).toBe("intacto");
  });
});
