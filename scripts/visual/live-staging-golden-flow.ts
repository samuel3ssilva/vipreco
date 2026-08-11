/**
 * Golden flow CLICADO no staging publicado, e as seis capturas do que está no ar.
 *
 * =============================================================================
 * POR QUE ESTE SCRIPT É DIFERENTE DE `b2c-north-star.ts`
 * =============================================================================
 *
 * Aquele fotografa o servidor de desenvolvimento: prova o que o código faz. Este fotografa
 * `https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev`, que é o que o Founder vai
 * abrir no próprio celular. São perguntas diferentes, e a segunda já falhou antes por
 * motivos que a primeira nunca veria — bundle antigo em cache, variável de ambiente
 * ausente no Worker, rota que existe no roteador e 404 na borda.
 *
 * E ele **clica**. HTTP 200 em seis URLs prova que seis rotas respondem; não prova que
 * existe caminho de uma até a outra. O mandato é explícito: "Não basta HTTP 200. Clicar na
 * jornada inteira." Então cada passo daqui parte do elemento que o usuário vê, acha a
 * posição real dele na tela e despacha um clique de mouse de verdade via
 * `Input.dispatchMouseEvent`. Se o CTA sumir, mudar de texto ou ficar coberto, o script
 * para com o passo nomeado — e não com um diff de pixels difícil de ler.
 *
 * O que ele NÃO faz: não escreve, não envia formulário, não abre o WhatsApp. O último
 * passo confere que o link `wa.me` existe e para ali.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Sessao, abrirChrome, conectar, dimensoesDoPng, esperar } from "./cdp.ts";

const BASE = "https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev";
const LARGURA = 390;
const DESTINO = "docs/evidence/visual/b2c-north-star/live-staging";

/** Cada linha do relato da jornada: passo, URL de chegada e o que foi conferido nela. */
type Passo = { passo: string; url: string; conferido: string[] };

const jornada: Passo[] = [];

async function medir<T>(s: Sessao, expressao: string): Promise<T> {
  const { result } = await s.enviar<{ result: { value?: T } }>("Runtime.evaluate", {
    expression: expressao,
    returnByValue: true,
  });
  if (result?.value === undefined) throw new Error(`não consegui medir: ${expressao}`);
  return result.value;
}

/**
 * Acha o elemento pelo TEXTO que o usuário lê e devolve o centro dele em coordenadas de
 * viewport. Texto, e não seletor CSS: um seletor continua casando depois de a copy virar
 * outra coisa, e é justamente a copy que o Founder vai ler na tela.
 */
async function centroDe(s: Sessao, texto: string): Promise<{ x: number; y: number }> {
  const alvo = JSON.stringify(texto);
  const posicao = await medir<{ x: number; y: number } | null>(
    s,
    `(() => {
      const alvo = ${alvo};
      const candidatos = [...document.querySelectorAll("a, button")];
      const achado = candidatos.find((e) => (e.innerText || "").trim().includes(alvo));
      if (!achado) return null;
      achado.scrollIntoView({ block: "center", behavior: "instant" });
      const r = achado.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`,
  );
  if (posicao === null) throw new Error(`não achei nenhum link ou botão contendo "${texto}"`);
  return posicao;
}

/** Clique de mouse de verdade, no centro do elemento, com espera de navegação. */
async function clicar(s: Sessao, texto: string): Promise<void> {
  const { x, y } = await centroDe(s, texto);
  await esperar(150); // o scrollIntoView acima é instantâneo, mas o layout ainda assenta
  const comum = { x, y, button: "left", clickCount: 1 };
  await s.enviar("Input.dispatchMouseEvent", { type: "mousePressed", ...comum });
  await s.enviar("Input.dispatchMouseEvent", { type: "mouseReleased", ...comum });
  await esperar(1800);
}

async function urlAtual(s: Sessao): Promise<string> {
  return medir<string>(s, "location.pathname + location.search");
}

async function textoDaPagina(s: Sessao): Promise<string> {
  return medir<string>(s, "document.body.innerText");
}

/** Exige que a tela diga cada uma destas coisas; lista o que faltou, não só a primeira. */
async function exigir(s: Sessao, passo: string, frases: string[]): Promise<string[]> {
  const texto = await textoDaPagina(s);
  const faltando = frases.filter((f) => !texto.includes(f));
  if (faltando.length > 0) {
    throw new Error(`${passo}: a tela não disse ${faltando.map((f) => `"${f}"`).join(", ")}`);
  }
  return frases;
}

/** As imagens que a tela realmente carregou — src, alt e se o navegador conseguiu decodificar. */
async function imagens(s: Sessao): Promise<{ src: string; alt: string; ok: boolean }[]> {
  return medir(
    s,
    `[...document.querySelectorAll("img")].map((i) => ({
       src: i.currentSrc || i.src, alt: i.alt, ok: i.complete && i.naturalWidth > 0
     }))`,
  );
}

async function folha(s: Sessao, arquivo: string): Promise<void> {
  await s.enviar("Runtime.evaluate", {
    expression: `(() => {
      const e = document.createElement("style");
      e.textContent = "*,*::before,*::after{animation:none !important;transition:none !important;caret-color:transparent !important}";
      document.head.appendChild(e);
      return true;
    })()`,
    returnByValue: true,
  });
  await esperar(150);
  const { data } = await s.enviar<{ data: string }>("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  const bytes = Buffer.from(data, "base64");
  const { largura } = dimensoesDoPng(bytes);
  // deviceScaleFactor 2: o PNG tem o dobro da largura CSS. Conferido do IHDR, não do que
  // o script pediu -- foi assim que um recorte silencioso passou por evidência uma vez.
  if (largura !== LARGURA * 2) {
    throw new Error(`${arquivo}: largura ${largura}, esperado ${LARGURA * 2}`);
  }
  const destino = join(DESTINO, arquivo);
  writeFileSync(destino, bytes);
  if (!existsSync(destino)) throw new Error(`${destino} não foi escrito`);
  console.log(`  → ${destino} (${largura} px)`);
}

async function irPara(s: Sessao, caminho: string): Promise<void> {
  await s.enviar("Page.navigate", { url: `${BASE}${caminho}` });
  await esperar(2500);
}

async function main() {
  mkdirSync(DESTINO, { recursive: true });
  const perfil = mkdtempSync(join(tmpdir(), "live-golden-"));
  const chrome = abrirChrome(9333, perfil);
  try {
    const s = await conectar(9333);
    await s.enviar("Emulation.setDeviceMetricsOverride", {
      width: LARGURA,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    // 1 · HOME
    await irPara(s, "/");
    let conferido = await exigir(s, "HOME", [
      "Achados em Artemis",
      "ARTEMIS · PIRACICABA, SP",
      "Café Serra Alta Tradicional 500 g",
      "R$17,49",
      "Mercado local 2",
    ]);
    const imgsHome = await imagens(s);
    const embalagemHome = imgsHome.find((i) => i.src.includes("cafe-serra-alta"));
    if (embalagemHome === undefined || !embalagemHome.ok) {
      throw new Error("HOME: a embalagem do café não carregou");
    }
    jornada.push({
      passo: "1 · HOME",
      url: await urlAtual(s),
      conferido: [...conferido, `imagem ${embalagemHome.src.split("/").pop()}`],
    });
    await folha(s, "live-b2c-home-390.png");

    // 2 · BUSCA — clicando o atalho "Café"
    await clicar(s, "Café");
    if (!(await urlAtual(s)).startsWith("/buscar")) {
      throw new Error(`clique em "Café" não levou à busca (foi para ${await urlAtual(s)})`);
    }
    conferido = await exigir(s, "BUSCA", ["Café Serra Alta Tradicional", "500 g", "Comparar"]);
    jornada.push({ passo: "2 · BUSCA", url: await urlAtual(s), conferido });
    await folha(s, "live-b2c-search-390.png");

    // 3 · COMPARAÇÃO — clicando "Comparar" no resultado do café 500 g
    await clicar(s, "Comparar");
    if (!(await urlAtual(s)).startsWith("/produto/")) {
      throw new Error(`clique em "Comparar" não levou à comparação (${await urlAtual(s)})`);
    }
    // "Comparação em 3 mercados" é o §5 do mandato virado em asserção: o Founder quer ver
    // o café comparado em três mercados, e é isto que a tela tem de dizer sozinha.
    conferido = await exigir(s, "COMPARAÇÃO", [
      "Café Serra Alta Tradicional",
      "500 g",
      "Comparação em 3 mercados",
      "17,49",
      "Mercado local 2",
    ]);
    const imgsComparacao = await imagens(s);
    const embalagemComparacao = imgsComparacao.find((i) => i.src.includes("cafe-serra-alta"));
    if (embalagemComparacao === undefined || !embalagemComparacao.ok) {
      throw new Error("COMPARAÇÃO: a embalagem do café não carregou");
    }
    // §8: a embalagem não pode mudar entre telas. O arquivo tem de ser o MESMO da Home.
    if (embalagemComparacao.src !== embalagemHome.src) {
      throw new Error(
        `a embalagem mudou entre Home (${embalagemHome.src}) e Comparação (${embalagemComparacao.src})`,
      );
    }
    jornada.push({
      passo: "3 · COMPARAÇÃO",
      url: await urlAtual(s),
      conferido: [...conferido, "mesma embalagem da Home"],
    });
    await folha(s, "live-b2c-comparison-390.png");

    // 4 · DETALHE — clicando a oferta mais barata da lista
    await clicar(s, "Mercado local 2");
    if (!(await urlAtual(s)).includes("/oferta/")) {
      throw new Error(`clique na oferta #1 não levou ao detalhe (${await urlAtual(s)})`);
    }
    conferido = await exigir(s, "DETALHE", [
      "Café Serra Alta Tradicional",
      "500 g",
      "Mercado local 2",
    ]);
    const imgsDetalhe = await imagens(s);
    const embalagemDetalhe = imgsDetalhe.find((i) => i.src.includes("cafe-serra-alta"));
    if (embalagemDetalhe === undefined || !embalagemDetalhe.ok) {
      throw new Error("DETALHE: a embalagem do café não carregou");
    }
    if (embalagemDetalhe.src !== embalagemHome.src) {
      throw new Error(`a embalagem mudou entre Home e Detalhe (${embalagemDetalhe.src})`);
    }
    jornada.push({
      passo: "4 · DETALHE",
      url: await urlAtual(s),
      conferido: [...conferido, "mesma embalagem da Home"],
    });
    await folha(s, "live-b2c-detail-390.png");

    // 5 · WHATSAPP — clicando o CTA de retenção do detalhe
    await clicar(s, "WhatsApp");
    if ((await urlAtual(s)) !== "/whatsapp") {
      throw new Error(`o CTA de WhatsApp não levou à tela própria (${await urlAtual(s)})`);
    }
    conferido = await exigir(s, "WHATSAPP", ["Artemis"]);
    const wa = await medir<string[]>(
      s,
      `[...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.href)`,
    );
    if (wa.length === 0) throw new Error("WHATSAPP: nenhum link wa.me na tela");
    jornada.push({
      passo: "5 · WHATSAPP",
      url: await urlAtual(s),
      conferido: [...conferido, `link wa.me presente (${wa.length})`],
    });
    await folha(s, "live-b2c-whatsapp-390.png");

    // 6 · B2B — smoke test, sem clicar em nada: a superfície está congelada
    await irPara(s, "/para-mercados");
    conferido = await exigir(s, "B2B", ["Artemis"]);
    jornada.push({ passo: "6 · B2B /para-mercados", url: await urlAtual(s), conferido });
    await folha(s, "live-b2b-para-mercados-390.png");

    s.fechar();
  } finally {
    chrome.kill();
    rmSync(perfil, { recursive: true, force: true });
  }

  console.log("\n=== JORNADA CLICADA NO STAGING ===");
  for (const p of jornada) {
    console.log(`${p.passo}  ${p.url}`);
    for (const c of p.conferido) console.log(`    ✓ ${c}`);
  }
}

await main();
