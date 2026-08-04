import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatarRelatorio,
  preverBackfill,
  proporLinha,
  type LinhaProduto,
} from "./backfill-preview";
import { buildDemoOpportunities } from "@/lib/demo-opportunities";

const fonte = readFileSync(new URL("./backfill-preview.ts", import.meta.url), "utf-8");

/**
 * O arquivo sem comentário nenhum.
 *
 * A verificação é sobre o que o script EXECUTA. O cabeçalho fala em `UPDATE`, `INSERT` e
 * `DELETE` justamente para dizer que não faz nenhum dos três, e uma checagem que casa em
 * cima do texto inteiro proibiria explicar a própria garantia.
 */
const executavel = fonte
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((linha) => !linha.trimStart().startsWith("//"))
  .join("\n");

function linha(id: string, size_text: string | null, extra: Partial<LinhaProduto> = {}) {
  return { id, name: "Café", brand: "Pilão", variant: "Tradicional", size_text, ...extra };
}

describe("garantia estrutural — a ferramenta não consegue escrever", () => {
  it("não contém comando de escrita em SQL", () => {
    // A garantia mais importante do módulo é negativa, então ela precisa ser verificada
    // no próprio texto: uma promessa em comentário não impede ninguém de acrescentar um
    // UPDATE depois.
    for (const comando of [
      /\bUPDATE\b/i,
      /\bINSERT\b/i,
      /\bDELETE\b/i,
      /\bDROP\b/i,
      /\bALTER\b/i,
      /\bTRUNCATE\b/i,
      /\bUPSERT\b/i,
    ]) {
      expect(executavel, `o script menciona ${comando}`).not.toMatch(comando);
    }
  });

  it("não importa cliente de banco nem abre conexão", () => {
    for (const proibido of [
      /@supabase/,
      /createClient/,
      /\bpg\b/,
      /postgres:/,
      /\bfetch\s*\(/,
      /node:https?/,
      /process\.env/,
    ]) {
      expect(executavel, `o script referencia ${proibido}`).not.toMatch(proibido);
    }
  });

  it("lê arquivo, e só", () => {
    // A única porta de entrada é um JSON no disco, gerado por uma consulta read-only que
    // um humano roda. O script não escolhe o ambiente e não tem como alcançá-lo.
    expect(fonte).toContain('import { readFileSync } from "node:fs"');
    expect(executavel).not.toMatch(/writeFileSync|appendFileSync|createWriteStream|unlink|rmSync/);
  });
});

describe("classificação — cada linha sai rotulada", () => {
  it("leitura única vira proposta segura, com a normalização junto", () => {
    const p = proporLinha(linha("p1", "500 g"));
    expect(p.estado).toBe("proposta_segura");
    expect(p.proposta).toEqual({
      quantity_value: 500,
      quantity_unit: "g",
      package_type: null,
      units_per_package: null,
    });
    expect(p.normalizado).toEqual({ value: 500, unit: "g" });
  });

  it("'500g' e '500 g' convergem — mas só na representação estruturada", () => {
    // O texto original continua diferente e continua intocado. A convergência acontece na
    // proposta, que é o ponto: é ela que resolve o que o índice textual nunca resolveu.
    const semEspaco = proporLinha(linha("p1", "500g"));
    const comEspaco = proporLinha(linha("p2", "500 g"));
    expect(semEspaco.normalizado).toEqual(comEspaco.normalizado);
    expect(semEspaco.texto_original).toBe("500g");
    expect(comEspaco.texto_original).toBe("500 g");
  });

  it("'0,5 kg' e '500 g' convergem na grandeza base", () => {
    expect(proporLinha(linha("p1", "0,5 kg")).normalizado).toEqual(
      proporLinha(linha("p2", "500 g")).normalizado,
    );
  });

  it("peso variável nunca vira proposta", () => {
    for (const texto of ["peso variável", "aprox. 1 kg", "a granel", "1 kg a 1,2 kg"]) {
      const p = proporLinha(linha("p1", texto));
      expect(p.estado, texto).toBe("ambigua");
      expect(p.proposta, texto).toBeNull();
      expect(p.normalizado, texto).toBeNull();
      expect(p.razao).toContain("§4.3");
    }
  });

  it("unidade desconhecida não recebe fator nenhum", () => {
    for (const texto of ["16 oz", "2 lb", "1 conjunto"]) {
      const p = proporLinha(linha("p1", texto));
      expect(p.proposta, texto).toBeNull();
      expect(p.normalizado, texto).toBeNull();
      expect(["nao_suportada", "ambigua"], texto).toContain(p.estado);
    }
  });

  it("número sem unidade é ambíguo, e o relatório diz por quê", () => {
    const p = proporLinha(linha("p1", "12"));
    expect(p.estado).toBe("ambigua");
    expect(p.razao).toContain("nenhuma unidade");
  });

  it("size_text ausente ou vazio vira `ausente`, não erro", () => {
    for (const texto of [null, "", "   "]) {
      const p = proporLinha(linha("p1", texto));
      expect(p.estado, JSON.stringify(texto)).toBe("ausente");
    }
  });

  it("pack contado sugere package_type pack e o conteúdo", () => {
    const p = proporLinha(linha("p1", "12 rolos"));
    expect(p.estado).toBe("proposta_segura");
    expect(p.proposta?.package_type).toBe("pack");
    expect(p.proposta?.units_per_package).toBe(12);
  });

  it("todo estado que não é proposta_segura deixa os quatro campos null", () => {
    for (const texto of [null, "peso variável", "1 conjunto", "12"]) {
      const p = proporLinha(linha("p1", texto));
      expect([...p.permanece_null].sort()).toEqual([
        "package_type",
        "quantity_unit",
        "quantity_value",
        "units_per_package",
      ]);
    }
  });

  it("proposta segura sem embalagem declarada registra que package_type fica null", () => {
    // Embalagem nunca é inferida de texto livre, exceto `pack` contado. É a resposta certa,
    // e o relatório precisa dizer isso em vez de deixar quem revisa achar que acabou.
    const p = proporLinha(linha("p1", "500 g"));
    expect(p.permanece_null).toContain("package_type");
    expect(p.acao_recomendada).toContain("package_type");
  });
});

describe("conflito — duas linhas que não podem ser aprovadas juntas", () => {
  it("'500 g' e '0,5 kg' do mesmo produto colidem, e as duas são marcadas", () => {
    // É o caso real: o índice textual de hoje aceita as duas como produtos distintos, e o
    // índice de R2-A recusaria a segunda. Descobrir aqui é melhor que descobrir no UPDATE.
    const linhas = [linha("p1", "500 g"), linha("p2", "0,5 kg")];
    const relatorio = preverBackfill(linhas);
    expect(relatorio.map((p) => p.estado)).toEqual(["conflito", "conflito"]);
    expect(relatorio[0].acao_recomendada).toContain("Founder/PMO");
  });

  it("mesma quantidade em produtos diferentes não é conflito", () => {
    const relatorio = preverBackfill([linha("p1", "500 g"), linha("p2", "500 g", { name: "Chá" })]);
    expect(relatorio.every((p) => p.estado === "proposta_segura")).toBe(true);
  });

  it("mesma grandeza numérica em unidades diferentes não é conflito", () => {
    const relatorio = preverBackfill([linha("p1", "500 g"), linha("p2", "500 ml")]);
    expect(relatorio.every((p) => p.estado === "proposta_segura")).toBe(true);
  });
});

describe("determinismo", () => {
  it("o mesmo lote produz exatamente o mesmo relatório", () => {
    const linhas = [
      linha("p1", "500 g"),
      linha("p2", "1 L"),
      linha("p3", "peso variável"),
      linha("p4", null),
      linha("p5", "0,5 kg"),
    ];
    const primeiro = JSON.stringify(preverBackfill(linhas));
    for (let i = 0; i < 5; i++) {
      expect(JSON.stringify(preverBackfill(linhas))).toBe(primeiro);
    }
    expect(formatarRelatorio(preverBackfill(linhas))).toBe(
      formatarRelatorio(preverBackfill(linhas)),
    );
  });

  it("a ordem de saída acompanha a ordem de entrada", () => {
    const ids = ["z", "a", "m"].map((id) => linha(id, "500 g"));
    expect(preverBackfill(ids).map((p) => p.product_id)).toEqual(["z", "a", "m"]);
  });
});

describe("execução contra os dados versionados", () => {
  it("os sete produtos do seed produzem proposta para todos", () => {
    const seed = readFileSync(new URL("../supabase/seed.sql", import.meta.url), "utf-8");
    const bloco = seed.slice(seed.indexOf("INSERT INTO public.products"));
    const linhas = [
      ...bloco.matchAll(/\('([0-9a-f-]{36})',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'/g),
    ].map((m) => ({ id: m[1], name: m[2], brand: m[3], variant: m[4], size_text: m[5] }));
    expect(linhas.length).toBe(7);

    const relatorio = preverBackfill(linhas);
    // Sete formatos diferentes de escrever a mesma ideia, e todos são legíveis. O que a
    // ferramenta NÃO faz é transformar isso em aprovação.
    expect(relatorio.every((p) => p.proposta !== null)).toBe(true);
    for (const p of relatorio) {
      expect(p.estado, `${p.texto_original}`).toBe("proposta_segura");
    }
  });

  it("o fixture de demonstração é legível de ponta a ponta", () => {
    const linhas = buildDemoOpportunities(new Date("2026-08-03T12:00:00Z")).map((achado) => ({
      id: achado.product.id,
      name: achado.product.name,
      brand: achado.product.brand,
      variant: achado.product.variant,
      size_text: achado.product.size_text,
    }));
    const relatorio = preverBackfill(linhas);
    expect(relatorio.every((p) => p.estado === "proposta_segura")).toBe(true);
  });

  it("o relatório diz, em texto, que nada foi escrito", () => {
    const texto = formatarRelatorio(preverBackfill([linha("p1", "500 g")]));
    expect(texto).toContain("NADA FOI ESCRITO");
    expect(texto).toContain("decisão humana");
  });

  it("não vaza dado pessoal: o relatório só carrega id, texto e classificação", () => {
    const texto = formatarRelatorio(
      preverBackfill([linha("p1", "500 g", { name: "Café", brand: "Pilão" })]),
    );
    for (const proibido of [/@/, /\+55/, /\bcpf\b/i, /telefone/i]) {
      expect(texto).not.toMatch(proibido);
    }
  });
});
