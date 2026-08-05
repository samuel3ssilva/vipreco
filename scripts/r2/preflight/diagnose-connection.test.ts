// R2.3E — o diagnóstico lê o erro antes de opinar.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// No run 31030456630 o preflight morreu em `Network is unreachable` — o TCP nunca
// abriu, a senha nunca foi testada — e o texto impresso mandava conferir a credencial.
// Quatro hipóteses, todas sobre a senha, todas irrelevantes.
//
// É a mesma família de defeito que a R2.3D existe para eliminar, um nível acima: uma
// mensagem que se disfarça de resposta e manda investigar o lugar errado. Antes, o
// defeito estava no valor da senha; aqui, no texto que explica a falha. O custo é o
// mesmo — alguém procura onde não está.
//
// Por isso o diagnóstico saiu de dentro do `run.sh` e virou uma função sourced: dá para
// EXECUTAR, com erros reais de psql copiados dos runs, em vez de conferir o texto por
// regex e torcer.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const DIAGNOSTICO = new URL("./diagnose-connection.sh", import.meta.url).pathname;
const FONTE = readFileSync(DIAGNOSTICO, "utf-8");
const RUNNER = readFileSync(new URL("./run.sh", import.meta.url), "utf-8");

let trabalho = "";
beforeEach(() => {
  trabalho = mkdtempSync(join(tmpdir(), "r2-diagnostico-"));
});
afterEach(() => {
  rmSync(trabalho, { recursive: true, force: true });
});

/** Roda `diagnostico_de_conexao` de verdade sobre um stderr de psql. */
function diagnosticar(erroDoPsql: string | null): string {
  const caminho = join(trabalho, "psql.err");
  if (erroDoPsql !== null) writeFileSync(caminho, erroDoPsql, "utf-8");
  const r = spawnSync(
    "bash",
    [
      "-c",
      `set -euo pipefail\nERRO_PSQL="$2"\nsource "$1"\ndiagnostico_de_conexao`,
      "_",
      DIAGNOSTICO,
      caminho,
    ],
    { encoding: "utf-8", env: { PATH: process.env.PATH } },
  );
  expect(r.status, `o diagnóstico não pode falhar: ${r.stderr}`).toBe(0);
  return r.stderr ?? "";
}

// O erro EXATO do run 31030456630, com o host já mascarado pelo GitHub.
const ERRO_REDE_REAL = `psql: error: connection to server at "***" (2600:1f11:c29:8b01:1f37:785f:3f86:6352), port 5432 failed: Network is unreachable
	Is the server running on that host and accepting TCP/IP connections?`;

// O erro EXATO do run 4 de R2.3B.
const ERRO_SENHA_REAL = `psql: error: connection to server at "***" (1.2.3.4), port 5432 failed: FATAL:  password authentication failed for user "postgres"
	password retrieved from file "/tmp/r2-preflight.XXXX/.pgpass"`;

describe("falha de rede — o TCP nunca abriu", () => {
  it("diz que a senha não foi testada, e não a acusa", () => {
    const saida = diagnosticar(ERRO_REDE_REAL);
    expect(saida).toContain("O TCP NUNCA ABRIU");
    expect(saida).toContain("nao chegou a ser testada");
    // A regressão inteira em uma asserção: nenhuma hipótese sobre a senha aqui.
    expect(saida).not.toContain("senha da CONTA do Supabase");
    expect(saida).not.toContain("connection string inteira colada");
  });

  it("nomeia a causa real e onde copiar o host certo", () => {
    const saida = diagnosticar(ERRO_REDE_REAL);
    expect(saida).toContain("IPv6-only");
    expect(saida).toContain("IPv4-only");
    expect(saida).toContain("supabaseDbHost");
    expect(saida).toContain("Session pooler");
  });

  it.each([
    ["DNS não resolve", 'could not translate host name "x" to address'],
    ["nome desconhecido", "Name or service not known"],
    ["porta fechada", "Connection refused"],
    ["sem rota", "No route to host"],
    ["timeout", "connection timed out"],
    ["timeout do libpq", "timeout expired"],
  ])("também trata %s como falha de caminho, não de credencial", (_nome, erro) => {
    const saida = diagnosticar(`psql: error: ${erro}`);
    expect(saida).toContain("O TCP NUNCA ABRIU");
    expect(saida).not.toContain("senha da CONTA do Supabase");
  });
});

describe("falha de autenticação — o servidor respondeu e recusou", () => {
  it("aí sim aponta para o valor do segredo", () => {
    const saida = diagnosticar(ERRO_SENHA_REAL);
    expect(saida).toContain("O SERVIDOR RESPONDEU E RECUSOU");
    expect(saida).toContain("senha da CONTA do Supabase");
    expect(saida).not.toContain("O TCP NUNCA ABRIU");
  });

  it("manda conferir o usuário que o servidor citou de volta", () => {
    // O pooler espera `postgres.<project-ref>`. Um servidor citando `postgres` puro é
    // informação, não ruído — e por isso `PGUSER` não é mascarado.
    const saida = diagnosticar(ERRO_SENHA_REAL);
    expect(saida).toContain("postgres.<project-ref>");
  });

  it("não promete nada que o segredo atômico não garanta", () => {
    const saida = diagnosticar(ERRO_SENHA_REAL);
    expect(saida).toContain("nao ha URI para montar errado");
    expect(saida).toContain("nem base64");
  });
});

describe("erro de outra natureza, ou nenhum erro", () => {
  it.each([
    ["erro de SQL", 'ERROR:  relation "nao_existe" does not exist'],
    ["erro vazio", ""],
  ])("não conclui nada com %s", (_nome, erro) => {
    const saida = diagnosticar(erro);
    expect(saida).toContain("nao e de rede nem de autenticacao");
    expect(saida).not.toContain("O TCP NUNCA ABRIU");
    expect(saida).not.toContain("O SERVIDOR RESPONDEU E RECUSOU");
  });

  it("não quebra quando o arquivo de erro nem existe", () => {
    // `set -u` mais um `[ -f ]` que falha é o tipo de coisa que derruba o script
    // justamente no caminho de erro — onde ninguém testa e todo mundo precisa.
    const saida = diagnosticar(null);
    expect(saida).toContain("--- diagnostico de conexao");
  });
});

describe("o diagnóstico nunca vaza nada", () => {
  it("não imprime senha, host nem caminho de arquivo vindos do erro", () => {
    const saida = diagnosticar(
      'psql: FATAL: password authentication failed\npassword retrieved from file "/tmp/segredo/.pgpass"',
    );
    // Ele ecoa o próprio texto do psql? Não: o runner já mandou o stderr do psql para o
    // log; o diagnóstico só acrescenta a leitura.
    expect(saida).not.toContain("/tmp/segredo");
    expect(saida).not.toContain("password retrieved from file");
  });
});

describe("o runner usa o diagnóstico, e captura o erro para ele", () => {
  it("sourceia o módulo em vez de repetir o texto", () => {
    expect(RUNNER).toContain('source "$PREFLIGHT_DIR/diagnose-connection.sh"');
    expect(RUNNER).not.toContain("O TCP NUNCA ABRIU");
  });

  it("guarda o stderr do psql, além de repassá-lo", () => {
    // Sem isso o diagnóstico não tem como saber por que falhou, e um diagnóstico que
    // não lê o erro só pode chutar — que é como este defeito nasceu.
    expect(RUNNER).toContain('ERRO_PSQL="$TRABALHO/psql.err"');
    expect(RUNNER).toMatch(/2>"\$ERRO_PSQL"/);
    expect(RUNNER).toMatch(/cat "\$ERRO_PSQL" >&2/);
  });

  it("o módulo define e não invoca", () => {
    expect(FONTE).not.toMatch(/^\s*diagnostico_de_conexao\s*$/m);
  });
});
