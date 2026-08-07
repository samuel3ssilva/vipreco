/**
 * R3.3B — painel comparativo da Home para o Gate visual do Founder.
 *
 * =============================================================================
 * NENHUM "ANTES" É LEMBRADO. TODOS SÃO RENDERIZADOS AGORA
 * =============================================================================
 *
 * O mandato §14 pede quatro áreas: a Home técnica anterior, a referência visual aprovada, a
 * R3.3A e a R3.3B. Três delas são aplicação — e as três são servidas por servidores paralelos,
 * de worktrees efêmeros, fotografadas no MESMO navegador e no MESMO instante. Sem isso, metade
 * do que o painel mostrasse como mudança de desenho seria diferença de fonte, de versão de
 * navegador ou de data de fixture.
 *
 * Como rodar (três servidores, um por versão):
 *
 *     git worktree add --detach /tmp/vp-antes origin/main
 *     git worktree add --detach /tmp/vp-r33a  <head de R3.3A>
 *     for d in /tmp/vp-antes /tmp/vp-r33a; do ln -s "$PWD/node_modules" $d/node_modules; cp .env $d/.env; done
 *     (cd /tmp/vp-antes && bunx vite dev --port 8081 --strictPort) &
 *     (cd /tmp/vp-r33a  && bunx vite dev --port 8082 --strictPort) &
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
const R33A = process.env.BASE_R33A ?? "http://localhost:8082";
const DEPOIS = process.env.BASE_DEPOIS ?? "http://localhost:8080";
const DESTINO = join(process.cwd(), "docs/evidence/visual/r33");
const PORTA = 9342;
const LARGURA = 2080;

/** Worktrees efêmeros que servem as colunas A e C. Só para ler o commit que cada um serve. */
const WORKTREE_ANTES = process.env.WORKTREE_ANTES ?? "/tmp/vp-antes";
const WORKTREE_R33A = process.env.WORKTREE_R33A ?? "/tmp/vp-r33a";

/**
 * A leitura que o mandato §14 pede explicitamente: o que ficou mais bonito, o que ficou mais
 * simples, o que foi preservado, o que foi removido e o que permanece futuro — entre a coluna C
 * (R3.3A) e a coluna D (R3.3B).
 */
const DE_C_PARA_D = [
  "MAIS BONITO — produto visível. Três placeholders viraram três ilustrações de categoria, e o card de destaque passou a ter uma imagem de 112 px em vez de um ícone de 96. É a mudança que responde ao diagnóstico do Founder: a Home parecia painel administrativo porque não mostrava produto nenhum.",
  "MAIS BONITO — hierarquia de preço. O preço do destaque foi de 2 rem para 2,625 rem, e a lista ganhou um preço próprio à direita, alinhado. Antes o preço empatava com o nome do produto e com o nome do mercado: três linhas com o mesmo peso não são hierarquia.",
  "MAIS SIMPLES — a primeira dobra perdeu duas frases. O cabeçalho de seção da busca ('Procurando um produto específico?' mais uma linha de apoio) explicava um campo com lupa, placeholder e quatro atalhos com nome de produto. O título encolheu de 'Você está vendo ofertas de Artemis' para 'Achados em Artemis', que diz menos, não mais.",
  "MAIS SIMPLES — a página encurtou ~25% a 390 px, sem perder um único campo de procedência.",
  "REMOVIDO — o que parecia laboratório. A moldura tracejada em monoespaçada do selo de dados fictícios (a FRASE ficou), o `font-data` das datas de observação e validade, e o botão repetido no rodapé de cada item da lista.",
  "REMOVIDO — as marcas reais do fixture, e com elas o risco de uma ilustração genérica ser lida como a embalagem de uma marca existente.",
  "PRESERVADO — tudo o que o §4 lista. Duas abas; Artemis · Piracicaba-SP; produto exato antes do preço; fonte, atualização e validade em todo card; validade ausente dita; sem promessa absoluta; sem histórico de preço; sem mercado habitual; sem personalização; sem prova social; sem parceiro; sem ranking pago; sem distância; expirada ≠ desatualizada; vazio ≠ sem ofertas vigentes.",
  "PRESERVADO — os sete estados da seção de Achados, um a um, com a apresentação melhorada e o contrato intacto.",
  "FUTURO — comparação do mesmo SKU, detalhe da oferta, contagem de mercados no CTA, fotografia real de produto e preço unitário. Cada um com o seu bloqueio nomeado abaixo.",
];

/** Onde a entrega SEGUE a referência atual, o North Star V2. */
const ALINHAMENTOS = [
  "DUAS ABAS, E SÓ DUAS. O V2 desenha a barra inferior com Achados e Buscar. A Home entregue tem exatamente essas duas, no cabeçalho e na barra — e há teste que reprova a volta de Comparar, Favoritos, Mais, Mercados e WhatsApp como aba.",
  "A BUSCA NA PRIMEIRA DOBRA. O V2 põe o campo acima dos Achados, e é a decisão D2 do roadmap. Antes ele vinha DEPOIS da vitrine inteira: quem chegava sabendo o que queria precisava rolar por tudo antes de poder perguntar.",
  "R3.3B — PRODUTO RECONHECÍVEL EM TODO ACHADO. Era esta a lacuna que o Founder viu: a Home mostrava placeholders e parecia painel técnico. Agora cada Achado tem uma ilustração de categoria, versionada, feita para a demonstração — sem embalagem, marca, logotipo ou trade dress de terceiro. O `alt` de cada uma diz o que ela é: ilustração genérica, não a embalagem do produto.",
  "R3.3B — CARTÃO PROTAGONISTA E LINHA COMPACTA, como no V2. O destaque domina — imagem de 112 px, preço em 2,625 rem — e os demais são linhas de leitura rápida com imagem, identidade, mercado, procedência e preço à direita.",
  "CONTEXTO ANTES DE CONTEÚDO. O título diz onde você está — 'Achados em Artemis' — em vez de prometer resultado. O V2 pede a mesma disciplina: nada de 'melhor preço', nada de 'mais barato perto de você'.",
  "PROCEDÊNCIA EM TODO PREÇO. Nenhum card mostra valor sem fonte, atualização e validade — na Home entregue e no V2. Quando o mercado não informou validade, a ausência é DITA.",
  "UM CONVITE DE WHATSAPP, DEPOIS DO PRODUTO. R3.3A removeu o CTA fixo que acompanhava a rolagem desde a primeira dobra. R3.3B rebaixou o peso dele: o botão sólido da Home passou a ser o de comparação, que é o núcleo do produto.",
];

/** Onde a entrega SE AFASTA da referência, e por quê. */
const DIVERGENCIAS = [
  "A DIFERENÇA ENTRE MERCADOS NÃO APARECE. O V2 mostra 'R$ 0,50 abaixo da próxima oferta observada'. A Home entrega Achados de produtos DIFERENTES, não um conjunto comparável do mesmo SKU — não há segundo preço de onde tirar a distância. Ela entra com a tela de comparação, em R5/R6.",
  "O CTA NÃO DIZ 'COMPARAR EM 3 MERCADOS'. O V2 diz, e o Card v2 sabe dizer — `markets_with_valid_price` existe e é lido. O que não existe é a contagem: o fixture tem um preço por produto, e escrever um número maior seria inventar. O rótulo passa a citar mercados quando o dado citar.",
  "NENHUM SINO DE NOTIFICAÇÃO. O North Star original desenhava um. Notificação exige canal, consentimento e uma decisão sobre o que é digno de interromper alguém — nada disso existe. Um sino que não notifica ensina o usuário a não confiar na interface.",
  "NENHUMA PERSONALIZAÇÃO NA HOME. O seletor 'Seu mercado habitual' saiu em R3.3A: um seletor na primeira tela declara um produto personalizado, e o MVP não é um. Ele continua em `/produto/$productId`, onde a preferência tem consequência imediata. 'Preferência de mercado / mercado habitual / personalização futura' está registrado como POST-MVP em ROADMAP-MVP-v3 §4.",
  "NENHUMA TARJA 'DESTAQUE DE HOJE'. O V2 desenha uma faixa âmbar sobre o card principal. O destaque do ViPreço não é escolhido por ninguém — é o primeiro da lista que o serviço já entregou ordenada —, e uma tarja editorial afirmaria uma curadoria que não existe. A referência é autoridade de qualidade, não de função.",
  "ARTEMIS É FIXA NO TÍTULO. Não há seleção de bairro nem geolocalização — geolocalização está fora do MVP por escopo. O piloto é de um bairro só, e o título diz isso em vez de fingir cobertura.",
  "O SEED DE STAGING AINDA TEM AS MARCAS ANTIGAS. O fixture da Home passou a usar marcas fictícias; `supabase/seed.sql` não, porque banco está fora do escopo desta missão (§10). Em staging, portanto, a Home mostra 'Serra Alta' e a página do produto mostra a marca antiga. Alinhar exige reseed, que é decisão do Founder.",
];

/** Decisões funcionais que ganharam do desenho, com o motivo. */
const DECISOES = [
  "R3.3B — UMA ANATOMIA, DUAS COMPOSIÇÕES. Até aqui a lista usava o `AchadoCard`, um componente com título, preço e procedência próprios. Duas anatomias são duas chances de uma regra ser cumprida de um lado e esquecida do outro: foi assim que o histórico de preço sobreviveu na Home por uma onda inteira depois de sair do Card v2 (DL-030). A linha de lista agora chama a MESMA `montarVisaoDoCard` do destaque, e o `AchadoCard` deixou de existir.",
  "R3.3B — A LINHA INTEIRA VIROU O LINK. O botão 'Ver preços por mercado' repetido a cada 130 px deixava de ser ação e virava textura. O alvo não encolheu: cresceu para a linha toda, que passa de 88 px de altura.",
  "R3.3B — NADA TRUNCA NA LINHA DE PROCEDÊNCIA. A primeira versão truncava, e o resultado era 'válido até 10/0…' e 'validade…'. Truncar serve para texto que se repete; não serve para o dado que o card existe para carregar. A linha ocupa a largura inteira e quebra.",
  "R3.3B — A MONOESPAÇADA SAIU DO TEXTO CORRIDO. 'observado em 06/08/2026 · ontem' em mono não alinhava coluna nenhuma e emprestava ao card o ar de log de sistema. A regra é do próprio design system: mono só em dado tabular de fato.",
  "R3.3B — AS MARCAS DO FIXTURE VIRARAM FICTÍCIAS. Uma ilustração genérica ao lado do nome de uma marca existente representa a embalagem daquela marca, por mais genérico que seja o traço. O assessment da North Star V2 já tinha rejeitado marcas reais nas telas; esta rodada fechou a ponta do dado.",
  "O BOTÃO 'BUSCAR' DO CABEÇALHO SAIU. Com a busca na primeira dobra e 'Buscar' como aba, ele era a TERCEIRA forma de fazer a mesma coisa no mesmo viewport de 390 px. A aba fica porque está no polegar em todas as rotas; o campo fica porque é onde a busca acontece.",
  "'AJUDA' E 'MERCADOS' VIRARAM LINKS DE RODAPÉ, e por motivos diferentes. 'Mercados' era a `/para-mercados` — uma landing B2B — vestida de seção do app do consumidor. 'Ajuda' é consulta pontual, não jornada, e numa barra de quatro cada aba levava um quarto da largura e um quarto da atenção.",
  "O TÍTULO É 'ACHADOS', NÃO 'ACHADOS DE HOJE'. O fixture tem preços de ontem e de dois dias atrás, e o piloto vai ter dados mais velhos. 'De hoje' prometeria uma frescura que a linha de procedência de cada card desmente três linhas abaixo.",
  "HISTÓRICO DE PREÇO SAIU DO DADO, NÃO SÓ DA TELA. Sem P-01 decidida, não existe critério escrito de QUAL observação anterior conta — e um fixture que carrega o número mantém vivo o componente que o mostra.",
  "R3.3A — O CONSERTO SAIU JUNTO COM O PROBLEMA. Com o CTA fixo fora da Home, saiu também a máquina de anti-duplicação que existia por causa dele. Um mecanismo que nunca dispara é o que ninguém percebe estar quebrado. Ele continua inteiro em `/para-mercados`, onde a duplicação é real.",
  "R3.3A — AS TRÊS REGRAS DE CONFIANÇA FORAM PARA `/como-funciona`, inclusive A ORDEM NÃO É VENDIDA, que é o princípio de neutralidade declarado em público. A redução da Home só pôde acontecer depois de o texto existir do outro lado, e um teste amarra as duas pontas.",
  "OS DOIS `nav` TÊM NOMES DISTINTOS. Com o mesmo nome, os dois marcos ficam indistinguíveis na lista de regiões do leitor de tela. Foi a medição que pegou; a inspeção visual não pegaria.",
];

/** O que R3.3B NÃO entrega, dito para não ser lido como esquecimento. */
const FUTUROS = [
  "Tela de comparação do mesmo SKU entre mercados (R5/R6) — o núcleo do produto, e a razão de a busca ter subido.",
  "Detalhe completo da oferta, com a lista de preços por mercado (R5/R6).",
  "Contagem de mercados no rótulo do CTA — o card já sabe exibi-la; falta o dado.",
  "Fotografia real de produto — depende da política de revisão de imagem (R6). As ilustrações desta rodada são de categoria e existem só na demonstração.",
  "Personalização por mercado habitual na Home — POST-MVP, registrado em ROADMAP-MVP-v3 §4.",
  "Mecânica completa do WhatsApp — o convite continua sendo um link, e a resposta continua manual.",
  "Preço unitário na Home — depende de quantidade estruturada aprovada, e o backfill continua proibido.",
  "Histórico de preço e alerta de queda — bloqueado por P-01.",
  "Qualquer camada de parceiro ou conteúdo pago: quando existir, vive em seção separada e rotulada, e jamais reordena a lista orgânica.",
];

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

/** O commit que cada servidor está servindo, lido do worktree correspondente. */
function commitDe(url: string): string {
  const dir = url === DEPOIS ? process.cwd() : url === ANTES ? WORKTREE_ANTES : WORKTREE_R33A;
  return execFileSync("git", ["-C", dir, "rev-parse", "HEAD"]).toString().trim();
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
  v2: string;
  r33a: string;
  depois: string;
  abasAntes: MedidaAbas;
  abasDepois: MedidaAbas;
  shaAntes: string;
  shaR33a: string;
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
    .quatro { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 18px; align-items: start; }
    .col { background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 14px; }
    .col.entrega { border-color: #0e5c3c; border-width: 2px; }
    .col.ref { border-color: #c89a25; border-width: 2px; background: #fffdf6; }
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
    <h1>R3.3B — painel comparativo da Home para o Gate visual</h1>
    <p class="sub">Quatro áreas, mesma largura de celular (390&nbsp;px). <strong>A</strong> é a Home técnica anterior, renderizada agora a partir de <code>origin/main</code> num servidor paralelo — não é captura antiga guardada em disco. <strong>B</strong> é a referência visual aprovada, a tela 1 do North&nbsp;Star&nbsp;V2, em tamanho suficiente para comparação. <strong>C</strong> é a R3.3A, funcionalmente correta e reprovada na direção visual. <strong>D</strong> é a R3.3B. As três colunas de aplicação são páginas inteiras <strong>recortadas pelo topo na mesma escala</strong> — as versões completas estão nos PNGs de largura ao lado deste arquivo — e saíram do mesmo navegador, no mesmo instante, com animação congelada.</p>
    <div class="quatro">
      <div class="col">
        <p class="rot velho">A · Home técnica anterior (origin/main)</p>
        <p class="meta">${campos.shaAntes}</p>
        <img class="app" src="data:image/png;base64,${campos.antes}" alt="Home técnica anterior">
      </div>
      <div class="col ref">
        <p class="rot">B · Referência aprovada — North Star V2, tela 1</p>
        <p class="meta">docs/product/visual-north-star-v2/telas/tela-1-home.png</p>
        <img src="data:image/png;base64,${campos.v2}" alt="North Star V2, tela 1">
      </div>
      <div class="col">
        <p class="rot velho">C · R3.3A — contratos certos, direção visual reprovada</p>
        <p class="meta">${campos.shaR33a}</p>
        <img class="app" src="data:image/png;base64,${campos.r33a}" alt="Home de R3.3A">
      </div>
      <div class="col entrega">
        <p class="rot">D · R3.3B — final visual polish</p>
        <p class="meta">${campos.shaDepois}</p>
        <img class="app" src="data:image/png;base64,${campos.depois}" alt="Home entregue por R3.3B">
      </div>
    </div>

    <div class="abas">
      <h2>Navegação: de quatro abas para duas</h2>
      <div class="linha"><b>A · anterior (${campos.abasAntes.abas} abas)</b>${chips(campos.abasAntes, "#c9b98a")}</div>
      <div class="linha"><b>D · R3.3B (${campos.abasDepois.abas} abas)</b>${chips(campos.abasDepois, "#0e5c3c")}</div>
      <p class="rodape"><strong>Medido no DOM, não lido no código:</strong> a Home anterior tinha ${campos.abasAntes.navsComMesmoNome > 0 ? `<strong>${campos.abasAntes.navsComMesmoNome} par de landmarks de navegação com o MESMO nome acessível</strong> — “Navegação principal” duas vezes, indistinguíveis na lista de regiões do leitor de tela. A entregue tem ${campos.abasDepois.navsComMesmoNome}` : `${campos.abasAntes.navsComMesmoNome} nome de navegação repetido, e a entregue também ${campos.abasDepois.navsComMesmoNome}`}.</p>
      <p class="rodape">“Como funciona” e “Tenho um mercado” continuam alcançáveis, pelo rodapé. Aba não é o único jeito de chegar a uma página; é o jeito que declara “esta é uma das coisas principais que você faz aqui”. Achar e comparar preço são duas. Não há uma terceira.</p>
    </div>

    <div class="bloco"><h2>O que ficou mais bonito, mais simples e o que foi removido — de C para D</h2><ul>${lista(DE_C_PARA_D)}</ul></div>
    <div class="bloco"><h2>Onde a entrega segue o North Star V2</h2><ul>${lista(ALINHAMENTOS)}</ul></div>
    <div class="bloco"><h2>Decisões funcionais que prevaleceram sobre o desenho</h2><ul>${lista(DECISOES)}</ul></div>
    <div class="bloco alerta"><h2>Divergências em relação à referência</h2><ul>${lista(DIVERGENCIAS)}</ul></div>
    <div class="bloco futuro"><h2>Itens futuros — não entregues em R3.3B, e dito para não ser lido como esquecimento</h2><ul>${lista(FUTUROS)}</ul></div>

    <p class="rodape">Todo dado exibido é <strong>fictício e versionado</strong> (<code>src/lib/demo-opportunities.ts</code>): nenhum mercado real aparece como participante, nenhum preço vem de staging ou de produção, e a faixa “AMBIENTE DE TESTE” está no topo das três colunas de aplicação. Os estados da seção de Achados estão em <code>home-final-states.png</code>. As imagens de produto são <strong>ilustrações genéricas de categoria</strong>, criadas para a demonstração: não reproduzem embalagem, marca, logotipo ou trade dress de terceiro, e o texto alternativo de cada uma diz isso.</p>
  </body></html>`;
}

async function principal() {
  for (const base of [ANTES, R33A, DEPOIS]) {
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
    const pngR33a = await capturarPagina(s, { url: `${R33A}/`, ...opcoes });
    const abasR33a = await medir<MedidaAbas>(s, MEDIR_ABAS);
    const pngDepois = await capturarPagina(s, { url: `${DEPOIS}/`, ...opcoes });
    const abasDepois = await medir<MedidaAbas>(s, MEDIR_ABAS);

    console.log(
      `antes:  ${abasAntes.abas} abas — ${abasAntes.rotulos.join(", ")} · nav com nome repetido: ${abasAntes.navsComMesmoNome}`,
    );
    console.log(
      `r3.3a:  ${abasR33a.abas} abas — ${abasR33a.rotulos.join(", ")} · nav com nome repetido: ${abasR33a.navsComMesmoNome}`,
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
    if (abasR33a.abas !== 2) {
      throw new Error(`a coluna C tem ${abasR33a.abas} abas; R3.3A tem 2. Servidor errado?`);
    }
    if (abasDepois.abas !== 2) {
      throw new Error(`o "depois" tem ${abasDepois.abas} abas; R3.3B tem 2. Servidor errado?`);
    }
    // A coluna C precisa ser R3.3A, e não uma cópia da D. Se os dois servidores servirem o mesmo
    // head, o painel afirmaria "antes e depois" sobre duas fotos idênticas.
    if (pngR33a.equals(pngDepois)) {
      throw new Error(
        "as colunas C e D saíram idênticas — os dois servidores servem o mesmo head?",
      );
    }

    const html = montarHtml({
      antes: pngAntes.toString("base64"),
      v2: base64(join(process.cwd(), "docs/product/visual-north-star-v2/telas/tela-1-home.png")),
      r33a: pngR33a.toString("base64"),
      depois: pngDepois.toString("base64"),
      abasAntes,
      abasDepois,
      shaAntes: commitDe(ANTES),
      shaR33a: commitDe(R33A),
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
      // Quatro PNGs de página inteira como `data:` URI, e não três. O painel de R3.3A já morria
      // com 1,5 s; com uma coluna a mais, 6 s continua sendo o piso seguro.
      espera: 8000,
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
    writeFileSync(join(DESTINO, "home-final-comparison-board.png"), primeira);
    console.log(`\n==> home-final-comparison-board.png — ${largura}x${altura} px · reprodutível`);
  } finally {
    chrome.kill();
  }
}

await principal();
