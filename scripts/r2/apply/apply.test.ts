// R2.6 — testes do runner de aplicação controlada.
//
// A máquina de estados tem teste próprio em `operations.test.ts`. Este arquivo cobre o que
// aquele não alcança: a leitura dos fatos medidos, e as propriedades do workflow, do runner
// e do SQL de remediação que nenhum `bun run test` conseguiria descobrir de outro jeito —
// porque a alternativa seria descobri-las durante uma escrita contra um ambiente real.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VERSOES_DO_BASELINE } from "./operations";
import { campos, lerFatos, medir, todos, um } from "./fatos";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const RAIZ = process.cwd();
const RUNNER = readFileSync(join(RAIZ, "scripts/r2/apply/run.sh"), "utf-8");
const WORKFLOW = readFileSync(join(RAIZ, ".github/workflows/r2-staging-apply.yml"), "utf-8");
const REMEDIACAO = readFileSync(
  join(RAIZ, "scripts/r2/apply/sql/remediate-demo-gtins.sql"),
  "utf-8",
);

/** O runner sem comentário: a verificação é sobre o que o script EXECUTA. */
const runnerExecutavel = RUNNER.split("\n")
  .filter((linha) => !linha.trimStart().startsWith("#"))
  .join("\n");

/**
 * A remediação sem comentário, pela mesma razão — e não é hipótese: o cabeçalho do arquivo
 * explica que `size_text` NÃO é lido nem escrito, e a primeira versão deste teste reprovou
 * por causa dessa frase. É a mesma armadilha que o guarda de read-only e o teste de fontes
 * já tinham encontrado: uma verificação que lê comentário mede o texto, e não o programa.
 */
const remediacaoExecutavel = REMEDIACAO.split("\n")
  .filter((linha) => !linha.trimStart().startsWith("--"))
  .join("\n");

describe("fatos medidos", () => {
  function comFatos(linhas: string[]) {
    const caminho = join(tmpdir(), `fatos-${linhas.length}-${linhas.join("").length}.txt`);
    writeFileSync(caminho, linhas.join("\n"));
    return lerFatos(caminho);
  }

  it("lê chave|valor e preserva chaves repetidas na ordem", () => {
    const fatos = comFatos(["history.version|A", "history.version|B", "history.count|2"]);
    expect(todos(fatos, "history.version")).toEqual(["A", "B"]);
    expect(um(fatos, "history.count")).toBe("2");
  });

  it("valor com `|` no meio não é truncado", () => {
    // `schema.grants_table` traz `tabela|papel|privilegio` no valor. Cortar no primeiro
    // separador perderia o resto — e o resto é justamente o privilégio.
    const fatos = comFatos(["schema.grants_table|prices|anon|SELECT"]);
    expect(um(fatos, "schema.grants_table")).toBe("prices|anon|SELECT");
  });

  it("campos() lê o formato `a=1,b=2` e ignora o que não for número", () => {
    expect(campos("preenchidos=5,invalidos=2,duplicados=0")).toEqual({
      preenchidos: 5,
      invalidos: 2,
      duplicados: 0,
    });
    expect(campos("invalidos=nao_lido").invalidos).toBeUndefined();
    expect(campos(null)).toEqual({});
  });

  it("histórico ausente é ZERO versões, e não erro de leitura", () => {
    // É exatamente o estado de staging antes da adoção: a tabela existe (a plataforma a
    // cria) e está vazia porque o schema foi aplicado pelo editor SQL do painel.
    const medicao = medir(
      comFatos(["count.products|7", "gtin.resumo|preenchidos=5,invalidos=2,duplicados=0"]),
    );
    expect(medicao.historicoRemoto).toBe(0);
    expect(medicao.leuConteudo).toBe(true);
  });

  it("distingue `não há inválidos` de `ninguém olhou`", () => {
    // A distinção decide o gate: uma medição que falhou não pode virar autorização.
    const semConteudo = medir(comFatos(["history.count|7"]));
    expect(semConteudo.leuConteudo).toBe(false);
    expect(semConteudo.gtinsInvalidos).toBe(0);

    const comConteudo = medir(comFatos(["gtin.resumo|preenchidos=5,invalidos=0,duplicados=0"]));
    expect(comConteudo.leuConteudo).toBe(true);
    expect(comConteudo.gtinsInvalidos).toBe(0);
  });

  it("contagem ausente vira null, e não zero", () => {
    const medicao = medir(comFatos(["count.products|7", "gtin.resumo|invalidos=0"]));
    expect(medicao.linhas.products).toBe(7);
    expect(medicao.linhas.prices).toBeNull();
  });

  it("lê o formato COMPOSTO das tabelas de catálogo", () => {
    // Regressão do defeito que o primeiro `plan` contra staging expôs. `20-content.sql`
    // emite `total=4,demo=4,real=0,ativos=4` para markets/products/prices e um número puro
    // para as três de contribuição. A primeira versão de `medir()` só entendia o número
    // puro, então as três tabelas cujo total importa viravam `null` — e `null` significa
    // "não lido", que faz `check-after.ts` PULAR a comparação. A guarda parecia existir.
    const medicao = medir(
      comFatos([
        "count.markets|total=4,demo=4,real=0,ativos=4",
        "count.products|total=7,demo=7,real=0,ativos=7,com_gtin=5,com_size_text=7",
        "count.prices|total=22,demo=22,real=0,ativos=22,validos=22",
        "count.price_submissions|0",
        "count.product_watch_requests|1",
        "count.decision_feedback|0",
        "gtin.resumo|preenchidos=5,invalidos=2,duplicados=0",
      ]),
    );
    expect(medicao.linhas).toEqual({
      markets: 4,
      products: 7,
      prices: 22,
      price_submissions: 0,
      product_watch_requests: 1,
      decision_feedback: 0,
    });
    for (const valor of Object.values(medicao.linhas)) {
      expect(valor, "nenhuma contagem pode ficar como não lida").not.toBeNull();
    }
  });

  it("os dois formatos do fixture são os que o SQL realmente emite", () => {
    // Sem esta amarra, o teste acima protege contra um defeito que já aconteceu — e não
    // contra o próximo, que seria o SQL mudar de formato e o fixture continuar antigo. Foi
    // exatamente assim que o defeito nasceu: o fixture usava o formato de UMA das famílias
    // de tabela para as duas.
    const conteudo = readFileSync(join(RAIZ, "scripts/r2/preflight/20-content.sql"), "utf-8");
    for (const tabela of ["markets", "products", "prices"]) {
      expect(conteudo, `count.${tabela} deixou de ser composto`).toMatch(
        new RegExp(`'count\\.${tabela}',\\s*format\\(\\s*\\n?\\s*'total=%s`),
      );
    }
    for (const tabela of ["price_submissions", "product_watch_requests", "decision_feedback"]) {
      expect(conteudo, `count.${tabela} deixou de ser número puro`).toContain(
        `SELECT 'count.${tabela}', count(*)::text`,
      );
    }
  });
});

describe("as sete versões do baseline", () => {
  it("existem como arquivo, e são as sete anteriores à normalização", () => {
    const versoesNoDisco = readdirSync(join(RAIZ, "supabase/migrations"))
      .filter((n) => n.endsWith(".sql"))
      .map((n) => n.split("_")[0])
      .sort();

    for (const versao of VERSOES_DO_BASELINE) {
      expect(versoesNoDisco, `${versao} não existe em supabase/migrations`).toContain(versao);
    }
    // As sete são exatamente as que precedem a normalização — se uma migration nova for
    // criada com timestamp anterior, o baseline deixa de ser sete e este teste avisa.
    const anteriores = versoesNoDisco.filter((v) => Number(v) < 20260803000000);
    expect(anteriores).toEqual([...VERSOES_DO_BASELINE].sort());
  });
});

describe("o workflow", () => {
  it("só dispara manualmente — sem push, sem pull_request, sem schedule, sem call", () => {
    expect(WORKFLOW).toContain("workflow_dispatch:");
    for (const gatilho of [
      "\n  push:",
      "\n  pull_request:",
      "\n  schedule:",
      "\n  workflow_call:",
    ]) {
      expect(WORKFLOW, `o workflow tem o gatilho ${gatilho.trim()}`).not.toContain(gatilho);
    }
  });

  it("roda no Environment staging, com concurrency exclusiva, timeout e permissões mínimas", () => {
    expect(WORKFLOW).toMatch(/environment:\s*staging/);
    expect(WORKFLOW).toMatch(/cancel-in-progress:\s*false/);
    expect(WORKFLOW).toMatch(/timeout-minutes:\s*\d+/);
    expect(WORKFLOW).toMatch(/permissions:\s*\n\s*contents:\s*read/);
  });

  it("não aceita input de ambiente, host ou connection string", () => {
    // Um host vindo de input poderia apontar para outro tenant sem ninguém notar. Tudo que
    // identifica o alvo vem de arquivo versionado.
    const inputs = /inputs:\s*\n([\s\S]*?)\nconcurrency:/.exec(WORKFLOW)?.[1] ?? "";
    expect(inputs.length).toBeGreaterThan(0);
    for (const proibido of ["environment", "host", "db_url", "url", "password", "project"]) {
      expect(inputs.toLowerCase(), `o workflow aceita input '${proibido}'`).not.toMatch(
        new RegExp(`^\\s{6}${proibido}\\w*:`, "m"),
      );
    }
  });

  it("exige o SHA da main e oferece exatamente as nove operações", () => {
    expect(WORKFLOW).toMatch(/expected_main_sha:[\s\S]*?required:\s*true/);
    const opcoes = /options:\s*\n((?:\s*-\s*[\w-]+\n)+)/.exec(WORKFLOW)?.[1] ?? "";
    const lista = opcoes
      .split("\n")
      .map((l) => l.replace(/^\s*-\s*/, "").trim())
      .filter(Boolean);
    expect(lista).toHaveLength(9);
    expect(lista).toContain("plan");
    expect(lista.some((o) => /all/i.test(o))).toBe(false);
  });

  it("lê o segredo uma vez só, e nunca o interpola em `run:`", () => {
    const ocorrencias = WORKFLOW.match(/secrets\.SUPABASE_DB_PASSWORD/g) ?? [];
    expect(ocorrencias).toHaveLength(1);
    // A única referência tem que estar num bloco `env:`, e não numa linha de comando.
    expect(WORKFLOW).toMatch(
      /SUPABASE_DB_PASSWORD:\s*\$\{\{\s*secrets\.SUPABASE_DB_PASSWORD\s*\}\}/,
    );
    expect(WORKFLOW).not.toMatch(/run:[^\n]*secrets\./);
  });

  it("não menciona produção em lugar nenhum", () => {
    const semComentario = WORKFLOW.split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .join("\n");
    expect(semComentario).not.toMatch(/\bproduction\b/);
  });
});

describe("o runner", () => {
  it("nunca liga o rastreamento do shell", () => {
    // Com `set -x`, cada expansão vai para o log — inclusive as que carregam a connection
    // string montada.
    expect(runnerExecutavel).toContain("set +x");
    expect(runnerExecutavel).not.toMatch(/^\s*set -x/m);
    expect(runnerExecutavel).not.toMatch(/set -[a-wyz]*x/);
  });

  it("a URL entregue à CLI não carrega senha", () => {
    // `--db-url` vai para argv, e argv é visível para qualquer processo da máquina. A senha
    // fica no `.pgpass` 0600 apontado por PGPASSFILE, que o driver da CLI lê como o libpq
    // leria. Se um dia a CLI parar de honrá-lo, a conexão falha por autenticação — e um
    // bloqueio reportado é melhor que uma senha em argv como plano B.
    const linhaUrl = /DB_URL="([^"]+)"/.exec(runnerExecutavel)?.[1] ?? "";
    expect(linhaUrl).toContain("${PGUSER}@${PGHOST}");
    expect(linhaUrl).not.toContain("PASSWORD");
    expect(linhaUrl).not.toMatch(/:\$\{[^}]*\}@/);
    expect(runnerExecutavel).toContain("PGPASSFILE");
  });

  it("remove a senha do ambiente assim que o .pgpass existe", () => {
    expect(runnerExecutavel).toContain("unset SUPABASE_DB_PASSWORD");
    const ordem =
      runnerExecutavel.indexOf("preparar_credencial") <
      runnerExecutavel.indexOf("unset SUPABASE_DB_PASSWORD");
    expect(ordem).toBe(true);
  });

  it("apaga o diretório de trabalho por trap, inclusive quando falha no meio", () => {
    expect(runnerExecutavel).toMatch(/trap limpar EXIT/);
    expect(runnerExecutavel).toMatch(/rm -rf "\$TRABALHO"/);
  });

  it("recusa ambiente, ref e SHA divergentes antes de qualquer escrita", () => {
    for (const guarda of [
      'APPLY_ENVIRONMENT:-}" != "staging"',
      'GITHUB_REF:-refs/heads/main}" != "refs/heads/main"',
      "MAIN SHA MISMATCH",
      "STAGING DATABASE PASSWORD SECRET REQUIRED",
      "PROJECT REF MISMATCH",
    ]) {
      expect(runnerExecutavel, `falta a guarda: ${guarda}`).toContain(guarda);
    }
  });

  it("reaproveita a cadeia de recusa de produção, em vez de reescrevê-la", () => {
    // Uma segunda cópia divergiria da primeira, e divergiria esquecendo uma guarda.
    expect(runnerExecutavel).toContain("prepare-credential.sh");
    expect(runnerExecutavel).toContain("preparar_credencial");
  });

  it("usa ON_ERROR_STOP em toda invocação de psql", () => {
    const invocacoes = runnerExecutavel.match(/psql (?:--[\w-]+(?:=\S+)?\s*|\\\s*\n\s*)+/g) ?? [];
    expect(invocacoes.length).toBeGreaterThan(0);
    for (const invocacao of invocacoes) {
      expect(invocacao, `psql sem ON_ERROR_STOP: ${invocacao}`).toContain("ON_ERROR_STOP=1");
    }
  });

  it("confere por hash cada migration copiada para o workdir efêmero", () => {
    // Copiar errado é indistinguível de aplicar outra coisa.
    expect(runnerExecutavel).toContain("shasum -a 256");
    expect(runnerExecutavel).toMatch(/nao confere com o original/);
  });

  it("roda G7-POST depois de R2-A e G7-POST-GTIN depois de R2-B", () => {
    // A separação foi medida ao vivo: a consulta de concordância chama `pa_is_valid_gtin()`,
    // que R2-B cria. Rodar o arquivo inteiro depois de R2-A morria em
    // `function does not exist` e reprovava um ambiente correto.
    expect(runnerExecutavel).toMatch(/OPERACAO" = "apply-r2a"/);
    expect(runnerExecutavel).toContain("target-readiness-post.sql");
    expect(runnerExecutavel).toContain("G7 POST FAILED");
    expect(runnerExecutavel).toMatch(/OPERACAO" = "apply-r2b"/);
    expect(runnerExecutavel).toContain("target-readiness-post-gtin.sql");
    expect(runnerExecutavel).toContain("G7 POST GTIN FAILED");
  });

  it("G7-POST, o de R2-A, não referencia nada que só R2-B cria", () => {
    const post = readFileSync(join(RAIZ, "scripts/r2/target-readiness-post.sql"), "utf-8")
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("--"))
      .join("\n");
    for (const deR2B of ["pa_is_valid_gtin", "pa_gtin_check_digit", "products_gtin_valid"]) {
      expect(post, `G7-POST referencia ${deR2B}, que só existe depois de R2-B`).not.toContain(
        deR2B,
      );
    }
  });

  it("a mensagem de aborto para de mentir depois que a escrita aconteceu", () => {
    // `abortar()` afirmava sempre "Nenhuma escrita foi emitida" — e depois de R2-A aplicada
    // com G7-POST reprovado, a frase era falsa. Erro que mente sobre o estado do banco manda
    // quem lê procurar no lugar errado.
    expect(runnerExecutavel).toContain("JA_ESCREVEU");
    expect(runnerExecutavel).toContain("A ESCRITA JA TINHA ACONTECIDO");
  });

  it("o plan tem controle positivo do detector de colisões", () => {
    // Sem ele, "0 colisões" é indistinguível de "o detector não funciona" — e as duas
    // leituras passariam verdes exatamente iguais.
    expect(runnerExecutavel).toContain("COLLISION DETECTOR BROKEN");
    expect(runnerExecutavel).toContain("sintetico.json");
  });
});

describe("o SQL de remediação dos GTINs", () => {
  it("é o único arquivo de escrita, e escreve uma coluna só", () => {
    const updates = remediacaoExecutavel.match(/UPDATE\s+public\.\w+\s+SET\s+[^;]+/gi) ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatch(/UPDATE public\.products SET gtin = NULL WHERE id = ANY\(alvos\)/);
  });

  it("não cria, não apaga e não toca em schema", () => {
    for (const proibido of [
      /\bDELETE\s+FROM\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bDROP\b/i,
      /\bCREATE\b/i,
      /\bALTER\s+TABLE\b/i,
      /\bTRUNCATE\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
    ]) {
      expect(remediacaoExecutavel, `a remediação contém ${proibido}`).not.toMatch(proibido);
    }
  });

  it("não toca em nenhuma coluna de R2-A nem em size_text", () => {
    for (const coluna of [
      "quantity_value",
      "quantity_unit",
      "package_type",
      "units_per_package",
      "size_text",
    ]) {
      expect(remediacaoExecutavel, `a remediação menciona ${coluna}`).not.toContain(coluna);
    }
  });

  it("abre e fecha exatamente uma transação, e exige duas linhas", () => {
    expect((remediacaoExecutavel.match(/^BEGIN;/gm) ?? []).length).toBe(1);
    expect((remediacaoExecutavel.match(/^COMMIT;/gm) ?? []).length).toBe(1);
    expect(REMEDIACAO).toContain("GET DIAGNOSTICS alterados = ROW_COUNT");
    expect(REMEDIACAO).toMatch(/IF alterados <> 2 THEN/);
  });

  it("verifica de novo depois do UPDATE, em vez de confiar no ROW_COUNT", () => {
    // `ROW_COUNT = 2` prova que duas linhas mudaram. Não prova que eram as duas certas.
    expect(REMEDIACAO).toMatch(/IF restantes <> 0 THEN/);
  });

  it("recusa qualquer ambiente que não seja o do seed de demonstração", () => {
    expect(REMEDIACAO).toMatch(/total_produtos <> 7/);
    expect(REMEDIACAO).toMatch(/produtos_demo <> total_produtos/);
    expect(REMEDIACAO).toMatch(/duplicados <> 0/);
  });

  it("não imprime GTIN, id nem nome de produto", () => {
    const notices = REMEDIACAO.match(/RAISE NOTICE[^;]+/g) ?? [];
    for (const notice of notices) {
      expect(notice).not.toMatch(/\bgtin\b\s*[,)]/i);
      expect(notice).not.toMatch(/%.*\bname\b/i);
    }
  });

  it("usa a MESMA expressão de validade de 20-content.sql", () => {
    // Copiar é ruim; divergir seria pior — o preflight diria "2 inválidos" e a transação
    // poderia enxergar outro conjunto.
    const conteudo = readFileSync(join(RAIZ, "scripts/r2/preflight/20-content.sql"), "utf-8");
    const nucleo =
      /\(10 - \(SUM\(\s*\(substr\(c\.gtin, length\(c\.gtin\) - 1 - i, 1\)\)::integer\s*\* CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END\s*\) % 10\)\) % 10/;
    expect(conteudo).toMatch(nucleo);
    expect(REMEDIACAO).toMatch(nucleo);
    // E as duas listas de comprimento GS1 precisam ser a mesma.
    expect(conteudo).toContain("length(c.gtin) IN (8, 12, 13, 14)");
    expect(REMEDIACAO).toContain("length(c.gtin) IN (8, 12, 13, 14)");
  });
});

describe("o relatório de colisões", () => {
  it("roda também imediatamente antes da normalização, e exige vazio", () => {
    // Não vale o relatório do `plan`: entre um plano e a aplicação pode passar tempo, e
    // nesse tempo alguém pode cadastrar um produto pelo painel. O relatório que autoriza a
    // aplicação precisa ser o da aplicação.
    expect(runnerExecutavel).toContain('relatorio_de_colisoes "exigir_vazio"');
    expect(runnerExecutavel).toContain('OPERACAO" = "apply-normalization"');
    expect(runnerExecutavel).toContain("NORMALIZATION COLLISION HUMAN DECISION REQUIRED");
  });

  it("distingue `sem colisões` de `não pôde medir`", () => {
    // Só o primeiro autoriza a aplicação. Tratar os dois igual é como uma medição que
    // falhou vira uma autorização.
    expect(runnerExecutavel).toContain("NORMALIZATION COLLISION REPORT UNAVAILABLE");
  });

  it("o controle positivo roda em toda invocação, e não só no plan", () => {
    const chamadas = runnerExecutavel.match(/relatorio_de_colisoes "/g) ?? [];
    expect(chamadas.length).toBe(2);
    const corpo = /relatorio_de_colisoes\(\) \{([\s\S]*?)\n\}/.exec(runnerExecutavel)?.[1] ?? "";
    expect(corpo).toContain("COLLISION DETECTOR BROKEN");
    // O controle positivo vem ANTES da medição real: um detector quebrado não pode produzir
    // um relatório vazio que alguém leia como autorização.
    expect(corpo.indexOf("COLLISION DETECTOR BROKEN")).toBeLessThan(corpo.indexOf("produtos.json"));
  });
});

describe("o limite de plataforma no ALTER DEFAULT PRIVILEGES", () => {
  const HARDENINGS = [
    "20260803005000_core_table_privilege_hardening.sql",
    "20260803007500_contribution_table_privilege_hardening.sql",
  ];

  for (const arquivo of HARDENINGS) {
    const sql = readFileSync(join(RAIZ, "supabase/migrations", arquivo), "utf-8");
    // Sem comentário. É a terceira vez nesta missão que uma verificação lê a explicação em
    // vez do programa — aqui as migrations EXPLICAM por que não usam `WHEN OTHERS`, e a
    // explicação contém as duas palavras.
    const executavelDoArquivo = sql
      .split("\n")
      .filter((linha) => !linha.trimStart().startsWith("--"))
      .join("\n");

    it(`${arquivo} trata insufficient_privilege por papel`, () => {
      // Medido ao vivo: `permission denied to change default privileges (SQLSTATE 42501)`.
      // Medir o papel respondia "QUAL papel"; não respondia "posso alterar esse papel". Na
      // plataforma Supabase o default de `public` pertence a um papel administrativo do
      // qual o usuário da conexão não é membro.
      expect(sql).toContain("WHEN insufficient_privilege THEN");
      expect(sql).toContain("sem_permissao");
    });

    it(`${arquivo} NÃO usa WHEN OTHERS`, () => {
      // `WHEN OTHERS` transformaria qualquer defeito futuro em aviso — e aviso é
      // exatamente o que ninguém lê.
      expect(executavelDoArquivo).not.toMatch(/WHEN\s+OTHERS/i);
    });

    it(`${arquivo} avisa nomeando os papéis que não conseguiu alterar`, () => {
      expect(sql).toMatch(/RAISE WARNING/);
      expect(sql).toContain("HERANCA NAO CORRIGIDA");
    });

    it(`${arquivo} mantém as revogações de tabela FORA do bloco tolerante`, () => {
      // Esta é a razão inteira da mudança: a migration é transacional, então deixar o erro
      // subir revertia TAMBÉM os REVOKE — trocando a correção P0, que fecha o TRUNCATE, por
      // uma proteção acessória contra tabelas que ainda não existem.
      const antesDoBloco = sql.slice(0, sql.indexOf("DO $$"));
      expect(antesDoBloco).toMatch(/REVOKE .* ON public\.\w+\s+FROM anon, authenticated;/);
      expect(antesDoBloco).toMatch(/REVOKE .* ON public\.\w+\s+FROM PUBLIC;/);
    });
  }

  it("o resumo publica o default privilege medido a cada operação", () => {
    const checkAfter = readFileSync(join(RAIZ, "scripts/r2/apply/check-after.ts"), "utf-8");
    expect(checkAfter).toContain("priv.default_acl");
    expect(checkAfter).toContain("Default privileges de tabela");
  });
});
