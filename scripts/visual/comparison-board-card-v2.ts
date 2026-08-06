/**
 * R3.2 §14 — painel comparativo do Card v2: o North Star ao lado do que foi entregue.
 *
 * O painel carrega três coisas que uma montagem de imagens não carrega:
 *
 *   1. o RECORTE relevante do North Star — a região dos cards, e não a tela inteira;
 *   2. as notas de alinhamento — onde a entrega segue a direção;
 *   3. as divergências e as decisões funcionais que prevaleceram sobre o mockup.
 *
 * As três vivem neste arquivo, versionadas. Mudar a lista de divergências passa a ser
 * mudar código revisável, e não reeditar um bitmap que envelhece separado do texto que o
 * explica.
 *
 * O NORTH STAR NÃO É DEFORMADO: `object-fit: contain`, proporção livre. Uma direção visual
 * esticada mentiria sobre a própria direção.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const DESTINO = join(process.cwd(), "docs/evidence/visual/r32");
const PORTA = 9336;
const LARGURA = 1400;

/** Onde a entrega SEGUE a direção aprovada. */
const ALINHAMENTOS = [
  "A hierarquia do mockup foi preservada onde ela é sobre produto: imagem, identidade do SKU e só então o preço. O nome, a marca e a variante deixaram de ser um título concatenado e viraram campos separados, que é o que torna 250 g distinguível de 500 g numa lista.",
  "A tipografia, a paleta e o ritmo de espaço saem inteiramente dos tokens aprovados em R3.1. Nenhum valor novo de cor, fonte ou espaçamento foi introduzido por este card.",
  "O bloco de procedência — fonte, data e validade — aparece junto do preço em todos os estados, como o contrato exige. Não existe card com preço e sem data.",
  "O alvo de toque do CTA é de 48 px em todas as larguras medidas, e o foco é o anel do sistema.",
];

/** Onde a entrega SE AFASTA do mockup, e por quê. */
const DIVERGENCIAS = [
  "LOGOTIPOS E FOTOS DE MARCA: o North Star mostra logotipos de rede e embalagens de marcas reais. Nenhum direito de uso foi obtido e nenhum desses mercados é parceiro. O card identifica mercado por TEXTO e usa placeholder onde não há correspondência exata aprovada — a única imagem do laboratório é um desenho geométrico embutido, rotulado como demonstração.",
  "R$/kg EM TODO CARD: no mockup o preço unitário aparece sempre. Aqui ele é CONDICIONAL e só aparece com quantidade estruturada e aprovada (`confirmed`). Como o backfill de quantidade continua proibido, num banco real ele estaria ausente na maioria dos cards — e ausente significa sumir, não virar traço.",
  "PROMOÇÃO SEM CONDIÇÃO: o mockup exibe o selo de promoção sem o requisito. Aqui a condição é exibida por extenso, sempre junto do preço. Uma promoção cujo limite só aparece na gôndola é uma promessa que o produto não pode cumprir.",
  "BAIRRO E CIDADE: o mockup usa São Luís-MA. O piloto é Artemis, Piracicaba-SP. As ofertas deste laboratório são fictícias — 'Mercado Exemplo', 'Bairro Exemplo', 'Produto Demonstrativo' — e nenhuma delas vem de staging ou de produção.",
];

/** Decisões funcionais que ganharam do desenho, com o motivo. */
const DECISOES = [
  "O RÓTULO DE ESTADO VEM ANTES DO PREÇO. A ordem recomendada do mandato não posiciona o estado; ler 'R$ 8,90' e só depois descobrir que a oferta expirou é ler como vigente um preço que não é. O estado é condição de leitura do número.",
  "A VALIDADE SOBE PARA DENTRO DO BLOCO DE PROCEDÊNCIA, junto de fonte e data, em vez de ficar isolada na posição 7 da ordem. Fonte, data e validade são um bloco inseparável por contrato; separá-los para respeitar a numeração cumpriria a ordem e quebraria a regra que a ordem serve.",
  "'DESATUALIZADO' E 'EXPIRADA' SÃO ESTADOS DIFERENTES. Validade vencida é expiração; observação antiga sem validade nenhuma é desatualização. Usar a mesma palavra nos dois casos inventaria uma validade só para poder anunciar que ela venceu.",
  "NENHUMA VARIANTE PATROCINADA foi desenhada. Não há contrato normativo aprovado na main para conteúdo pago no card, e desenhá-lo agora decidiria o assunto pelo desenho. Conteúdo pago, quando existir, vive em seção separada e rotulada e jamais reordena a lista orgânica.",
];

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");

function montarHtml(): string {
  const northStar = base64(
    join(process.cwd(), "docs/product/visual-north-star/vipreco-mvp-north-star.png"),
  );
  // A GRADE DE VARIANTES, e não a captura de página inteira.
  //
  // A primeira versão embutia `card-v2-390.png`, que tem 20 mil pixels de altura. Com
  // `object-fit: cover; object-position: top`, o recorte de 900 px pegava o CABEÇALHO da
  // página — texto explicativo, zero cards. O painel ficou bonito, legível e inútil:
  // ninguém compara anatomia de card olhando um parágrafo.
  //
  // Só apareceu ao OLHAR o PNG. As conferências automáticas passaram todas — largura
  // certa, duas imagens carregadas, altura suficiente —, porque nenhuma delas sabe o que
  // é um card. Verificação automática prova que a imagem existe; ela não prova que a
  // imagem mostra a coisa certa.
  const card = base64(join(DESTINO, "card-v2-variants.png"));
  const lista = (itens: readonly string[]) => itens.map((d) => `<li>${d}</li>`).join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fbf7ec; color: #10231c; font-family: -apple-system, system-ui, sans-serif; padding: 32px; width: ${LARGURA}px; }
    h1 { font-size: 26px; letter-spacing: -0.01em; }
    .sub { color: #5b6b63; margin: 6px 0 24px; font-size: 14px; line-height: 1.55; max-width: 92ch; }
    .par { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
    .col { background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 16px; }
    .rot { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #0e5c3c; margin-bottom: 10px; }
    /* contain, nunca cover: o North Star não pode ser esticado nem recortado. */
    img { width: 100%; height: auto; object-fit: contain; display: block; border-radius: 6px; }
    .card { max-height: 1400px; object-fit: contain; }
    .bloco { margin-top: 22px; background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 18px 22px; }
    .bloco h2 { font-size: 15px; margin-bottom: 10px; }
    .bloco li { font-size: 13px; line-height: 1.6; color: #3c4c45; margin-left: 18px; margin-bottom: 9px; }
    .rodape { margin-top: 18px; font-size: 12px; color: #5b6b63; line-height: 1.6; }
  </style></head><body>
    <h1>R3.2 — painel comparativo do Card v2 para o Gate visual</h1>
    <p class="sub">À esquerda, a direção aprovada em R3.0. À direita, as oito variantes do Card v2 entregue, capturadas em navegador — cards consecutivos, que é como eles vão aparecer de verdade. As capturas a 320&nbsp;px e 390&nbsp;px estão em <code>docs/evidence/visual/r32/</code>.
    A comparação é de <strong>anatomia e linguagem visual</strong>: R3.2 entrega o card isolado, no laboratório. Nenhuma das cinco telas foi implementada, e a Home segue exatamente como estava.</p>
    <div class="par">
      <div class="col"><div class="rot">North Star — direção aprovada (R3.0)</div><img src="data:image/png;base64,${northStar}" alt=""></div>
      <div class="col"><div class="rot">Card v2 — as oito variantes em lista, render real</div><img class="card" src="data:image/png;base64,${card}" alt=""></div>
    </div>
    <div class="bloco"><h2>Onde a entrega segue a direção</h2><ul>${lista(ALINHAMENTOS)}</ul></div>
    <div class="bloco"><h2>Divergências conhecidas</h2><ul>${lista(DIVERGENCIAS)}</ul></div>
    <div class="bloco"><h2>Decisões funcionais que prevaleceram sobre o mockup</h2><ul>${lista(DECISOES)}</ul></div>
    <p class="rodape">Nenhuma imagem contém dado real. As ofertas do laboratório são fictícias e versionadas; o conteúdo do North Star é ilustrativo e não é fonte de dado.</p>
  </body></html>`;
}

async function principal() {
  const html = montarHtml();
  const chrome = abrirChrome(PORTA, "/tmp/vipreco-board-card-v2-perfil");

  try {
    const s = await conectar(PORTA);

    // ARQUIVO, E NÃO `data:` URL. A R3.1 embutiu as duas imagens numa data URL de ~3 MB,
    // o Chrome recusou a navegação em silêncio, e o painel saiu BRANCO — com as dimensões
    // certas, porque a conferência de largura só olha o cabeçalho do PNG.
    const pasta = mkdtempSync(join(tmpdir(), "vipreco-board-v2-"));
    const arquivo = join(pasta, "board.html");
    writeFileSync(arquivo, html, "utf-8");

    const bytes = await capturarPagina(s, {
      url: `file://${arquivo}`,
      largura: LARGURA,
      movel: false,
      espera: 3000,
    });

    const { largura, altura } = dimensoesDoPng(bytes);
    if (largura !== LARGURA * 2) {
      throw new Error(`o painel saiu com ${largura}px; esperava ${LARGURA * 2}px.`);
    }

    // CONFERÊNCIA DE TINTA. Dimensão certa não prova conteúdo: um PNG inteiramente branco
    // do tamanho certo passa por evidência com uma facilidade desconfortável.
    const medida = await medir<{ imagens: number; carregadas: number; altura: number }>(
      s,
      `({
        imagens: document.querySelectorAll('img').length,
        carregadas: [...document.querySelectorAll('img')].filter(i => i.naturalWidth > 0).length,
        altura: document.body.scrollHeight,
      })`,
    );
    if (medida.imagens !== 2) {
      throw new Error(`o painel deveria ter 2 imagens e tem ${medida.imagens}.`);
    }
    if (medida.carregadas !== 2) {
      throw new Error(
        `${medida.carregadas} de 2 imagens carregaram — as outras não renderizaram nada.`,
      );
    }
    if (medida.altura < 900) {
      throw new Error(`o corpo do painel mede ${medida.altura}px — está vazio demais.`);
    }

    writeFileSync(join(DESTINO, "card-v2-comparison-board.png"), bytes);
    console.log(`==> card-v2-comparison-board.png — ${largura}x${altura} px`);
    s.fechar();
  } finally {
    chrome.kill();
  }
}

await principal();
