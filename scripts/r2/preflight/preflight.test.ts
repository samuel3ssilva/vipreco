// R2.3 — regressão do preflight remoto de staging.
//
// O que este arquivo protege, em ordem de gravidade se quebrar:
//
// 1. A GARANTIA DE READ-ONLY. Três camadas, e as três verificadas aqui: a estática
//    (nenhum verbo de escrita nos `.sql`), a transacional (o prólogo abre `READ ONLY`)
//    e a de verificação (o banco confirma). Um `UPDATE` que entrasse num desses
//    arquivos rodaria contra staging com credencial de escrita.
//
// 2. O SIGILO DA SAÍDA. Nada que este workflow publica pode conter connection string,
//    senha, token, host completo, GTIN completo ou linha de tabela.
//
// 3. A CLASSIFICAÇÃO. Histórico A–E, dados EMPTY/DEMO ONLY/MIXED, gates. É onde mora a
//    decisão, e decisão sem teste é palpite — inclusive os casos que ninguém quer
//    descobrir ao vivo: banco vazio, histórico ausente, dado real presente.
//
// 4. O DESENHO DO WORKFLOW. `workflow_dispatch` apenas, environment `staging`,
//    permissão mínima, e nenhum caminho que alcance produção.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ARQUIVOS_DE_AUDITORIA, VERBOS_PROIBIDOS, auditar, lerArquivos } from "./read-only-guard";
import {
  avaliarGates,
  campos,
  classificarDados,
  classificarHistorico,
  lerFatos,
  renderizar,
} from "./render-summary";

const WORKFLOW = readFileSync(
  new URL("../../../.github/workflows/r2-staging-preflight.yml", import.meta.url),
  "utf-8",
);
const RUNNER = readFileSync(new URL("./run.sh", import.meta.url), "utf-8");
const PROLOGO = readFileSync(new URL("./_prologue.sql", import.meta.url), "utf-8");
const EPILOGO = readFileSync(new URL("./_epilogue.sql", import.meta.url), "utf-8");
const CONTEUDO = readFileSync(new URL("./20-content.sql", import.meta.url), "utf-8");
const ENVIRONMENTS = JSON.parse(
  readFileSync(new URL("../../../config/environments.json", import.meta.url), "utf-8"),
) as { staging: { supabaseProjectId: string }; production: { supabaseProjectId: string } };

// ---------------------------------------------------------------------------------
// 1. Read-only
// ---------------------------------------------------------------------------------

describe("guarda de read-only — camada A (estática)", () => {
  it("aprova os arquivos SQL como estão", () => {
    expect(auditar(lerArquivos())).toEqual([]);
  });

  it.each(VERBOS_PROIBIDOS)("reprova quando %s entra num arquivo de auditoria", (verbo) => {
    const achados = auditar([
      { nome: "00-structure.sql", conteudo: `SELECT 1;\n${verbo} public.products;` },
    ]);
    expect(achados.length).toBeGreaterThan(0);
  });

  // Controle positivo composto. Um teste que só passa não distingue "os arquivos estão
  // limpos" de "a verificação não funciona", e as duas coisas parecem iguais no CI.
  it("reprova statement que não é SELECT mesmo sem verbo da lista", () => {
    const achados = auditar([{ nome: "20-content.sql", conteudo: "SELECT 1;\nEXPLAIN SELECT 1;" }]);
    expect(achados.some((a) => a.problema.includes("não começa com SELECT"))).toBe(true);
  });

  it("reprova arquivo que carrega credencial", () => {
    const achados = auditar([
      { nome: "00-structure.sql", conteudo: "SELECT 1; -- postgresql://user:senha@host/db" },
    ]);
    expect(achados.some((a) => a.problema.includes("connection string"))).toBe(true);
  });

  it("reprova arquivo vazio em vez de aprová-lo por omissão", () => {
    const achados = auditar([{ nome: "20-content.sql", conteudo: "-- só comentário\n" }]);
    expect(achados.some((a) => a.problema.includes("statement nenhum"))).toBe(true);
  });

  // Sem isto, a única forma de descobrir que uma consulta não compila seria ao vivo,
  // contra staging, com o Founder olhando.
  it("o drill executa todo .sql do preflight contra Postgres vivo", () => {
    const drill = readFileSync(new URL("../../db-drill/run.sh", import.meta.url), "utf-8");
    expect(drill).toContain("scripts/r2/preflight");
    for (const nome of ARQUIVOS_DE_AUDITORIA) {
      expect(drill, `o drill não executa ${nome}`).toContain(nome);
    }
    expect(drill).toContain("_prologue.sql");
  });

  it("todo arquivo de auditoria está na lista verificada", () => {
    // Um `.sql` novo que ninguém acrescentasse aqui rodaria contra staging sem guarda.
    for (const nome of ARQUIVOS_DE_AUDITORIA) {
      expect(() => readFileSync(new URL(`./${nome}`, import.meta.url))).not.toThrow();
    }
    // Nomes DISTINTOS, não ocorrências: o runner consulta `00-structure.sql` duas
    // vezes de propósito (a segunda com a leitura alternativa da senha), e contar
    // ocorrências transformaria uma repetição legítima em falha — sem que nenhum
    // `.sql` tivesse escapado da guarda, que é a única coisa que este teste protege.
    const consultados = new Set(
      [...RUNNER.matchAll(/consultar "([\w-]+\.sql)"/g)].map((m) => m[1]),
    );
    expect([...consultados].sort()).toEqual([...ARQUIVOS_DE_AUDITORIA].sort());
  });
});

describe("guarda de read-only — camada B (transacional)", () => {
  it("o prólogo abre transação read-only com limites de tempo", () => {
    expect(PROLOGO).toMatch(/^\s*BEGIN;/m);
    expect(PROLOGO).toMatch(/SET TRANSACTION READ ONLY;/);
    expect(PROLOGO).toMatch(/SET LOCAL statement_timeout/);
    expect(PROLOGO).toMatch(/SET LOCAL lock_timeout/);
  });

  it("o epílogo faz ROLLBACK, nunca COMMIT", () => {
    // Comentários fora: o epílogo EXPLICA por que não usa `COMMIT`, e casar em cima do
    // texto inteiro proibiria o arquivo de justificar a própria garantia.
    const executavel = EPILOGO.split("\n")
      .filter((l) => !l.trimStart().startsWith("--"))
      .join("\n");
    expect(executavel).toMatch(/ROLLBACK;/);
    expect(executavel).not.toMatch(/\bCOMMIT\b/i);
  });

  it("toda invocação de psql é alimentada pelo prólogo", () => {
    // Um `psql` que não passe pelo par prólogo/epílogo roda fora da transação read-only
    // — a camada B deixaria de existir para aquela consulta, em silêncio.
    const invocacoes = RUNNER.match(/psql --no-psqlrc/g) ?? [];
    const embrulhos = RUNNER.match(/_prologue\.sql/g) ?? [];
    expect(invocacoes.length).toBeGreaterThan(0);
    expect(embrulhos.length).toBe(invocacoes.length);
  });
});

describe("guarda de read-only — camada C (verificação no banco)", () => {
  it("a primeira consulta pergunta ao banco se a transação está read-only", () => {
    const estrutura = readFileSync(new URL("./00-structure.sql", import.meta.url), "utf-8");
    const executavel = estrutura.split("\n").filter((l) => !l.trimStart().startsWith("--"));
    expect(executavel.find((l) => l.trim().length > 0)).toContain("guard.read_only");
  });

  it("o runner aborta quando a resposta não é 'on'", () => {
    expect(RUNNER).toMatch(/if \[ "\$read_only" != "on" \]/);
    expect(RUNNER).toMatch(/Abortando antes de qualquer outra consulta/);
  });
});

// ---------------------------------------------------------------------------------
// 2. Sigilo
// ---------------------------------------------------------------------------------

describe("o segredo nunca é impresso", () => {
  it("SUPABASE_DB_URL é lido uma única vez, e só como secret", () => {
    expect(WORKFLOW).toContain("SUPABASE_DB_URL: ${{ secrets.SUPABASE_DB_URL }}");
    expect(WORKFLOW.match(/secrets\.SUPABASE_DB_URL/g)).toHaveLength(1);
    expect(WORKFLOW).not.toContain("vars.SUPABASE_DB_URL");
  });

  it("o runner nunca ecoa a URL", () => {
    for (const linha of RUNNER.split("\n")) {
      if (/^\s*(echo|printf|cat)\b/.test(linha)) {
        expect(linha, `linha imprime a URL: ${linha}`).not.toContain("$SUPABASE_DB_URL");
        expect(linha).not.toContain("${SUPABASE_DB_URL");
      }
    }
  });

  it("o runner registra add-mask para os pedaços da URL", () => {
    // O GitHub mascara o secret INTEIRO sozinho. Host, usuário e senha isolados não
    // seriam mascarados — e é justamente eles que vazariam num erro de conexão.
    expect(RUNNER).toContain("::add-mask::");
    expect(RUNNER).toMatch(/for segredo in "\$PGHOST" "\$PGUSER"/);
    // A senha não está na lista porque não existe neste processo — está no `.pgpass`.
    // Mascará-la aqui exigiria trazer o valor de volta para o shell, que é o oposto
    // do que a mudança fez.
    expect(RUNNER).not.toMatch(/add-mask[^\n]*PGPASSWORD/);
  });

  it("a senha não entra na linha de comando do psql", () => {
    // A senha não entra em argv (legível por outros processos do runner) e também não
    // entra no ambiente: ela vive num `.pgpass` de modo 0600, e o que o runner exporta
    // é o CAMINHO. A decomposição vive em `parse-connection-url.ts`, com suíte própria
    // — a versão artesanal anterior corrompia a senha em silêncio.
    expect(RUNNER).toMatch(/export PGHOST PGPORT PGUSER PGDATABASE PGPASSFILE/);
    expect(RUNNER).not.toMatch(/psql[^\n]*\$SUPABASE_DB_URL/);
    expect(RUNNER).not.toMatch(/psql[^\n]*\$PGPASSWORD/);
    // `--no-password` para o psql falhar na hora em vez de esperar um prompt que
    // ninguém vai responder: num runner, "pendurado" e "quebrado" são o mesmo estado,
    // e só um dos dois diz o motivo.
    expect(RUNNER).toContain("--no-password");
  });

  it("nada é enviado como artefato", () => {
    expect(WORKFLOW).not.toContain("upload-artifact");
    expect(WORKFLOW).not.toContain("actions/cache");
  });

  it("a saída de target-readiness.sql é retida, porque contém GTIN completo", () => {
    expect(RUNNER).toMatch(/saida nao publicada: contem GTIN completo/);
    expect(RUNNER).toMatch(/rm -f "\$TRABALHO\/readiness\.txt"/);
  });

  it("o dump de produtos é apagado e nunca publicado", () => {
    expect(RUNNER).toMatch(/rm -f "\$TRABALHO\/produtos\.json"/);
    expect(RUNNER).toMatch(/trap limpar EXIT/);
  });

  it("o GTIN sai mascarado do SQL, não do renderizador", () => {
    // Mascarar só na renderização deixaria o código completo no arquivo intermediário.
    expect(CONTEUDO).toMatch(
      /repeat\('\*', greatest\(length\(a\.gtin\) - 4, 0\)\) \|\| right\(a\.gtin, 4\)/,
    );
  });
});

// ---------------------------------------------------------------------------------
// 3. Produção é inalcançável
// ---------------------------------------------------------------------------------

describe("produção não é alcançável por este workflow", () => {
  it("o workflow não menciona produção em lugar nenhum", () => {
    expect(WORKFLOW).not.toContain(ENVIRONMENTS.production.supabaseProjectId);
    expect(WORKFLOW).not.toMatch(/environment:\s*production/);
    expect(WORKFLOW).toMatch(/environment:\s*staging/);
  });

  it("o runner recusa a execução se a URL apontar para produção", () => {
    // Não basta "o workflow não aponta para produção". A garantia é o workflow se
    // RECUSAR a rodar contra produção mesmo se alguém apontar.
    expect(RUNNER).toContain("REF_PROIBIDO");
    expect(RUNNER).toMatch(/aponta para o projeto de PRODUCAO. Abortando/);
  });

  it("o runner exige confirmar que a URL é a de staging", () => {
    expect(RUNNER).toContain("REF_STAGING");
    expect(RUNNER).toMatch(/Nao foi possivel confirmar que a connection string e a de staging/);
  });

  // A guarda de produção falharia ABERTA se este teste não existisse: com `REF_STAGING`
  // vazio, `!= *""*` é sempre falso e a confirmação de staging passaria calada. É o pior
  // tipo de defeito — a checagem parece estar lá, e não está.
  it("aborta se não conseguir ler os refs, em vez de seguir sem guarda", () => {
    expect(RUNNER).toMatch(/if \[ -z "\$REF_STAGING" \] \|\| \[ -z "\$REF_PROIBIDO" \]/);
    expect(RUNNER).toMatch(/uma guarda que nao e verificavel nao e guarda/);
  });

  it("os dois refs vêm do arquivo versionado, não de literal no script", () => {
    expect(RUNNER).toContain("config/environments.json");
    expect(RUNNER).not.toContain(ENVIRONMENTS.production.supabaseProjectId);
    expect(RUNNER).not.toContain(ENVIRONMENTS.staging.supabaseProjectId);
  });

  it("nenhuma credencial administrativa é referenciada", () => {
    for (const proibido of ["SERVICE_ROLE", "service_role_key", "CLOUDFLARE", "wrangler"]) {
      expect(WORKFLOW).not.toContain(proibido);
      expect(RUNNER).not.toContain(proibido);
    }
  });
});

// ---------------------------------------------------------------------------------
// 4. Desenho do workflow
// ---------------------------------------------------------------------------------

describe("r2-staging-preflight.yml — desenho", () => {
  it("só dispara manualmente", () => {
    expect(WORKFLOW).toMatch(/^on:\n\s+workflow_dispatch: \{\}\n/m);
    expect(WORKFLOW).not.toMatch(/^\s*(push|pull_request|schedule):/m);
  });

  it("tem permissão mínima, concorrência exclusiva e timeout", () => {
    expect(WORKFLOW).toMatch(/permissions:\s*\n\s*contents:\s*read/);
    expect(WORKFLOW).toMatch(/group:\s*r2-staging-preflight\n\s*cancel-in-progress:\s*false/);
    expect(WORKFLOW).toMatch(/timeout-minutes:\s*\d+/);
  });

  it("não existe modo apply, e nenhum comando que escreva", () => {
    // Comentários fora: o cabeçalho do workflow EXPLICA por que não instala a CLI do
    // Supabase e por que não existe modo apply. Casar em cima do texto inteiro
    // proibiria o arquivo de documentar a própria restrição.
    const executavel = WORKFLOW.split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .join("\n")
      .toLowerCase();
    for (const proibido of [
      "db push",
      "migration up",
      "migration repair",
      "db reset",
      "supabase",
    ]) {
      expect(executavel, `o workflow executa "${proibido}"`).not.toContain(`${proibido} `);
    }
    expect(RUNNER).not.toMatch(/\bdb push\b|\bmigration repair\b|\bdb reset\b/);
  });

  it("fixa as actions por SHA", () => {
    const usos = WORKFLOW.match(/uses: \S+/g) ?? [];
    expect(usos.length).toBeGreaterThan(0);
    for (const uso of usos) expect(uso).toMatch(/@[0-9a-f]{40}$/);
  });
});

describe("comportamento sem o segredo", () => {
  it("verifica a presença sem tocar no valor, e devolve a mensagem exata", () => {
    expect(RUNNER).toMatch(/if \[ -z "\$\{SUPABASE_DB_URL:-\}" \]/);
    expect(RUNNER).toContain("STAGING DATABASE SECRET REQUIRED");
    expect(RUNNER).toContain("GitHub Environment `staging`");
  });

  it("a guarda de presença vem antes de qualquer conexão", () => {
    expect(RUNNER.indexOf("STAGING DATABASE SECRET REQUIRED")).toBeLessThan(RUNNER.indexOf("psql"));
  });
});

// ---------------------------------------------------------------------------------
// 5. Classificação
// ---------------------------------------------------------------------------------

const LOCAIS = ["20260727005424_a", "20260803010000_b", "20260803020000_c"];

describe("classificarHistorico", () => {
  it("A. ALIGNED quando remoto e local batem", () => {
    expect(classificarHistorico("true", [...LOCAIS], LOCAIS).estado).toBe("A. ALIGNED");
  });

  it("B. HISTORY MISSING quando a tabela não existe", () => {
    const r = classificarHistorico("false", [], LOCAIS);
    expect(r.estado).toBe("B. HISTORY MISSING");
    // O texto precisa dizer o que NÃO fazer: `migration repair` é a saída errada óbvia.
    expect(r.explicacao).toContain("migration repair");
  });

  it("C. REMOTE AHEAD quando o ambiente tem versão que o repositório não tem", () => {
    const r = classificarHistorico("true", [...LOCAIS, "20260901000000_x"], LOCAIS);
    expect(r.estado).toBe("C. REMOTE AHEAD");
    expect(r.soRemoto).toEqual(["20260901000000_x"]);
  });

  it("D. LOCAL AHEAD quando o repositório está à frente", () => {
    const r = classificarHistorico("true", LOCAIS.slice(0, 1), LOCAIS);
    expect(r.estado).toBe("D. LOCAL AHEAD");
    expect(r.soLocal).toEqual(LOCAIS.slice(1));
  });

  it("E. UNKNOWN quando nem a presença da tabela foi lida", () => {
    // Distinção que R2.2 já teve de fazer: E descreve a MEDIÇÃO, B descreve o BANCO.
    expect(classificarHistorico(null, [], LOCAIS).estado).toBe("E. UNKNOWN");
  });

  it("C vence D quando os dois lados divergem", () => {
    const r = classificarHistorico("true", ["20260901000000_x"], LOCAIS);
    expect(r.estado).toBe("C. REMOTE AHEAD");
  });
});

describe("classificarDados", () => {
  const fatosDe = (linhas: string[]) => lerFatos(linhas.join("\n"));

  it("EMPTY quando tudo está zerado", () => {
    expect(
      classificarDados(
        fatosDe([
          "count.markets|total=0,demo=0,real=0,ativos=0",
          "count.products|total=0,demo=0,real=0,ativos=0",
          "count.prices|total=0,demo=0,real=0,ativos=0",
          "count.price_submissions|0",
          "count.product_watch_requests|0",
          "count.decision_feedback|0",
        ]),
      ).classe,
    ).toBe("EMPTY");
  });

  it("DEMO ONLY quando toda linha é demo e não há submissão", () => {
    expect(
      classificarDados(
        fatosDe([
          "count.markets|total=4,demo=4,real=0,ativos=4",
          "count.products|total=7,demo=7,real=0,ativos=7",
          "count.prices|total=22,demo=22,real=0,ativos=22",
          "count.price_submissions|0",
          "count.product_watch_requests|0",
          "count.decision_feedback|0",
        ]),
      ).classe,
    ).toBe("DEMO ONLY");
  });

  it("MIXED OR UNKNOWN quando aparece uma linha não-demo", () => {
    const r = classificarDados(
      fatosDe([
        "count.markets|total=4,demo=4,real=0,ativos=4",
        "count.products|total=8,demo=7,real=1,ativos=8",
        "count.prices|total=22,demo=22,real=0,ativos=22",
      ]),
    );
    expect(r.classe).toBe("MIXED OR UNKNOWN");
    expect(r.explicacao).toContain("1 linha");
  });

  it("MIXED OR UNKNOWN quando uma tabela de submissão tem conteúdo", () => {
    const r = classificarDados(
      fatosDe([
        "count.markets|total=4,demo=4,real=0,ativos=4",
        "count.products|total=7,demo=7,real=0,ativos=7",
        "count.prices|total=22,demo=22,real=0,ativos=22",
        "count.price_submissions|3",
      ]),
    );
    expect(r.classe).toBe("MIXED OR UNKNOWN");
    expect(r.explicacao).toContain("Onda 3");
  });

  it("UNKNOWN, e não EMPTY, quando nenhuma contagem foi lida", () => {
    // A confusão perigosa: "não consegui ler" parecendo "está vazio".
    const r = classificarDados(fatosDe(["db.name|postgres"]));
    expect(r.classe).toBe("MIXED OR UNKNOWN");
    expect(r.explicacao).toContain("honesta");
  });
});

describe("campos", () => {
  it("interpreta pares chave=valor separados por vírgula", () => {
    expect(campos("total=7,demo=7,real=0")).toEqual({ total: 7, demo: 7, real: 0 });
  });

  it("ignora valor não numérico em vez de virar NaN", () => {
    expect(campos("total=7,demo=?")).toEqual({ total: 7 });
  });

  it("devolve vazio para entrada ausente", () => {
    expect(campos(null)).toEqual({});
  });
});

describe("avaliarGates", () => {
  const fatosPreR2 = lerFatos(
    [
      "schema.column|products.gtin:text",
      "schema.column|products.size_text:text",
      "count.markets|total=4,demo=4,real=0,ativos=4",
      "count.products|total=7,demo=7,real=0,ativos=7",
      "count.prices|total=22,demo=22,real=0,ativos=22",
      "count.price_submissions|0",
      "count.product_watch_requests|0",
      "count.decision_feedback|0",
      "gtin.resumo|preenchidos=5,invalidos=0,duplicados=0",
    ].join("\n"),
  );

  const gate = (fatos: ReturnType<typeof lerFatos>, id: string) => {
    const historico = classificarHistorico("true", [...LOCAIS], LOCAIS);
    return avaliarGates(fatos, historico, classificarDados(fatos)).find((g) => g.id === id)!;
  };

  it("G4 passa quando nenhuma coluna de R2-A está presente", () => {
    expect(gate(fatosPreR2, "G4").veredito).toBe("PASS");
  });

  it("G4 reprova quando R2-A já parece aplicada", () => {
    const fatos = lerFatos("schema.column|products.package_type:text");
    expect(gate(fatos, "G4").veredito).toBe("FAIL");
    expect(gate(fatos, "G4").base).toContain("package_type");
  });

  it("G4 fica UNKNOWN quando nenhuma coluna foi lida", () => {
    expect(gate(lerFatos("db.name|postgres"), "G4").veredito).toBe("UNKNOWN");
  });

  it("G8 reprova com GTIN inválido, e o número aparece na base", () => {
    const fatos = lerFatos("gtin.resumo|preenchidos=5,invalidos=2,duplicados=0");
    expect(gate(fatos, "G8").veredito).toBe("FAIL");
    expect(gate(fatos, "G8").base).toContain("inválidos=2");
  });

  it("G8 reprova com GTIN duplicado", () => {
    expect(
      gate(lerFatos("gtin.resumo|preenchidos=5,invalidos=0,duplicados=1"), "G8").veredito,
    ).toBe("FAIL");
  });

  it("G8 fica UNKNOWN se a auditoria não foi lida — nunca PASS por omissão", () => {
    expect(gate(lerFatos("db.name|postgres"), "G8").veredito).toBe("UNKNOWN");
  });

  it("G3 acompanha o estado do histórico", () => {
    const fatos = fatosPreR2;
    const desalinhado = avaliarGates(
      fatos,
      classificarHistorico("false", [], LOCAIS),
      classificarDados(fatos),
    ).find((g) => g.id === "G3")!;
    expect(desalinhado.veredito).toBe("FAIL");
    expect(gate(fatos, "G3").veredito).toBe("PASS");
  });

  it("G5 e G13 passam com DEMO ONLY e reprovam com dado real", () => {
    expect(gate(fatosPreR2, "G5").veredito).toBe("PASS");
    expect(gate(fatosPreR2, "G13").veredito).toBe("PASS");
    const comReal = lerFatos("count.products|total=8,demo=7,real=1,ativos=8");
    expect(gate(comReal, "G5").veredito).toBe("FAIL");
    expect(gate(comReal, "G13").veredito).toBe("FAIL");
  });

  it("G7 fica UNKNOWN sem status e reprova quando parcial", () => {
    expect(gate(lerFatos("db.name|postgres"), "G7").veredito).toBe("UNKNOWN");
    expect(gate(lerFatos("readiness.status|parcial"), "G7").veredito).toBe("FAIL");
    expect(gate(lerFatos("readiness.status|ok"), "G7").veredito).toBe("PASS");
  });
});

// ---------------------------------------------------------------------------------
// 6. Renderização
// ---------------------------------------------------------------------------------

describe("renderizar", () => {
  const fatos = lerFatos(
    [
      "run.environment|staging",
      "run.main_sha|abc1234",
      "run.ref_sufixo|hhvigy",
      "run.host_hash|9f2c1a4b7e08",
      "guard.read_only|on",
      "db.name|postgres",
      "db.user|postgres",
      "db.version|16.4",
      "db.now_utc|2026-08-04T18:00:00Z",
      "history.table_present|true",
      "history.version|20260727005424_a",
      "schema.column|products.gtin:text",
      "schema.constraint|products.products_gtin_valid_chk:c:NOT VALID",
      "schema.rls|products:true:forcada=false",
      "count.markets|total=4,demo=4,real=0,ativos=4",
      "count.products|total=7,demo=7,real=0,ativos=7",
      "count.prices|total=22,demo=22,real=0,ativos=22",
      "count.price_submissions|0",
      "count.product_watch_requests|0",
      "count.decision_feedback|0",
      "gtin.resumo|preenchidos=5,invalidos=2,duplicados=0",
      "gtin.invalido|22222222-2222-2222-2222-000000000002:*********0002:digito verificador errado",
      "preview.estado|proposta_segura=7",
      "preview.estado|ambigua=0",
      "readiness.status|parcial",
      "readiness.detalhe|interrompeu numa coluna inexistente",
    ].join("\n"),
  );
  const md = renderizar(fatos, LOCAIS);

  it("publica o fingerprint sanitizado, e não o host", () => {
    expect(md).toContain("9f2c1a4b7e08");
    expect(md).toContain("…hhvigy");
    expect(md).not.toMatch(/supabase\.(co|com)/);
    expect(md).not.toMatch(/postgres(ql)?:\/\//);
  });

  it("não vaza credencial de nenhum tipo", () => {
    for (const proibido of [/password/i, /\bsb_[a-z]/i, /\beyJ/, /service[_-]?role/i]) {
      expect(md).not.toMatch(proibido);
    }
  });

  it("mostra o GTIN mascarado e nunca um código completo", () => {
    expect(md).toContain("*********0002");
    // A checagem é restrita à seção de GTIN. O relatório inteiro não serve de escopo:
    // versão de migration é `20260803010000`, catorze dígitos legítimos, e uma regra
    // ampla demais reprovaria isso — e ninguém corrige um teste que grita sem razão,
    // desliga.
    // `-` entra na exclusão porque o `id` do produto é um UUID, e segmento de UUID é
    // sequência longa de dígitos legítima.
    const secao = md.slice(md.indexOf("## 5. GTIN"), md.indexOf("## 6."));
    expect(secao).toContain("*********0002");
    const semMascara = /(?<![*\d-])\d{8,14}(?![\d-])/;
    expect(secao, "há uma sequência longa de dígitos sem máscara na seção de GTIN").not.toMatch(
      semMascara,
    );
    // Controle positivo: a regra acima precisa reprovar um GTIN inteiro. Sem isto, ela
    // passaria igual se estivesse quebrada — e uma checagem de vazamento que não
    // detecta vazamento é pior do que nenhuma, porque tranquiliza.
    expect("| `22222222-2222-2222-2222-000000000002` | `7891000315507` |").toMatch(semMascara);
  });

  it("diz que R2-B passaria e que a FASE 6 é quem falharia", () => {
    // A distinção que o gate existe para preservar. Perdê-la faria alguém ler
    // "a migration aplica" como "o dado está limpo".
    expect(md).toContain("NOT VALID");
    expect(md).toContain("FASE 6");
  });

  it("não recomenda aplicar quando há gate reprovado", () => {
    expect(md).toContain("Nenhuma migration deve ser aplicada");
  });

  it("declara explicitamente o que não faz", () => {
    expect(md).toContain("backfill");
    expect(md).toContain("produção");
  });

  it("publica só a contagem do preview, nunca as linhas", () => {
    expect(md).toContain("proposta_segura");
    expect(md).not.toContain("size_text original");
    expect(md).toContain("não vão para o log nem para artefato");
  });

  it("mesmo com todos os gates verdes, não autoriza aplicação", () => {
    const limpos = lerFatos(
      [
        "history.table_present|true",
        ...LOCAIS.map((v) => `history.version|${v}`),
        "schema.column|products.gtin:text",
        "count.markets|total=4,demo=4,real=0,ativos=4",
        "count.products|total=7,demo=7,real=0,ativos=7",
        "count.prices|total=22,demo=22,real=0,ativos=22",
        "count.price_submissions|0",
        "count.product_watch_requests|0",
        "count.decision_feedback|0",
        "gtin.resumo|preenchidos=5,invalidos=0,duplicados=0",
        "readiness.status|ok",
        "readiness.detalhe|executado por inteiro",
      ].join("\n"),
    );
    const saida = renderizar(limpos, LOCAIS);
    expect(saida).toContain("**não** autoriza aplicar nada");
  });
});

// ---------------------------------------------------------------------------------
// 7. A aritmética GS1 duplicada não pode divergir
// ---------------------------------------------------------------------------------

describe("a aritmética GS1 de 20-content.sql não divergiu", () => {
  // Mesmo raciocínio de `target-readiness.test.ts`: a divergência perigosa não é a que
  // reprova demais — essa falha fechada. É a que reprova um GTIN VÁLIDO e manda alguém
  // "corrigir" dado bom. Um GTIN válido pertence a um produto real.
  const alvo = readFileSync(new URL("../target-readiness.sql", import.meta.url), "utf-8");
  const drill = readFileSync(new URL("../../db-drill/90-assertions.sql", import.meta.url), "utf-8");

  const NUCLEO = ["(10 - (SUM(", "* CASE WHEN i % 2 = 0 THEN 3 ELSE 1 END", ") % 10)) % 10"];

  it.each(NUCLEO)("o trecho %j aparece nos três arquivos", (trecho) => {
    expect(CONTEUDO, "ausente em 20-content.sql").toContain(trecho);
    expect(alvo, "ausente em target-readiness.sql").toContain(trecho);
    expect(drill, "ausente em 90-assertions.sql").toContain(trecho);
  });

  it("a indexação sobre o código completo é a mesma", () => {
    const indexacao = /substr\((\w+\.)?codigo, length\((\w+\.)?codigo\) - 1 - i, 1\)/;
    expect(CONTEUDO.replace(/c\.gtin/g, "codigo")).toMatch(indexacao);
    expect(alvo.replace(/c\.gtin/g, "codigo")).toMatch(indexacao);
  });
});
