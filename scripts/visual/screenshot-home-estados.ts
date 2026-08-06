/**
 * R3.3 — `home-achados-states.png`: os sete estados da seção de Achados, numa imagem.
 *
 * Os painéis vêm de `/laboratorio-home-estados`, cada um a 390 px — a largura do celular comum.
 * A página inteira é fotografada de uma vez, para que os sete apareçam na mesma escala e possam
 * ser comparados entre si sem abrir sete arquivos.
 *
 * REPRODUTIBILIDADE É REQUISITO, não gentileza. Duas capturas consecutivas do mesmo commit
 * precisam sair **byte a byte idênticas**, e o script falha se não saírem. Sem isso, "a
 * evidência está desatualizada" e "a captura só varia" viram a mesma observação — e foi
 * exatamente essa ambiguidade que produziu o incidente de evidência publicada de 06/08/2026.
 *
 * Duas fontes de variação foram fechadas:
 *   - a animação, congelada por `cdp.ts` antes de cada foto (o esqueleto pulsava);
 *   - o relógio, fixado em `AGORA` dentro da própria rota do laboratório (senão "há 2 dias"
 *     vira "há 3 dias" na virada do dia, e o PNG muda sem o código mudar).
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const BASE = process.argv[2] ?? "http://localhost:8080";
const ROTA = "/laboratorio-home-estados";
const PORTA = 9341;
const LARGURA = 1400;
const DESTINO = join(process.cwd(), "docs/evidence/visual/r33");
const ARQUIVO = "home-achados-states.png";

/** Os sete estados que o mandato exige, na ordem em que os painéis aparecem. */
const ESTADOS_EXIGIDOS = [
  "Carregando",
  "Vazio — nenhum Achado existe",
  "Erro parcial",
  "Sem ofertas vigentes",
  "Oferta desatualizada",
  "Sem imagem confiável",
  "Apenas uma oferta",
] as const;

interface Medida {
  paineis: number;
  titulos: string[];
  scrollWidth: number;
  clientWidth: number;
  historicoDePreco: number;
}

const MEDIR = `({
  paineis: document.querySelectorAll('[data-laboratorio-estados] section.w-\\\\[390px\\\\]').length,
  titulos: [...document.querySelectorAll('[data-laboratorio-estados] h2')].map(h => h.textContent.trim()),
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  historicoDePreco: (document.body.innerText.match(/antes\\\\s*R\\\\$/gi) || []).length,
})`;

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

async function principal() {
  const resposta = await fetch(`${BASE}${ROTA}`).catch(() => null);
  if (resposta === null || !resposta.ok) {
    console.error(`ERRO: ${BASE}${ROTA} não respondeu. Suba o servidor antes (bun run dev).`);
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, "/tmp/vipreco-estados-perfil");

  try {
    const s = await conectar(PORTA);
    const opcoes = { url: `${BASE}${ROTA}`, largura: LARGURA, movel: false, espera: 2000 };

    const primeira = await capturarPagina(s, opcoes);
    const m = await medir<Medida>(s, MEDIR);

    console.log(`painéis: ${m.paineis}`);
    for (const t of m.titulos) console.log(`  · ${t}`);

    if (m.paineis !== ESTADOS_EXIGIDOS.length) {
      throw new Error(`${m.paineis} painéis; o mandato exige ${ESTADOS_EXIGIDOS.length}.`);
    }
    for (const exigido of ESTADOS_EXIGIDOS) {
      if (!m.titulos.some((t) => t.includes(exigido))) {
        throw new Error(`o estado "${exigido}" não aparece na página.`);
      }
    }
    if (m.scrollWidth > m.clientWidth) {
      throw new Error(`a página estoura horizontalmente a ${LARGURA} px.`);
    }
    // DL-030 vale também na evidência: nenhum painel pode reintroduzir histórico de preço.
    if (m.historicoDePreco > 0) {
      throw new Error(`histórico de preço visível na página de estados — DL-030 proíbe.`);
    }

    // A SEGUNDA CAPTURA É A PROVA. Mesma página, mesmo instante de código, navegador recarregado:
    // se os bytes diferirem, alguma coisa nesta tela ainda depende do relógio ou de animação.
    const segunda = await capturarPagina(s, opcoes);
    const [a, b] = [sha(primeira), sha(segunda)];
    console.log(`\nSHA-256 captura 1: ${a}`);
    console.log(`SHA-256 captura 2: ${b}`);
    if (a !== b) {
      throw new Error("duas capturas consecutivas divergiram — a evidência não é reprodutível.");
    }

    const { largura, altura } = dimensoesDoPng(primeira);
    writeFileSync(join(DESTINO, ARQUIVO), primeira);
    console.log(`\n==> ${ARQUIVO} — ${largura}x${altura} px · reprodutível`);
  } finally {
    chrome.kill();
  }
}

await principal();
