// Copy e estrutura da busca. Regressão estática, no mesmo espírito de
// `index.demo-source.test.ts`: as frases abaixo foram aprovadas na North Star v1.2.2 e a
// separação entre "vazio" e "erro" é uma decisão de produto, não um detalhe de implementação.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const busca = readFileSync(join(process.cwd(), "src", "components", "ProductSearch.tsx"), "utf-8");
const home = readFileSync(join(process.cwd(), "src", "routes", "index.tsx"), "utf-8");

describe("copy e estados da busca", () => {
  it("usa a mensagem de erro factual aprovada", () => {
    expect(busca).toContain("Não foi possível atualizar a busca agora.");
    expect(busca).toContain("Confira novamente em alguns instantes.");
  });

  it("não culpa a conexão do visitante nem promete tempo real", () => {
    expect(busca).not.toContain("Verifique sua conexão");
    expect(busca).not.toContain("tempo real");
  });

  it("oferece 'Tentar novamente' no erro", () => {
    expect(busca).toContain("Tentar novamente");
    expect(busca).toContain("onClick={() => refetch()}");
  });

  it("o estado vazio não é anunciado como alerta", () => {
    // `role="alert"` aparece uma única vez no arquivo — no erro, e só nele.
    expect(busca.match(/role="alert"/g) ?? []).toHaveLength(1);
    expect(busca).toContain("Ainda não temos esse produto no catálogo.");
  });

  it("o esqueleto substituiu o texto de carregamento", () => {
    expect(busca).toContain("<SearchSkeleton />");
    expect(busca).not.toContain("Buscando produtos…");
    expect(busca).not.toContain("Carregando preços…");
  });

  it("o painel só existe quando o estado deixa de ser inicial", () => {
    expect(busca).toContain('const showPanel = (inline || open) && estado !== "inicial"');
  });
});

describe("a busca na Home", () => {
  it("usa o título e o subtexto aprovados", () => {
    expect(home).toContain("Procurando um produto específico?");
    expect(home).toContain(
      "Compare o mesmo produto entre os mercados, com data e fonte de cada preço.",
    );
  });

  it("mantém o aviso de preços abaixo da busca", () => {
    expect(home).toContain("<PriceDisclaimer />");
    const busca = home.indexOf("<ProductSearch");
    const aviso = home.indexOf("<PriceDisclaimer />");
    expect(busca).toBeGreaterThan(-1);
    expect(aviso).toBeGreaterThan(busca);
  });

  it("os Achados não dependem da busca: vêm do loader, em outra seção", () => {
    // Se a busca falhar, o que já está na tela continua na tela — os Achados nunca passam pelo
    // estado da consulta do cliente.
    expect(home).toContain("<HomeHero");
    expect(home).toContain("opportunities={validOpportunities}");
    expect(home).not.toMatch(/\buseQuery\s*\(/);
  });
});
