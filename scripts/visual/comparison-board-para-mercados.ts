/**
 * B2B-0 §16 — painel comparativo de `/para-mercados`: a rota anterior ao lado da proposta.
 *
 * O painel carrega três coisas que uma montagem de imagens não carrega:
 *
 *   1. as duas versões da MESMA página, renderizadas pelo mesmo script;
 *   2. o que mudou e por quê;
 *   3. o objetivo da entrevista, que é o critério contra o qual a página deve ser julgada.
 *
 * As três vivem neste arquivo, versionadas. Mudar a lista de decisões passa a ser mudar código
 * revisável, e não reeditar um bitmap que envelhece separado do texto que o explica.
 *
 * O "ANTES" NÃO É UM PNG GUARDADO: ele é gerado do código de `origin/main`, com o mesmo script,
 * no mesmo navegador, no mesmo instante. Um "antes" capturado noutra ocasião compararia duas
 * coisas que diferem também em fonte, token e navegador — e a comparação atribuiria à mudança
 * de copy diferenças que não são dela.
 *
 * Uso:
 *   bun scripts/visual/comparison-board-para-mercados.ts --antes=<pasta com antes-390.png>
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DESTINO = join(process.cwd(), "docs/evidence/visual/b2b0");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9338;
const LARGURA = 1400;

const arg = (nome: string, padrao: string) => {
  const encontrado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return encontrado === undefined ? padrao : encontrado.slice(nome.length + 3);
};

const PASTA_ANTES = arg("antes", "");

/** O que a página passou a fazer, e por quê. */
const MUDANCAS = [
  {
    o: "Hero",
    antes: "“Seu mercado mais perto de quem compra no bairro.”",
    depois:
      "“Leve mais consumidores de Artemis até suas ofertas.” O subtítulo diz na PRIMEIRA DOBRA que o produto ainda não está no ar — um lojista que descobre isso no meio da conversa relê tudo o que ouviu antes com desconfiança, e com razão.",
  },
  {
    o: "Como o consumidor encontra o mercado",
    antes: "Não existia. A página explicava bem o que o mercado ENVIA e mal o que o morador VÊ.",
    depois:
      "Quatro momentos: Achados, busca por produto exato, comparação entre mercados e como chegar. Para quem toca uma loja, “quem me encontra?” é a pergunta que decide.",
  },
  {
    o: "Como o piloto funciona",
    antes: "Três passos, terminando em “o morador encontra e compra na loja”.",
    depois:
      "Cinco etapas. As duas novas são as que o mercado mais quer saber e que a versão anterior não respondia: se alguém MEDE alguma coisa, e se ele fica sabendo do RESULTADO — inclusive quando o resultado for ruim.",
  },
  {
    o: "O que pedimos ao mercado",
    antes: "Espalhado por três seções, sem lista.",
    depois:
      "Seis itens, explícitos. Nenhum deles é instalar, integrar ou assinar. Um pedido que cabe numa tarde é um pedido que alguém pode aceitar.",
  },
  {
    o: "Benefícios potenciais",
    antes: "Não existiam na página.",
    depois:
      "Cinco, e a palavra “potenciais” aparece no título E no corpo. Dizê-la uma vez só, em letra miúda, seria ressalva; dizê-la duas é o enquadramento. Nada foi medido, e nada pode ser medido antes do piloto.",
  },
  {
    o: "Neutralidade",
    antes: "Diluída numa lista de regras: “A ordem não é vendida.”",
    depois:
      "A frase por extenso, em destaque: “Participar do ViPreço não compra posição no ranking.” É a única afirmação da página que um lojista pode querer testar depois, e a única que não é negociável em nenhum cenário.",
  },
  {
    o: "CTA",
    antes: "“Quero conhecer o piloto.”",
    depois:
      "“Quero conversar sobre o piloto.” Conhecer é passivo e não pede nada; conversar nomeia exatamente o que está sendo pedido, que são vinte minutos.",
  },
] as const;

/** O critério contra o qual a página deve ser julgada. */
const OBJETIVO = [
  "A página não vende um produto final. Ela apoia UMA CONVERSA de vinte minutos, e o sucesso dela é o lojista aceitar essa conversa.",
  "Ela é lida antes ou depois da visita, no celular, provavelmente entre duas outras coisas. Por isso a primeira dobra diz o que é, para quem é e o que ainda não é.",
  "O roteiro de entrevista mostra o protótipo no bloco 6, e não antes: mostrar tela cedo demais transforma a entrevista em demonstração. A página cumpre o mesmo papel quando alguém a abre sozinho.",
] as const;

/** O que continua fora, e por quê. */
const FORA = [
  "PAINEL DO LOJISTA, login, upload de planilha, integração com ERP, área de ofertas, atualização automática, contrato, pagamento e destaque patrocinado. Todos em B2B-5 ou fora do MVP.",
  "LOGOTIPO DE MERCADO: nenhum direito de uso foi obtido para nenhum. A identificação é textual.",
  "QR CODE: depende de uma URL estável e aprovada, que só existe em R8.",
  "CAPTURA DE TELA DO PRODUTO: o único exemplo visual continua sendo o card estático rotulado “Exemplo fictício”. Uma imagem com cara de produto pronto, numa página que um lojista lê como proposta, promete um produto que não está no ar.",
  "NÚMERO DE USUÁRIO, TRÁFEGO OU RESULTADO: não existem.",
  "ABA INFERIOR NO APP B2C: `/para-mercados` continua sendo rota separada.",
] as const;

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");
const lista = (itens: readonly string[]) => itens.map((d) => `<li>${d}</li>`).join("");

function montarHtml(): string {
  const depois = base64(join(DESTINO, "para-mercados-390.png"));
  const antes = PASTA_ANTES === "" ? null : base64(join(PASTA_ANTES, "antes-390.png"));

  const colunaAntes =
    antes === null
      ? `<div class="vazio"><strong>ANTES não capturado.</strong> Rode o script de captura contra o código de <code>origin/main</code> e passe <code>--antes=&lt;pasta&gt;</code>. Sem isso o painel compara uma coisa com nada, e um painel assim engana mais do que informa.</div>`
      : `<img src="data:image/png;base64,${antes}" alt="A rota /para-mercados como estava na main, a 390 px" />`;

  const mudancas = MUDANCAS.map(
    (m) => `<tr>
      <th scope="row">${m.o}</th>
      <td class="antes">${m.antes}</td>
      <td class="depois">${m.depois}</td>
    </tr>`,
  ).join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    :root { --verde:#0e5c3c; --creme:#fbf7ec; --tinta:#10231c; --cinza:#5b6b63; --borda:#e2ded2; }
    * { box-sizing: border-box; }
    body { margin:0; padding:28px; background:var(--creme); color:var(--tinta);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height:1.5; }
    h1 { font-size:26px; margin:0 0 4px; color:var(--verde); }
    h2 { font-size:17px; margin:26px 0 8px; padding-top:14px; border-top:1px solid var(--borda); }
    .sub { color:var(--cinza); margin:0 0 18px; font-size:14px; }
    .telas { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:start; }
    .tela { background:#fff; border:1px solid var(--borda); border-radius:10px; padding:10px; }
    .tela h3 { margin:0 0 8px; font-size:14px; }
    /* Altura limitada e recorte pelo TOPO: a página tem 14 mil pixels, e o que a comparação
       precisa mostrar é a primeira dobra e as seções novas logo abaixo dela. */
    .janela { height:1500px; overflow:hidden; border-radius:6px; border:1px solid var(--borda); }
    .janela img { width:100%; display:block; }
    .vazio { padding:16px; background:#fbeae6; border:1px solid #b3311f; border-radius:6px;
      font-size:13px; color:#7a2214; }
    table { width:100%; border-collapse:collapse; font-size:13px; background:#fff;
      border:1px solid var(--borda); border-radius:10px; overflow:hidden; }
    th, td { padding:9px 11px; text-align:left; vertical-align:top; border-bottom:1px solid var(--borda); }
    th[scope="row"] { width:150px; font-weight:700; background:#f1efe4; }
    thead th { background:var(--verde); color:#fff; font-size:12px; letter-spacing:.02em; }
    .antes { color:var(--cinza); width:31%; }
    .depois { width:auto; }
    ul { margin:0; padding-left:20px; font-size:13px; }
    li { margin-bottom:7px; }
    .rodape { margin-top:26px; padding-top:12px; border-top:1px solid var(--borda);
      font-size:12px; color:var(--cinza); }
  </style></head><body>
    <h1>/para-mercados — B2B-0</h1>
    <p class="sub">A rota como estava na <code>main</code>, ao lado da proposta. Mesma página, mesmo script, mesmo navegador, mesmo instante. Recorte de 1500 px a partir do topo, a 390 px de largura.</p>

    <div class="telas">
      <div class="tela"><h3>ANTES — <code>origin/main</code></h3><div class="janela">${colunaAntes}</div></div>
      <div class="tela"><h3>DEPOIS — <code>feat/b2b0-para-mercados</code></h3><div class="janela"><img src="data:image/png;base64,${depois}" alt="A rota /para-mercados na proposta de B2B-0, a 390 px" /></div></div>
    </div>

    <h2>O que mudou, e por quê</h2>
    <table>
      <thead><tr><th>Onde</th><th>Antes</th><th>Depois</th></tr></thead>
      <tbody>${mudancas}</tbody>
    </table>

    <h2>O objetivo, que é o critério</h2>
    <ul>${lista(OBJETIVO)}</ul>

    <h2>O que continua fora</h2>
    <ul>${lista(FORA)}</ul>

    <p class="rodape">Nenhum dado real, nenhum mercado real, nenhum logotipo de terceiro, nenhum número de usuário. O único exemplo de card é fictício e está rotulado como tal. Nenhum deploy foi feito.</p>
  </body></html>`;
}

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

async function principal() {
  if (!existsSync(join(DESTINO, "para-mercados-390.png"))) {
    console.error("ERRO: rode `screenshot-para-mercados.ts` antes — falta a captura de 390 px.");
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  const htmlPath = join(DESTINO, ".painel-b2b0.tmp.html");
  writeFileSync(htmlPath, montarHtml(), "utf-8");

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      `--remote-debugging-port=${PORTA}`,
      "--user-data-dir=/tmp/vipreco-b2b0-painel-perfil",
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
    await s.enviar("Emulation.setDeviceMetricsOverride", {
      width: LARGURA,
      height: 1000,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await s.enviar("Page.navigate", { url: `file://${htmlPath}` });
    await esperar(2500);

    // As DUAS imagens precisam ter carregado. Uma delas em branco produziria um painel
    // plausível e mudo — foi exatamente o defeito que o painel do Card v2 teve na primeira
    // versão, e ele passou por toda a conferência automática.
    const { result } = await s.enviar<{ result: { value: { total: number; ok: number } } }>(
      "Runtime.evaluate",
      {
        expression: `({ total: document.images.length, ok: [...document.images].filter(i => i.naturalWidth > 0).length })`,
        returnByValue: true,
      },
    );
    const esperadas = PASTA_ANTES === "" ? 1 : 2;
    if (result.value.total !== esperadas || result.value.ok !== esperadas) {
      throw new Error(
        `o painel esperava ${esperadas} imagem(ns) carregada(s); tem ${result.value.ok} de ${result.value.total}.`,
      );
    }

    const { data } = await s.enviar<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    const bytes = Buffer.from(data, "base64");
    const altura = bytes.readUInt32BE(20);
    if (altura < 2000) {
      throw new Error(`o painel saiu com ${altura}px de altura — está vazio demais.`);
    }
    writeFileSync(join(DESTINO, "para-mercados-comparison-board.png"), bytes);
    console.log(
      `==> para-mercados-comparison-board.png — ${bytes.readUInt32BE(16)}x${altura} px` +
        (PASTA_ANTES === "" ? "  (SEM a coluna ANTES)" : ""),
    );

    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
