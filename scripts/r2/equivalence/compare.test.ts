import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classificarGrants,
  comparar,
  lerFingerprint,
  normalizar,
  recortarDivergencia,
  renderizar,
} from "./compare";

/**
 * R2.4 §5 — o comparador de equivalência de schema.
 *
 * O que este arquivo protege, em ordem de gravidade se quebrar:
 *
 * 1. QUE `EXACT EQUIVALENT` SEJA DIFÍCIL. Ele é o único veredito que autoriza adotar as
 *    oito versões como baseline histórico. Um comparador que normaliza demais devolve
 *    "equivalente" para bancos diferentes, e o resultado seria carimbar como aplicadas
 *    dez migrations cujo efeito não está lá — trocar uma incerteza conhecida por uma
 *    certeza falsa.
 *
 * 2. QUE `UNKNOWN` NÃO VIRE `MATERIAL DRIFT`. Falhar por fato medido e falhar por não ter
 *    conseguido medir levam a decisões diferentes, e o relatório precisa dizer qual é.
 *
 * 3. QUE O `.sql` CONTINUE READ-ONLY. Ele roda contra staging.
 */

const FINGERPRINT_SQL = readFileSync(new URL("./fingerprint.sql", import.meta.url), "utf-8");

/** Um schema mínimo, mas com um objeto de cada categoria que importa. */
const BASE = [
  "fp.guard.read_only|on",
  "fp.db.version|17.6",
  "fp.tabela|products|kind=r,rls=true,forcada=false",
  "fp.coluna|products.gtin|pos=7,tipo=text,notnull=false,default=(nenhum)",
  "fp.coluna|products.id|pos=1,tipo=uuid,notnull=true,default=gen_random_uuid()",
  "fp.constraint|products.products_pkey|tipo=p,validada=true,def=PRIMARY KEY (id)",
  "fp.indice|products.products_gtin_unique_idx|CREATE UNIQUE INDEX products_gtin_unique_idx ON public.products USING btree (gtin) WHERE (gtin IS NOT NULL)",
  "fp.funcao|pa_normalize_text(text)|volatil=i,secdef=false,kind=f,def=CREATE OR REPLACE FUNCTION public.pa_normalize_text(t text) RETURNS text",
  "fp.policy|products.leitura_publica|cmd=r,permissiva=t,papeis=anon,using=(is_active),check=(nenhum)",
  "fp.grant_tabela|products:anon:SELECT|concedido",
  "fp.grant_funcao|pa_normalize_text(text):service_role:EXECUTE|concedido",
  "fp.comentario|coluna:products.size_text|Texto de exibicao, nunca fonte de calculo.",
  "fp.extensao|pg_trgm|schema=extensions",
].join("\n");

const trocar = (de: string, para: string) => BASE.replace(de, para);

describe("lerFingerprint", () => {
  it("separa categoria, identidade e assinatura", () => {
    const m = lerFingerprint("fp.coluna|products.gtin|pos=7,tipo=text");
    expect([...m.values()]).toEqual([
      { categoria: "fp.coluna", identidade: "products.gtin", assinatura: "pos=7,tipo=text" },
    ]);
  });

  it("ignora linha em branco e linha que não é fato", () => {
    const m = lerFingerprint("\nBEGIN\nSET\nfp.tabela|products|kind=r\nROLLBACK\n");
    expect(m.size).toBe(1);
  });

  it("aceita fato sem assinatura, como as linhas de contexto", () => {
    const m = lerFingerprint("fp.db.version|17.6");
    expect([...m.values()][0]).toEqual({
      categoria: "fp.db.version",
      identidade: "17.6",
      assinatura: "",
    });
  });
});

describe("normalizar — só o que o mandato permite", () => {
  it("remove qualificação de schema equivalente", () => {
    expect(normalizar("SELECT public.f(extensions.g(x))")).toBe("SELECT f(g(x))");
    expect(normalizar("pg_catalog.now()")).toBe("now()");
  });

  it("colapsa espaço em branco", () => {
    expect(normalizar("CREATE   INDEX\n  x")).toBe("CREATE INDEX x");
  });

  it("NÃO remove qualificação de schema inesperado", () => {
    // Uma função que migrou para outro schema é drift, e precisa aparecer como tal.
    expect(normalizar("auth.uid()")).toBe("auth.uid()");
  });

  it("NÃO toca em nada além disso", () => {
    for (const original of [
      "notnull=true",
      "validada=false",
      "WHERE (gtin IS NOT NULL)",
      "USING btree (gtin)",
      "papeis=anon,authenticated",
      "volatil=i",
    ]) {
      expect(normalizar(original)).toBe(original);
    }
  });
});

describe("comparar", () => {
  it("EXACT EQUIVALENT quando os dois lados são idênticos", () => {
    const c = comparar(BASE, BASE);
    expect(c.classificacao).toBe("EXACT EQUIVALENT");
    expect(c.diferencas).toEqual([]);
    expect(c.objetosComparados).toBe(11);
  });

  it("EXACT EQUIVALENT quando a única diferença é qualificação ou espaço", () => {
    const outroLado = BASE.replace("ON public.products USING btree", "ON products   USING  btree");
    expect(comparar(BASE, outroLado).classificacao).toBe("EXACT EQUIVALENT");
  });

  it("EXACT EQUIVALENT sobrevive a patch diferente do PostgreSQL", () => {
    expect(comparar(BASE, trocar("fp.db.version|17.6", "fp.db.version|17.2")).classificacao).toBe(
      "EXACT EQUIVALENT",
    );
  });

  it("e a versão do Postgres nunca é contada como objeto divergente", () => {
    const c = comparar(BASE, trocar("fp.db.version|17.6", "fp.db.version|17.2"));
    expect(c.diferencas).toEqual([]);
    expect(c.objetosComparados).toBe(11);
  });

  /**
   * Um caso por tipo de diferença que o mandato proíbe normalizar. Todos são a mesma
   * asserção, e é de propósito: a lista existe para que remover qualquer item dela quebre
   * um teste com nome próprio, em vez de sumir numa condição composta.
   */
  it.each([
    ["nulabilidade", "notnull=false,default=(nenhum)", "notnull=true,default=(nenhum)"],
    ["default", "default=gen_random_uuid()", "default=uuid_generate_v4()"],
    ["tipo de coluna", "tipo=text,notnull=false", "tipo=character varying,notnull=false"],
    ["validação de constraint", "validada=true,def=PRIMARY KEY", "validada=false,def=PRIMARY KEY"],
    ["predicado de índice", "WHERE (gtin IS NOT NULL)", "WHERE (gtin IS NOT NULL AND is_active)"],
    ["expressão de policy", "using=(is_active)", "using=(true)"],
    ["papéis de policy", "papeis=anon", "papeis=anon,authenticated"],
    ["RLS", "rls=true,forcada=false", "rls=false,forcada=false"],
    ["volatilidade de função", "volatil=i,secdef=false", "volatil=v,secdef=false"],
    ["modo de segurança", "secdef=false,kind=f", "secdef=true,kind=f"],
    ["corpo de função", "RETURNS text", "RETURNS citext"],
    ["comentário normativo", "nunca fonte de calculo", "pode ser usado em calculo"],
  ])("MATERIAL DRIFT quando %s difere", (_rotulo, de, para) => {
    const c = comparar(BASE, trocar(de, para));
    expect(c.classificacao).toBe("MATERIAL DRIFT");
    expect(c.diferencas).toHaveLength(1);
    expect(c.diferencas[0]!.tipo).toBe("assinatura diferente");
  });

  it("MATERIAL DRIFT quando o ambiente tem um grant a mais", () => {
    const c = comparar(BASE, `${BASE}\nfp.grant_tabela|products:anon:INSERT|concedido`);
    expect(c.classificacao).toBe("MATERIAL DRIFT");
    expect(c.diferencas[0]).toMatchObject({ tipo: "só no ambiente", categoria: "fp.grant_tabela" });
  });

  it("MATERIAL DRIFT quando falta um objeto no ambiente", () => {
    const semIndice = BASE.split("\n")
      .filter((l) => !l.startsWith("fp.indice|"))
      .join("\n");
    const c = comparar(BASE, semIndice);
    expect(c.classificacao).toBe("MATERIAL DRIFT");
    expect(c.diferencas[0]).toMatchObject({ tipo: "só no esperado", categoria: "fp.indice" });
  });

  it("UNKNOWN quando um dos lados veio vazio — e nunca EXACT EQUIVALENT", () => {
    expect(comparar(BASE, "").classificacao).toBe("UNKNOWN");
    expect(comparar("", BASE).classificacao).toBe("UNKNOWN");
    // O erro perigoso: dois vazios "batem" e passariam por equivalentes.
    expect(comparar("", "").classificacao).toBe("UNKNOWN");
  });

  it("UNKNOWN quando a leitura do ambiente não foi read-only", () => {
    const c = comparar(BASE, trocar("fp.guard.read_only|on", "fp.guard.read_only|off"));
    expect(c.classificacao).toBe("UNKNOWN");
    expect(c.motivo).toContain("read-only");
  });

  it("UNKNOWN quando há diferença E as versões maiores divergem", () => {
    // Não dá para separar drift de schema de mudança de renderizador. Chamar de MATERIAL
    // DRIFT afirmaria mais do que se mediu.
    const outro = trocar("fp.db.version|17.6", "fp.db.version|16.4").replace(
      "volatil=i",
      "volatil=v",
    );
    const c = comparar(BASE, outro);
    expect(c.classificacao).toBe("UNKNOWN");
    expect(c.motivo).toContain("renderizador");
  });

  it("mas versões maiores diferentes SEM diferença continuam EXACT EQUIVALENT", () => {
    // É uma prova mais forte, não mais fraca: sobreviveu à troca de renderizador.
    expect(comparar(BASE, trocar("fp.db.version|17.6", "fp.db.version|16.4")).classificacao).toBe(
      "EXACT EQUIVALENT",
    );
  });
});

describe("renderizar", () => {
  it("EXACT EQUIVALENT diz o que a adoção NÃO afirma", () => {
    const md = renderizar(comparar(BASE, BASE));
    expect(md).toContain("EXACT EQUIVALENT");
    expect(md).toContain("procedência");
    // R2.5: a adoção passou a ser das SETE versões, e a lista do que ela NÃO autoriza
    // cresceu junto — normalização e hardening entraram na frente de R2-A.
    expect(md).toContain("Não autoriza aplicar a normalização");
    expect(md).toContain("R2-A");
  });

  it("MATERIAL DRIFT recusa reparar, e diz por quê", () => {
    const md = renderizar(comparar(BASE, trocar("rls=true", "rls=false")));
    expect(md).toContain("MATERIAL DRIFT");
    expect(md).toContain("certeza falsa");
    expect(md).toContain("`fp.tabela`");
  });

  it("UNKNOWN se distingue de reprovação no texto", () => {
    const md = renderizar(comparar(BASE, ""));
    expect(md).toContain("não foi conclusiva");
  });

  it("a contrabarra é escapada ANTES do pipe, senão a tabela quebra na linha que importa", () => {
    // `a\|b` escapado só no pipe vira `a\\|b` — em Markdown, `\\` é contrabarra literal e
    // o `|` seguinte volta a separar célula. Definição de função em Postgres carrega
    // contrabarra de verdade (`regexp_replace(..., '\s+', ' ')`), então não é hipótese.
    const comBarra = `${BASE}\nfp.funcao|f()|def=regexp_replace(x, '\\s+', ' ')`;
    const md = renderizar(comparar(BASE, comBarra));
    expect(md).toContain("\\\\s+");
    // Nenhuma linha da tabela pode ter mais células do que o cabeçalho declara.
    const linhasDeTabela = md.split("\n").filter((l) => l.startsWith("| `"));
    expect(linhasDeTabela.length).toBeGreaterThan(0);
    for (const linha of linhasDeTabela) {
      const celulas = linha.split(/(?<!\\)\|/).length;
      expect(celulas, `linha com célula a mais: ${linha}`).toBe(6);
    }
  });

  it("o `|` de uma assinatura não quebra a tabela Markdown", () => {
    const comBarra = `${BASE}\nfp.constraint|products.x|tipo=c,validada=true,def=CHECK ((a | b) > 0)`;
    const md = renderizar(comparar(BASE, comBarra));
    expect(md).toContain("(a \\| b)");
  });

  it("nunca imprime credencial, host ou linha de tabela", () => {
    const md = renderizar(comparar(BASE, BASE));
    for (const proibido of [/password/i, /postgres(ql)?:\/\//, /supabase\.co/, /\beyJ/]) {
      expect(md).not.toMatch(proibido);
    }
  });
});

/**
 * Estes casos existem por causa de um defeito real, achado na primeira execução contra
 * staging (run 31041870966): o relatório imprimiu duas células com texto IDÊNTICO sob o
 * rótulo "assinatura diferente", porque as duas assinaturas só divergiam depois de um
 * prefixo comum maior que o limite de corte.
 */
describe("recortarDivergencia — a diferença precisa aparecer na célula", () => {
  const PREFIXO = "CREATE OR REPLACE FUNCTION public.pa_normalize_text(input text) RETURNS text ";

  it("mostra o ponto onde os dois lados se separam, e não o começo comum", () => {
    const [esq, dir] = recortarDivergencia(
      `${PREFIXO}AS $$ SELECT btrim(regexp_replace(lower(x), 'a', 'b')) $$`,
      `${PREFIXO}AS $$ SELECT lower(x) $$`,
    );
    expect(esq).not.toBe(dir);
    expect(esq).toContain("btrim");
    expect(dir).toContain("lower(x)");
    expect(dir).not.toContain("btrim");
  });

  it("marca com reticências que houve corte à esquerda", () => {
    const [esq, dir] = recortarDivergencia(`${PREFIXO}IMMUTABLE`, `${PREFIXO}STABLE`);
    expect(esq.startsWith("…")).toBe(true);
    expect(dir.startsWith("…")).toBe(true);
  });

  it("não corta quando a divergência já está no começo", () => {
    const a = "volatil=i,secdef=f";
    const b = "volatil=s,secdef=f";
    expect(recortarDivergencia(a, b)).toEqual([a, b]);
  });

  it("não corta quando um lado é prefixo curto do outro", () => {
    expect(recortarDivergencia("abc", "abcdef")).toEqual(["abc", "abcdef"]);
  });

  it("preserva contexto igual antes da divergência, para a célula ser legível", () => {
    const [esq] = recortarDivergencia(`${PREFIXO}IMMUTABLE`, `${PREFIXO}STABLE`);
    // O trecho comum imediatamente anterior tem que estar lá: sem ele, o leitor vê o
    // caractere divergente sem saber em que ponto da definição ele está.
    expect(esq).toContain("text ");
  });

  it("o relatório de duas assinaturas com prefixo longo não repete a mesma célula", () => {
    const comum = "fp.funcao|f(text)|";
    const esperado = [`${comum}def=${PREFIXO}AS $$ SELECT btrim(x) $$`];
    const encontrado = [`${comum}def=${PREFIXO}AS $$ SELECT lower(x) $$`];
    const md = renderizar(comparar(esperado.join("\n"), encontrado.join("\n")));
    const linha = md.split("\n").find((l) => l.includes("assinatura diferente"));
    expect(linha).toBeDefined();
    const celulas = linha!.split("|").map((c) => c.trim());
    // As duas células de valor precisam ser diferentes entre si — que é exatamente o
    // que o defeito original violava.
    expect(celulas[3]).not.toBe(celulas[4]);
  });
});

describe("fingerprint.sql é read-only, e isso é verificável", () => {
  const executavel = FINGERPRINT_SQL.split("\n")
    .filter((l) => !l.trimStart().startsWith("--"))
    .join("\n");

  const VERBOS = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "MERGE",
    "TRUNCATE",
    "COPY",
    "ALTER",
    "CREATE",
    "DROP",
    "GRANT",
    "REVOKE",
    "CALL",
    "DO",
  ] as const;

  it.each(VERBOS)("não contém %s fora de comentário", (verbo) => {
    expect(executavel).not.toMatch(new RegExp(`\\b${verbo}\\b`, "i"));
  });

  it("e o guarda acima reprova quando um verbo entra", () => {
    const hostil = `${executavel}\nDROP TABLE public.products;`;
    expect(VERBOS.some((v) => new RegExp(`\\b${v}\\b`, "i").test(hostil))).toBe(true);
  });

  it("todo statement começa com SELECT ou WITH", () => {
    const statements = executavel
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    expect(statements.length).toBeGreaterThan(10);
    for (const s of statements) expect(s).toMatch(/^(SELECT|WITH)\b/i);
  });

  it("não lê linha de nenhuma tabela de negócio", () => {
    // A comparação é de SCHEMA. Tocar em `products`, `prices` ou `markets` como tabela
    // (e não como nome no catálogo) seria ler dado que a pergunta não precisa.
    for (const tabela of ["public.products", "public.prices", "public.markets"]) {
      expect(executavel).not.toContain(`FROM ${tabela}`);
    }
  });

  it("cobre todas as categorias que o mandato §5 exige", () => {
    for (const categoria of [
      "fp.tabela",
      "fp.coluna",
      "fp.constraint",
      "fp.indice",
      "fp.funcao",
      "fp.trigger",
      "fp.policy",
      "fp.grant_tabela",
      "fp.grant_funcao",
      "fp.comentario",
      "fp.extensao",
    ]) {
      expect(FINGERPRINT_SQL, `categoria ausente: ${categoria}`).toContain(`'${categoria}'`);
    }
  });

  it("colapsa espaço em branco na origem, senão o formato linha a linha quebraria", () => {
    // `pg_get_functiondef` devolve texto com quebra de linha. Sem o `regexp_replace`, uma
    // única função viraria dezenas de "fatos" e o comparador leria lixo.
    for (const renderizador of [
      "pg_get_functiondef",
      "pg_get_constraintdef",
      "pg_get_indexdef",
      "pg_get_triggerdef",
      "pg_get_expr",
    ]) {
      expect(executavel, `${renderizador} sem normalização de espaço`).toContain(
        `regexp_replace(${renderizador}`,
      );
    }
  });
});

/**
 * R2.5 §2 — a classificação de grants existe para o relatório VER o que o veredito ignora.
 *
 * Desde que o lado esperado passou a reproduzir os default privileges da plataforma, os
 * grants aparecem dos dois lados e somem do diff. Isso é correto para a pergunta "o schema
 * é o das sete migrations?" — e seria uma armadilha como resposta final, porque tornaria
 * invisível justamente o achado que motivou a migration de hardening.
 */
describe("classificarGrants — modelar para não confundir, nunca para não enxergar", () => {
  const linha = (t: string, p: string, priv: string) =>
    `fp.grant_tabela|${t}:${p}:${priv}|concedido`;

  it.each(["INSERT", "UPDATE", "DELETE", "TRUNCATE"])(
    "%s de anon em tabela central é categoria C",
    (priv) => {
      const [g] = classificarGrants(linha("products", "anon", priv));
      expect(g?.categoria).toBe("C. inseguro — exige hardening");
    },
  );

  it.each(["markets", "prices", "products"])("as três centrais entram em C — %s", (tabela) => {
    const [g] = classificarGrants(linha(tabela, "authenticated", "DELETE"));
    expect(g?.categoria).toBe("C. inseguro — exige hardening");
  });

  it("TRUNCATE recebe justificativa própria — a RLS não se aplica a ele", () => {
    const [truncate] = classificarGrants(linha("prices", "anon", "TRUNCATE"));
    const [del] = classificarGrants(linha("prices", "anon", "DELETE"));
    expect(truncate?.porque).toContain("RLS");
    expect(truncate?.porque).not.toBe(del?.porque);
  });

  it("SELECT público é categoria B — leitura é o produto", () => {
    const [g] = classificarGrants(linha("products", "anon", "SELECT"));
    expect(g?.categoria).toBe("B. intencional do aplicativo");
  });

  it("escrita nas tabelas de contribuição é B, não C — elas têm contrato e policy", () => {
    for (const t of ["price_submissions", "product_watch_requests", "decision_feedback"]) {
      const [g] = classificarGrants(linha(t, "anon", "INSERT"));
      expect(g?.categoria, `${t} foi classificada errado`).toBe("B. intencional do aplicativo");
    }
  });

  it("service_role e o owner nunca são categoria C", () => {
    for (const papel of ["service_role", "postgres"]) {
      const [g] = classificarGrants(linha("products", papel, "TRUNCATE"));
      expect(g?.categoria).toBe("B. intencional do aplicativo");
    }
  });

  it("PUBLIC com escrita em tabela central também é C", () => {
    const [g] = classificarGrants(linha("markets", "PUBLIC", "UPDATE"));
    expect(g?.categoria).toBe("C. inseguro — exige hardening");
  });

  it("REFERENCES e TRIGGER de anon são A — plataforma, sem efeito de escrita", () => {
    for (const priv of ["REFERENCES", "TRIGGER", "MAINTAIN"]) {
      const [g] = classificarGrants(linha("products", "anon", priv));
      expect(g?.categoria).toBe("A. padrão da plataforma");
    }
  });

  it("o relatório mostra a categoria C mesmo quando NÃO há diferença de schema", () => {
    // O caso que importa: os dois lados idênticos (EXACT EQUIVALENT) e ainda assim o
    // grant inseguro visível. É esta linha que impede o modelo de virar cegueira.
    const c = comparar(BASE, BASE);
    expect(c.classificacao).toBe("EXACT EQUIVALENT");
    const md = renderizar(c, classificarGrants(linha("products", "anon", "TRUNCATE")));
    expect(md).toContain("C. inseguro");
    expect(md).toContain("hardening");
  });

  it("sem grants inseguros, a seção não inventa alarme", () => {
    const iguais = [...BASE].join("\n");
    const md = renderizar(
      comparar(iguais, iguais),
      classificarGrants(linha("products", "anon", "SELECT")),
    );
    expect(md).not.toContain("C. inseguro");
  });
});
