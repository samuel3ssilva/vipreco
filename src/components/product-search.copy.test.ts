// Copy e estrutura da busca. Regressão estática, no mesmo espírito de
// `index.demo-source.test.ts`: as frases abaixo foram aprovadas na North Star v1.2.2 e a
// separação entre "vazio" e "erro" é uma decisão de produto, não um detalhe de implementação.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const busca = readFileSync(join(process.cwd(), "src", "components", "ProductSearch.tsx"), "utf-8");
const home = readFileSync(join(process.cwd(), "src", "routes", "index.tsx"), "utf-8");

/**
 * A Home sem os comentários. As proibições abaixo são sobre o que a rota RENDERIZA, e o cabeçalho
 * dela explica por escrito qual cabeçalho de seção saiu — citando, necessariamente, o texto que
 * saiu. A explicação vale mais do que a conveniência de uma busca ingênua por texto.
 */
const homeCodigo = home.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

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
  /**
   * R3.3B §6 e §7 TIRARAM O CABEÇALHO DE SEÇÃO, e o teste mudou junto.
   *
   * Eram duas frases — "Procurando um produto específico?" e uma linha de apoio — explicando um
   * campo que tem lupa, `placeholder` e quatro atalhos com nome de produto logo abaixo. O que a
   * seção precisa continuar tendo é NOME para quem navega por regiões, e a variante de destaque
   * do campo. Rótulo e instrução seguem no HTML, apenas fora do desenho.
   */
  it("a seção continua nomeada, e o campo é o da primeira dobra", () => {
    expect(home).toContain('aria-label="Busca de produto"');
    expect(home).toContain("<ProductSearch destaque");
    expect(homeCodigo).not.toContain("Procurando um produto específico?");
  });

  it("mantém o aviso de preços abaixo da busca, agora discreto", () => {
    // A frase da North Star v1.2.2 continua inteira. O que saiu foi a moldura de alerta: numa
    // tela de descoberta, uma caixa colorida logo abaixo do campo rouba a atenção dos Achados.
    expect(home).toContain("Os preços podem mudar.");
    expect(home).toContain("Confira a data e a fonte");
    expect(home).not.toContain("<PriceDisclaimer />");
    const busca = home.indexOf("<ProductSearch");
    const aviso = home.indexOf("<AvisoDePreco />");
    expect(busca).toBeGreaterThan(-1);
    expect(aviso).toBeGreaterThan(busca);
  });

  it("o rótulo e a instrução continuam existindo para leitor de tela", () => {
    // Escondido visualmente não é ausente: `sr-only` mantém o `<label>` associado e a instrução
    // ligada por `aria-describedby`. Se alguém trocar isso por remoção, o campo perde o nome.
    expect(busca).toContain("htmlFor={inputId}");
    expect(busca).toContain('destaque ? "sr-only"');
    expect(busca).toContain(`aria-describedby={\`\${inputId}-ajuda\`}`);
  });

  it("os Achados não dependem da busca: vêm do loader, em outra seção", () => {
    // Se a busca falhar, o que já está na tela continua na tela — os Achados nunca passam pelo
    // estado da consulta do cliente.
    expect(home).toContain("<HomeAchados");
    expect(home).toContain("opportunities={validOpportunities}");
    expect(home).not.toMatch(/\buseQuery\s*\(/);
  });
});
