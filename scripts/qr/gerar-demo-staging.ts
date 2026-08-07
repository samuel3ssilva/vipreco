/**
 * Gera o QR Code da demonstração das entrevistas — SVG e PNG — apontando para `/para-mercados`
 * no Worker de STAGING.
 *
 * A URL é constante deste arquivo, e não parâmetro. Um script que aceita qualquer destino é um
 * script que um dia gera o QR de produção por engano, num diretório chamado "demonstração".
 * Trocar o destino passa a ser mudar código revisável.
 *
 *   bun scripts/qr/gerar-demo-staging.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gerarQr } from "./encoder";
import { paraPng, paraSvg } from "./render";

/** Validada em 06/08/2026: HTTP 200, H1 aprovado, MarketShell, banner de ambiente de teste. */
const DESTINO = "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/para-mercados";

const PASTA = join(process.cwd(), "docs/business/interviews/offline");

if (!DESTINO.includes(".workers.dev")) {
  throw new Error("o destino saiu do Worker de staging — este script não gera QR de produção");
}
if (/\d{10,15}/.test(DESTINO)) {
  throw new Error("o destino carrega o que parece um telefone");
}

mkdirSync(PASTA, { recursive: true });
const { versao, mascara, modulos } = gerarQr(DESTINO);

writeFileSync(join(PASTA, "qr-demo-staging.svg"), paraSvg(DESTINO));
writeFileSync(join(PASTA, "qr-demo-staging.png"), paraPng(DESTINO));

console.log(`destino  ${DESTINO}`);
console.log(
  `símbolo  versão ${versao}, ${modulos.length}x${modulos.length} módulos, máscara ${mascara}`,
);
console.log(`escrito  ${join(PASTA, "qr-demo-staging.svg")}`);
console.log(`escrito  ${join(PASTA, "qr-demo-staging.png")}`);
