/**
 * QA visual rápido da demo v2 — captura as seis telas para inspeção local.
 * Uso: bun scripts/visual/qa-comparaveis.ts <destino> [base]
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar } from "./cdp";

const DESTINO = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:8080";
const PORTA = 9377;

const TELAS = [
  { chave: "home", rota: "/" },
  { chave: "busca", rota: "/buscar?q=frango" },
  { chave: "comparacao-bucho", rota: "/produto/33333333-3333-3333-3333-0000000000b2" },
  { chave: "comparacao-dreamies", rota: "/produto/33333333-3333-3333-3333-0000000000bd" },
  {
    chave: "detalhe",
    rota: "/produto/33333333-3333-3333-3333-0000000000b2/oferta/demo-v2-bucho-mota",
  },
  { chave: "whatsapp", rota: "/whatsapp" },
] as const;

async function main() {
  if (!DESTINO) throw new Error("uso: bun scripts/visual/qa-comparaveis.ts <destino> [base]");
  mkdirSync(DESTINO, { recursive: true });
  const perfil = mkdtempSync(join(tmpdir(), "vipreco-qa-"));
  const chrome = abrirChrome(PORTA, perfil);
  try {
    const sessao = await conectar(PORTA);
    for (const tela of TELAS) {
      const png = await capturarPagina(sessao, {
        url: `${BASE}${tela.rota}`,
        largura: 390,
        movel: true,
      });
      writeFileSync(join(DESTINO, `${tela.chave}.png`), png);
      console.log(tela.chave, png.length);
    }
  } finally {
    chrome.kill();
    try {
      execFileSync("rm", ["-rf", perfil]);
    } catch {
      // perfil temporário órfão não invalida a captura
    }
  }
}

await main();
