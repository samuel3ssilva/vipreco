// R2.3B — regressão da decomposição da connection string.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A primeira execução real do preflight, com o secret já cadastrado, voltou com
// `password authentication failed for user "postgres"`. A leitura natural dessa
// mensagem é "a credencial está errada" — e ela estava certa. Quem estava errado era
// o decompositor da URL, escrito com expansão de parâmetro do bash e sem um teste
// sequer.
//
// Eram quatro defeitos, e o que os une é o que importa: NENHUM deles falha. Os quatro
// entregam uma senha silenciosamente diferente da que o Founder cadastrou, e uma
// senha diferente volta do Postgres com exatamente a mesma mensagem de uma senha
// inválida. Um defeito que se disfarça de problema do outro lado da conexão manda
// investigar o banco, o secret e o pooler — nunca o parser.
//
// Por isso cada um dos quatro tem caso aqui, com o valor que o parser antigo produzia
// escrito por extenso: se alguém reintroduzir a "simplificação", a suíte diz qual.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PARSER = new URL("./parse-connection-url.ts", import.meta.url).pathname;
const RUNNER = readFileSync(new URL("./run.sh", import.meta.url), "utf-8");

type Componentes = Record<string, string>;

/** Executa o parser como o runner executa: URL pelo AMBIENTE, nunca por argv. */
function parsear(url: string): Componentes {
  const saida = execFileSync("bun", [PARSER], {
    env: { ...process.env, SUPABASE_DB_URL: url },
    encoding: "utf-8",
  });
  const componentes: Componentes = {};
  for (const linha of saida.trim().split("\n")) {
    const corte = linha.indexOf("=");
    const chave = linha.slice(0, corte);
    const valor = linha.slice(corte + 1);
    componentes[chave] = chave === "FORMA" ? valor : Buffer.from(valor, "base64").toString("utf-8");
  }
  return componentes;
}

function falhar(url: string): { status: number; stderr: string } {
  try {
    execFileSync("bun", [PARSER], {
      env: { ...process.env, SUPABASE_DB_URL: url },
      encoding: "utf-8",
      stdio: "pipe",
    });
    return { status: 0, stderr: "" };
  } catch (erro) {
    const e = erro as { status: number; stderr: string };
    return { status: e.status, stderr: e.stderr };
  }
}

const HOST = "db.abcdefghijklmnop.supabase.co";
const url = (senha: string) => `postgresql://postgres:${senha}@${HOST}:5432/postgres`;

describe("os quatro defeitos que se disfarçavam de credencial inválida", () => {
  it("preserva `+` na senha — o parser antigo devolvia 'abc def'", () => {
    // Em URI, `+` é um mais literal. Quem troca `+` por espaço é o formato de
    // formulário (application/x-www-form-urlencoded), não o de URL; o libpq só faz
    // percent-decode. Trocar aqui é inventar um espaço que o Founder nunca digitou.
    expect(parsear(url("abc+def")).PGPASSWORD).toBe("abc+def");
  });

  it("preserva `%` que não é escape válido — o parser antigo devolvia '100\\xpure'", () => {
    // `printf '%b'` com `\x` sem dígito hexadecimal não só devolvia lixo: escrevia
    // `printf: missing hex digit for \x` no stderr, ou seja, o defeito tinha aviso e
    // ninguém o lia.
    const r = parsear(url("100%pure"));
    expect(r.PGPASSWORD).toBe("100%pure");
    expect(r.FORMA).toContain("senha:percent-invalido");
  });

  it("não interpreta barra invertida — o parser antigo transformava `\\n` em quebra de linha", () => {
    // A senha é DADO. O parser antigo a passava para `printf` como se fosse FORMATO.
    expect(parsear(url("a\\nb")).PGPASSWORD).toBe("a\\nb");
  });

  it("corta no ÚLTIMO `@`, não no primeiro — o parser antigo truncava a senha em 'sen'", () => {
    const r = parsear(url("sen@ha"));
    expect(r.PGPASSWORD).toBe("sen@ha");
    expect(r.PGHOST).toBe(HOST);
    expect(r.FORMA).toContain("url:mais-de-um-arroba");
  });
});

describe("decodificação percent-encoded", () => {
  it("decodifica os caracteres que a URI exige escapar", () => {
    expect(parsear(url("p%40ss")).PGPASSWORD).toBe("p@ss");
    expect(parsear(url("a%3Ab")).PGPASSWORD).toBe("a:b");
    expect(parsear(url("x%25y")).PGPASSWORD).toBe("x%y");
    expect(parsear(url("a%2Bb")).PGPASSWORD).toBe("a+b");
  });

  it("registra na FORMA quando decodificou, para o diagnóstico não ser adivinhação", () => {
    expect(parsear(url("p%40ss")).FORMA).toContain("senha:percent-encoded");
  });
});

describe("os componentes que o libpq recebe", () => {
  it("separa host, porta, usuário, senha e banco", () => {
    const r = parsear("postgresql://usuario:segredo@exemplo.supabase.co:6543/meubanco");
    expect(r).toMatchObject({
      PGHOST: "exemplo.supabase.co",
      PGPORT: "6543",
      PGUSER: "usuario",
      PGPASSWORD: "segredo",
      PGDATABASE: "meubanco",
    });
  });

  it("assume 5432 quando a porta é omitida, e sinaliza a omissão", () => {
    const r = parsear(`postgresql://postgres:senha@${HOST}/postgres`);
    expect(r.PGPORT).toBe("5432");
    expect(r.FORMA).toContain("url:sem-porta-explicita");
  });

  it("aceita o usuário do pooler, que carrega o project ref e um ponto", () => {
    const r = parsear(
      "postgres://postgres.abcdefghijklmnop:senha@aws-1-ca-central-1.pooler.supabase.com:6543/postgres?sslmode=require",
    );
    expect(r.PGUSER).toBe("postgres.abcdefghijklmnop");
    expect(r.PGDATABASE).toBe("postgres");
    expect(r.FORMA).toContain("url:tem-query");
  });

  it("sobrevive a senha com `=`, `|`, espaço e quebra de linha — daí o base64", () => {
    // Qualquer separador em texto puro seria mais um jeito silencioso de corromper o
    // valor. É o mesmo erro de classe dos quatro acima, um nível abaixo.
    for (const senha of ["a=b", "a|b", "a b", "a\nb"]) {
      expect(parsear(url(encodeURIComponent(senha))).PGPASSWORD).toBe(senha);
    }
  });
});

describe("o que o parser recusa, e sem imprimir o valor", () => {
  const recusas: Array<[string, string]> = [
    ["não é URL", "isto-nao-e-uma-url"],
    ["esquema errado", `mysql://postgres:senha@${HOST}:3306/postgres`],
    ["sem senha", `postgresql://postgres@${HOST}:5432/postgres`],
  ];

  for (const [rotulo, valor] of recusas) {
    it(`recusa: ${rotulo}`, () => {
      const { status, stderr } = falhar(valor);
      expect(status).toBe(1);
      expect(stderr).toContain("::error::");
    });
  }

  it("nunca imprime a senha, nem quando recusa", () => {
    // Controle positivo do teste: uma senha inconfundível, procurada na saída inteira.
    // Uma checagem de vazamento que não detecta vazamento é pior do que nenhuma,
    // porque tranquiliza.
    const senha = "SENHA-QUE-NAO-PODE-VAZAR-9c1f";
    const { stderr } = falhar(`mysql://postgres:${senha}@${HOST}:3306/postgres`);
    expect(stderr).not.toContain(senha);
    expect(stderr).not.toContain("mysql://postgres:");
  });

  it("a FORMA descreve o formato e nunca carrega o conteúdo", () => {
    const senha = "OUTRA-SENHA-INCONFUNDIVEL-4b7e+x";
    const { FORMA, PGPASSWORD } = parsear(url(senha));
    expect(PGPASSWORD).toBe(senha); // provou que o valor passou intacto...
    expect(FORMA).not.toContain(senha); // ...e que o diagnóstico não o repete.
    expect(FORMA).not.toContain(HOST);
    expect(FORMA).toBe("senha:contem-mais");
  });
});

describe("o runner usa este parser, e não volta a parsear na mão", () => {
  it("chama parse-connection-url.ts", () => {
    expect(RUNNER).toContain("parse-connection-url.ts");
  });

  it("não tem mais a expansão de parâmetro que corrompia a senha", () => {
    const codigo = RUNNER.split("\n")
      .filter((l) => !l.trimStart().startsWith("#"))
      .join("\n");
    expect(codigo).not.toContain("//+/ ");
    expect(codigo).not.toContain("printf '%b'");
    expect(codigo).not.toContain("%%@*");
  });

  it("recebe os componentes em base64, e não em texto separado por delimitador", () => {
    expect(RUNNER).toContain("base64 --decode");
  });

  it("tem diagnóstico de conexão que orienta sem revelar", () => {
    expect(RUNNER).toContain("diagnostico_de_conexao");
    expect(RUNNER).toContain("nenhum valor e impresso");
  });
});
