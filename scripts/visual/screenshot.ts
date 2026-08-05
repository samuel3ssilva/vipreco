/**
 * R3.1A §14 — screenshots do laboratório visual, no viewport certo.
 *
 * POR QUE NÃO `chrome --headless --screenshot --window-size`
 *
 * Porque ele mente. Foi a primeira tentativa, e o PNG de 390 px saiu com o título cortado
 * no meio da palavra e a segunda coluna da paleta atravessando a borda direita — o retrato
 * de uma página que estoura horizontalmente. Só que a página **não** estoura: medido no
 * navegador, `document.documentElement.scrollWidth` é exatamente igual ao `clientWidth` nos
 * três tamanhos, e os únicos elementos que passam da borda são as células de uma tabela
 * cujo pai tem `overflow-x: auto` — que é o padrão correto para conteúdo largo.
 *
 * O que acontece é que `--window-size` dimensiona a JANELA, não o viewport de layout: o
 * headless diagrama numa largura maior e recorta o PNG na largura pedida. O resultado é uma
 * evidência que parece provar um defeito inexistente. Screenshot recortado é pior que
 * screenshot nenhum — ele não deixa a pergunta em aberto, responde errado, e ainda por cima
 * com a autoridade de uma imagem.
 *
 * `Emulation.setDeviceMetricsOverride`, via CDP, dimensiona o viewport de verdade. É o que
 * o Playwright faz por baixo; aqui é falado direto com o navegador para não trocar um passo
 * de evidência por uma dependência de desenvolvimento que baixa os próprios binários.
 *
 * CONTRAPARTIDA, DITA EM VOZ ALTA: depende do Chrome instalado na máquina de quem roda,
 * então NÃO é reproduzível em CI hoje. É script de evidência para revisão humana, não gate.
 * Gate que depende do que existe na máquina de alguém não é gate.
 */

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:8080";
const ROTA = "/laboratorio-visual";
const DESTINO = join(process.cwd(), "docs/evidence/visual/r31");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9333;

const TAMANHOS = [
  { nome: "screenshot-320.png", largura: 320, movel: true },
  { nome: "screenshot-390.png", largura: 390, movel: true },
  { nome: "screenshot-desktop.png", largura: 1280, movel: false },
] as const;

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

/**
 * Uma sessão CDP mínima: envia comando, espera a resposta com o mesmo id.
 *
 * O DESPACHO NÃO É DIRIGIDO PELO DADO DE FORA, e isso é o desenho, não um detalhe.
 *
 * A primeira versão guardava os callbacks pendentes num `Map<number, fn>` e, ao receber
 * um frame, fazia `pendentes.get(msg.id)?.(msg.result)` — ou seja, o JSON que chega do
 * navegador escolhia QUAL função chamar. O CodeQL apontou (js/unvalidated-dynamic-method-call,
 * severidade alta). Minha primeira correção só validou que `msg.id` era inteiro, e o alerta
 * continuou de pé — corretamente: garantir o TIPO de uma chave não garante que o valor
 * pertença a um conjunto seguro, e a função invocada seguia sendo escolhida por dado
 * externo.
 *
 * Aqui cada comando registra o próprio ouvinte, e `ok` é ligado lexicamente. O `id` que
 * chega de fora decide apenas SE aquela promessa resolve — nunca O QUE é chamado. Some o
 * padrão, some o alerta, e some o `Map` junto: a versão segura ficou menor que a insegura.
 */
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
        // O id que chega decide apenas SE esta promessa resolve. Quem é chamado —
        // `ok` — está ligado lexicamente e não depende de nada que veio do socket.
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

async function principal() {
  const resposta = await fetch(`${BASE}${ROTA}`).catch(() => null);
  if (resposta === null || !resposta.ok) {
    console.error(`ERRO: ${BASE}${ROTA} não respondeu. Suba o servidor antes (bun run dev).`);
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORTA}`,
      "--user-data-dir=/tmp/vipreco-screenshot-perfil",
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

    for (const { nome, largura, movel } of TAMANHOS) {
      // Altura pequena de propósito: `captureBeyondViewport` cuida do resto, e um viewport
      // curto é o que dispara as media queries de altura como num aparelho de verdade.
      await s.enviar("Emulation.setDeviceMetricsOverride", {
        width: largura,
        height: 900,
        deviceScaleFactor: 2,
        mobile: movel,
      });
      await s.enviar("Page.navigate", { url: `${BASE}${ROTA}` });
      // A fonte é local agora, então o atraso é de layout e não de rede.
      await esperar(2500);

      const { data } = await s.enviar<{ data: string }>("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      const caminho = join(DESTINO, nome);
      writeFileSync(caminho, Buffer.from(data, "base64"));

      // Confere a largura no PNG: bytes 16..19 do cabeçalho IHDR. Sem esta verificação, um
      // recorte silencioso voltaria a passar por evidência.
      const bytes = Buffer.from(data, "base64");
      const larguraPng = bytes.readUInt32BE(16);
      const esperada = largura * 2;
      if (larguraPng !== esperada) {
        throw new Error(`${nome} saiu com ${larguraPng}px de largura; esperava ${esperada}px.`);
      }
      console.log(`==> ${nome} — ${larguraPng}x${bytes.readUInt32BE(20)} px`);
    }

    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
