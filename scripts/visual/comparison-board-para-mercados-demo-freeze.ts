/**
 * DEMO FREEZE §27 — painel comparativo de `/para-mercados`, em TRÊS colunas.
 *
 *   A · a rota como está na `main` (B2B-0, já mergeada)
 *   B · a referência visual do Founder, versionada e NUNCA recortada
 *   C · a candidata desta rodada
 *
 * A coluna B é a novidade em relação ao painel de B2B-0, e ela existe porque o Founder passou a
 * julgar a página contra uma referência estética explícita. Ela é exibida por inteiro, com
 * `object-fit: contain` — um mockup de direção visual recortado mentiria sobre a própria direção,
 * e é a mesma regra que o painel da Home já seguia.
 *
 * Herdado do painel de B2B-0: a rota anterior ao lado da proposta.
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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DESTINO = join(process.cwd(), "docs/evidence/visual/b2b-demo-freeze");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORTA = 9344;
const LARGURA = 2000;

const arg = (nome: string, padrao: string) => {
  const encontrado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return encontrado === undefined ? padrao : encontrado.slice(nome.length + 3);
};

const PASTA_ANTES = arg("antes", "");

/** A referência anexada pelo Founder, versionada. Autoridade ESTÉTICA, nunca funcional. */
const REFERENCIA = join(
  process.cwd(),
  "docs/product/visual-north-star-v2/referencias/referencia-b-para-mercados.png",
);

/** O que a página passou a fazer, e por quê. */
const MUDANCAS = [
  {
    o: "DÚVIDAS FREQUENTES",
    antes:
      "Oito perguntas, todas abertas, uma abaixo da outra. Umas duas mil linhas de pixel de resposta que quase ninguém lê inteira, no meio de uma página que já era longa.",
    depois:
      "Acordeão de `<details>` nativo, com TREZE perguntas: as oito de antes, com o texto intacto, mais as cinco que o §17 pediu e a página não respondia — instalação, atualização de preço, duração do piloto, saída e como a oferta aparece. Fechadas, cabem em duas telas; cada uma abre sozinha. `<details>` nativo traz de graça o estado, o foco de teclado, o anúncio de expandido no leitor de tela e a busca do navegador achando texto lá dentro.",
  },
  {
    o: "PRIMEIRA IMPRESSÃO",
    antes:
      "Depois do hero vinha direto “Como o piloto funciona”, com cinco cartões de texto. As objeções de porta de loja — dá trabalho? preciso de sistema? o que vocês fazem com meu preço? — só eram respondidas seções abaixo, ou na conversa.",
    depois:
      "Quatro cartões curtos logo abaixo da dobra: nada para instalar, você escolhe o que enviar, preço com procedência, começa pequeno em Artemis. Duas colunas já a partir de 360 px, para os quatro caberem num olhar. É o que faz o §23 ser respondível em dez segundos.",
  },
  {
    o: "EXEMPLO DE OFERTA",
    antes:
      "Card de texto: produto, embalagem, preço, mercado e uma linha de procedência. Sem imagem, e com a composição antiga do Achado.",
    depois:
      "Ganhou a IMAGEM — a mesma ilustração genérica de categoria que o morador vê nos Achados —, o preço por quilo e o bairro, na composição do Card v2: imagem à esquerda, identidade e preço na coluna ao lado. É a peça que faz o lojista pensar “minha oferta apareceria assim”, e o rótulo “Exemplo fictício” continua sendo a primeira coisa do card.",
  },
  {
    o: "BENEFÍCIOS",
    antes:
      "Título “Benefícios potenciais”. O conteúdo já era honesto, mas “benefício” é substantivo de resultado, e resultado é o que esta página não pode afirmar.",
    depois:
      "“Como o piloto pode ajudar”, com o verbo de possibilidade que o §14 manda usar. As quatro linhas foram reescritas na mesma chave: apresentar as ofertas, moradores PODEM encontrar ao pesquisar, divulgação além dos canais atuais, aprendizado compartilhado.",
  },
  {
    o: "ALVO DE TOQUE DO RODAPÉ",
    antes:
      "“Ver a experiência do morador” media 17 px de altura — a altura da letra, menos de metade dos 48 px que o produto exige em toda parte. Era o único controle da página abaixo do mínimo, e ninguém tinha medido.",
    depois:
      "`inline-flex` com `min-h-12`. Continua discreto, em peso de texto, no rodapé; passa a ser acertável com o polegar. Nada mais do shell mudou.",
  },
  {
    o: "ALTURA DA PÁGINA",
    antes: "15342 px de dispositivo a 390 px (7671 px de CSS).",
    depois:
      "15406 px — praticamente igual, 0,4% a mais. O acordeão recolheu perto de mil pixels e a rodada gastou o mesmo tanto no que não existia: os quatro cartões, a imagem do exemplo e as cinco perguntas novas. Quem quiser a página mais curta precisa TIRAR conteúdo, e isso é decisão do Founder. O que mudou foi ONDE a resposta está, não quanto se rola até o fim.",
  },
  {
    o: "O QUE NÃO MUDOU",
    antes: "—",
    depois:
      "A tese, o shell B2B, o CTA (“Quero conversar sobre o piloto”, que já era o rótulo certo), a frase da neutralidade por extenso e em destaque, as cinco etapas do piloto, os sete pedidos, as sete coisas que o mercado envia e as duas seções que eu tinha tentado absorver e o guarda de copy mandou de volta inteiras.",
  },
] as const;

/**
 * A parte mais importante deste painel.
 *
 * A referência da coluna B é autoridade ESTÉTICA. Cinco coisas nela são promessas que o produto
 * não pode fazer, e nenhuma entrou — a lista existe para o Founder conferir a recusa item a item,
 * em vez de confiar que ela aconteceu.
 */
const NAO_COPIADO = [
  "“Apareça para MILHARES DE MORADORES do bairro”: número inventado. O piloto é de um bairro e não tem base de usuários medida. Prova social fictícia é a forma mais barata de perder a única coisa que este produto tem para vender.",
  "“MAIS VISIBILIDADE para seu mercado” e “DESTAQUE NAS BUSCAS”, no bloco “O que você recebe de volta”: o primeiro é garantia de resultado; o segundo descreve exatamente o que o princípio de neutralidade proíbe. Vender destaque em busca não é uma feature adiada, é uma feature vetada. Viraram “Como o piloto pode ajudar”, com “pode”.",
  "“É rápido, gratuito e SEGURO”, sob o CTA: “seguro” sem escopo é afirmação de segurança que ninguém delimitou; e “gratuito” é mais forte do que a decisão que existe — a página responde que as condições serão combinadas na conversa e que nada será cobrado sem acordo.",
  "“PARTICIPAR VIA WHATSAPP” / “QUERO PARTICIPAR AGORA” como rótulo do CTA: o §12 é explícito em não usar adesão quando ainda queremos uma conversa antes. O rótulo continua “Quero conversar sobre o piloto”, que já era o aprovado.",
  "“Cadastre seu mercado e suas ofertas” e “Posso editar ou remover ofertas?”: descrevem um painel do lojista que NÃO EXISTE. A operação de oferta é manual e server-side, e desenhar o formulário antes de a mecânica existir cria expectativa numa entrevista comercial.",
  "O quinto cartão “SEM CUSTO PARA PARTICIPAR”: os outros quatro entraram, este não, pelo mesmo motivo de “gratuito” acima.",
] as const;

/** O objetivo, que é o critério. */
const OBJETIVO = [
  "O §23: a 390 px, em dez segundos, o lojista precisa entender o que é o ViPreço, que é um piloto, o que ele precisa fazer, como sua oferta pode aparecer, o que NÃO precisa instalar e como conversar conosco.",
  "Depois desta rodada, as seis respostas cabem na primeira tela e meia: hero, exemplo de oferta com imagem, e os quatro cartões.",
  "Ela é lida antes ou depois da visita, no celular, provavelmente entre duas outras coisas. Por isso a primeira dobra diz o que é, para quem é e o que ainda não é.",
  "A página é proposta, não produto. Tudo o que ela mostra tem de ser verdade hoje, ou estar rotulado como exemplo.",
] as const;

/** O que continua fora, e por quê. */
const FORA = [
  "PAINEL DO LOJISTA, login, upload de planilha, integração com ERP, área de ofertas, atualização automática, contrato, pagamento e destaque patrocinado. Todos em B2B-5 ou fora do MVP.",
  "LOGOTIPO DE MERCADO: nenhum direito de uso foi obtido para nenhum. A identificação é textual.",
  "FOTOGRAFIA DE PRODUTO REAL: a imagem do exemplo é ilustração genérica de categoria, declarada no próprio arquivo e no `alt`. Nenhuma embalagem, marca ou trade dress de terceiro.",
  "NÚMERO DE USUÁRIO, TRÁFEGO OU RESULTADO: não existem.",
  "ABA INFERIOR NO APP B2C: `/para-mercados` é rota separada, com shell próprio. Nenhuma barra do consumidor aparece aqui.",
  "BACKEND, banco, migration, reseed, deploy e dados reais: o §29 proíbe, e nada disso foi tocado.",
] as const;

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");
const lista = (itens: readonly string[]) => itens.map((d) => `<li>${d}</li>`).join("");

function montarHtml(): string {
  const depois = base64(join(DESTINO, "para-mercados-final-390.png"));
  const antes = PASTA_ANTES === "" ? null : base64(join(PASTA_ANTES, "antes-390.png"));
  const referencia = base64(REFERENCIA);

  const colunaAntes =
    antes === null
      ? `<div class="vazio"><strong>ANTES não capturado.</strong> Rode o script de captura contra o código de <code>origin/main</code> e passe <code>--antes=&lt;pasta&gt;</code>. Sem isso o painel compara uma coisa com nada, e um painel assim engana mais do que informa.</div>`
      : `<img src="data:image/png;base64,${antes}" alt="A rota /para-mercados como está na main, a 390 px" />`;

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
    .telas { display:grid; grid-template-columns:1fr 1fr 1fr; gap:18px; align-items:start; }
    .tela { background:#fff; border:1px solid var(--borda); border-radius:10px; padding:10px; }
    .tela h3 { margin:0 0 8px; font-size:14px; }
    /* Altura limitada e recorte pelo TOPO: a página tem quinze mil pixels, e o que a comparação
       precisa mostrar é a primeira dobra e as seções novas logo abaixo dela. */
    .janela { height:1500px; overflow:hidden; border-radius:6px; border:1px solid var(--borda); }
    .janela img { width:100%; display:block; }
    /* A REFERÊNCIA NUNCA É RECORTADA NEM ESTICADA. Ela é uma folha inteira, com proporção
       própria; object-fit contain a mostra completa dentro da mesma altura das outras duas. */
    .janela.ref { display:flex; align-items:flex-start; justify-content:center; background:#f1efe4; }
    .janela.ref img { width:100%; height:auto; object-fit:contain; }
    .vazio { padding:16px; background:#fbeae6; border:1px solid #b3311f; border-radius:6px;
      font-size:13px; color:#7a2214; }
    table { width:100%; border-collapse:collapse; font-size:13px; background:#fff;
      border:1px solid var(--borda); border-radius:10px; overflow:hidden; }
    th, td { padding:9px 11px; text-align:left; vertical-align:top; border-bottom:1px solid var(--borda); }
    th[scope="row"] { width:170px; font-weight:700; background:#f1efe4; }
    thead th { background:var(--verde); color:#fff; font-size:12px; letter-spacing:.02em; }
    .antes { color:var(--cinza); width:31%; }
    .depois { width:auto; }
    ul { margin:0; padding-left:20px; font-size:13px; }
    li { margin-bottom:7px; }
    .rodape { margin-top:26px; padding-top:12px; border-top:1px solid var(--borda);
      font-size:12px; color:var(--cinza); }
  </style></head><body>
    <h1>/para-mercados — DEMO FREEZE</h1>
    <p class="sub">A rota como está na <code>main</code>, a referência do Founder e a candidata desta rodada. As duas colunas de aplicação saem do mesmo script, no mesmo navegador, no mesmo instante, com recorte de 1500 px a partir do topo a 390 px de largura. A referência aparece inteira, sem recorte e sem esticar.</p>

    <div class="telas">
      <div class="tela"><h3>A · ATUAL — <code>origin/main</code> (B2B-0)</h3><div class="janela">${colunaAntes}</div></div>
      <div class="tela"><h3>B · REFERÊNCIA DO FOUNDER — autoridade estética</h3><div class="janela ref"><img src="data:image/png;base64,${referencia}" alt="A referência visual anexada pelo Founder para /para-mercados, inteira" /></div></div>
      <div class="tela"><h3>C · CANDIDATA — <code>feat/b2b-visual-demo-polish</code></h3><div class="janela"><img src="data:image/png;base64,${depois}" alt="A rota /para-mercados na candidata do Demo Freeze, a 390 px" /></div></div>
    </div>

    <h2>O que mudou, e por quê</h2>
    <table>
      <thead><tr><th>Onde</th><th>Antes (main)</th><th>Depois (candidata)</th></tr></thead>
      <tbody>${mudancas}</tbody>
    </table>

    <h2>O que da referência NÃO foi copiado, e por quê</h2>
    <ul>${lista(NAO_COPIADO)}</ul>

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
  if (!existsSync(join(DESTINO, "para-mercados-final-390.png"))) {
    console.error("ERRO: rode `screenshot-para-mercados.ts` antes — falta a captura de 390 px.");
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  // PASTA TEMPORÁRIA DO SISTEMA, E NÃO A PASTA DE EVIDÊNCIA.
  //
  // A versão anterior escrevia `.painel-b2b0.tmp.html` dentro de `docs/evidence/visual/b2b0/`
  // e nunca apagava. O arquivo tem 4 MB (as duas capturas embutidas em base64), começa com
  // ponto — então some do `ls` — e entrou num commit por um `git add -A`. Lixo versionado é
  // pior que lixo: ele passa a ser diff, revisão e histórico para sempre.
  const pasta = mkdtempSync(join(tmpdir(), "vipreco-board-b2b0-"));
  const htmlPath = join(pasta, "painel.html");
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
    const esperadas = PASTA_ANTES === "" ? 2 : 3;
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
    writeFileSync(join(DESTINO, "para-mercados-final-comparison-board.png"), bytes);
    console.log(
      `==> para-mercados-final-comparison-board.png — ${bytes.readUInt32BE(16)}x${altura} px` +
        (PASTA_ANTES === "" ? "  (SEM a coluna ANTES)" : ""),
    );

    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
