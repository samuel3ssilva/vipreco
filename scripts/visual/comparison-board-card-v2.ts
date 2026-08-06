/**
 * R3.2 §14 — painel comparativo do Card v2: a referência atual ao lado do que foi entregue.
 *
 * =============================================================================
 * A REFERÊNCIA MUDOU EM 06/08/2026, E ELA É A CAUSA DE UM MAL-ENTENDIDO REAL
 * =============================================================================
 *
 * Até esta versão o painel punha o **North Star R3.0** na coluna da esquerda. Aquele mockup
 * mostra "Preço anterior: R$ 20,49" e uma queda percentual — porque é justamente o desenho
 * que está sendo criticado. Quem abriu o PNG leu a coluna da esquerda como se fosse o card
 * entregue, e concluiu que o Card v2 ainda exibia histórico de preço. Não exibia: as oito
 * variantes da direita nunca mostraram nenhum.
 *
 * A ordem foi invertida. A comparação principal agora é contra o **North Star V2**, a
 * referência atual (`docs/product/visual-north-star-v2/`), cuja classificação de roadmap
 * põe "histórico de preço e alertas de queda" em **fora do escopo atual**. O R3.0 continua
 * no painel, embaixo, rotulado como **histórico** e com o motivo escrito ao lado.
 *
 * Um painel cuja coluna de referência contradiz a entrega precisa dizer isso em texto, ou
 * vira exatamente a evidência que produz o alarme falso que ele deveria evitar.
 *
 * O painel carrega três coisas que uma montagem de imagens não carrega:
 *
 *   1. o RECORTE relevante das referências — a região dos cards, e não a tela inteira;
 *   2. as notas de alinhamento — onde a entrega segue a direção;
 *   3. as divergências e as decisões funcionais que prevaleceram sobre o mockup.
 *
 * As três vivem neste arquivo, versionadas. Mudar a lista de divergências passa a ser
 * mudar código revisável, e não reeditar um bitmap que envelhece separado do texto que o
 * explica.
 *
 * NENHUMA REFERÊNCIA É DEFORMADA: `object-fit: contain`, proporção livre. Uma direção
 * visual esticada mentiria sobre a própria direção.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { abrirChrome, capturarPagina, conectar, dimensoesDoPng, medir } from "./cdp";

const DESTINO = join(process.cwd(), "docs/evidence/visual/r32");
const PORTA = 9336;
const LARGURA = 1400;

/** Onde a entrega SEGUE a referência atual, o North Star V2. */
const ALINHAMENTOS = [
  "PRODUTO EXATO ANTES DO PREÇO, que é o primeiro dos seis princípios do V2. Nome, marca, variante e quantidade são campos separados acima do preço, e é o que torna 250 g distinguível de 500 g numa lista.",
  "NENHUMA PROMESSA ABSOLUTA. O card não diz 'melhor preço', não diz 'mais barato do bairro' e não diz 'perto de você'. Onde o V2 escreve 'menor preço observado', o card entrega a mesma disciplina: o CTA fala em comparar, e não em vencer.",
  "PROCEDÊNCIA COMO BLOCO. Fonte, atualização e validade aparecem juntas do preço em todos os oito estados, exatamente como o V2 pede na tela 3. Não existe card com preço e sem data.",
  "ESTADOS DE AUSÊNCIA COMO PARTE DO PRODUTO. O V2 desenha oito; o laboratório entrega oito variantes de primeira classe — sem imagem, sem validade, expirada, desatualizada, quantidade não confiável, promoção condicionada, contagem indisponível, preço a granel.",
  "UM CTA POR CARD, com alvo de 48 px em todas as larguras medidas, e foco no anel do sistema.",
  "A tipografia, a paleta e o ritmo de espaço saem inteiramente dos tokens aprovados em R3.1. Nenhum valor novo de cor, fonte ou espaçamento foi introduzido por este card.",
];

/** Onde a entrega SE AFASTA das referências, e por quê. */
const DIVERGENCIAS = [
  "A DIFERENÇA ENTRE MERCADOS AINDA NÃO APARECE, e a razão é estrutural. O V2 mostra 'R$ 0,50 abaixo da próxima oferta observada' — a distância para o SEGUNDO mercado da mesma comparação, medida no mesmo instante. R3.2 entrega o card ISOLADO no laboratório: ele recebe uma oferta, não um conjunto comparável, e portanto não tem de onde tirar o segundo preço. Ela entra com a comparação, em R5/R6, junto da regra do que fazer quando só existe um mercado. NÃO é histórico de preço e NÃO está bloqueada por P-01.",
  "LOGOTIPOS E FOTOS DE MARCA: o R3.0 mostra logotipos de rede e embalagens de marcas reais. O V2 já corrigiu isso, e o card segue o V2: identifica mercado por TEXTO e usa placeholder onde não há correspondência exata aprovada. A única imagem do laboratório é um desenho geométrico embutido, rotulado como demonstração.",
  "R$/kg EM TODO CARD: nos dois mockups o preço unitário aparece sempre. Aqui ele é CONDICIONAL e só aparece com quantidade estruturada e aprovada (`confirmed`). Como o backfill de quantidade continua proibido, num banco real ele estaria ausente na maioria dos cards — e ausente significa sumir, não virar traço.",
  "PROMOÇÃO: o R3.0 exibe o selo sem o requisito. O V2 já pede condição, total no caixa e preço efetivo juntos. O card entrega a condição por extenso, sempre junto do preço; total e efetivo são da tela de comparação, que R3.2 não implementa.",
  "BAIRRO E CIDADE: o R3.0 usa São Luís-MA. O V2 já usa Artemis, Piracicaba-SP. As ofertas deste laboratório são fictícias — 'Mercado Exemplo', 'Bairro Exemplo', 'Produto Demonstrativo' — e nenhuma delas vem de staging ou de produção.",
];

/**
 * O bloco que existe por causa de um mal-entendido, e que fica mesmo depois de resolvido.
 *
 * A confusão custou uma rodada de revisão. O texto abaixo é o que teria evitado, e o custo
 * dele no painel é de dez linhas.
 */
const HISTORICO = [
  "O CARD ENTREGUE NÃO EXIBE HISTÓRICO DE PREÇO. Nenhuma das oito variantes mostra preço anterior, queda percentual, economia acumulada ou comparação com data passada. Está provado por teste em `card-v2.test.ts` e em `laboratorio-card-v2.contract.test.ts`, que reprovam tanto o dado quanto a legenda.",
  "O QUE MOSTRA HISTÓRICO É O R3.0, LOGO ABAIXO. 'Preço anterior: R$ 20,49' e a queda percentual estão no mockup de 05/08/2026, que é a referência sendo criticada, e não a entrega. Numa comparação lado a lado isso se lê com facilidade ao contrário.",
  "O NORTH STAR V2 CONCORDA COM A REMOÇÃO. A classificação de impacto no roadmap do documento V2 põe 'histórico de preço e alertas de queda' na faixa FORA DO ESCOPO ATUAL. A remoção de DL-030 chegou à mesma conclusão por outro caminho: falta o contrato P-01, que define qual observação anterior conta.",
  "A DIFERENÇA QUE O V2 MOSTRA É OUTRA COISA. 'R$ 0,50 abaixo da próxima oferta observada' compara dois mercados no mesmo instante, dentro da mesma consulta que ordena a comparação. Não depende de P-01, não depende de `price_events`, e não foi o que DL-030 removeu.",
];

/** Decisões funcionais que ganharam do desenho, com o motivo. */
const DECISOES = [
  "O RÓTULO DE ESTADO VEM ANTES DO PREÇO. A ordem recomendada do mandato não posiciona o estado; ler 'R$ 8,90' e só depois descobrir que a oferta expirou é ler como vigente um preço que não é. O estado é condição de leitura do número.",
  "A VALIDADE SOBE PARA DENTRO DO BLOCO DE PROCEDÊNCIA, junto de fonte e data, em vez de ficar isolada na posição 7 da ordem. Fonte, data e validade são um bloco inseparável por contrato; separá-los para respeitar a numeração cumpriria a ordem e quebraria a regra que a ordem serve.",
  "'DESATUALIZADO' E 'EXPIRADA' SÃO ESTADOS DIFERENTES. Validade vencida é expiração; observação antiga sem validade nenhuma é desatualização. Usar a mesma palavra nos dois casos inventaria uma validade só para poder anunciar que ela venceu.",
  "NENHUMA VARIANTE PATROCINADA foi desenhada. Não há contrato normativo aprovado na main para conteúdo pago no card, e desenhá-lo agora decidiria o assunto pelo desenho. Conteúdo pago, quando existir, vive em seção separada e rotulada e jamais reordena a lista orgânica.",
  "O SELO DE ESTADO É SUAVE, E NÃO SÓLIDO. Um selo vermelho cheio dentro de um card de produto é o elemento de maior peso da composição — mais chamativo que o nome e que o preço —, e com a tarja temporal no topo o vermelho aparecia duas vezes antes de o leitor saber que produto é aquele. O par suave mede 5.34:1, e a oferta fora da lista orgânica continua distinguível por três canais independentes: rótulo escrito, preço atenuado e tarja.",
  "O CTA CONTINUA SENDO UM BOTÃO. A revisão especializada recomendou transformá-lo em link discreto na variante de lista, para economizar altura. Rejeitado: ele é a única ação do card e leva à comparação, que é o núcleo do produto. O que mudou foi o peso — superfície discreta em vez de caixa contornada, mesmo alvo de 48 px.",
];

const base64 = (caminho: string) => readFileSync(caminho).toString("base64");

function montarHtml(): string {
  const v2 = (arquivo: string) =>
    base64(join(process.cwd(), "docs/product/visual-north-star-v2/telas", arquivo));
  // As duas telas do V2 em que o CARD é o objeto: a Home, com o destaque e a lista de
  // achados, e a busca, com exatos e similares separados. As outras três do V2 (comparação,
  // detalhe e WhatsApp) são telas, e R3.2 não implementa tela nenhuma.
  const v2Home = v2("tela-1-home.png");
  const v2Busca = v2("tela-2-busca.png");
  const northStarR30 = base64(
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
    /* contain, nunca cover: nenhuma referência pode ser esticada nem recortada. */
    img { width: 100%; height: auto; object-fit: contain; display: block; border-radius: 6px; }
    .card { max-height: 1400px; object-fit: contain; }
    .telas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .bloco { margin-top: 22px; background: #fff; border: 1px solid #e2ded2; border-radius: 12px; padding: 18px 22px; }
    .bloco h2 { font-size: 15px; margin-bottom: 10px; }
    .bloco li { font-size: 13px; line-height: 1.6; color: #3c4c45; margin-left: 18px; margin-bottom: 9px; }
    .alerta { border-color: #b3311f; background: #fdf4f2; }
    .alerta h2 { color: #7a2214; }
    .historico { margin-top: 22px; background: #f4f2ea; border: 1px dashed #b9b3a1; border-radius: 12px; padding: 18px 22px; }
    .historico .rot { color: #5b6b63; }
    .historico p { font-size: 13px; line-height: 1.6; color: #5b6b63; max-width: 92ch; margin-bottom: 12px; }
    .historico img { max-height: 620px; }
    .rodape { margin-top: 18px; font-size: 12px; color: #5b6b63; line-height: 1.6; }
  </style></head><body>
    <h1>R3.2 — painel comparativo do Card v2 para o Gate visual</h1>
    <p class="sub">À esquerda, a <strong>referência atual</strong>: as duas telas do North&nbsp;Star&nbsp;V2 em que o card é o objeto. À direita, as oito variantes do Card v2 entregue, capturadas em navegador — cards consecutivos, que é como eles vão aparecer de verdade. As capturas a 320&nbsp;px e 390&nbsp;px estão em <code>docs/evidence/visual/r32/</code>.
    A comparação é de <strong>anatomia e linguagem visual</strong>: R3.2 entrega o card isolado, no laboratório. Nenhuma das cinco telas foi implementada, e a Home segue exatamente como estava.</p>
    <div class="par">
      <div class="col">
        <div class="rot">North Star V2 — referência atual (06/08/2026)</div>
        <div class="telas">
          <img src="data:image/png;base64,${v2Home}" alt="">
          <img src="data:image/png;base64,${v2Busca}" alt="">
        </div>
      </div>
      <div class="col"><div class="rot">Card v2 — as oito variantes em lista, render real</div><img class="card" src="data:image/png;base64,${card}" alt=""></div>
    </div>
    <div class="bloco alerta"><h2>Histórico de preço: onde ele aparece, e onde não aparece</h2><ul>${lista(HISTORICO)}</ul></div>
    <div class="bloco"><h2>Onde a entrega segue a referência atual</h2><ul>${lista(ALINHAMENTOS)}</ul></div>
    <div class="bloco"><h2>Divergências conhecidas</h2><ul>${lista(DIVERGENCIAS)}</ul></div>
    <div class="bloco"><h2>Decisões funcionais que prevaleceram sobre o mockup</h2><ul>${lista(DECISOES)}</ul></div>
    <div class="historico">
      <div class="rot">North Star R3.0 — histórico, não é a referência atual</div>
      <p>Aprovado em 05/08/2026 e <strong>substituído pelo V2</strong> um dia depois. Fica no painel porque é contra ele que as divergências acima foram escritas, e porque apagar a referência anterior apagaria o motivo de várias decisões. <strong>É este mockup que mostra "Preço anterior: R$ 20,49" e a queda percentual</strong> — e não o card entregue.</p>
      <img src="data:image/png;base64,${northStarR30}" alt="">
    </div>
    <p class="rodape">Nenhuma imagem contém dado real. As ofertas do laboratório são fictícias e versionadas; o conteúdo dos dois North Stars é ilustrativo e não é fonte de dado.</p>
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
    // Quatro: as duas telas do V2, a grade de variantes e o R3.0 histórico.
    const ESPERADAS = 4;
    if (medida.imagens !== ESPERADAS) {
      throw new Error(`o painel deveria ter ${ESPERADAS} imagens e tem ${medida.imagens}.`);
    }
    if (medida.carregadas !== ESPERADAS) {
      throw new Error(
        `${medida.carregadas} de ${ESPERADAS} imagens carregaram — as outras não renderizaram nada.`,
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
