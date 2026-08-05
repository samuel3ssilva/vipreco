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
// A SENHA NAO SAI POR STDOUT
//   Ela e escrita direto num arquivo `.pgpass` com modo 0600 dentro do diretorio de
//   trabalho efemero, e o que sai e o CAMINHO. O libpq le a senha de la (`PGPASSFILE`).
//
//   Nao e zelo: sair por stdout significaria a senha atravessando um pipe, virando
//   variavel de ambiente e -- o pior -- passando codificada em base64, que NAO e
//   protecao. O `::add-mask::` do GitHub mascara o valor literal do secret; ele nao
//   reconhece o base64 do mesmo valor. Uma senha em base64 num log e uma senha num
//   log com um passo a mais.
//
// SAIDA (stdout, uma chave por linha, valor em base64)
//   base64 porque usuario e banco podem conter `=`, `|`, espaco ou quebra de linha, e
//   qualquer separador em texto puro seria mais um jeito silencioso de corromper o
//   valor -- o mesmo erro de classe dos quatro defeitos acima, um nivel abaixo.
//
//     PGHOST=<b64>  PGPORT=<b64>  PGUSER=<b64>  PGDATABASE=<b64>
//     PGPASSFILE=<b64 do caminho>
//     FORMA=<lista separada por virgula>   (diagnostico, nunca contem o valor)
//
// O QUE NUNCA E IMPRESSO
//   a URL, a senha, o host, o usuario -- nem em erro. As linhas `FORMA=` carregam
//   apenas FATOS DE FORMATO ("a senha tem `%` que nao e escape valido"), que sao o
//   necessario para orientar a correcao sem revelar o segredo.
//
// ENTRADA (ambiente)
//   SUPABASE_DB_URL      a connection string de staging.
//   PREFLIGHT_WORKDIR    diretorio efemero onde o `.pgpass` e escrito. Exigido, e nao
//                        inventado aqui: quem cria o diretorio e quem o apaga, e o
//                        runner ja o apaga por `trap ... EXIT`, inclusive quando falha
//                        no meio -- que e justamente quando alguem esqueceria.
// =============================================================================
import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const bruto = process.env.SUPABASE_DB_URL;
const diretorio = process.env.PREFLIGHT_WORKDIR;

function abortar(mensagem: string): never {
  console.error(`::error::${mensagem}`);
  process.exit(1);
}

if (!bruto) {
  abortar("SUPABASE_DB_URL nao esta no ambiente.");
}
if (!diretorio) {
  abortar("PREFLIGHT_WORKDIR nao esta no ambiente; sem ele nao ha onde escrever o .pgpass.");
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

// -----------------------------------------------------------------------------
// O `.pgpass`.
//
// Formato do libpq: `host:porta:banco:usuario:senha`, uma entrada por linha, e o
// arquivo e IGNORADO se o modo for mais permissivo que 0600.
//
// Os quatro primeiros campos vao como `*`. Nao e preguica: casar host e porta
// exatamente cria um modo de falha novo e mudo -- se o libpq normalizar o host de um
// jeito e este arquivo escrever de outro, a entrada simplesmente nao casa e o psql se
// comporta como se nao houvesse senha. O arquivo e efemero, de uso unico e so tem
// esta linha; restringir os campos nao protege nada e pode quebrar tudo.
//
// `\` e `:` precisam de escape, e nesta ordem -- escapar `:` antes de `\` faria a
// barra do proprio escape ser escapada depois. E exatamente a familia de erro que
// motivou este arquivo: transformacao de string que corrompe em silencio.
// -----------------------------------------------------------------------------
function escreverPgpass(nome: string, valor: string): string {
  const escapada = valor.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
  const caminho = join(diretorio, nome);
  writeFileSync(caminho, `*:*:*:*:${escapada}\n`, { encoding: "utf-8", mode: 0o600 });
  chmodSync(caminho, 0o600);
  return caminho;
}

const caminhoPgpass = escreverPgpass(".pgpass", senha);

// -----------------------------------------------------------------------------
// O candidato alternativo, e por que ele existe.
//
// Quando a senha vem percent-encoded, decodificar e o certo -- e o que o libpq faz
// com uma URI. Mas ha um caso em que decodificar e o ERRADO: uma senha que contem
// literalmente `%40` e foi colada crua. As duas situacoes sao indistinguiveis olhando
// so para o texto, e as duas terminam no mesmo `password authentication failed`.
//
// Nao da para adivinhar qual e. Da para eliminar a duvida: quando a decodificacao
// mudou alguma coisa, o outro candidato e escrito tambem, e o runner tenta o segundo
// se o primeiro for recusado. Nao e adivinhar senha -- os dois candidatos saem, de
// forma deterministica, do mesmo valor que o Founder cadastrou. E a diferenca entre
// dizer "a credencial esta errada" e ter PROVADO que esta.
// -----------------------------------------------------------------------------
const caminhoAlternativo =
  senha !== url.password ? escreverPgpass(".pgpass-alt", url.password) : "";

const b64 = (v: string) => Buffer.from(v, "utf-8").toString("base64");

const linhas = [
  `PGHOST=${b64(url.hostname)}`,
  `PGPORT=${b64(url.port || "5432")}`,
  `PGUSER=${b64(usuario)}`,
  `PGDATABASE=${b64(banco)}`,
  `PGPASSFILE=${b64(caminhoPgpass)}`,
  `PGPASSFILE_ALT=${caminhoAlternativo ? b64(caminhoAlternativo) : ""}`,
  `FORMA=${forma.join(",")}`,
];

console.log(linhas.join("\n"));
