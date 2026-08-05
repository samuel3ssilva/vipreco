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
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const PARSER = new URL("./parse-connection-url.ts", import.meta.url).pathname;
const LOADER = new URL("./load-components.sh", import.meta.url).pathname;
const RUNNER = readFileSync(new URL("./run.sh", import.meta.url), "utf-8");
const PARSER_FONTE = readFileSync(new URL("./parse-connection-url.ts", import.meta.url), "utf-8");

type Componentes = Record<string, string> & { senha: string; saidaBruta: string };

let trabalho: string;
beforeEach(() => {
  trabalho = mkdtempSync(join(tmpdir(), "r2-parser-"));
});
afterEach(() => {
  rmSync(trabalho, { recursive: true, force: true });
});

/**
 * Executa o parser como o runner executa: URL pelo AMBIENTE, nunca por argv.
 * A senha é lida do `.pgpass`, e não da saída — porque ela não sai na saída.
 */
function parsear(url: string): Componentes {
  const saidaBruta = execFileSync("bun", [PARSER], {
    env: { ...process.env, SUPABASE_DB_URL: url, PREFLIGHT_WORKDIR: trabalho },
    encoding: "utf-8",
  });
  const componentes: Record<string, string> = {};
  for (const linha of saidaBruta.trim().split("\n")) {
    const corte = linha.indexOf("=");
    const chave = linha.slice(0, corte);
    const valor = linha.slice(corte + 1);
    componentes[chave] = chave === "FORMA" ? valor : Buffer.from(valor, "base64").toString("utf-8");
  }
  return { ...componentes, senha: lerSenhaDoPgpass(componentes.PGPASSFILE), saidaBruta };
}

/**
 * Desfaz o formato do libpq: `host:porta:banco:usuario:senha`, com `\` e `:`
 * escapados. Desescapar aqui, e não simplesmente cortar no último `:`, é o que faz o
 * teste provar o escape em vez de assumi-lo.
 */
function lerSenhaDoPgpass(caminho: string): string {
  const linha = readFileSync(caminho, "utf-8").replace(/\n$/, "");
  const campos: string[] = [];
  let atual = "";
  for (let i = 0; i < linha.length; i++) {
    if (linha[i] === "\\") {
      atual += linha[++i];
    } else if (linha[i] === ":") {
      campos.push(atual);
      atual = "";
    } else {
      atual += linha[i];
    }
  }
  campos.push(atual);
  return campos[4];
}

function falhar(url: string): { status: number; stderr: string } {
  try {
    execFileSync("bun", [PARSER], {
      env: { ...process.env, SUPABASE_DB_URL: url, PREFLIGHT_WORKDIR: trabalho },
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
    expect(parsear(url("abc+def")).senha).toBe("abc+def");
  });

  it("preserva `%` que não é escape válido — o parser antigo devolvia '100\\xpure'", () => {
    // `printf '%b'` com `\x` sem dígito hexadecimal não só devolvia lixo: escrevia
    // `printf: missing hex digit for \x` no stderr, ou seja, o defeito tinha aviso e
    // ninguém o lia.
    const r = parsear(url("100%pure"));
    expect(r.senha).toBe("100%pure");
    expect(r.FORMA).toContain("senha:percent-invalido");
  });

  it("não interpreta barra invertida — o parser antigo transformava `\\n` em quebra de linha", () => {
    // A senha é DADO. O parser antigo a passava para `printf` como se fosse FORMATO.
    expect(parsear(url("a\\nb")).senha).toBe("a\\nb");
  });

  it("corta no ÚLTIMO `@`, não no primeiro — o parser antigo truncava a senha em 'sen'", () => {
    const r = parsear(url("sen@ha"));
    expect(r.senha).toBe("sen@ha");
    expect(r.PGHOST).toBe(HOST);
    expect(r.FORMA).toContain("url:mais-de-um-arroba");
  });
});

describe("decodificação percent-encoded", () => {
  it("decodifica os caracteres que a URI exige escapar", () => {
    expect(parsear(url("p%40ss")).senha).toBe("p@ss");
    expect(parsear(url("a%3Ab")).senha).toBe("a:b");
    expect(parsear(url("x%25y")).senha).toBe("x%y");
    expect(parsear(url("a%2Bb")).senha).toBe("a+b");
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
      PGDATABASE: "meubanco",
      senha: "segredo",
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
      expect(parsear(url(encodeURIComponent(senha))).senha).toBe(senha);
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
    const r = parsear(url(senha));
    expect(r.senha).toBe(senha); // provou que o valor passou intacto...
    expect(r.FORMA).not.toContain(senha); // ...e que o diagnóstico não o repete.
    expect(r.FORMA).not.toContain(HOST);
    expect(r.FORMA).toBe("senha:contem-mais");
  });
});

// -----------------------------------------------------------------------------
// A senha não atravessa stdout.
//
// O CodeQL apontou `js/clear-text-logging` na versão que emitia `PGPASSWORD=<base64>`,
// e estava certo — base64 não é proteção. É pior que isso: o `::add-mask::` do GitHub
// mascara o valor LITERAL do secret e não reconhece o base64 do mesmo valor, então a
// codificação que parecia esconder era exatamente o que furava o mascaramento.
//
// A correção não foi silenciar o alerta. Foi remover o que ele apontava.
// -----------------------------------------------------------------------------
describe("a senha vai para um .pgpass, e não para a saída", () => {
  const SENHA = "SENHA-INCONFUNDIVEL-DE-TESTE-7d2a";

  it("não aparece na saída do parser, em texto nem em base64", () => {
    // Controle positivo: se o `.pgpass` não tivesse a senha, o primeiro expect
    // falharia — uma checagem de vazamento que não detecta vazamento tranquiliza.
    const r = parsear(url(SENHA));
    expect(r.senha).toBe(SENHA);
    expect(r.saidaBruta).not.toContain(SENHA);
    expect(r.saidaBruta).not.toContain(Buffer.from(SENHA, "utf-8").toString("base64"));
    expect(r.saidaBruta).not.toContain("PGPASSWORD");
  });

  it("escreve o arquivo com modo 0600 — o libpq ignora qualquer coisa mais permissiva", () => {
    const r = parsear(url(SENHA));
    expect(statSync(r.PGPASSFILE).mode & 0o777).toBe(0o600);
  });

  it("escapa `:` e `\\` no formato do libpq, na ordem certa", () => {
    // Escapar `:` antes de `\` faria a barra do próprio escape ser escapada depois.
    // É a mesma família de erro que motivou este arquivo: transformação de string que
    // corrompe em silêncio.
    for (const senha of ["a:b", "a\\b", "a\\:b", ":::", "a\\\\:b"]) {
      expect(parsear(url(encodeURIComponent(senha))).senha).toBe(senha);
    }
  });

  it("o parser nunca escreve a senha em stdout", () => {
    const codigo = PARSER_FONTE.split("\n")
      .filter((l) => !l.trimStart().startsWith("//"))
      .join("\n");
    expect(codigo).not.toMatch(/console\.log[^\n]*senha/);
    expect(codigo).not.toMatch(/PGPASSWORD/);
  });

  it("o arquivo mora no diretório efêmero que o runner apaga por trap", () => {
    const r = parsear(url(SENHA));
    expect(r.PGPASSFILE.startsWith(trabalho)).toBe(true);
    expect(RUNNER).toContain("trap limpar EXIT");
    expect(RUNNER).toContain('PREFLIGHT_WORKDIR="$TRABALHO"');
  });

  it("exige o diretório em vez de inventar um — quem cria é quem apaga", () => {
    let status = 0;
    try {
      execFileSync("bun", [PARSER], {
        env: { ...process.env, SUPABASE_DB_URL: url(SENHA), PREFLIGHT_WORKDIR: "" },
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch (erro) {
      status = (erro as { status: number }).status;
    }
    expect(status).toBe(1);
  });
});

// -----------------------------------------------------------------------------
// A COSTURA.
//
// Os dois blocos acima testam o parser. `preflight.test.ts` testa o runner. E o
// defeito seguinte morou exatamente entre os dois: `while IFS='=' read -r chave valor`
// descarta delimitadores no fim da linha, e o fim de toda linha base64 é `=`.
//
//   postgres -> cG9zdGdyZXM=  -> vira cG9zdGdyZXM  -> "postgr"
//   5432     -> NTQzMg==      -> vira NTQzMg       -> inválido
//
// Pior: o GNU base64 recusa com `invalid input`, o do macOS TRUNCA EM SILÊNCIO. O
// mesmo código falha barulhento no CI e mudo na máquina de quem escreveu — e o
// sintoma que chega é `password authentication failed`, que manda investigar o banco.
//
// Testar as duas pontas e não a junção é como conferir as duas margens e não a ponte.
// Por isso a leitura virou `load-components.sh`, uma função com nome, e por isso este
// bloco a executa DE VERDADE, em bash, com a saída real do parser.
// -----------------------------------------------------------------------------
describe("a junção entre o parser e o shell", () => {
  /** Roda a função real de `load-components.sh` sobre a saída real do parser. */
  function carregar(url: string): Record<string, string> {
    const saida = execFileSync("bun", [PARSER], {
      env: { ...process.env, SUPABASE_DB_URL: url, PREFLIGHT_WORKDIR: trabalho },
      encoding: "utf-8",
    });
    const script = `
      source "${LOADER}"
      carregar_componentes <<'FIM'
${saida}
FIM
      for v in PGHOST PGPORT PGUSER PGDATABASE PGPASSFILE FORMA_DA_URL; do
        printf '%s\\t%s\\n' "$v" "\${!v}"
      done
    `;
    const linhas = execFileSync("bash", ["-c", script], { encoding: "utf-8" }).trim().split("\n");
    return Object.fromEntries(linhas.map((l) => l.split("\t")));
  }

  it("não perde o padding `=` do base64 — 'postgres' não pode virar 'postgr'", () => {
    const r = carregar("postgresql://postgres:senha@db.abcdefghijklmnop.supabase.co:5432/postgres");
    expect(r.PGUSER).toBe("postgres");
    expect(r.PGDATABASE).toBe("postgres");
    expect(r.PGPORT).toBe("5432"); // `NTQzMg==` — dois `=` de padding, o pior caso
    expect(r.PGHOST).toBe("db.abcdefghijklmnop.supabase.co");
  });

  it("atravessa valores de todos os comprimentos módulo 3 — 0, 1 e 2 padding", () => {
    // O padding depende de length % 3. Um teste com um só valor cobre um só caso, e
    // foi exatamente assim que isto passou despercebido.
    for (const banco of ["ab", "abc", "abcd", "abcde", "abcdef"]) {
      const r = carregar(
        `postgresql://postgres:senha@db.abcdefghijklmnop.supabase.co:5432/${banco}`,
      );
      expect(r.PGDATABASE).toBe(banco);
    }
  });

  it("carrega o diagnóstico de forma junto", () => {
    const r = carregar(
      "postgresql://postgres:p%40ss@db.abcdefghijklmnop.supabase.co:5432/postgres",
    );
    expect(r.FORMA_DA_URL).toContain("senha:percent-encoded");
  });

  it("aborta em vez de seguir com componente vazio", () => {
    // Componente vazio não para nada sozinho: só muda para onde o psql tenta
    // conectar, e depois se apresenta como erro de credencial.
    let status = 0;
    try {
      execFileSync(
        "bash",
        ["-c", `source "${LOADER}"; printf 'PGUSER=!!!nao-e-base64!!!\\n' | carregar_componentes`],
        {
          encoding: "utf-8",
          stdio: "pipe",
        },
      );
    } catch (erro) {
      status = (erro as { status: number }).status;
    }
    expect(status).not.toBe(0);
  });
});

describe("o runner usa este parser, e não volta a parsear na mão", () => {
  it("chama parse-connection-url.ts", () => {
    expect(RUNNER).toContain("parse-connection-url.ts");
  });

  it("usa a função testada, e não um `read` inline", () => {
    expect(RUNNER).toContain("carregar_componentes");
    expect(RUNNER).not.toContain("IFS='='");
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
    expect(readFileSync(LOADER, "utf-8")).toContain("base64 --decode");
  });

  it("tem diagnóstico de conexão que orienta sem revelar", () => {
    expect(RUNNER).toContain("diagnostico_de_conexao");
    expect(RUNNER).toContain("nenhum valor e impresso");
  });
});
