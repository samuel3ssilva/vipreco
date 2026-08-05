#!/usr/bin/env bun
// =============================================================================
// R2.3B - DECOMPOSICAO DA CONNECTION STRING DE STAGING
//
// Le SUPABASE_DB_URL do AMBIENTE (nunca de argv) e devolve os componentes que o
// libpq espera, para que a senha nunca precise entrar na linha de comando do psql.
//
// POR QUE ISSO EXISTE
//   A primeira versao fazia isso com expansao de parametro do bash. Parecia
//   suficiente e nao era -- quatro defeitos, todos silenciosos:
//
//     `+` virava espaco       em URI, `+` e um mais literal; quem troca `+` por
//                             espaco e o formato de formulario, nao o de URL. O
//                             libpq so faz percent-decode.
//     `%` sem hex valido      `printf '%b'` cuspia `\x` literal.
//     `\n`, `\t`, `\\`        `printf '%b'` interpretava a senha como se fosse um
//                             formato, e nao um dado.
//     split no primeiro `@`   senha com `@` literal era truncada; o corte correto
//                             e no ULTIMO `@`.
//
//   Nenhum deles quebra o script: os quatro produzem uma senha errada, e uma senha
//   errada volta do banco como `password authentication failed` -- exatamente a
//   mesma mensagem de uma credencial de fato invalida. Um defeito que se disfarca
//   de problema do outro lado e o pior tipo, porque manda investigar o lugar errado.
//
//   Por isso a decomposicao passou a usar um parser de URL de verdade.
//
// SAIDA (stdout, uma chave por linha, valor em base64)
//   base64 porque senha pode conter `=`, `|`, espaco ou quebra de linha, e qualquer
//   separador em texto puro seria mais um jeito silencioso de corromper o valor.
//
//     PGHOST=<b64>  PGPORT=<b64>  PGUSER=<b64>  PGPASSWORD=<b64>  PGDATABASE=<b64>
//     FORMA=<lista separada por virgula>   (diagnostico, nunca contem o valor)
//
// O QUE NUNCA E IMPRESSO
//   a URL, a senha, o host, o usuario -- nem em erro. As linhas `FORMA=` carregam
//   apenas FATOS DE FORMATO ("a senha tem `%` que nao e escape valido"), que sao o
//   necessario para orientar a correcao sem revelar o segredo.
// =============================================================================

const bruto = process.env.SUPABASE_DB_URL;

function abortar(mensagem: string): never {
  console.error(`::error::${mensagem}`);
  process.exit(1);
}

if (!bruto) {
  abortar("SUPABASE_DB_URL nao esta no ambiente.");
}

let url: URL;
try {
  url = new URL(bruto);
} catch {
  abortar(
    "SUPABASE_DB_URL nao e uma URL valida. O valor nao e impresso. Formato esperado: postgresql://USUARIO:SENHA@HOST:5432/postgres",
  );
}

if (!url.protocol.startsWith("postgres")) {
  abortar(
    `O esquema da SUPABASE_DB_URL e '${url.protocol.replace(":", "")}', e deveria ser postgresql. O restante do valor nao e impresso.`,
  );
}
if (!url.hostname) abortar("SUPABASE_DB_URL nao tem host.");
if (!url.username) abortar("SUPABASE_DB_URL nao tem usuario antes do ':'.");
if (!url.password) abortar("SUPABASE_DB_URL nao tem senha. O valor nao e impresso.");

const forma: string[] = [];

// `URL` devolve usuario e senha ainda percent-encoded, e o libpq espera o valor
// decodificado. Decodificar so quando decodifica limpo: se o Founder colou uma senha
// com `%` literal sem escapar, `decodeURIComponent` lanca -- e o certo ai e usar o
// texto como esta, que e o que ele quis dizer, e AVISAR que a URI esta ambigua.
function decodificar(valor: string, campo: string): string {
  try {
    const decodificado = decodeURIComponent(valor);
    if (decodificado !== valor) forma.push(`${campo}:percent-encoded`);
    return decodificado;
  } catch {
    forma.push(`${campo}:percent-invalido`);
    return valor;
  }
}

const usuario = decodificar(url.username, "usuario");
const senha = decodificar(url.password, "senha");
const banco = decodificar(url.pathname.replace(/^\//, ""), "banco") || "postgres";

// Diagnostico de forma. Nunca o valor -- so a presenca de caracteres que a versao
// anterior corrompia, para que um `password authentication failed` futuro possa ser
// lido com a informacao certa em maos.
if (url.password.includes("+")) forma.push("senha:contem-mais");
if (/[\\]/.test(senha)) forma.push("senha:contem-barra-invertida");
if ((bruto.match(/@/g) ?? []).length > 1) forma.push("url:mais-de-um-arroba");
if (url.search) forma.push("url:tem-query");
if (!url.port) forma.push("url:sem-porta-explicita");

const b64 = (v: string) => Buffer.from(v, "utf-8").toString("base64");

const linhas = [
  `PGHOST=${b64(url.hostname)}`,
  `PGPORT=${b64(url.port || "5432")}`,
  `PGUSER=${b64(usuario)}`,
  `PGPASSWORD=${b64(senha)}`,
  `PGDATABASE=${b64(banco)}`,
  `FORMA=${forma.join(",")}`,
];

console.log(linhas.join("\n"));
