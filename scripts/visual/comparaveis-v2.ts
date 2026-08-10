/**
 * COMPARABLE PRODUCTS DEMO V2 — a evidência visual do mandato de 09/08/2026 (§19, §20, §23).
 *
 * Produz, em `docs/evidence/visual/comparaveis-v2/`:
 *
 *   {home,busca,comparacao-mota,comparacao-dreamies,detalhe,whatsapp}-390.png   cada tela
 *   north-star-{home,busca,comparacao,detalhe}-compare.png       TARGET | IMPLEMENTATION
 *   comparable-products-demo-board.png                           a prancha final (§20)
 *
 * O alvo de cada confronto é RECORTADO do PNG versionado do North Star — nada é redesenhado;
 * as coordenadas são as mesmas medidas na convergência B2C anterior e ficam à vista.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const BASE = process.argv[2] ?? "http://localhost:8080";
const DESTINO = join(process.cwd(), "docs/evidence/visual/comparaveis-v2");
const REFERENCIA = join(process.cwd(), "docs/product/visual-north-star/vipreco-mvp-north-star.png");
const PORTA = 9351;

/** Os aparelhos na referência de 1448×1086, medidos uma vez na convergência B2C. */
const RECORTES = [
  { chave: "home", x: 30, y: 200, w: 265, h: 700 },
  { chave: "busca", x: 315, y: 200, w: 265, h: 700 },
  { chave: "comparacao", x: 590, y: 200, w: 265, h: 700 },
  { chave: "detalhe", x: 862, y: 200, w: 265, h: 700 },
] as const;

const GRUPO_BUCHO = "33333333-3333-3333-3333-0000000000b2";
const GRUPO_DREAMIES = "33333333-3333-3333-3333-0000000000bd";

const TELAS = [
  { chave: "home", titulo: "1 · Home / Achados", rota: "/", alvo: "home" },
  { chave: "busca", titulo: "2 · Busca (frango)", rota: "/buscar?q=frango", alvo: "busca" },
  {
    chave: "comparacao-mota",
    titulo: "3a · Comparação — Bucho bovino (peso variável)",
    rota: `/produto/${GRUPO_BUCHO}`,
    alvo: "comparacao",
  },
  {
    chave: "comparacao-dreamies",
    titulo: "3b · Comparação — Dreamies (embalagens diferentes)",
    rota: `/produto/${GRUPO_DREAMIES}`,
    alvo: null,
  },
  {
    chave: "detalhe",
    titulo: "4 · Detalhe — Bucho no Açougue Mota",
    rota: `/produto/${GRUPO_BUCHO}/oferta/demo-v2-bucho-mota`,
    alvo: "detalhe",
  },
  { chave: "whatsapp", titulo: "5 · WhatsApp / retenção", rota: "/whatsapp", alvo: null },
] as const;

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
  .div { background:#fff; border:1px solid #e2ded2; border-radius:16px; padding:22px 26px; }
  .div h2 { font-size:16px; margin:0 0 12px; }
  .div ul { margin:0; padding-left:20px; }
  .div li { font-size:13.5px; line-height:1.6; color:#3c4c45; margin-bottom:8px; }
  .prancha { width:1700px; padding:40px; }
  .fila { display:grid; grid-template-columns: repeat(6, 1fr); gap:16px; margin-bottom:28px; }
  .tela { display:flex; flex-direction:column; gap:10px; }
  .tela .quadro { height:640px; background:#fff; }
  .tela p { margin:0; font-size:12.5px; font-weight:700; text-align:center; }
`;

/** As decisões de honestidade da demo v2 — na prancha, onde o Founder decide. */
const NOTAS_POLISH = [
  "<b>Snapshot histórico (§18 do polish).</b> Nenhuma data foi reancorada: os encartes venceram em 09 e 12/08 e as ofertas CONTINUAM na demo, com a validade em tempo verbal honesto — 'valeu até 09/08/2026' — e a nota única 'preços observados em agosto de 2026'. Vigência nunca é afirmada depois do vencimento; o caminho do piloto continua expirando pelo princípio 2.",
  "<b>Imagens novas do Founder.</b> Bucho bovino trocado pela foto correta (prato) em todo o fluxo; bisteca bovina saiu do placeholder e entrou na Home. Elseve 200 ml e Sanol 7 un continuam com placeholder deliberado, fora de posição nobre.",
  "<b>Diferença de preço (§12).</b> 'R$ 0,50 a menos que o 2º mercado em 500 g' — só em grupo de mesmo produto e mesma quantidade, aritmética determinística de centavos, acompanhando o seletor de peso. Nunca 'economize'.",
  "<b>Banner de ambiente virou pill (§16).</b> A mesma informação, sem competir com o conteúdo; noindex técnico intacto.",
];

const NOTAS = [
  "<b>Fonte da verdade: a planilha.</b> Preço cheio, preço de clube, gramatura, condição, fonte e período vêm de Comparativo_Precos_Supermercados_09-08-2026.xlsx. Nenhum valor foi inventado; os normalizados são derivados da quantidade estruturada e conferidos ao centavo contra a planilha (única exceção: farofa no Safra, 12,48 × 12,47 — empate de meio centavo, arredondamento).",
  "<b>Package price protagonista (§0).</b> O número grande é sempre o que o consumidor paga — a embalagem, ou o calculado de aprox. 250 g / 500 g / 1 kg no peso variável. O R$/kg, R$/L e R$/un ficam logo abaixo, menores, como base de comparação.",
  "<b>Embalagens diferentes comparam por custo unitário (§5, §6, §7).</b> Dreamies, Elseve e Sanol ordenam pelo normalizado, com o selo 'Melhor custo/kg·L·un' e a gramatura de cada SKU na linha. 'Mais barato' sem denominador não aparece em tela nenhuma.",
  "<b>Preço de clube separado (§8).</b> Cartão Savegnago e 'levando 3' aparecem ao lado do preço cheio, com a condição — nunca no lugar dele, e nunca reordenando a lista.",
  "<b>Imagens: IA só nos cortes sem marca; produto de marca é recorte do encarte do próprio mercado (§10).</b> Elseve 200 ml e Sanol 7 un ficam com placeholder: não há material com qualidade de recorte, e imagem errada é pior que nenhuma.",
  "<b>Datas e validades reais (§15).</b> Encartes valeram até 09/08 ou 12/08/2026 — as datas são as reais e nenhuma foi reancorada; o que a demo faz com o vencimento está na nota de snapshot acima.",
  "<b>Localização só onde é validada (§16).</b> Mota é de Artemis; Safra é loja única com endereço da planilha; Savegnago, Atacadão e Pague Menos são preços de rede/tabloide regional e não afirmam bairro. Nenhuma distância é dita.",
];

function recortar(): Map<string, string> {
  const tmp = mkdtempSync(join(tmpdir(), "cv2-alvo-"));
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

async function folha(
  s: Awaited<ReturnType<typeof conectar>>,
  html: string,
  destino: string,
  largura: number,
): Promise<void> {
  const caminho = join(mkdtempSync(join(tmpdir(), "cv2-folha-")), "folha.html");
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
  if (!existsSync(destino)) throw new Error(`${destino} não foi escrito`);
}

async function principal(): Promise<void> {
  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, mkdtempSync(join(tmpdir(), "cv2-perfil-")));

  try {
    const s = await conectar(PORTA);

    // 1. cada tela, a 390 px, página inteira — mais a dobra para os confrontos.
    const dobras = new Map<string, string>();
    for (const tela of TELAS) {
      const arquivo = join(DESTINO, `${tela.chave}-390.png`);
      const png = await capturarPagina(s, {
        url: `${BASE}${tela.rota}`,
        largura: 390,
        movel: true,
      });
      writeFileSync(arquivo, png);
      const { largura, altura } = dimensoesDoPng(png);
      if (largura !== 780) {
        throw new Error(`${tela.chave}: largura ${largura}, esperado 780 (390 CSS × 2)`);
      }
      const estoura = await medir<boolean>(
        s,
        "document.documentElement.scrollWidth > document.documentElement.clientWidth",
      );
      if (estoura) throw new Error(`${tela.chave} estoura horizontalmente a 390 px.`);
      console.log(`==> ${tela.chave}-390.png — ${largura}x${altura} px`);

      const dobra = await capturarPagina(s, {
        url: `${BASE}${tela.rota}`,
        largura: 390,
        movel: true,
        clip: { x: 0, y: 0, width: 390, height: 844, scale: 2 },
      });
      const arquivoDobra = join(DESTINO, `${tela.chave}-390-dobra.png`);
      writeFileSync(arquivoDobra, dobra);
      dobras.set(tela.chave, arquivoDobra);
    }

    const alvos = recortar();

    // 2. NORTH STAR | IMPLEMENTATION — Home, Busca, Comparação e Detalhe (§20).
    for (const tela of TELAS) {
      if (tela.alvo === null) continue;
      const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
        <div class="folha">
          <h1>${tela.titulo}</h1>
          <p class="sub">North Star (alvo) · implementação a 390 px, primeira dobra</p>
          <div class="linha">
            <div class="col"><span class="rot t">North Star</span>
              <div class="quadro"><img src="${alvos.get(tela.alvo)}"></div></div>
            <div class="col"><span class="rot i">Implementation — 390 px</span>
              <div class="quadro"><img src="${dataUri(dobras.get(tela.chave)!)}"></div></div>
          </div>
        </div>`;
      const arquivo = join(DESTINO, `north-star-${tela.alvo}-compare.png`);
      await folha(s, html, arquivo, 1400);
      console.log(`==> north-star-${tela.alvo}-compare.png`);
    }

    // 3. a prancha final — as seis telas e as notas de honestidade (§20, §23).
    const prancha = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
      <div class="prancha">
        <h1>VIPREÇO — COMPARABLE PRODUCTS DEMO</h1>
        <p class="sub">Demo v2 + Final Visual Polish (10/08/2026) · dados comparáveis reais da
          planilha de 09/08/2026 · cinco mercados de Piracicaba e região · 390 px, primeira
          dobra de cada tela.</p>
        <div class="fila">
          ${TELAS.map(
            (t) => `<div class="tela">
              <div class="quadro"><img src="${dataUri(dobras.get(t.chave)!)}"></div>
              <p>${t.titulo}</p>
            </div>`,
          ).join("")}
        </div>
        <div class="div"><h2>Como esta demo diz a verdade</h2><ul>
          ${[...NOTAS_POLISH, ...NOTAS].map((n) => `<li>${n}</li>`).join("")}
        </ul></div>
      </div>`;
    await folha(s, prancha, join(DESTINO, "comparable-products-demo-board.png"), 1700);
    console.log("==> comparable-products-demo-board.png");

    // 4. Benchmark Lessons Board (§26-I do mandato de polish): as DECISÕES adotadas de cada
    // referência, em texto — nenhuma captura de app de terceiro é redesenhada nem versionada.
    // A única imagem é a Home final do ViPreço, que é o resultado das decisões.
    const licoes = [
      {
        titulo: "North Star (autoridade estética)",
        itens: [
          "Paleta creme + verde, tipografia display e a faixa 'Achado em destaque' — mantidas",
          "Fonte, data e validade em todas as telas — mantidas",
          "5 tabs, Favoritos e Comparar como tab — continuam proibidos",
        ],
      },
      {
        titulo: "iFood — clareza e spacing",
        itens: [
          "ADAPT: um CTA forte por card; seções separadas por espaço, não por texto",
          "ADAPT: copy institucional fora do fluxo de compra",
          "REJECT: preço riscado sem fonte, planos pagos",
        ],
      },
      {
        titulo: "Rappi — catálogo e scan",
        itens: [
          "ADAPT: preço sempre na mesma posição; chips de uma palavra",
          "ADAPT: unit price pequeno e cinza sob o preço (valida o §0)",
          "REJECT: '-54%', 'recomendado para você', carrinho",
        ],
      },
      {
        titulo: "Daki — grocery-first",
        itens: [
          "ADAPT: imagem 1:1 protagonista no card (thumb 80→96 px)",
          "ADAPT: PDP com foto grande, nome, preço e UMA ação",
          "REJECT: 'entrega em 15 min', sacola, leve 2 pague 1",
        ],
      },
      {
        titulo: "ViPreço Final",
        itens: [
          "Package price protagonista; R$/kg·L·un secundário e derivado",
          "Snapshot histórico honesto: 'valeu até', sem reancorar datas",
          "Neutralidade intacta: nada pago, nada reordenado, distância nunca dita",
        ],
      },
    ];
    const lessons = `<!doctype html><meta charset="utf-8"><style>${CSS}
        .colunas { display:grid; grid-template-columns: repeat(5, 1fr); gap:14px; }
        .col-b { background:#fff; border:1px solid #e2ded2; border-radius:12px; padding:14px 16px; }
        .col-b h3 { font-size:13px; margin:0 0 8px; }
        .col-b li { font-size:12px; line-height:1.5; color:#3c4c45; margin-bottom:6px; }
        .col-b ul { margin:0; padding-left:16px; }
        .final { display:grid; grid-template-columns: 300px 1fr; gap:18px; margin-top:18px;
                 background:#fff; border:1px solid #e2ded2; border-radius:12px; padding:16px; }
        .final img { width:100%; border-radius:8px; border:1px solid #e2ded2; }
        .final p { font-size:12.5px; line-height:1.6; color:#3c4c45; margin:0; }
      </style>
      <div class="folha" style="width:1500px">
        <h1>BENCHMARK LESSONS — o que cada referência ensinou</h1>
        <p class="sub">Decisões visuais adotadas e rejeitadas (§20). Nenhuma UI de terceiro é
          copiada — os benchmarks calibram acabamento; o North Star define quem somos.</p>
        <div class="colunas">
          ${licoes
            .map(
              (l) =>
                `<div class="col-b"><h3>${l.titulo}</h3><ul>${l.itens
                  .map((i) => `<li>${i}</li>`)
                  .join("")}</ul></div>`,
            )
            .join("")}
        </div>
        <div class="final">
          <img src="${dataUri(dobras.get("home")!)}">
          <p><b>O resultado na Home.</b> Foto forte do produto (as duas imagens novas do
            Founder incluídas), preço da embalagem como número grande, R$/kg logo abaixo,
            mercado nomeado, um CTA — e a procedência numa linha discreta com o tempo verbal
            certo. A pergunta do §29 — "parece um aplicativo de supermercado moderno?" — é
            respondida por esta composição, não por qualquer elemento copiado.</p>
        </div>
      </div>`;
    await folha(s, lessons, join(DESTINO, "benchmark-lessons-board.png"), 1500);
    console.log("==> benchmark-lessons-board.png");
  } finally {
    chrome.kill();
  }
}

await principal();
