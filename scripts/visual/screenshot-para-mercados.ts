/**
 * B2B-0 §16 — screenshots de `/para-mercados`.
 *
 *   para-mercados-390.png      página inteira a 390 px — celular comum
 *   para-mercados-430.png      página inteira a 430 px — celular grande
 *   para-mercados-desktop.png  página inteira a 1280 px
 *
 * O prefixo e o destino são parametrizáveis (`--prefixo=`, `--destino=`) porque o painel
 * comparativo precisa da MESMA página renderizada em duas versões do código. Sem isso, o
 * "antes e depois" viraria uma descrição em texto do que mudou — e uma descrição do que mudou
 * é exatamente o que o Founder não consegue conferir sem rodar o projeto.
 *
 * =============================================================================
 * POR QUE A PLUMBING DE CDP ESTÁ DUPLICADA AQUI
 * =============================================================================
 *
 * `scripts/visual/cdp.ts` — a extração desta mesma plumbing — existe na branch do Card v2, no
 * PR #89, que continua sem merge. Importar de lá amarraria este PR àquele, e os dois estão em
 * gates independentes: o de B2B-0 pode ser aprovado antes ou depois do de R3.2.
 *
 * A duplicação é temporária e tem endereço: quando o PR #89 mergear, este arquivo passa a
 * importar `./cdp` e as ~70 linhas abaixo somem.
 *
 * Contrapartida herdada da R3.1 e dita de novo: depende do Chrome instalado na máquina de quem
 * roda, então NÃO é gate de CI. É instrumento de evidência para revisão humana.
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:8080";
const ROTA = "/para-mercados";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9337;

const arg = (nome: string, padrao: string) => {
  const encontrado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return encontrado === undefined ? padrao : encontrado.slice(nome.length + 3);
};

const PREFIXO = arg("prefixo", "para-mercados");
const DESTINO = arg("destino", join(process.cwd(), "docs/evidence/visual/b2b0"));

const TAMANHOS = [
  { sufixo: "390", largura: 390, movel: true },
  { sufixo: "430", largura: 430, movel: true },
  { sufixo: "desktop", largura: 1280, movel: false },
] as const;

/** As larguras onde não pode haver rolagem horizontal, e onde todo alvo precisa de 48 px. */
const LARGURAS_DE_CONTROLE = [320, 360, 390, 430, 1280] as const;

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
 * O DESPACHO NÃO É DIRIGIDO PELO DADO DE FORA. O `id` que chega do navegador decide apenas SE
 * aquela promessa resolve — nunca O QUE é chamado, porque `ok` está ligado lexicamente. A
 * versão com `Map<id, callback>` produzia alerta alto do CodeQL
 * (js/unvalidated-dynamic-method-call), e validar o tipo do `id` não resolvia: garantir o TIPO
 * de uma chave não garante que o valor pertença a um conjunto seguro.
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

interface Medida {
  scrollWidth: number;
  clientWidth: number;
  h1: number;
  secoes: number;
  alvosPequenos: number;
  ctas: number;
}

/**
 * `alvosPequenos` mede TODO link e botão visível da página, e não só o CTA.
 *
 * Aqui há links de âncora, o botão de voltar e dois convites de WhatsApp — e é justamente num
 * deles que um `btn-touch-48` esquecido passaria despercebido.
 */
const MEDIR_PAGINA = `({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  h1: document.querySelectorAll('h1').length,
  secoes: document.querySelectorAll('section[aria-labelledby]').length,
  alvosPequenos: [...document.querySelectorAll('main a, main button')]
    .filter(el => el.getBoundingClientRect().height > 0)
    .filter(el => el.getBoundingClientRect().height < 48).length,
  ctas: document.querySelectorAll('[data-market-cta]').length,
})`;

async function irPara(s: Sessao, largura: number, movel: boolean, espera = 2500) {
  await s.enviar("Emulation.setDeviceMetricsOverride", {
    width: largura,
    height: 900,
    deviceScaleFactor: 2,
    mobile: movel,
  });
  await s.enviar("Page.navigate", { url: `${BASE}${ROTA}` });
  await esperar(espera);
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
      "--user-data-dir=/tmp/vipreco-b2b0-perfil",
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
    await s.enviar("Runtime.enable");

    for (const { sufixo, largura, movel } of TAMANHOS) {
      const nome = `${PREFIXO}-${sufixo}.png`;
      await irPara(s, largura, movel);
      const { data } = await s.enviar<{ data: string }>("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      });
      const bytes = Buffer.from(data, "base64");
      const larguraPng = bytes.readUInt32BE(16);
      if (larguraPng !== largura * 2) {
        throw new Error(`${nome} saiu com ${larguraPng}px de largura; esperava ${largura * 2}px.`);
      }
      writeFileSync(join(DESTINO, nome), bytes);
      console.log(`==> ${nome} — ${larguraPng}x${bytes.readUInt32BE(20)} px`);
    }

    // -------------------------------------------------------------------------
    // As medidas, que são a parte que um screenshot não prova
    //
    // Um screenshot mostra que a página PARECE caber. `scrollWidth === clientWidth` prova
    // que ela cabe. São coisas diferentes, e só a segunda é verificação.
    // -------------------------------------------------------------------------
    console.log("\nmedidas por largura:");
    for (const largura of LARGURAS_DE_CONTROLE) {
      await irPara(s, largura, largura < 1000, 1500);
      const { result } = await s.enviar<{ result: { value: Medida } }>("Runtime.evaluate", {
        expression: MEDIR_PAGINA,
        returnByValue: true,
      });
      const m = result.value;
      const estoura = m.scrollWidth > m.clientWidth;
      console.log(
        `  ${String(largura).padStart(4)} px — scrollWidth ${m.scrollWidth}, clientWidth ` +
          `${m.clientWidth}${estoura ? "  *** ESTOURA ***" : "  ok"}, ` +
          `${m.secoes} seções, ${m.h1} h1, ${m.ctas} CTA, alvos abaixo de 48 px: ${m.alvosPequenos}`,
      );
      if (estoura) throw new Error(`a página estoura horizontalmente a ${largura} px.`);
      if (m.alvosPequenos > 0) {
        throw new Error(`${m.alvosPequenos} alvo(s) abaixo de 48 px a ${largura} px.`);
      }
      if (m.h1 !== 1) throw new Error(`a página tem ${m.h1} h1 a ${largura} px; precisa de 1.`);
    }

    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
