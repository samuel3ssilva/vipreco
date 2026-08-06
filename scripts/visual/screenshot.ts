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

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng } from "./cdp";

const BASE = process.argv[2] ?? "http://localhost:8080";
const ROTA = "/laboratorio-visual";
const DESTINO = join(process.cwd(), "docs/evidence/visual/r31");
const PORTA = 9333;

const TAMANHOS = [
  { nome: "screenshot-320.png", largura: 320, movel: true },
  { nome: "screenshot-390.png", largura: 390, movel: true },
  { nome: "screenshot-desktop.png", largura: 1280, movel: false },
] as const;

async function principal() {
  const resposta = await fetch(`${BASE}${ROTA}`).catch(() => null);
  if (resposta === null || !resposta.ok) {
    console.error(`ERRO: ${BASE}${ROTA} não respondeu. Suba o servidor antes (bun run dev).`);
    process.exit(1);
  }

  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, "/tmp/vipreco-screenshot-perfil");

  try {
    const s = await conectar(PORTA);

    for (const { nome, largura, movel } of TAMANHOS) {
      const bytes = await capturarPagina(s, { url: `${BASE}${ROTA}`, largura, movel });

      // Confere a largura no cabeçalho IHDR. Sem esta verificação, um recorte silencioso
      // voltaria a passar por evidência.
      const { largura: w, altura: h } = dimensoesDoPng(bytes);
      if (w !== largura * 2) {
        throw new Error(`${nome} saiu com ${w}px de largura; esperava ${largura * 2}px.`);
      }
      writeFileSync(join(DESTINO, nome), bytes);
      console.log(`==> ${nome} — ${w}x${h} px`);
    }

    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
