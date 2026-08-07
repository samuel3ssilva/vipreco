/**
 * R3.3 / R3.3A — painel comparativo da Home para o Gate visual do Founder.
 *
 * =============================================================================
 * O "ANTES" É RENDERIZADO, NÃO LEMBRADO
 * =============================================================================
 *
 * A coluna da esquerda não é uma captura antiga guardada em disco: é a Home de `origin/main`
 * servida por um SEGUNDO servidor de desenvolvimento, num worktree efêmero, e fotografada no
 * mesmo navegador e no mesmo instante que a Home de R3.3. Sem isso, o "antes" e o "depois"
 * teriam fontes, versões de navegador e datas de fixture diferentes, e metade do que o painel
 * mostrasse como mudança de R3.3 seria mudança de ambiente.
 *
 * Como rodar (dois servidores, um por versão):
 *
 *     git worktree add --detach /tmp/antes origin/main
 *     ln -s "$PWD/node_modules" /tmp/antes/node_modules
 *     (cd /tmp/antes && bunx vite dev --port 8081) &
 *     bun run dev &
 *     bun scripts/visual/comparison-board-home.ts
 *
 * O painel carrega três coisas que uma montagem de imagens não carrega: o recorte relevante da
 * referência, as decisões funcionais que prevaleceram sobre o mockup, e as divergências. As três
 * vivem neste arquivo, versionadas — mudar a lista passa a ser mudar código revisável, e não
 * reeditar um bitmap que envelhece separado do texto que o explica.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const ANTES = process.env.BASE_ANTES ?? "http://localhost:8081";
const DEPOIS = process.env.BASE_DEPOIS ?? "http://localhost:8080";
const DESTINO = join(process.cwd(), "docs/evidence/visual/r33");
const PORTA = 9342;
const LARGURA = 1600;

/** Onde a entrega SEGUE a referência atual, o North Star V2. */
const ALINHAMENTOS = [
  "DUAS ABAS, E SÓ DUAS. O V2 desenha a barra inferior com Achados e Buscar. A Home entregue tem exatamente essas duas, no cabeçalho e na barra — e há teste que reprova a volta de Comparar, Favoritos, Mais, Mercados e WhatsApp como aba.",
  "A BUSCA NA PRIMEIRA DOBRA. O V2 põe o campo acima dos Achados, e é a decisão D2 do roadmap. Antes ele vinha DEPOIS da vitrine inteira: quem chegava sabendo o que queria precisava rolar por tudo antes de poder perguntar.",
  "CONTEXTO ANTES DE CONTEÚDO. O título diz onde você está — 'Você está vendo ofertas de Artemis' — em vez de prometer resultado. O V2 pede a mesma disciplina: nada de 'melhor preço', nada de 'mais barato perto de você'.",
  "O CARD V2 NO DESTAQUE. A primeira oferta usa a peça aprovada em R3.2: identidade do produto antes do preço, procedência completa, estado em texto.",
  "PROCEDÊNCIA EM TODO PREÇO. Nenhum card mostra valor sem fonte e data — na Home entregue e no V2.",
  "UM CONVITE DE WHATSAPP, DEPOIS DO PRODUTO. R3.3A removeu o CTA fixo que acompanhava a rolagem desde a primeira dobra: ele pedia o contato de quem ainda não tinha visto um Achado. Ficou um só, inline, abaixo do que a Home entrega.",
];

/** Onde a entrega SE AFASTA da referência, e por quê. */
const DIVERGENCIAS = [
  "OS SECUNDÁRIOS NÃO SÃO CARD V2. Só o destaque é. Foi medido em R3.2: o Card v2 ocupa ~400 px de CSS, e quatro deles passam de uma tela e meia num celular comum — o que se repete deixa de ser informação e vira textura. Os secundários seguem no `AchadoCard` compacto. A unificação é assunto de R6, quando o detalhe da oferta existir e a lista tiver mais do que três itens fictícios para provar densidade.",
  "A DIFERENÇA ENTRE MERCADOS NÃO APARECE. O V2 mostra 'R$ 0,50 abaixo da próxima oferta observada'. A Home entrega Achados de produtos DIFERENTES, não um conjunto comparável do mesmo SKU — não há segundo preço de onde tirar a distância. Ela entra com a tela de comparação, em R5/R6.",
  "NENHUM SINO DE NOTIFICAÇÃO. O North Star original desenhava um. Notificação exige canal, consentimento e uma decisão sobre o que é digno de interromper alguém — nada disso existe. Um sino que não notifica ensina o usuário a não confiar na interface.",
  "NENHUMA PERSONALIZAÇÃO NA HOME. O seletor 'Seu mercado habitual' saiu em R3.3A: um seletor na primeira tela declara um produto personalizado, e o MVP não é um. Ele continua em `/produto/$productId`, onde a preferência tem consequência imediata na linha de quanto você economiza. 'Preferência de mercado / mercado habitual / personalização futura' está registrado como POST-MVP em ROADMAP-MVP-v3 §4.",
  "ARTEMIS É FIXA NO TÍTULO. Não há seleção de bairro nem geolocalização — geolocalização está fora do MVP por escopo. O piloto é de um bairro só, e o título diz isso em vez de fingir cobertura.",
];

/** Decisões funcionais que ganharam do desenho, com o motivo. */
const DECISOES = [
  "O BOTÃO 'BUSCAR' DO CABEÇALHO SAIU. Com a busca na primeira dobra e 'Buscar' como aba, ele era a TERCEIRA forma de fazer a mesma coisa no mesmo viewport de 390 px, e as três brigavam pela mesma decisão nos primeiros cinco segundos. A aba fica porque está no polegar em todas as rotas; o campo fica porque é onde a busca acontece.",
  "'AJUDA' E 'MERCADOS' VIRARAM LINKS DE RODAPÉ, e por motivos diferentes. 'Mercados' era a `/para-mercados` — uma landing B2B — vestida de seção do app do consumidor; o contrato aprovado diz rota separada, nunca aba do B2C. 'Ajuda' é consulta pontual, não jornada, e numa barra de quatro cada aba levava um quarto da largura e um quarto da atenção.",
  "O TÍTULO É 'ACHADOS', NÃO 'ACHADOS DE HOJE'. O fixture tem preços de ontem, de dois e de três dias atrás, e o piloto vai ter dados mais velhos. 'De hoje' prometeria uma frescura que a linha de procedência de cada card desmente três linhas abaixo. Foi um teste de regressão que pegou isto, não uma revisão.",
  "NENHUM CRITÉRIO EDITORIAL ESCOLHE O DESTAQUE. Ele é o primeiro da lista que o serviço já entregou ordenada. 'Destaque do dia' com curadoria seria ranking editorial — o oposto da neutralidade — e não existe critério objetivo escrito para elegê-lo.",
  "HISTÓRICO DE PREÇO SAIU DO DADO, NÃO SÓ DA TELA. O campo `previous_price` foi removido do fixture e da interface do card. Sem P-01 decidida, não existe critério escrito de QUAL observação anterior conta — e um fixture que carrega o número mantém vivo o componente que o mostra. Tirar da tela e deixar no dado é adiar, não decidir.",
  "R3.3A — O CONSERTO SAIU JUNTO COM O PROBLEMA. Com o CTA fixo fora da Home, saiu também a máquina de anti-duplicação que existia por causa dele: loja de visibilidade compartilhada, marcador no DOM, `IntersectionObserver` e o `inert` condicional no convite do fluxo. Um mecanismo que nunca dispara é o que ninguém percebe estar quebrado. Ele continua inteiro em `/para-mercados`, onde a duplicação é real.",
  "R3.3A — OS DOIS BLOCOS LONGOS DO RODAPÉ VIRARAM COMPACTOS, e o conteúdo mudou de lugar, não de existência. 'Nenhum preço aparece sozinho' (quatro cartões de atributo e três regras) virou 'Preço com procedência': uma frase e uma porta. As três regras — você compra na loja, o estoque é do mercado, A ORDEM NÃO É VENDIDA — foram para `/como-funciona`. A terceira é o princípio de neutralidade declarado em público; a redução da Home só pôde acontecer depois de o texto existir do outro lado, e um teste amarra as duas pontas.",
  "R3.3A — 'SEM OFERTAS VIGENTES' GANHOU COPY PRÓPRIA. Era divergência registrada no painel de estados: os dois estados caíam em 'estamos começando a mapear preços' — verdadeiro quando nada foi conferido, falso quando houve mapeamento e o preço envelheceu. A distinção é dado, não heurística: lista de origem vazia é vazio real; lista com itens e nenhum válido é oferta vencida. Só a segunda oferece 'Buscar produto' — no vazio real não há o que buscar.",
  "OS DOIS `nav` TÊM NOMES DISTINTOS. 'Navegação principal' na barra inferior, 'Navegação principal do cabeçalho' no topo. Com o mesmo nome, os dois marcos ficam indistinguíveis na lista de regiões do leitor de tela — e só um está visível por vez, mas a árvore acessível não sabe disso. Foi a medição que pegou; a inspeção visual não pegaria.",
];

/** O que R3.3 NÃO entrega, dito para não ser lido como esquecimento. */
const FUTUROS = [
  "Tela de comparação do mesmo SKU entre mercados (R5/R6) — o núcleo do produto, e a razão de a busca ter subido.",
  "Detalhe completo da oferta, com a lista de preços por mercado (R5/R6).",
  "Card v2 na lista inteira, com densidade medida em dado real (R6).",
  "Personalização por mercado habitual na Home — POST-MVP, registrado em ROADMAP-MVP-v3 §4. Nada dela pode ser preparado por antecipação: nenhuma segmentação e nenhum recorte da lista orgânica.",
  "Mecânica completa do WhatsApp — o convite continua sendo um link, e a resposta continua manual. R3.3A mudou a posição e o texto do CTA, não o que acontece depois dele.",
  "Preço unitário na Home — depende de quantidade estruturada aprovada, e o backfill continua proibido.",
  "Histórico de preço e alerta de queda — fora do escopo atual no roadmap do V2, e bloqueado por P-01.",
  "Qualquer camada de parceiro ou conteúdo pago: quando existir, vive em seção separada e rotulada, e jamais reordena a lista orgânica.",
];

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function commitDe(url: string): string {
  if (url === DEPOIS) return execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
  return execFileSync("git", ["rev-parse", "origin/main"]).toString().trim();
}

interface MedidaAbas {
  abas: number;
  rotulos: string[];
  /** Quantos `nav` a mais existem do que nomes acessíveis distintos. Precisa ser 0. */
  navsComMesmoNome: number;
}

/**
 * O seletor precisa achar a barra inferior nas DUAS versões, e `data-barra-inferior` só existe
 * na de R3.3 — ele foi criado justamente porque, na anterior, os dois `nav` compartilhavam o
 * mesmo `aria-label` e não havia como distingui-los. Então a âncora comum é a geometria: a barra
 * é o `nav` fixado no rodapé.
 */
const MEDIR_ABAS = `(() => {
  const barra = document.querySelector('nav[data-barra-inferior]')
    ?? [...document.querySelectorAll('nav')].find(n => {
      const e = getComputedStyle(n);
      return e.position === 'fixed' && e.bottom === '0px';
    });
  const itens = barra ? [...barra.querySelectorAll('a')] : [];
  return {
    abas: itens.length,
    rotulos: itens.map(a => a.textContent.trim()),
    navsComMesmoNome: (() => {
      const nomes = [...document.querySelectorAll('nav[aria-label]')].map(n => n.getAttribute('aria-label'));
      return nomes.length - new Set(nomes).size;
    })(),
  };
})()`;

function montarHtml(campos: {
  antes: string;
  depois: string;
  v2: string;
  abasAntes: MedidaAbas;
  abasDepois: MedidaAbas;
  shaAntes: string;
  shaDepois: string;
}): string {
  const lista = (itens: readonly string[]) => itens.map((d) => `<li>${d}</li>`).join("");
  const chips = (m: MedidaAbas, cor: string) =>
    m.rotulos.map((r) => `<span class="chip" style="border-color:${cor}">${r}</span>`).join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fbf7ec; color: #10231c; font-family: -apple-system, system-ui, sans-serif; padding: 32px; width: ${LARGURA}px; }
    h1 { font-size: 26px; letter-spacing: -0.01em; }
    .sub { color: #5b6b63; margin: 6px 0 24px; font-size: 14px; line-height: 1.55; max-width: 96ch; }
    .tres { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: start; }
    .col { background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 14px; }
    .col.entrega { border-color: #0e5c3c; border-width: 2px; }
    .rot { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #0e5c3c; }
    .rot.velho { color: #8a7a55; }
    .meta { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 10px; color: #8a9490; margin: 4px 0 10px; word-break: break-all; }
    /* A REFERENCIA nunca e recortada nem esticada: contain, proporcao livre. Um mockup de
       direcao visual cortado mentiria sobre a propria direcao. */
    img { width: 100%; height: auto; max-height: 1500px; object-fit: contain; object-position: top; display: block; border-radius: 6px; border: 1px solid #eee7d6; }
    /* AS DUAS CAPTURAS DE APLICACAO sao outra coisa: paginas inteiras, muito altas, e a
       entregue e MAIS alta que a anterior (a busca subiu para a primeira dobra). Com contain
       numa caixa de altura fixa, a mais alta encolhe mais -- e a coluna da entrega saia menor e
       ilegivel ao lado da coluna do antes. Isso nao e uma diferenca de desenho; e um artefato da
       montagem, e uma montagem que faz a entrega parecer menor do que e nao e evidencia.
       As duas foram capturadas a 390 CSS px com o mesmo fator de escala, entao tem a MESMA
       largura intrinseca: recortadas pelo topo na mesma caixa, aparecem na mesma escala e a
       comparacao volta a ser justa. As paginas inteiras continuam nos quatro PNGs de largura. */
    img.app { height: 1500px; max-height: none; object-fit: cover; object-position: top; }
    .abas { margin-top: 22px; background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 18px 22px; }
    .abas h2 { font-size: 15px; margin-bottom: 12px; }
    .linha { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
    .linha b { font-size: 12px; width: 190px; color: #5b6b63; }
    .chip { font-size: 12px; padding: 4px 10px; border: 1.5px solid #ccc; border-radius: 999px; }
    .bloco { margin-top: 22px; background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 18px 22px; }
    .bloco h2 { font-size: 15px; margin-bottom: 10px; }
    .bloco li { font-size: 13px; line-height: 1.6; color: #3c4c45; margin-left: 18px; margin-bottom: 9px; }
    .alerta { border-color: #b3311f; background: #fdf4f2; }
    .alerta h2 { color: #7a2214; }
    .futuro { border-style: dashed; background: #f4f2ea; }
    .futuro h2 { color: #5b6b63; }
    .rodape { margin-top: 18px; font-size: 12px; color: #5b6b63; line-height: 1.6; max-width: 96ch; }
  </style></head><body>
    <h1>R3.3A — painel comparativo da Home para o Gate visual</h1>
    <p class="sub">Três colunas, mesma largura de celular (390&nbsp;px). À esquerda a Home <strong>anterior</strong>, renderizada agora a partir de <code>origin/main</code> num servidor paralelo — não é uma captura antiga guardada em disco. No meio a <strong>referência atual</strong>, a tela 1 do North&nbsp;Star&nbsp;V2. À direita a Home <strong>entregue por R3.3 + R3.3A</strong>. As colunas 1 e 3 são páginas inteiras <strong>recortadas pelo topo na mesma escala</strong> — as versões completas estão nos quatro PNGs de largura ao lado deste arquivo. Os três saíram do mesmo navegador, no mesmo instante, com animação congelada.</p>
    <div class="tres">
      <div class="col">
        <p class="rot velho">1 · Home anterior (origin/main)</p>
        <p class="meta">${campos.shaAntes}</p>
        <img class="app" src="data:image/png;base64,${campos.antes}" alt="Home anterior">
      </div>
      <div class="col">
        <p class="rot">2 · North Star V2 — tela 1</p>
        <p class="meta">docs/product/visual-north-star-v2/telas/tela-1-home.png</p>
        <img src="data:image/png;base64,${campos.v2}" alt="North Star V2, tela 1">
      </div>
      <div class="col entrega">
        <p class="rot">3 · Home entregue — R3.3 + R3.3A</p>
        <p class="meta">${campos.shaDepois}</p>
        <img class="app" src="data:image/png;base64,${campos.depois}" alt="Home entregue por R3.3 e R3.3A">
      </div>
    </div>

    <div class="abas">
      <h2>Navegação: de quatro abas para duas</h2>
      <div class="linha"><b>Antes (${campos.abasAntes.abas} abas)</b>${chips(campos.abasAntes, "#c9b98a")}</div>
      <div class="linha"><b>R3.3A (${campos.abasDepois.abas} abas)</b>${chips(campos.abasDepois, "#0e5c3c")}</div>
      <p class="rodape"><strong>Medido no DOM, não lido no código:</strong> a Home anterior tinha ${campos.abasAntes.navsComMesmoNome > 0 ? `<strong>${campos.abasAntes.navsComMesmoNome} par de landmarks de navegação com o MESMO nome acessível</strong> — “Navegação principal” duas vezes, indistinguíveis na lista de regiões do leitor de tela. A entregue tem ${campos.abasDepois.navsComMesmoNome}` : `${campos.abasAntes.navsComMesmoNome} nome de navegação repetido, e a entregue também ${campos.abasDepois.navsComMesmoNome}`}.</p>
      <p class="rodape">“Como funciona” e “Tenho um mercado” continuam alcançáveis, pelo rodapé. Aba não é o único jeito de chegar a uma página; é o jeito que declara “esta é uma das coisas principais que você faz aqui”. Achar e comparar preço são duas. Não há uma terceira.</p>
    </div>

    <div class="bloco"><h2>Onde a entrega segue o North Star V2</h2><ul>${lista(ALINHAMENTOS)}</ul></div>
    <div class="bloco"><h2>Decisões funcionais que prevaleceram sobre o desenho</h2><ul>${lista(DECISOES)}</ul></div>
    <div class="bloco alerta"><h2>Divergências em relação à referência</h2><ul>${lista(DIVERGENCIAS)}</ul></div>
    <div class="bloco futuro"><h2>Itens futuros — não entregues em R3.3/R3.3A, e dito para não ser lido como esquecimento</h2><ul>${lista(FUTUROS)}</ul></div>

    <p class="rodape">Todo dado exibido é <strong>fictício e versionado</strong> (<code>src/lib/demo-opportunities.ts</code>): nenhum mercado real aparece como participante, nenhum preço vem de staging ou de produção, e a faixa “AMBIENTE DE TESTE” está no topo das três colunas de aplicação. Os estados da seção de Achados estão em <code>home-achados-states.png</code>.</p>
  </body></html>`;
}

async function principal() {
  for (const base of [ANTES, DEPOIS]) {
    const r = await fetch(base).catch(() => null);
    if (r === null || !r.ok) {
      console.error(
        `ERRO: ${base} não respondeu. Veja o cabeçalho deste arquivo para subir os dois servidores.`,
      );
      process.exit(1);
    }
  }

  mkdirSync(DESTINO, { recursive: true });
  const chrome = abrirChrome(PORTA, "/tmp/vipreco-board-home-perfil");

  try {
    const s = await conectar(PORTA);
    const opcoes = { largura: 390, movel: true, espera: 1800 } as const;

    const pngAntes = await capturarPagina(s, { url: `${ANTES}/`, ...opcoes });
    const abasAntes = await medir<MedidaAbas>(s, MEDIR_ABAS);
    const pngDepois = await capturarPagina(s, { url: `${DEPOIS}/`, ...opcoes });
    const abasDepois = await medir<MedidaAbas>(s, MEDIR_ABAS);

    console.log(
      `antes:  ${abasAntes.abas} abas — ${abasAntes.rotulos.join(", ")} · nav com nome repetido: ${abasAntes.navsComMesmoNome}`,
    );
    console.log(
      `depois: ${abasDepois.abas} abas — ${abasDepois.rotulos.join(", ")} · nav com nome repetido: ${abasDepois.navsComMesmoNome}`,
    );
    if (abasDepois.navsComMesmoNome !== 0) {
      throw new Error("dois landmarks de navegação com o mesmo nome acessível na Home entregue.");
    }

    // O painel existe para mostrar a redução de quatro para duas. Se os dois lados medirem a
    // mesma coisa, ou o servidor errado respondeu, ou o worktree não está em `origin/main` —
    // e o painel sairia afirmando uma mudança que não aconteceu.
    if (abasAntes.abas !== 4) {
      throw new Error(`o "antes" tem ${abasAntes.abas} abas; origin/main tem 4. Servidor errado?`);
    }
    if (abasDepois.abas !== 2) {
      throw new Error(`o "depois" tem ${abasDepois.abas} abas; R3.3 tem 2. Servidor errado?`);
    }

    const html = montarHtml({
      antes: pngAntes.toString("base64"),
      depois: pngDepois.toString("base64"),
      v2: base64(join(process.cwd(), "docs/product/visual-north-star-v2/telas/tela-1-home.png")),
      abasAntes,
      abasDepois,
      shaAntes: commitDe(ANTES),
      shaDepois: commitDe(DEPOIS),
    });

    const arquivoHtml = join("/tmp", "vipreco-board-home.html");
    writeFileSync(arquivoHtml, html);

    // 6 s, e não os 1,5 s das outras capturas. O painel carrega três PNGs de página inteira como
    // `data:` URI — cerca de 3 MB de base64 —, e com 1,5 s o `captureScreenshot` voltava vazio:
    // o CDP respondia com erro em vez de resultado, e o script morria num destructuring de
    // `undefined` sem dizer por quê. O sintoma não parecia tempo; era.
    const opcoesBoard = {
      url: `file://${arquivoHtml}`,
      largura: LARGURA,
      movel: false,
      espera: 6000,
    };
    const primeira = await capturarPagina(s, opcoesBoard);
    const segunda = await capturarPagina(s, opcoesBoard);
    const [a, b] = [sha(primeira), sha(segunda)];
    console.log(`\nSHA-256 captura 1: ${a}`);
    console.log(`SHA-256 captura 2: ${b}`);
    if (a !== b) {
      throw new Error("duas capturas consecutivas divergiram — o painel não é reprodutível.");
    }

    const { largura, altura } = dimensoesDoPng(primeira);
    writeFileSync(join(DESTINO, "home-achados-comparison-board.png"), primeira);
    console.log(`\n==> home-achados-comparison-board.png — ${largura}x${altura} px · reprodutível`);
  } finally {
    chrome.kill();
  }
}

await principal();
