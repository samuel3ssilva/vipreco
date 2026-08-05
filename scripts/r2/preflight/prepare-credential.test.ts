// R2.3D — a credencial de staging vem de um segredo ATÔMICO.
//
// POR QUE ESTE ARQUIVO EXECUTA BASH DE VERDADE
//
// O antecessor deste caminho tinha teste, e mesmo assim quebrou cinco vezes. A quinta
// foi a mais instrutiva: as duas pontas — o parser e o shell — estavam testadas, e o
// defeito morava na COSTURA entre elas (`read` com `IFS='='` comia o `=` de padding do
// base64). Testar as duas margens não é testar a ponte.
//
// Então aqui nada é verificado por regex sobre o texto do script quando dá para
// EXECUTAR a função. `preparar_credencial` roda de verdade, com senhas hostis, e o que
// se afirma é o arquivo que ela produziu — conteúdo, modo, e o que NÃO apareceu na
// saída.
//
// As asserções estáticas que sobraram são as que não têm como ser executadas num teste
// (o desenho do workflow, a ausência de um caminho alternativo), e cada uma diz por quê.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CREDENCIAL = new URL("./prepare-credential.sh", import.meta.url).pathname;
const FONTE = readFileSync(CREDENCIAL, "utf-8");
const RUNNER = readFileSync(new URL("./run.sh", import.meta.url), "utf-8");
const WORKFLOW = readFileSync(
  new URL("../../../.github/workflows/r2-staging-preflight.yml", import.meta.url),
  "utf-8",
);
const ENVIRONMENTS = JSON.parse(
  readFileSync(new URL("../../../config/environments.json", import.meta.url), "utf-8"),
) as { staging: { supabaseProjectId: string }; production: { supabaseProjectId: string } };

const REF_STAGING = ENVIRONMENTS.staging.supabaseProjectId;
const REF_PRODUCAO = ENVIRONMENTS.production.supabaseProjectId;

let trabalho = "";
const destino = () => join(trabalho, ".pgpass");

beforeEach(() => {
  trabalho = mkdtempSync(join(tmpdir(), "r2-credencial-"));
});
afterEach(() => {
  rmSync(trabalho, { recursive: true, force: true });
});

type Resultado = { ok: boolean; stdout: string; stderr: string };

/**
 * Executa `preparar_credencial` de verdade, em bash, com o ambiente pedido.
 *
 * `senha: null` significa "a variável não existe", que é diferente de "existe vazia" —
 * e as duas precisam ser recusadas pelo mesmo motivo mas por caminhos diferentes.
 */
function preparar(
  senha: string | null,
  refStaging = REF_STAGING,
  refProducao = REF_PRODUCAO,
  alvo = destino(),
): Resultado {
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH };
  if (senha !== null) env.SUPABASE_DB_PASSWORD = senha;
  const r = spawnSync(
    "bash",
    [
      "-c",
      `set -euo pipefail\nsource "$1"\npreparar_credencial "$2" "$3" "$4"`,
      "_",
      CREDENCIAL,
      refStaging,
      refProducao,
      alvo,
    ],
    { encoding: "utf-8", env },
  );
  return { ok: r.status === 0, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

/** A senha como o libpq a lê de volta: campo 5 em diante, com os escapes desfeitos. */
function senhaLida(caminho = destino()): string {
  const linha = readFileSync(caminho, "utf-8").replace(/\n$/, "");
  const campos: string[] = [];
  let atual = "";
  for (let i = 0; i < linha.length; i++) {
    if (linha[i] === "\\" && i + 1 < linha.length) {
      atual += linha[++i];
    } else if (linha[i] === ":") {
      campos.push(atual);
      atual = "";
    } else {
      atual += linha[i];
    }
  }
  campos.push(atual);
  return campos.slice(4).join(":");
}

function campos(caminho = destino()): string[] {
  const linha = readFileSync(caminho, "utf-8").replace(/\n$/, "");
  const saida: string[] = [];
  let atual = "";
  for (let i = 0; i < linha.length; i++) {
    if (linha[i] === "\\" && i + 1 < linha.length) atual += linha[++i];
    else if (linha[i] === ":") {
      saida.push(atual);
      atual = "";
    } else atual += linha[i];
  }
  saida.push(atual);
  return saida;
}

// ---------------------------------------------------------------------------------
// 1. O segredo: presença, e recusa em vez de conserto
// ---------------------------------------------------------------------------------

describe("o segredo atômico", () => {
  it("recusa quando SUPABASE_DB_PASSWORD não existe no ambiente", () => {
    const r = preparar(null);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("SUPABASE_DB_PASSWORD nao esta no ambiente");
    expect(existsSync(destino())).toBe(false);
  });

  it("recusa quando o segredo existe mas está vazio", () => {
    // Diferente do caso acima: aqui a variável FOI cadastrada. Um segredo vazio no
    // GitHub é indistinguível de um ausente na tela, e teria produzido um prompt de
    // senha em vez de um erro claro.
    const r = preparar("");
    expect(r.ok).toBe(false);
    expect(existsSync(destino())).toBe(false);
  });

  it.each([
    ["espaço no fim", "senha123 "],
    ["espaço no começo", " senha123"],
    ["quebra de linha no fim", "senha123\n"],
    ["tabulação no fim", "senha123\t"],
  ])("recusa, em vez de aparar, com %s", (_nome, senha) => {
    // Aparar em silêncio produziria uma senha DIFERENTE da cadastrada — e uma senha
    // diferente volta do Postgres como `password authentication failed`, que manda
    // investigar o banco. É exatamente a família de defeito que esta mudança elimina.
    const r = preparar(senha);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("espaco em branco");
    expect(existsSync(destino())).toBe(false);
  });

  it("aceita senha alfanumérica sem avisar nada sobre a forma", () => {
    const r = preparar("Abc123XyZ789");
    expect(r.ok).toBe(true);
    expect(r.stderr).not.toContain("::warning::");
    expect(senhaLida()).toBe("Abc123XyZ789");
  });

  it("avisa — e prossegue — quando o segredo não é alfanumérico puro", () => {
    // Um bit de forma, e só. Não é o valor, nem comprimento, nem prefixo, nem hash.
    // Existe porque a ausência exata deste bit fez três execuções de R2.3C apontarem
    // para o banco quando o problema estava no conteúdo do segredo.
    const r = preparar("senha-com-hifen");
    expect(r.ok).toBe(true);
    expect(r.stderr).toContain("fora de [A-Za-z0-9]");
    expect(senhaLida()).toBe("senha-com-hifen");
  });
});

// ---------------------------------------------------------------------------------
// 2. O `.pgpass`: conteúdo exato, escapes, e modo
// ---------------------------------------------------------------------------------

describe("o .pgpass", () => {
  it("tem os quatro primeiros campos fixos, e o host é o de staging", () => {
    expect(preparar("Abc123").ok).toBe(true);
    const [host, porta, banco, usuario] = campos();
    expect(host).toBe(`db.${REF_STAGING}.supabase.co`);
    expect(porta).toBe("5432");
    // Ordem do libpq: hostname:port:DATABASE:USERNAME:password. Os dois valem
    // `postgres` hoje, então trocá-los não quebraria nada — quebraria calado no dia em
    // que um deles mudasse.
    expect(banco).toBe("postgres");
    expect(usuario).toBe("postgres");
  });

  it("nasce e permanece com modo 0600", () => {
    // O libpq IGNORA o arquivo, em silêncio, se o modo for mais permissivo — e `psql`
    // se comportaria como se não houvesse senha nenhuma.
    expect(preparar("Abc123").ok).toBe(true);
    expect(statSync(destino()).mode & 0o777).toBe(0o600);
  });

  it.each([
    ["dois-pontos", "a:b:c"],
    ["barra invertida", "a\\b"],
    ["barra invertida antes de dois-pontos", "a\\:b"],
    ["barra invertida no fim", "abc\\"],
    ["percent e mais", "a%40b+c"],
    ["cifrão e crase", "a$b`c"],
    ["aspas", `a"b'c`],
    ["espaço no meio", "a b c"],
  ])("preserva a senha exata com %s", (_nome, senha) => {
    // `%` e `+` estão aqui de propósito: eram dois dos cinco defeitos do desenho
    // anterior, e agora não há nenhum estágio que possa reinterpretá-los.
    expect(preparar(senha).ok).toBe(true);
    expect(senhaLida()).toBe(senha);
  });

  it("nunca imprime a senha, nem em stdout nem em stderr", () => {
    const senha = "SenhaQueNaoPodeVazar12345";
    const r = preparar(senha);
    expect(r.ok).toBe(true);
    expect(r.stdout).not.toContain(senha);
    expect(r.stderr).not.toContain(senha);
    // Controle positivo: se a senha estivesse na saída, a asserção acima teria de
    // falhar. Sem isto, "não vazou" e "a verificação não funciona" são iguais no CI.
    expect(readFileSync(destino(), "utf-8")).toContain(senha);
  });

  it("não imprime comprimento, hash nem prefixo da senha", () => {
    const r = preparar("Abc123XyZ789");
    const saida = r.stdout + r.stderr;
    expect(saida).not.toMatch(/\b12\b/);
    expect(saida).not.toContain("Abc");
    expect(saida).not.toContain("789");
  });
});

// ---------------------------------------------------------------------------------
// 3. Guardas de ambiente
// ---------------------------------------------------------------------------------

describe("guardas de ambiente", () => {
  it("os dois refs do arquivo versionado são distintos", () => {
    expect(REF_STAGING).not.toBe(REF_PRODUCAO);
    expect(REF_STAGING.length).toBeGreaterThan(8);
  });

  it("constrói o host a partir do ref de staging, e de mais nada", () => {
    expect(preparar("Abc123").ok).toBe(true);
    expect(campos()[0]).toBe(`db.${REF_STAGING}.supabase.co`);
  });

  it.each([
    ["staging ausente", "", REF_PRODUCAO],
    ["produção ausente", REF_STAGING, ""],
    ["os dois ausentes", "", ""],
  ])("recusa com %s, em vez de seguir sem guarda", (_nome, staging, producao) => {
    // Falha ABERTA se ninguém exigir os dois: com o ref de produção vazio, qualquer
    // comparação com `*""*` casa sempre e a recusa passaria calada. É o pior tipo de
    // defeito — a guarda parece estar lá, e não está.
    const r = preparar("Abc123", staging, producao);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("uma guarda que nao e verificavel nao e guarda");
    expect(existsSync(destino())).toBe(false);
  });

  it("recusa quando staging e produção são o mesmo ref", () => {
    const r = preparar("Abc123", REF_PRODUCAO, REF_PRODUCAO);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("IGUAIS");
    expect(existsSync(destino())).toBe(false);
  });

  it("recusa quando o host montado conteria o ref de produção", () => {
    // O host é CONSTRUÍDO a partir do ref de staging, então esta é hoje uma asserção
    // sobre a construção, e não a validação de um valor externo — era validação quando
    // o host vinha da URI cadastrada à mão. Ela fica porque volta a ser necessária no
    // instante em que alguém reintroduzir um host vindo de fora, sem depender de
    // ninguém lembrar de recriá-la.
    const r = preparar("Abc123", `contaminado-${REF_PRODUCAO}-x`, REF_PRODUCAO);
    expect(r.ok).toBe(false);
    expect(r.stderr).toContain("PRODUCAO");
    expect(existsSync(destino())).toBe(false);
  });

  it("nenhuma credencial é escrita antes de as guardas passarem", () => {
    // A ordem importa: um `.pgpass` criado antes da guarda existiria em disco mesmo
    // num job abortado.
    for (const [staging, producao] of [
      ["", REF_PRODUCAO],
      [REF_PRODUCAO, REF_PRODUCAO],
    ]) {
      rmSync(destino(), { force: true });
      expect(preparar("Abc123", staging, producao).ok).toBe(false);
      expect(existsSync(destino())).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------------
// 4. O caminho antigo não existe mais
//
// Estas são estáticas porque o que se afirma é uma AUSÊNCIA — e ausência não se executa.
// ---------------------------------------------------------------------------------

describe("o caminho de URI foi eliminado, e não duplicado", () => {
  const TUDO = FONTE + RUNNER + WORKFLOW;

  // Comentários e heredocs fora.
  //
  // Os três arquivos EXPLICAM por que a URI, o base64 e o percent-encoding sumiram — em
  // comentário e no texto que o runner publica quando falha. Casar em cima do texto
  // inteiro proibiria cada um deles de documentar a própria garantia, que é justamente
  // a parte que sobrevive à próxima pessoa. Então o que estas asserções varrem é o que
  // de fato EXECUTA.
  //
  // Heredocs aqui são sempre da forma `<<'TAG'` (aspas simples, sem interpolação), e é
  // por isso que dá para removê-los por delimitador sem risco de comer código.
  const soExecutavel = (texto: string) => {
    const saida: string[] = [];
    let tagAberta: string | null = null;
    for (const linha of texto.split("\n")) {
      if (tagAberta !== null) {
        if (linha.trim() === tagAberta) tagAberta = null;
        continue;
      }
      if (linha.trimStart().startsWith("#")) continue;
      const abertura = linha.match(/<<'([A-Z_]+)'/);
      if (abertura) {
        tagAberta = abertura[1];
        continue;
      }
      saida.push(linha);
    }
    return saida.join("\n");
  };
  const RUNNER_EXEC = soExecutavel(RUNNER);
  const EXECUTAVEL = soExecutavel(FONTE) + RUNNER_EXEC + soExecutavel(WORKFLOW);

  // Controle positivo do filtro. Sem isto, um `soExecutavel` bom demais — que comesse
  // o arquivo inteiro — deixaria todas as asserções de ausência abaixo passarem sem
  // verificar nada, e "está limpo" e "a verificação não funciona" são idênticos no CI.
  it("o filtro de executável não esvazia o que deveria varrer", () => {
    expect(RUNNER_EXEC).toContain("preparar_credencial");
    expect(RUNNER_EXEC).toContain("psql");
    expect(RUNNER_EXEC.length).toBeGreaterThan(RUNNER.length / 3);
    expect(EXECUTAVEL).toContain("SUPABASE_DB_PASSWORD");
    expect(EXECUTAVEL).toContain("escrever_pgpass");
    // E o filtro remove mesmo: estas duas linhas existem no texto e não no executável.
    expect(TUDO).toContain("nao ha base64");
    expect(EXECUTAVEL).not.toContain("nao ha base64");
  });

  it("nada executável lê SUPABASE_DB_URL", () => {
    expect(EXECUTAVEL).not.toContain("SUPABASE_DB_URL");
    // E o que o runner publica quando falta o segredo manda cadastrar o segredo NOVO —
    // um resumo que ainda mandasse cadastrar o antigo seria instrução errada mesmo sem
    // executar nada.
    expect(RUNNER.slice(RUNNER.indexOf("## A ação mínima"))).not.toContain("SUPABASE_DB_URL");
  });

  it("não há parser de URI, nem reconstrução de connection string", () => {
    for (const proibido of [
      "postgresql://",
      "postgres://",
      "parse-connection-url",
      "decodeURIComponent",
      "urldecode",
      "PGPASSFILE_ALT",
    ]) {
      expect(EXECUTAVEL.toLowerCase(), `ainda existe "${proibido}"`).not.toContain(
        proibido.toLowerCase(),
      );
    }
  });

  it("não há base64 em lugar nenhum do caminho", () => {
    // O base64 não era só supérfluo: ele DERROTAVA o `::add-mask::` do GitHub, que
    // mascara o valor literal do secret e não reconhece a codificação dele.
    expect(EXECUTAVEL.toLowerCase()).not.toContain("base64");
  });

  it("os arquivos do desenho anterior não voltaram", () => {
    for (const nome of [
      "parse-connection-url.ts",
      "parse-connection-url.test.ts",
      "load-components.sh",
    ]) {
      expect(existsSync(new URL(`./${nome}`, import.meta.url).pathname), `${nome} voltou`).toBe(
        false,
      );
    }
  });

  it("existe um caminho de autenticação só, e ele não tem fallback", () => {
    // Uma única entrada executável para o script de credencial. Duas seriam dois
    // caminhos de autenticação em paralelo — exatamente o que o redesenho eliminou.
    expect(RUNNER_EXEC.match(/prepare-credential\.sh/g)).toHaveLength(1);
    expect(RUNNER_EXEC).toContain('source "$PREFLIGHT_DIR/prepare-credential.sh"');
    expect(RUNNER_EXEC.match(/preparar_credencial /g)).toHaveLength(1);
    // Sem segunda tentativa: ela existia porque a senha vinha de dentro de uma URI e
    // havia duas leituras defensáveis do mesmo texto. Com um segredo atômico há uma
    // leitura só, e um erro que aponta para um lugar.
    expect(RUNNER).not.toContain("PGPASSFILE_ALT");
    expect(RUNNER).not.toContain("FORMA_DA_URL");
  });

  it("o segredo é lido uma única vez, e só como secret do environment", () => {
    expect(WORKFLOW).toContain("SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}");
    expect(WORKFLOW.match(/secrets\.SUPABASE_DB_PASSWORD/g)).toHaveLength(1);
    expect(WORKFLOW).not.toContain("vars.SUPABASE_DB_PASSWORD");
    expect(WORKFLOW).not.toContain("inputs.SUPABASE_DB_PASSWORD");
  });

  it("a senha sai do ambiente assim que o .pgpass existe", () => {
    // Dali em diante todo processo filho — `psql`, `bun` do renderizador — herda um
    // ambiente que não a contém. O `unset` vem depois da chamada que a consome e antes
    // do primeiro `psql`; fora dessa ordem ele não protegeria nada ou quebraria tudo.
    expect(RUNNER_EXEC).toContain("unset SUPABASE_DB_PASSWORD");
    const posUnset = RUNNER.indexOf("unset SUPABASE_DB_PASSWORD");
    expect(posUnset).toBeGreaterThan(RUNNER.indexOf('preparar_credencial "$REF_STAGING"'));
    expect(posUnset).toBeLessThan(RUNNER.indexOf("psql_transacao()"));
  });

  it("o runner recusa qualquer environment que não seja staging", () => {
    expect(WORKFLOW).toMatch(/PREFLIGHT_ENVIRONMENT: staging/);
    expect(WORKFLOW).toMatch(/environment:\s*staging/);
    expect(RUNNER).toMatch(/if \[ "\$\{PREFLIGHT_ENVIRONMENT:-\}" != "staging" \]/);
  });

  it("sem o segredo, encerra com a mensagem exata e não tenta mais nada", () => {
    expect(RUNNER).toMatch(/if \[ -z "\$\{SUPABASE_DB_PASSWORD:-\}" \]/);
    expect(RUNNER).toContain("STAGING DATABASE PASSWORD SECRET REQUIRED");
    // A guarda de presença vem antes de qualquer psql.
    expect(RUNNER.indexOf("STAGING DATABASE PASSWORD SECRET REQUIRED")).toBeLessThan(
      RUNNER.indexOf("psql"),
    );
  });

  it("o .pgpass vive no diretório efêmero que o trap apaga", () => {
    // Estática de propósito: o que se afirma é a LIGAÇÃO entre dois fatos do runner —
    // o caminho do arquivo e o alvo do `trap`. Executar isso testaria o snippet do
    // teste, não o runner.
    expect(RUNNER).toContain('PGPASSFILE="$TRABALHO/.pgpass"');
    expect(RUNNER).toContain(
      'preparar_credencial "$REF_STAGING" "$REF_PROIBIDO" "$TRABALHO/.pgpass"',
    );
    expect(RUNNER).toMatch(/limpar\(\) \{ rm -rf "\$TRABALHO"; \}/);
    expect(RUNNER).toContain("trap limpar EXIT");
  });

  it("nenhuma credencial administrativa aparece no caminho", () => {
    // `service_role` em minúsculas não está na lista de propósito: o resumo publicado
    // PROÍBE cadastrá-la, e proibir exige nomear.
    for (const proibido of [
      "SERVICE_ROLE",
      "service_role_key",
      "anon_key",
      "CLOUDFLARE",
      "wrangler",
    ]) {
      expect(TUDO).not.toContain(proibido);
    }
  });

  it("o script de credencial é sourced, e não executado com a senha em argv", () => {
    // argv é legível por outros processos do runner. A senha entra pelo ambiente e sai
    // para um arquivo 0600; ela nunca é um argumento.
    //
    // O arquivo DEFINE a função e não a invoca: um `source` não pode ter efeito além de
    // declarar. `preparar_credencial() {` é definição; `preparar_credencial ...` seria
    // chamada, e é só essa segunda forma que a regex procura.
    expect(FONTE).not.toMatch(/^\s*preparar_credencial\s+\S/m);
    expect(RUNNER).not.toMatch(/prepare-credential\.sh[^\n]*\$SUPABASE_DB_PASSWORD/);
    expect(RUNNER).not.toMatch(/psql[^\n]*\$SUPABASE_DB_PASSWORD/);
  });
});

// ---------------------------------------------------------------------------------
// 5. shellcheck, quando estiver disponível
// ---------------------------------------------------------------------------------

describe("higiene do shell", () => {
  it("passa no shellcheck (pulado quando o binário não está presente)", () => {
    const temShellcheck = spawnSync("bash", ["-c", "command -v shellcheck"], {
      encoding: "utf-8",
    }).status;
    if (temShellcheck !== 0) return;
    const r = spawnSync("shellcheck", ["--severity=warning", CREDENCIAL], { encoding: "utf-8" });
    expect(r.stdout + r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  it("bash aceita os dois scripts sem erro de sintaxe", () => {
    for (const arquivo of [CREDENCIAL, new URL("./run.sh", import.meta.url).pathname]) {
      expect(() => execFileSync("bash", ["-n", arquivo], { encoding: "utf-8" })).not.toThrow();
    }
  });
});
