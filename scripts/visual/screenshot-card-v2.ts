/**
 * R3.2 §14 — screenshots do laboratório do Card v2.
 *
 * Cinco imagens, e as duas últimas são as que exigem explicação:
 *
 *   card-v2-320.png       página inteira a 320 px — o menor aparelho do contrato
 *   card-v2-390.png       página inteira a 390 px
 *   card-v2-desktop.png   página inteira a 1280 px
 *   card-v2-variants.png  RECORTE da grade "em lista", a 900 px — as oito de uma vez
 *   card-v2-list-390.png  RECORTE dos quatro primeiros cards a 390 px — o ritmo da lista
 *
 * O recorte não é decorativo, e a primeira versão dele estava errada: recortava a região
 * das variantes empilhadas, que a 900 px produzia um PNG de 18 mil pixels de altura — a
 * página inteira outra vez, com 2,4 MB e nenhum ganho. Quem revisa não rola dezoito mil
 * pixels; quem revisa quer ver as oito lado a lado.
 *
 * Então o recorte é a grade "em lista", onde os cards aparecem consecutivos como vão
 * aparecer de verdade. É ali que altura demais, excesso de selo e CTA dominante ficam
 * evidentes — um card isolado quase sempre parece bem.
 *
 * O RECORTE É MEDIDO NO NAVEGADOR, e não escrito à mão. Coordenada fixa envelhece na
 * primeira linha de texto acrescentada acima — e o resultado é um recorte que corta o
 * primeiro card ao meio e continua passando por evidência.
 *
 * Contrapartida herdada da R3.1, dita de novo: depende do Chrome instalado na máquina de
 * quem roda, então NÃO é gate de CI. É instrumento de evidência para revisão humana.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const BASE = process.argv[2] ?? "http://localhost:8080";
const ROTA = "/laboratorio-card-v2";
const DESTINO = join(process.cwd(), "docs/evidence/visual/r32");
const PORTA = 9335;

const TAMANHOS = [
  { nome: "card-v2-320.png", largura: 320, movel: true },
  { nome: "card-v2-390.png", largura: 390, movel: true },
  { nome: "card-v2-desktop.png", largura: 1280, movel: false },
] as const;

/** As larguras onde o mandato §11 exige ausência de rolagem horizontal. */
const LARGURAS_DE_CONTROLE = [320, 360, 390, 430, 1280] as const;

interface Medida {
  scrollWidth: number;
  clientWidth: number;
  cards: number;
  ctaMenorQue48: number;
  imagens: number;
  imagensCarregadas: number;
}

const MEDIR_PAGINA = `({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  cards: document.querySelectorAll('article').length,
  ctaMenorQue48: [...document.querySelectorAll('article a')]
    .filter(a => a.getBoundingClientRect().height < 48).length,
  imagens: document.querySelectorAll('article img').length,
  imagensCarregadas: [...document.querySelectorAll('article img')]
    .filter(i => i.naturalWidth > 0).length,
})`;

async function principal() {
  const resposta = await fetch(`${BASE}${ROTA}`).catch(() => null);
  if (resposta === null || !resposta.ok) {
    console.error(`ERRO: ${BASE}${ROTA} não respondeu. Suba o servidor antes (bun run dev).`);
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, "/tmp/vipreco-card-v2-perfil");

  try {
    const s = await conectar(PORTA);

    // ---------------------------------------------------------------------------
    // 1. As três capturas de página inteira
    // ---------------------------------------------------------------------------
    for (const { nome, largura, movel } of TAMANHOS) {
      const bytes = await capturarPagina(s, { url: `${BASE}${ROTA}`, largura, movel });
      const { largura: w, altura: h } = dimensoesDoPng(bytes);
      if (w !== largura * 2) {
        throw new Error(`${nome} saiu com ${w}px de largura; esperava ${largura * 2}px.`);
      }
      writeFileSync(join(DESTINO, nome), bytes);
      console.log(`==> ${nome} — ${w}x${h} px`);
    }

    // ---------------------------------------------------------------------------
    // 2. As medidas de responsividade e de alvo de toque
    //
    // Aqui a evidência deixa de ser uma imagem e passa a ser um número. Um screenshot
    // mostra que a página parece caber; `scrollWidth === clientWidth` PROVA que ela cabe.
    // ---------------------------------------------------------------------------
    console.log("\nmedidas por largura:");
    for (const largura of LARGURAS_DE_CONTROLE) {
      await capturarPagina(s, {
        url: `${BASE}${ROTA}`,
        largura,
        movel: largura < 1000,
        espera: 1500,
      });
      const m = await medir<Medida>(s, MEDIR_PAGINA);
      const estoura = m.scrollWidth > m.clientWidth;
      console.log(
        `  ${String(largura).padStart(4)} px — scrollWidth ${m.scrollWidth}, clientWidth ` +
          `${m.clientWidth}${estoura ? "  *** ESTOURA ***" : "  ok"}, ` +
          `${m.cards} cards, CTA abaixo de 48 px: ${m.ctaMenorQue48}`,
      );
      if (estoura) {
        throw new Error(`a página estoura horizontalmente a ${largura} px.`);
      }
      if (m.ctaMenorQue48 > 0) {
        throw new Error(`${m.ctaMenorQue48} CTA(s) abaixo de 48 px a ${largura} px.`);
      }
      if (m.imagens !== m.imagensCarregadas) {
        throw new Error(
          `${m.imagens - m.imagensCarregadas} imagem(ns) de card não renderizaram a ${largura} px.`,
        );
      }
    }

    // ---------------------------------------------------------------------------
    // 3. O recorte da grade "em lista", com a caixa medida na própria página
    // ---------------------------------------------------------------------------
    await capturarPagina(s, { url: `${BASE}${ROTA}`, largura: 900, movel: false, espera: 1500 });
    const caixa = await medir<{ x: number; y: number; width: number; height: number } | null>(
      s,
      `(() => {
        const el = document.getElementById('em-lista');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
      })()`,
    );
    if (caixa === null) {
      throw new Error("não achei #em-lista na página — o recorte não pode ser adivinhado.");
    }

    const bytes = await capturarPagina(s, {
      url: `${BASE}${ROTA}`,
      largura: 900,
      movel: false,
      espera: 1500,
      // Uma margem de respiro, para o recorte não encostar na borda dos cards.
      clip: {
        x: Math.max(0, caixa.x - 16),
        y: Math.max(0, caixa.y - 16),
        width: caixa.width + 32,
        height: caixa.height + 32,
        scale: 2,
      },
    });
    const { largura: vw, altura: vh } = dimensoesDoPng(bytes);
    if (vh < 800) {
      // O painel branco da R3.1 ensinou: dimensão plausível não prova conteúdo, mas
      // dimensão implausível prova a ausência dele. Oito cards em duas colunas não cabem
      // em menos de 800 px de altura em nenhuma composição razoável.
      throw new Error(`card-v2-variants.png saiu com ${vh}px de altura — está vazio demais.`);
    }
    writeFileSync(join(DESTINO, "card-v2-variants.png"), bytes);
    console.log(`\n==> card-v2-variants.png — ${vw}x${vh} px (recorte de #em-lista)`);

    // ---------------------------------------------------------------------------
    // 4. Quatro cards consecutivos a 390 px — o ritmo real de uma lista de celular
    //
    // A captura anterior mostra as oito variantes a 900 px, em duas colunas: ela serve
    // para conferir que cada estado é reconhecível. Esta responde outra pergunta, e é a
    // pergunta que o consumidor faz com o polegar — **quantos cards cabem, e o que se
    // repete demais quando eles vêm um atrás do outro.** Selo, CTA e bloco de procedência
    // parecem discretos num card isolado e viram textura numa lista.
    //
    // Quatro é o mínimo do mandato §8, e é também o suficiente: o quarto card já mostra o
    // padrão de repetição sem produzir um PNG de altura impraticável para revisão.
    // ---------------------------------------------------------------------------
    await capturarPagina(s, { url: `${BASE}${ROTA}`, largura: 390, movel: true, espera: 1500 });
    const quatro = await medir<{ x: number; y: number; width: number; height: number } | null>(
      s,
      `(() => {
        const el = document.getElementById('em-lista');
        if (!el) return null;
        const cards = [...el.children].slice(0, 4);
        if (cards.length < 4) return null;
        const caixas = cards.map(c => c.getBoundingClientRect());
        const topo = Math.min(...caixas.map(r => r.top)) + scrollY;
        const base = Math.max(...caixas.map(r => r.bottom)) + scrollY;
        const esq = Math.min(...caixas.map(r => r.left)) + scrollX;
        const dir = Math.max(...caixas.map(r => r.right)) + scrollX;
        return { x: esq, y: topo, width: dir - esq, height: base - topo };
      })()`,
    );
    if (quatro === null) {
      throw new Error("não achei quatro cards consecutivos em #em-lista — nada a recortar.");
    }

    const lista = await capturarPagina(s, {
      url: `${BASE}${ROTA}`,
      largura: 390,
      movel: true,
      espera: 1500,
      clip: {
        x: Math.max(0, quatro.x - 12),
        y: Math.max(0, quatro.y - 12),
        width: quatro.width + 24,
        height: quatro.height + 24,
        scale: 2,
      },
    });
    const { largura: lw, altura: lh } = dimensoesDoPng(lista);
    if (lh < 1200) {
      // Quatro cards com identidade, preço, mercado, procedência e CTA não cabem em menos
      // de 600 px de CSS — 1200 px de PNG a DPR 2. Abaixo disso o recorte pegou outra coisa.
      throw new Error(`card-v2-list-390.png saiu com ${lh}px de altura — recortou pouco demais.`);
    }
    writeFileSync(join(DESTINO, "card-v2-list-390.png"), lista);
    console.log(
      `==> card-v2-list-390.png — ${lw}x${lh} px (4 cards consecutivos, ` +
        `${Math.round(quatro.height / 4)} px de CSS por card)`,
    );

    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
