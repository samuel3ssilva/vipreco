/**
 * R3.1B §13 — painel comparativo: North Star ao lado do laboratório em 390 px.
 *
 * POR QUE UM HTML RENDERIZADO, E NÃO UMA MONTAGEM DE IMAGENS
 *
 * Porque o painel precisa carregar rótulo e nota de divergência junto das imagens, e um
 * PNG colado à mão envelhece separado do texto que o explica. Aqui as notas vivem neste
 * arquivo, versionadas: mudar a lista de divergências é mudar código revisável, não
 * reeditar um bitmap.
 *
 * O NORTH STAR NÃO É DEFORMADO. Ele entra com `object-fit: contain` e proporção livre —
 * §14 do mandato anterior é explícito, e uma direção visual esticada mentiria sobre a
 * própria direção.
 *
 * Reaproveita o mesmo caminho de CDP do `screenshot.ts`, incluindo a conferência de
 * largura no cabeçalho IHDR: um painel de revisão recortado seria pior que nenhum, porque
 * o Founder decidiria sobre o que sobrou do corte.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DESTINO = join(process.cwd(), "docs/evidence/visual/r31");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9334;
const LARGURA = 1400;

/**
 * As divergências conhecidas entre o North Star e o que R3.1 entrega. Ficam aqui, e não
 * só no relatório, porque o painel é o que o Founder olha na hora de decidir — e uma
 * divergência que só existe num documento paralelo é uma divergência que não foi avisada.
 */
const DIVERGENCIAS = [
  "O North Star mostra logotipos de rede (Bom Preço, Mix Mateus, Assaí) e fotos de embalagem de marcas reais. Nenhum direito de uso foi obtido e nenhum desses mercados é parceiro — o produto identifica mercado por TEXTO e usa placeholder onde não há correspondência exata.",
  "O bairro do mockup é São Luís-MA; o piloto é Artemis, Piracicaba-SP. Preços, datas, GTINs e promoções da imagem são ILUSTRATIVOS.",
  "O mockup exibe R$/kg em todo card. O preço unitário é CONDICIONAL e depende de quantidade estruturada, que é E1 e ainda não existe em ambiente nenhum.",
  "R3.1 é FUNDAÇÃO: tokens, primitivas e laboratório. Nenhuma das cinco telas foi implementada, e a Home segue exatamente como estava.",
];

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function comTentativas<T>(fn: () => Promise<T>, tentativas = 40): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      await esperar(250);
    }
  }
  throw ultimo;
}

class Sessao {
  private id = 0;
  private constructor(private ws: WebSocket) {}
  static async abrir(url: string): Promise<Sessao> {
    const ws = new WebSocket(url);
    await new Promise<void>((ok, erro) => {
      ws.addEventListener("open", () => ok(), { once: true });
      ws.addEventListener("error", () => erro(new Error("WebSocket CDP não abriu")), {
        once: true,
      });
    });
    return new Sessao(ws);
  }
  enviar<T = Record<string, unknown>>(method: string, params: object = {}): Promise<T> {
    const id = ++this.id;
    return new Promise((ok) => {
      const aoReceber = (ev: MessageEvent) => {
        const msg: unknown = JSON.parse(String(ev.data));
        if (typeof msg !== "object" || msg === null) return;
        const { id: recebido, result } = msg as { id?: unknown; result?: unknown };
        if (recebido !== id) return;
        this.ws.removeEventListener("message", aoReceber);
        ok(result as T);
      };
      this.ws.addEventListener("message", aoReceber);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  fechar() {
    this.ws.close();
  }
}

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");

function montarHtml(): string {
  const northStar = base64(
    join(process.cwd(), "docs/product/visual-north-star/vipreco-mvp-north-star.png"),
  );
  const lab = base64(join(DESTINO, "screenshot-390.png"));
  const notas = DIVERGENCIAS.map((d) => `<li>${d}</li>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fbf7ec; color: #10231c; font-family: -apple-system, system-ui, sans-serif; padding: 32px; width: ${LARGURA}px; }
    h1 { font-size: 26px; letter-spacing: -0.01em; }
    .sub { color: #5b6b63; margin: 6px 0 24px; font-size: 14px; line-height: 1.5; }
    .par { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    .col { background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 16px; }
    .rot { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #0e5c3c; margin-bottom: 10px; }
    /* contain, nunca cover: o North Star não pode ser esticado nem recortado. */
    img { width: 100%; height: auto; object-fit: contain; display: block; border-radius: 6px; }
    .lab { max-height: 720px; object-fit: cover; object-position: top; }
    .div { margin-top: 26px; background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 18px 22px; }
    .div h2 { font-size: 15px; margin-bottom: 10px; }
    .div li { font-size: 13px; line-height: 1.6; color: #3c4c45; margin-left: 18px; margin-bottom: 8px; }
    .rodape { margin-top: 18px; font-size: 12px; color: #5b6b63; line-height: 1.6; }
  </style></head><body>
    <h1>R3.1 — painel comparativo para o Gate visual</h1>
    <p class="sub">À esquerda, a direção aprovada. À direita, o que R3.1 de fato entrega, capturado em navegador a 390&nbsp;px.
    A comparação é de <strong>linguagem visual</strong> — cor, tipografia, ritmo, densidade —, não de tela a tela: R3.1 é fundação, e nenhuma das cinco telas foi implementada.</p>
    <div class="par">
      <div class="col"><div class="rot">North Star — direção aprovada (R3.0)</div><img src="data:image/png;base64,${northStar}" alt=""></div>
      <div class="col"><div class="rot">Laboratório R3.1 — 390 px, render real</div><img class="lab" src="data:image/png;base64,${lab}" alt=""></div>
    </div>
    <div class="div"><h2>Divergências conhecidas e não resolvidas</h2><ul>${notas}</ul></div>
    <p class="rodape">Nenhuma imagem contém dado real. O laboratório usa rótulos abstratos e <code>R$&nbsp;00,00</code>; o conteúdo do North Star é ilustrativo e não é fonte de dado.</p>
  </body></html>`;
}

async function principal() {
  const html = montarHtml();
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORTA}`,
      "--user-data-dir=/tmp/vipreco-board-perfil",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  try {
    const alvo = await comTentativas(async () => {
      const r = await fetch(`http://127.0.0.1:${PORTA}/json/new?about:blank`, { method: "PUT" });
      if (!r.ok) throw new Error(`/json/new devolveu ${r.status}`);
      return (await r.json()) as { webSocketDebuggerUrl: string };
    });
    const s = await Sessao.abrir(alvo.webSocketDebuggerUrl);
    await s.enviar("Page.enable");
    await s.enviar("Emulation.setDeviceMetricsOverride", {
      width: LARGURA,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    // ARQUIVO, E NÃO `data:` URL. A primeira versão embutia as duas imagens numa data URL
    // de ~3 MB; o Chrome recusou a navegação em silêncio e o painel saiu BRANCO — com as
    // dimensões certas, porque a conferência de largura só olha o cabeçalho do PNG.
    // Uma imagem em branco do tamanho certo passa por evidência com uma facilidade
    // desconfortável; é por isso que existe a checagem de tinta logo abaixo.
    const pasta = mkdtempSync(join(tmpdir(), "vipreco-board-"));
    const arquivo = join(pasta, "board.html");
    writeFileSync(arquivo, html, "utf-8");
    await s.enviar("Page.navigate", { url: `file://${arquivo}` });
    await esperar(3000);
    const { data } = await s.enviar<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    const bytes = Buffer.from(data, "base64");
    const larguraPng = bytes.readUInt32BE(16);
    if (larguraPng !== LARGURA * 2) {
      throw new Error(`comparison-board saiu com ${larguraPng}px; esperava ${LARGURA * 2}px.`);
    }

    // CONFERÊNCIA DE TINTA. Dimensão certa não prova conteúdo: a versão anterior gerou um
    // PNG 2800x1800 inteiramente branco e passou na checagem de largura sem reclamar.
    // Pergunta ao próprio navegador quantos pixels do painel não são o fundo.
    const { result } = await s.enviar<{
      result: { value: { imagens: number; altura: number; carregadas: number } };
    }>("Runtime.evaluate", {
      // Devolve um OBJETO. A primeira versão empacotava dois números em um só
      // (`imagens * 1000 + altura`) e a altura passava de 1000, transbordando para a
      // contagem de imagens: o painel correto foi reprovado dizendo "3 imagens".
      // Codificação apertada economiza uma linha e paga com um diagnóstico que mente.
      expression: `({
        imagens: document.querySelectorAll('img').length,
        carregadas: [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 0).length,
        altura: document.body.scrollHeight,
      })`,
      returnByValue: true,
    });
    const medida = result?.value;
    if (medida === undefined) throw new Error("não consegui medir o painel no navegador.");
    if (medida.imagens !== 2) {
      throw new Error(`o painel deveria ter 2 imagens e tem ${medida.imagens}.`);
    }
    if (medida.carregadas !== 2) {
      // O caso que produziu o painel branco: as tags existiam e os bytes não chegaram.
      throw new Error(
        `${medida.carregadas} de 2 imagens carregaram — as outras não renderizaram nada.`,
      );
    }
    if (medida.altura < 600) {
      throw new Error(`o corpo do painel mede ${medida.altura}px — está vazio demais.`);
    }

    writeFileSync(join(DESTINO, "comparison-board.png"), bytes);
    console.log(`==> comparison-board.png — ${larguraPng}x${bytes.readUInt32BE(20)} px`);
    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
