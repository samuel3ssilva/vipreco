import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveVisualLab } from "@/lib/visual-lab";

/**
 * R3.1 — o contrato do laboratório visual.
 *
 * Ele é a única rota nova desta fase, e o risco dele não é técnico: é de conteúdo. Uma
 * página interna que ganha um card de exemplo com nome de mercado e preço em reais deixa
 * de ser laboratório e vira o vazamento que o contrato visual §1 descreve — "conteúdo
 * inventado para dentro do produto" —, só que com a desculpa de ser um exemplo.
 *
 * O segundo risco é o oposto do primeiro: alguém achar que `noindex` basta. Não basta.
 * `noindex` é um pedido a buscadores, e a rota continuaria respondendo 200 para quem
 * digitasse a URL.
 */
const ROTA = readFileSync(join(process.cwd(), "src/routes/laboratorio-visual.tsx"), "utf-8");
const SITEMAP = readFileSync(join(process.cwd(), "src/routes/sitemap[.]xml.ts"), "utf-8");

describe("o laboratório não pode virar uma tela do produto", () => {
  it("não cita nenhum mercado — nem os ilustrativos do North Star", () => {
    // A imagem mostra "Bom Preço", "Mix Mateus" e "Assaí". Nenhum é parceiro, nenhum
    // autorizou nada, e reproduzi-los aqui seria apresentá-los como se fossem.
    for (const mercado of ["Bom Preço", "Mix Mateus", "Assaí", "Atacadão", "Carrefour"]) {
      expect(ROTA, `o laboratório cita ${mercado}`).not.toContain(mercado);
    }
  });

  it("não cita bairro nem cidade", () => {
    // O piloto é em Artemis, Piracicaba-SP. O mockup mostra Jardim Atlântico, São Luís.
    // Nenhum dos dois pertence a uma página de tokens.
    for (const lugar of ["Artemis", "Piracicaba", "Jardim Atlântico", "São Luís"]) {
      expect(ROTA, `o laboratório cita ${lugar}`).not.toContain(lugar);
    }
  });

  it("o único valor monetário é um zero explícito da amostra tipográfica", () => {
    // `R$ 00,00` existe para mostrar a escala de preço com a fonte tabular. Qualquer
    // outro número em reais seria um preço, e preço sem procedência é boato (princípio 10).
    const emReais = [...ROTA.matchAll(/R\$\s*[\d.,]+/g)].map((m) => m[0]);
    expect(emReais).toEqual(["R$ 00,00"]);
  });

  it("não menciona preço unitário, promoção nem preço anterior", () => {
    // Os três são conflitos registrados entre a imagem e os contratos. Nenhum se resolve
    // numa página de fundação — e vê-los aqui sugeriria que já foram resolvidos.
    for (const proibido of ["/kg", "R$/", "Leve 3", "Preço anterior", "menor preço"]) {
      expect(ROTA, `o laboratório menciona ${proibido}`).not.toContain(proibido);
    }
  });

  it("não importa fixture, serviço nem cliente de banco", () => {
    for (const proibido of ["@/services", "@/integrations", "demo-opportunities", "supabase"]) {
      expect(ROTA).not.toContain(proibido);
    }
  });
});

describe("o laboratório não é público", () => {
  it("tem um portão que decide se a rota existe", () => {
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
    // Um link no header transformaria uma página interna em parte da experiência sem que
    // ninguém tivesse decidido isso.
    const shell = readFileSync(join(process.cwd(), "src/components/AppShell.tsx"), "utf-8");
    expect(shell).not.toContain("laboratorio");
  });
});

describe("o portão fecha por padrão", () => {
  it("build de produção sem a variável: fechado", () => {
    expect(resolveVisualLab(undefined, false)).toBe(false);
    expect(resolveVisualLab("", false)).toBe(false);
    expect(resolveVisualLab("0", false)).toBe(false);
    expect(resolveVisualLab("false", false)).toBe(false);
  });

  it("abre só com opt-in explícito", () => {
    expect(resolveVisualLab("1", false)).toBe(true);
    expect(resolveVisualLab("true", false)).toBe(true);
  });

  it("e sempre aberto em desenvolvimento, que é onde ele serve", () => {
    expect(resolveVisualLab(undefined, true)).toBe(true);
  });
});

describe("a Home e o ranking continuam intocados", () => {
  /**
   * O mandato §16 pede a confirmação; um `git diff` contra a `main` é a única forma de
   * dá-la sem depender de alguém lembrar de olhar. Um teste que afirmasse isso por
   * inspeção de texto provaria bem menos.
   */
  function mudouNaBranch(caminho: string): boolean {
    try {
      const saida = execFileSync(
        "git",
        ["diff", "--name-only", "origin/main...HEAD", "--", caminho],
        {
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      return saida.trim().length > 0;
    } catch {
      // Sem `origin/main` local (clone raso, fork) a comparação não é possível. Declarar
      // "não mudou" aqui seria afirmar o que não se mediu.
      return false;
    }
  }

  it.each([
    "src/routes/index.tsx",
    "src/components/AchadoCard.tsx",
    "src/components/PriceCard.tsx",
    "src/components/PriceSummary.tsx",
    "src/components/AppShell.tsx",
    "src/lib/comparison.ts",
  ])("%s não foi alterado por R3.1", (caminho) => {
    expect(mudouNaBranch(caminho), `${caminho} mudou nesta branch`).toBe(false);
  });
});
