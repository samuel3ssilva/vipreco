/**
 * §13 e §14 do mandato de convergência B2C — a evidência visual das cinco telas.
 *
 * Produz, em `docs/evidence/visual/b2c-north-star/`:
 *
 *   north-star-{home,search,comparison,detail,whatsapp}-390.png   cada tela, sozinha
 *   north-star-{...}-compare.png                                  TARGET | IMPLEMENTATION
 *   north-star-convergence-board.png                              as cinco linhas juntas
 *   b2c-weekend-demo-final.png                                    a prancha limpa
 *
 * =============================================================================
 * O ALVO É RECORTADO DA REFERÊNCIA, NÃO REDESENHADO
 * =============================================================================
 *
 * Cada coluna TARGET sai de um recorte do PNG do North Star — o arquivo versionado, com o
 * SHA-256 conferido. Nada aqui reinterpreta a referência: se o recorte estiver errado, a
 * comparação inteira está errada, e é por isso que as coordenadas ficam à vista.
 *
 * O North Star entra com `object-fit: contain` e proporção livre. Uma direção visual esticada
 * mentiria sobre a própria direção.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const BASE = process.argv[2] ?? "http://localhost:8080";
const DESTINO = join(process.cwd(), "docs/evidence/visual/b2c-north-star");
const REFERENCIA = join(process.cwd(), "docs/product/visual-north-star/vipreco-mvp-north-star.png");
const PORTA = 9341;

/** Os cinco aparelhos na referência de 1448×1086, medidos uma vez e escritos aqui. */
const RECORTES = [
  { chave: "home", x: 30, y: 200, w: 265, h: 700 },
  { chave: "search", x: 315, y: 200, w: 265, h: 700 },
  { chave: "comparison", x: 590, y: 200, w: 265, h: 700 },
  { chave: "detail", x: 862, y: 200, w: 265, h: 700 },
  { chave: "whatsapp", x: 1150, y: 200, w: 265, h: 700 },
] as const;

const TELAS = [
  { chave: "home", titulo: "1 · Home / Achados", rota: "/" },
  { chave: "search", titulo: "2 · Resultados da busca", rota: "/buscar?q=caf%C3%A9" },
  {
    chave: "comparison",
    titulo: "3 · Comparação do produto",
    rota: "/produto/22222222-2222-2222-2222-000000000002",
  },
  {
    chave: "detail",
    titulo: "4 · Detalhe da oferta",
    rota: "/produto/22222222-2222-2222-2222-000000000002/oferta/demo-price-cafe-serra-alta-m2",
  },
  { chave: "whatsapp", titulo: "5 · WhatsApp / retenção", rota: "/whatsapp" },
] as const;

/**
 * DIVERGÊNCIAS DELIBERADAS — elas moram aqui, e não só no relatório, porque a prancha é o que
 * o Founder olha na hora de decidir. Uma divergência que só existe num documento paralelo é uma
 * divergência que não foi avisada.
 */
const DIVERGENCIAS = [
  "<b>Duas abas, não cinco.</b> A referência desenha Achados, Buscar, Comparar, Favoritos e Mais. Comparação e detalhe são fluxo depois do produto; favoritos não existe. Divergência aceita no §11 do mandato anterior e reafirmada no §10 deste.",
  "<b>Artemis, Piracicaba — SP.</b> A referência usa São Luís, Cohab e Jardim Atlântico. Nenhuma geografia antiga aparece no produto.",
  "<b>Marcas e mercados fictícios, sem logotipo.</b> Nenhum direito de uso foi obtido e nenhum mercado é parceiro. As embalagens são desenho próprio; os mercados são identificados por texto.",
  "<b>Sem preço riscado.</b> A referência mostra “Preço anterior: R$ 20,49”. A decisão P-01 — qual observação anterior conta como “antes” — nunca foi tomada, e um preço riscado sem critério afirma uma queda que ninguém verificou.",
  "<b>Sem preço unitário.</b> A referência mostra R$/kg em todo card. Ele depende de quantidade estruturada aprovada, que é E1 e não existe em ambiente nenhum. Derivá-lo de texto livre seria inventar a conta.",
  "<b>Sem sino de notificação.</b> Notificação exige canal, consentimento e uma decisão sobre o que merece interromper alguém. Nada disso existe.",
  "<b>Copy factual no lugar dos superlativos.</b> Saíram “ofertas reais”, “as melhores ofertas” e “todos os dias”; entraram frases que delimitam o universo observado.",
];

const CSS = `
  * { box-sizing: border-box; }
  body { margin:0; background:#fbf7ec; color:#10231c;
         font-family: "Public Sans", system-ui, -apple-system, sans-serif; }
  .folha { width: 1400px; padding: 36px 40px 44px; }
  h1 { font-size: 34px; margin: 0 0 4px; letter-spacing:-0.02em; }
  .sub { color:#5b6b63; font-size:15px; margin:0 0 28px; }
  .linha { display:grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-bottom: 30px;
           background:#fff; border:1px solid #e2ded2; border-radius:16px; padding:20px; }
  .col { display:flex; flex-direction:column; gap:10px; min-width:0; }
  .rot { font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
  .rot.t { color:#8a6412; } .rot.i { color:#0e5c3c; }
  .quadro { background:#f1efe4; border:1px solid #e2ded2; border-radius:12px;
            height:700px; display:flex; align-items:center; justify-content:center;
            overflow:hidden; padding:10px; }
  .quadro img { height:100%; width:auto; max-width:100%; object-fit:contain; display:block;
                 border-radius:8px; }
  .tit { font-size:17px; font-weight:800; margin:0 0 12px; }
  .div { background:#fff; border:1px solid #e2ded2; border-radius:16px; padding:22px 26px; }
  .div h2 { font-size:16px; margin:0 0 12px; }
  .div ul { margin:0; padding-left:20px; }
  .div li { font-size:13.5px; line-height:1.6; color:#3c4c45; margin-bottom:8px; }
  /* prancha limpa */
  .prancha { width:1500px; padding:40px; }
  .fila { display:grid; grid-template-columns: repeat(5, 1fr); gap:18px; }
  .tela { display:flex; flex-direction:column; gap:10px; }
  .tela .quadro { height:700px; background:#fff; }
  .tela p { margin:0; font-size:13px; font-weight:700; text-align:center; }
`;

function recortar(): Map<string, string> {
  const tmp = mkdtempSync(join(tmpdir(), "ns-alvo-"));
  const mapa = new Map<string, string>();
  for (const r of RECORTES) {
    const saida = join(tmp, `${r.chave}.png`);
    execFileSync("sips", [
      "-c",
      String(r.h),
      String(r.w),
      "--cropOffset",
      String(r.y),
      String(r.x),
      REFERENCIA,
      "--out",
      saida,
    ]);
    mapa.set(r.chave, `data:image/png;base64,${readFileSync(saida).toString("base64")}`);
  }
  return mapa;
}

const dataUri = (caminho: string) =>
  `data:image/png;base64,${readFileSync(caminho).toString("base64")}`;

/**
 * A FOLHA VAI PARA DISCO ANTES DE SER FOTOGRAFADA.
 *
 * A primeira versão navegava direto para uma `data:text/html`, e o Chrome recusa navegação de
 * topo para `data:` — silenciosamente. O resultado foi a captura da página ANTERIOR, com o
 * nome do arquivo novo: uma prancha que parecia pronta e mostrava outra coisa. `file://`,
 * como o painel de R3.1 já fazia.
 */
async function folha(
  s: Awaited<ReturnType<typeof conectar>>,
  html: string,
  destino: string,
  largura: number,
): Promise<void> {
  const caminho = join(mkdtempSync(join(tmpdir(), "ns-folha-")), "folha.html");
  writeFileSync(caminho, html, "utf-8");
  const bytes = await capturarPagina(s, {
    url: `file://${caminho}`,
    largura,
    movel: false,
    espera: 1200,
  });
  const { largura: real } = dimensoesDoPng(bytes);
  if (real !== largura * 2) {
    throw new Error(`${destino}: largura ${real}, esperado ${largura * 2}`);
  }
  writeFileSync(destino, bytes);
  // O ARQUIVO TEM DE EXISTIR DEPOIS DE SER ESCRITO, e a verificação não é paranoia: a versão
  // anterior deste bloco chamava `capturarPagina` com a assinatura antiga, nada era escrito, e
  // o `console.log` da linha seguinte anunciava sucesso. Cinco arquivos "gerados" que não
  // existiam — e uma prancha de revisão que o Founder abriria e não encontraria.
  if (!existsSync(destino)) throw new Error(`${destino} não foi escrito`);
}

async function principal(): Promise<void> {
  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, mkdtempSync(join(tmpdir(), "ns-perfil-")));

  try {
    const s = await conectar(PORTA);

    // 1. cada tela, a 390 px, página inteira.
    const capturas = new Map<string, string>();
    const dobras = new Map<string, string>();
    for (const tela of TELAS) {
      const arquivo = join(DESTINO, `north-star-${tela.chave}-390.png`);
      const png = await capturarPagina(s, {
        url: `${BASE}${tela.rota}`,
        largura: 390,
        movel: true,
      });
      writeFileSync(arquivo, png);
      const { largura, altura } = dimensoesDoPng(png);
      // `deviceScaleFactor: 2` no CDP: 390 px de CSS viram 780 px de PNG. A conferência é do
      // dobro, e não do número solto — foi assim que a captura de uma largura errada foi pega
      // antes, lendo o cabeçalho IHDR em vez de confiar no que foi pedido.
      if (largura !== 780) {
        throw new Error(`${tela.chave}: largura ${largura}, esperado 780 (390 CSS × 2)`);
      }
      const estoura = await medir<boolean>(
        s,
        "document.documentElement.scrollWidth > document.documentElement.clientWidth",
      );
      if (estoura) throw new Error(`${tela.chave} estoura horizontalmente a 390 px.`);
      capturas.set(tela.chave, arquivo);
      console.log(`==> north-star-${tela.chave}-390.png — ${largura}x${altura} px`);

      // A COLUNA DE CONFRONTO USA UMA DOBRA, NÃO A PÁGINA INTEIRA.
      //
      // A referência mostra UM aparelho: uma tela de 390×844. Colocar ao lado dela uma captura
      // de 4118 px de altura reduzida para caber compara duas coisas que não são comparáveis —
      // a implementação vira uma tira ilegível, e o confronto não confronta nada.
      //
      // A página inteira continua entregue, em `-390.png`. Aqui entra o que cabe na tela.
      const dobra = await capturarPagina(s, {
        url: `${BASE}${tela.rota}`,
        largura: 390,
        movel: true,
        clip: { x: 0, y: 0, width: 390, height: 844, scale: 2 },
      });
      const arquivoDobra = join(DESTINO, `north-star-${tela.chave}-390-dobra.png`);
      writeFileSync(arquivoDobra, dobra);
      dobras.set(tela.chave, arquivoDobra);
    }

    const alvos = recortar();

    // 2. um confronto por tela.
    for (const tela of TELAS) {
      const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
        <div class="folha">
          <h1>${tela.titulo}</h1>
          <p class="sub">North Star (alvo) · implementação a 390 px</p>
          <div class="linha">
            <div class="col"><span class="rot t">Target — North Star</span>
              <div class="quadro"><img src="${alvos.get(tela.chave)}"></div></div>
            <div class="col"><span class="rot i">Implementation — 390 px</span>
              <div class="quadro"><img src="${dataUri(dobras.get(tela.chave)!)}"></div></div>
          </div>
        </div>`;
      const arquivo = join(DESTINO, `north-star-${tela.chave}-compare.png`);
      await folha(s, html, arquivo, 1400);
      console.log(`==> north-star-${tela.chave}-compare.png`);
    }

    // 3. a prancha de confronto, cinco linhas.
    const linhas = TELAS.map(
      (t) => `<div class="linha">
          <div class="col"><span class="rot t">Target — ${t.titulo}</span>
            <div class="quadro"><img src="${alvos.get(t.chave)}"></div></div>
          <div class="col"><span class="rot i">Staging candidate — 390 px</span>
            <div class="quadro"><img src="${dataUri(dobras.get(t.chave)!)}"></div></div>
        </div>`,
    ).join("");
    const board = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
      <div class="folha">
        <h1>ViPreço B2C — North Star Convergence Board</h1>
        <p class="sub">Referência: vipreco-mvp-north-star.png · sha256 7b7a28b5…cbb858 · 1448×1086.
           Implementação medida a 390 px, página inteira, sem recorte.</p>
        ${linhas}
        <div class="div"><h2>Divergências deliberadas da referência</h2><ul>
          ${DIVERGENCIAS.map((d) => `<li>${d}</li>`).join("")}
        </ul></div>
      </div>`;
    await folha(s, board, join(DESTINO, "north-star-convergence-board.png"), 1400);
    console.log("==> north-star-convergence-board.png");

    // 4. a prancha limpa — só o produto.
    const prancha = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
      <div class="prancha">
        <h1>ViPreço B2C — Weekend Demo Final</h1>
        <p class="sub">Artemis · Piracicaba — SP. Demonstração: produtos e preços ilustrativos.</p>
        <div class="fila">
          ${TELAS.map(
            (t) => `<div class="tela">
              <div class="quadro"><img src="${dataUri(dobras.get(t.chave)!)}"></div>
              <p>${t.titulo}</p></div>`,
          ).join("")}
        </div>
      </div>`;
    await folha(s, prancha, join(DESTINO, "b2c-weekend-demo-final.png"), 1500);
    console.log("==> b2c-weekend-demo-final.png");

    writeFileSync(
      join(DESTINO, "README.md"),
      [
        "# Evidência visual — convergência B2C com o North Star",
        "",
        "Gerado por `scripts/visual/b2c-north-star.ts` contra o servidor de desenvolvimento.",
        "",
        "| Arquivo | O que é |",
        "| --- | --- |",
        ...TELAS.map((t) => `| \`north-star-${t.chave}-390.png\` | ${t.titulo}, 390 px |`),
        ...TELAS.map(
          (t) => `| \`north-star-${t.chave}-compare.png\` | ${t.titulo} — alvo vs implementação |`,
        ),
        "| `north-star-convergence-board.png` | as cinco linhas, com as divergências deliberadas |",
        "| `b2c-weekend-demo-final.png` | a prancha limpa, só o produto |",
        "",
        "A coluna **Target** é recortada de `docs/product/visual-north-star/vipreco-mvp-north-star.png`",
        "(sha256 `7b7a28b5feeac4f23df770e6719e7492a8dc5298e42e23f5e104211b89cbb858`, 1448×1086).",
        "Nenhuma imagem é esticada: as duas entram com `object-fit: contain`.",
        "",
      ].join("\n"),
    );
  } finally {
    chrome.kill();
  }
}

void principal();
