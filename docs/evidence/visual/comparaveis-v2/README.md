# Comparable Products Demo V3 — Final Productization Pass — evidência visual

Capturas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px) contra o servidor de
desenvolvimento na branch `feat/demo-comparaveis-v2`, geradas por
`scripts/visual/comparaveis-v2.ts`. Fonte da verdade dos dados: a planilha
`Comparativo_Precos_Supermercados_09-08-2026.xlsx` do Founder (abas Comparativo Geral,
Detalhe por item e Conferência 2 fontes), auditada antes de qualquer linha de código.

| Arquivo                              | O quê                                                            |
| ------------------------------------ | ---------------------------------------------------------------- |
| `home-390.png`                       | 1 · Home / Achados (herói: Frango inteiro; vitrine de 10)         |
| `busca-390.png`                      | 2 · Busca (`?q=cerveja` — 3 comparáveis)                          |
| `catalogo-390.png`                   | V3 §3 — /buscar sem termo: o catálogo completo, 24 por categoria  |
| `comparacao-frango-390.png`          | 3a · Golden flow A — Frango, peso variável, logos + diferença     |
| `comparacao-dreamies-390.png`        | 3b · Golden flow B — Dreamies, embalagens diferentes              |
| `detalhe-390.png`                    | 4 · Detalhe — Frango inteiro no Safra                             |
| `whatsapp-390.png`                   | 5 · WhatsApp / retenção                                           |
| `north-star-*-compare.png`           | NORTH STAR \| IMPLEMENTATION (Home, Busca, Comparação, Detalhe)   |
| `comparable-products-demo-board.png` | A prancha final V3, com as notas de honestidade                   |
| `benchmark-lessons-board.png`        | Decisões adotadas/rejeitadas de cada benchmark (sem copiar UI)    |
| `benchmark-diagnosis.md`             | Diagnóstico por dimensão + matriz KEEP/ADAPT/REJECT               |
| `*-390-dobra.png`                    | Primeira dobra de cada tela (insumo das pranchas)                 |

## O que a V3 mudou (10/08/2026 — Final Productization Pass)

- **Volume real (§3)** — de 12 para **24 grupos comparáveis**: todos os que a planilha
  classifica como Tipo "Igual" com confiança Alta. Critério de corte documentado no
  `demo-catalog.ts`: os sachês Dog Chow e Friskies (também "Igual") ficaram fora porque a
  gramatura do sachê não está confirmada nos dois mercados — princípio 1. "Similar" nunca
  entra. São 49 ofertas, todas com preço, clube, condição, fonte e período da planilha,
  normalizados conferidos ao centavo (segunda exceção de meio centavo documentada:
  eliminador Sanol no Pague Menos, 11,00 × 10,99).
- **Logos dos mercados (§2)** — fornecidos pelo Founder, processados para avatares
  quadrados uniformes (`public/img/demo/mercados/`); `MarketAvatar` com selo de posição no
  canto (comparação) e monograma para o Açougue Mota. Aplicados na comparação, no detalhe,
  nos cards da Home e da busca. Identificação, nunca parceria: tamanho igual para todos,
  nome sempre por extenso ao lado, ordem continua sendo só o preço.
- **Zero sobreposição (§1)** — o bug "Pague Menos × R$ 149,75" da V2 foi corrigido na
  estrutura (a linha nome × preço quebra com o preço descendo alinhado à direita; rótulo
  unitário curto "R$ 98,75/kg" na linha do ranking). O QA mede colisão por retângulo de
  TEXTO — que pega palavra única vazando o container, o caso "Savegnago" — em
  320/360/390/430 × 11 rotas: 44 combinações, zero overflow, zero colisão.
- **Herói editorial (§4)** — Frango inteiro no lugar do bucho: universal, comparação real
  de 25% (R$ 7,99 × 9,99/kg), imagem clara, peso variável. O bucho foi revisado (§5) e
  segue na vitrine com a foto correta, pelo Mota. A vitrine subiu para 10 cards em 8
  categorias, com a porta "Ver o catálogo completo — 24 produtos" logo abaixo.
- **Busca como catálogo (§7)** — /buscar sem termo lista os 24 grupos por categoria (só em
  modo demo); atalhos viraram Carnes · Hortifruti · Cerveja · Higiene · Pet, todos com
  resultado garantido por teste; "cerveja" devolve 3 comparações.
- **Condição na linha** — "preço por lata, venda só no pack de 12" aparece na própria
  linha da comparação da Cerveja Original, não só na ficha.

## A hierarquia do §0, medida nas telas

O número grande é **quanto se paga**: o preço da embalagem, ou o calculado para a
quantidade escolhida no peso variável (250 g / 500 g / 1 kg, padrão 500 g, sempre
"aprox."). O normalizado — R$/kg, R$/L, R$/un — fica logo abaixo, menor, **derivado** da
quantidade estruturada pela mesma `computeUnitPrice` de sempre e conferido ao centavo
contra a planilha (duas exceções de empate de meio centavo, documentadas nos testes:
farofa no Safra 12,48 × 12,47; eliminador Sanol no Pague Menos 11,00 × 10,99).

## Snapshot histórico (§18 do polish anterior — mantido)

Nenhuma data reancorada: oferta observada não some quando o encarte vence; a validade vira
"valeu até 09/08/2026" (tempo verbal, nunca vigência), a tarja de urgência derivada do
relógio fica neutra na demo, e a nota única diz "Demonstração com preços observados em
agosto de 2026". O caminho do piloto continua expirando pelo princípio 2 (`isValidPrice` +
RLS, intocados).

## Uma leitura que engana

- **A barra inferior fixa aparece no meio das capturas de página inteira** — artefato de
  `captureBeyondViewport` (`position: fixed` desenhada na posição do viewport). No
  aparelho ela fica colada embaixo.

## Imagens

- **IA fornecida pelo Founder** só nos itens de balcão sem marca (frango inteiro, bucho,
  bisteca, cebola), com `alt` que declara ilustração e IA.
- **Recorte de encarte/tabloide fornecido** para os demais — a arte que o próprio mercado
  publicou (Savegnago, Atacadão, Pague Menos em PDF vetorial), nunca embalagem gerada
  (§10). Os 12 grupos novos entraram todos por recorte de encarte, hortifruti incluído.
- **Placeholder deliberado** em Elseve 200 ml, Sanol 7 un e na lata avulsa de Original do
  Safra (só existe foto de tabloide impresso, sem qualidade de recorte), fora de posição
  nobre. Imagem errada é pior que nenhuma.
- **Logos** em `public/img/demo/mercados/` — recortados dos arquivos fornecidos pelo
  Founder (símbolo quando a marca inteira não lê a 40 px: Savegnago oval, Safra carrinho,
  Pague Menos emblema; Atacadão é o próprio símbolo). Açougue Mota não tem logo: monograma.
