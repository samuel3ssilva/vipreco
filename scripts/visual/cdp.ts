/**
 * A sessão CDP compartilhada pelos scripts de evidência visual.
 *
 * =============================================================================
 * POR QUE ISTO VIROU UM MÓDULO EM R3.2
 * =============================================================================
 *
 * R3.1 tinha duas cópias desta classe — `screenshot.ts` e `comparison-board.ts` —, e o
 * Card v2 precisava de mais duas. Quatro cópias de um cliente de protocolo é o número em
 * que uma correção de segurança passa a ser aplicada em três lugares e esquecida no
 * quarto. E há uma correção de segurança aqui dentro, com nome e sobrenome: o alerta
 * `js/unvalidated-dynamic-method-call` do CodeQL.
 *
 * O DESPACHO NÃO É DIRIGIDO PELO DADO DE FORA, e isso é o desenho, não um detalhe.
 *
 * A primeira versão da R3.1 guardava os callbacks pendentes num `Map<number, fn>` e, ao
 * receber um frame, fazia `pendentes.get(msg.id)?.(msg.result)` — ou seja, o JSON que
 * chega do navegador escolhia QUAL função chamar. Validar que `msg.id` era inteiro não
 * resolveu, e o alerta continuou de pé, corretamente: garantir o TIPO de uma chave não
 * garante que o valor pertença a um conjunto seguro.
 *
 * Aqui cada comando registra o próprio ouvinte, e `ok` é ligado lexicamente. O `id` que
 * chega de fora decide apenas SE aquela promessa resolve — nunca O QUE é chamado.
 *
 * CONTRAPARTIDA, DITA EM VOZ ALTA: depende do Chrome instalado na máquina de quem roda,
 * então **não é reproduzível em CI** e não é gate. É instrumento de evidência para revisão
 * humana. Gate que depende do que existe na máquina de alguém não é gate.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

export const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function comTentativas<T>(fn: () => Promise<T>, tentativas = 40): Promise<T> {
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

export class Sessao {
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

/** Sobe um Chrome headless próprio, com perfil isolado, na porta pedida. */
export function abrirChrome(porta: number, perfil: string): ChildProcess {
  return spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${porta}`,
      `--user-data-dir=${perfil}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
}

export async function conectar(porta: number): Promise<Sessao> {
  const alvo = await comTentativas(async () => {
    const r = await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: "PUT" });
    if (!r.ok) throw new Error(`/json/new devolveu ${r.status}`);
    return (await r.json()) as { webSocketDebuggerUrl: string };
  });
  const s = await Sessao.abrir(alvo.webSocketDebuggerUrl);
  await s.enviar("Page.enable");
  return s;
}

/**
 * Largura e altura lidas do cabeçalho IHDR do próprio PNG (bytes 16..23).
 *
 * Sem esta conferência, um recorte silencioso voltaria a passar por evidência — foi
 * exatamente o que aconteceu quando `--window-size` dimensionava a janela em vez do
 * viewport e o PNG saía cortado no meio de uma palavra.
 */
export function dimensoesDoPng(bytes: Buffer): { largura: number; altura: number } {
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

/**
 * Congela o que se move, imediatamente antes de fotografar.
 *
 * POR QUE ISTO EXISTE. Recapturar o laboratório do mesmo commit produzia PNGs com SHA-256
 * diferente. A diferença inteira cabia numa faixa de 376 linhas: o card de CARREGAMENTO, cujo
 * esqueleto usa `animate-pulse`. A foto pegava a pulsação numa fase qualquer, e a fase depende
 * de quantos milissegundos o navegador levou para chegar até ali.
 *
 * Isso torna a captura irreproduzível — e evidência de gate que ninguém consegue reproduzir é
 * exatamente o problema que este arquivo existe para não ter. Quem recebe o PNG precisa poder
 * rodar o script e obter o MESMO arquivo; sem isso, "esta captura é deste head" vira uma
 * afirmação de confiança em vez de uma medição.
 *
 * `animation-play-state: paused` para em qualquer fase, o que não resolveria nada. `animation:
 * none` devolve a propriedade ao valor base — no `animate-pulse`, opacidade 1 —, que é o mesmo
 * resultado que quem tem `prefers-reduced-motion` já vê hoje. Nenhuma medida de layout muda:
 * `animate-pulse` só anima opacidade.
 */
const CONGELAR_ANIMACAO = `
  (() => {
    const e = document.createElement("style");
    e.textContent = "*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}";
    document.head.appendChild(e);
    return true;
  })()
`;

/**
 * Toda imagem carregada e DECODIFICADA antes do screenshot (V4.3 §2).
 *
 * `captureBeyondViewport` pinta o que está abaixo da dobra, mas `loading="lazy"` só carrega
 * perto do viewport — e a espera fixa não garante a decodificação. O sintoma real: a
 * evidência da busca da V4.2 mostrou a Original como "lata cortada" (só as primeiras linhas
 * do JPEG pintadas) enquanto o app de verdade mostrava a lata inteira. Evidência que mente
 * sobre a tela é pior que nenhuma: aqui todo `<img>` vira eager e o screenshot só sai
 * depois de `decode()` resolver (ou falhar — imagem quebrada é defeito que a captura DEVE
 * mostrar, não esconder).
 */
const CARREGAR_IMAGENS = `
  (async () => {
    const imgs = Array.from(document.images);
    for (const img of imgs) img.loading = "eager";
    // Corrida com teto de 8 s: decode() de uma imagem cujo fetch estagnou nunca resolve,
    // e um awaitPromise pendurado congelava a captura inteira — pior que uma imagem a
    // menos na foto. No caso normal a decodificação termina muito antes do teto.
    await Promise.race([
      Promise.allSettled(imgs.map((img) => img.decode().catch(() => undefined))),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
    return imgs.length;
  })()
`;

/**
 * Captura a página inteira num viewport de verdade.
 *
 * `Emulation.setDeviceMetricsOverride` dimensiona o viewport de LAYOUT; é o que o
 * Playwright faz por baixo. Altura pequena de propósito: `captureBeyondViewport` cuida do
 * resto, e um viewport curto dispara as media queries de altura como num aparelho real.
 */
export async function capturarPagina(
  s: Sessao,
  opcoes: { url: string; largura: number; movel: boolean; espera?: number; clip?: object },
): Promise<Buffer> {
  await s.enviar("Emulation.setDeviceMetricsOverride", {
    width: opcoes.largura,
    height: 900,
    deviceScaleFactor: 2,
    mobile: opcoes.movel,
  });
  await s.enviar("Page.navigate", { url: opcoes.url });
  await esperar(opcoes.espera ?? 2500);
  // Depois da espera, não antes: a folha precisa sobreviver à hidratação, que troca a árvore.
  await s.enviar("Runtime.evaluate", { expression: CONGELAR_ANIMACAO, returnByValue: true });
  // Toda imagem eager e decodificada ANTES de fotografar — sem isto a evidência mentia
  // duas vezes: lazy abaixo da dobra saía como tile branco, e JPEG semi-decodificado
  // saía como produto "fatiado" (a lata cortada da V4.2).
  await s.enviar("Runtime.evaluate", {
    expression: CARREGAR_IMAGENS,
    awaitPromise: true,
    returnByValue: true,
  });
  await esperar(120);
  // O viewport cresce até a altura REAL do documento antes do screenshot: com
  // `captureBeyondViewport` sozinho, header e bottom-nav `fixed` pintavam na posição do
  // viewport curto — uma barra atravessando o meio da página, decapitando cards. Com o
  // viewport na altura da página, `fixed` top pinta no topo e `fixed` bottom no rodapé,
  // exatamente como o leitor veria cada extremo.
  const altura = await medir<number>(
    s,
    "Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))",
  );
  if (opcoes.clip === undefined && altura > 900) {
    await s.enviar("Emulation.setDeviceMetricsOverride", {
      width: opcoes.largura,
      height: altura,
      deviceScaleFactor: 2,
      mobile: opcoes.movel,
    });
    await esperar(350);
  }
  const { data } = await s.enviar<{ data: string }>("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    ...(opcoes.clip === undefined ? {} : { clip: opcoes.clip }),
  });
  return Buffer.from(data, "base64");
}

/** Avalia uma expressão na página e devolve o valor serializado. */
export async function medir<T>(s: Sessao, expressao: string): Promise<T> {
  const { result } = await s.enviar<{ result: { value: T } }>("Runtime.evaluate", {
    expression: expressao,
    returnByValue: true,
  });
  if (result?.value === undefined) throw new Error(`não consegui medir: ${expressao}`);
  return result.value;
}
