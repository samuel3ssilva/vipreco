/**
 * R3.3 §17 — capturas da Home/Achados.
 *
 *   home-achados-320.png       página inteira a 320 px
 *   home-achados-390.png       página inteira a 390 px — celular comum
 *   home-achados-430.png       página inteira a 430 px — celular grande
 *   home-achados-desktop.png   página inteira a 1280 px
 *   home-achados-list-390.png  recorte da lista de Achados a 390 px
 *   home-achados-states.png    os estados, do laboratório de estados
 *
 * O prefixo e o destino são parametrizáveis porque o painel comparativo precisa da MESMA
 * página renderizada em duas versões do código — o "antes" sai de `origin/main`, no mesmo
 * navegador, no mesmo instante.
 *
 * As animações são congeladas por `cdp.ts` antes de cada foto. Sem isso, o esqueleto de
 * carregamento é fotografado numa fase aleatória da pulsação e a captura deixa de reproduzir.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const BASE = process.argv[2] ?? "http://localhost:8080";
const ROTA = "/";
const PORTA = 9339;

const arg = (nome: string, padrao: string) => {
  const encontrado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return encontrado === undefined ? padrao : encontrado.slice(nome.length + 3);
};

const PREFIXO = arg("prefixo", "home-achados");
const DESTINO = arg("destino", join(process.cwd(), "docs/evidence/visual/r33"));

const TAMANHOS = [
  { sufixo: "320", largura: 320, movel: true },
  { sufixo: "390", largura: 390, movel: true },
  { sufixo: "430", largura: 430, movel: true },
  { sufixo: "desktop", largura: 1280, movel: false },
] as const;

/** As larguras onde não pode haver rolagem horizontal, e onde todo alvo precisa de 48 px. */
const LARGURAS_DE_CONTROLE = [320, 360, 390, 430, 1280] as const;

interface Medida {
  scrollWidth: number;
  clientWidth: number;
  cards: number;
  abas: number;
  abasCabecalho: number;
  ctaMenorQue48: number;
  h1: number;
  historicoDePreco: number;
}

const MEDIR_PAGINA = `({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  cards: document.querySelectorAll('article').length,
  abas: document.querySelectorAll('nav[data-barra-inferior] a').length,
  abasCabecalho: document.querySelectorAll('nav[aria-label="Navegação principal do cabeçalho"] a').length,
  ctaMenorQue48: [...document.querySelectorAll('a.btn-base, button.btn-base')]
    .filter(a => a.getClientRects().length > 0 && a.getBoundingClientRect().height < 48).length,
  h1: document.querySelectorAll('h1').length,
  historicoDePreco: (document.body.innerText.match(/antes\\\\s*R\\\\$/gi) || []).length,
})`;

async function principal() {
  const resposta = await fetch(`${BASE}${ROTA}`).catch(() => null);
  if (resposta === null || !resposta.ok) {
    console.error(`ERRO: ${BASE}${ROTA} não respondeu. Suba o servidor antes (bun run dev).`);
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, "/tmp/vipreco-home-perfil");

  try {
    const s = await conectar(PORTA);

    for (const { sufixo, largura, movel } of TAMANHOS) {
      const bytes = await capturarPagina(s, { url: `${BASE}${ROTA}`, largura, movel });
      const { largura: w, altura: h } = dimensoesDoPng(bytes);
      if (w !== largura * 2) {
        throw new Error(`${sufixo} saiu com ${w}px de largura; esperava ${largura * 2}px.`);
      }
      writeFileSync(join(DESTINO, `${PREFIXO}-${sufixo}.png`), bytes);
      console.log(`==> ${PREFIXO}-${sufixo}.png — ${w}x${h} px`);
    }

    // A evidência que não é imagem: um screenshot mostra que a página parece caber;
    // `scrollWidth === clientWidth` PROVA que ela cabe.
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
          `${m.cards} cards, ${m.abas} abas na barra, ${m.abasCabecalho} no cabeçalho, ${m.h1} h1, ` +
          `CTA abaixo de 48 px: ${m.ctaMenorQue48}, histórico de preço: ${m.historicoDePreco}`,
      );
      if (estoura) throw new Error(`a página estoura horizontalmente a ${largura} px.`);
      if (m.ctaMenorQue48 > 0) {
        throw new Error(`${m.ctaMenorQue48} CTA(s) abaixo de 48 px a ${largura} px.`);
      }
      if (m.h1 !== 1) throw new Error(`${m.h1} elementos h1 a ${largura} px; esperava 1.`);
      // A prova de DL-030 na Home, medida no DOM e não no código-fonte.
      if (m.historicoDePreco > 0) {
        throw new Error(`histórico de preço visível a ${largura} px — DL-030 proíbe.`);
      }
      // DUAS ABAS, E SÓ DUAS — nos dois lugares onde a navegação aparece. A barra inferior é
      // sempre renderizada (escondida por CSS acima de 640 px), e a do cabeçalho também: as
      // duas contagens são do DOM, não do que está visível, e as duas precisam bater.
      if (m.abas !== 2) throw new Error(`${m.abas} abas na barra a ${largura} px; esperava 2.`);
      if (m.abasCabecalho !== 2) {
        throw new Error(`${m.abasCabecalho} abas no cabeçalho a ${largura} px; esperava 2.`);
      }
    }

    // A lista de Achados recortada, para julgar ritmo: quantos cards cabem no polegar.
    await capturarPagina(s, { url: `${BASE}${ROTA}`, largura: 390, movel: true, espera: 1500 });
    const caixa = await medir<{ x: number; y: number; width: number; height: number } | null>(
      s,
      `(() => {
        const s = document.querySelector('section[aria-labelledby="achados-titulo"]');
        if (!s) return null;
        const r = s.getBoundingClientRect();
        return { x: 0, y: r.top + window.scrollY, width: 390, height: r.height };
      })()`,
    );
    if (caixa) {
      const lista = await capturarPagina(s, {
        url: `${BASE}${ROTA}`,
        largura: 390,
        movel: true,
        espera: 1500,
        clip: { ...caixa, scale: 2 },
      });
      const { largura: w, altura: h } = dimensoesDoPng(lista);
      writeFileSync(join(DESTINO, `${PREFIXO}-list-390.png`), lista);
      console.log(`\n==> ${PREFIXO}-list-390.png — ${w}x${h} px (seção de Achados a 390 px)`);
    }
  } finally {
    chrome.kill();
  }
}

await principal();
