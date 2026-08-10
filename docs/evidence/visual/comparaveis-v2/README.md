# Demo V4 — Final Visual Simplification & Premium Polish — evidência visual

Capturas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px) contra o servidor de
desenvolvimento na branch `feat/demo-comparaveis-v2`, geradas por
`scripts/visual/comparaveis-v2.ts`. Fonte da verdade dos dados: a planilha
`Comparativo_Precos_Supermercados_09-08-2026.xlsx` do Founder. **A V4 não mudou um dado
sequer** — mesmos 24 grupos, 49 ofertas, 5 mercados, preços, fontes e datas da V3; o que
mudou é hierarquia, densidade e acabamento.

| Arquivo                              | O quê                                                            |
| ------------------------------------ | ---------------------------------------------------------------- |
| `home-390.png` / `home-390-dobra.png`| 1–2 · Home completa e primeira dobra (herói: Frango, R$ 7,99/kg) |
| `catalogo-390.png` / `-dobra.png`    | 3–4 · /buscar sem termo: o catálogo, 24 por categoria, clicável  |
| `busca-390.png`                      | Busca (`?q=cerveja` — 3 comparáveis)                             |
| `comparacao-frango-390.png`          | 5 · Golden flow A — Frango, peso variável, R$/kg protagonista    |
| `comparacao-dreamies-390.png`        | 6 · Golden flow B — Dreamies, embalagens diferentes              |
| `detalhe-390.png`                    | 7 · Detalhe — Frango inteiro no Safra                            |
| `whatsapp-390.png`                   | 8 · WhatsApp / retenção                                          |
| `v3-v4-compare-board.png`            | 9 · V3 \| V4 — primeira dobra de 5 telas, antes e depois         |
| `north-star-*-compare.png`           | 10 · NORTH STAR \| IMPLEMENTATION (Home, Busca, Comparação, Detalhe) |
| `comparable-products-demo-board.png` | A prancha final V4, com as notas de honestidade                  |
| `benchmark-lessons-board.png`        | 11 · Decisões adotadas/rejeitadas de cada benchmark              |
| `benchmark-diagnosis.md`             | Diagnóstico por dimensão + matriz KEEP/ADAPT/REJECT (V2/V3)      |
| `*-390-dobra.png`                    | Primeira dobra de cada tela (insumo das pranchas)                |

## O que a V4 mudou (10/08/2026 — Final Visual Simplification & Premium Polish)

- **Peso variável correto (§4, P0)** — o número grande passou a ser o **R$/kg observado**
  ("R$ 7,99/kg", unidade colada no número), em todas as superfícies; o valor para a
  quantidade escolhida virou **simulação nomeada** ("500 g ≈ R$ 4,00"), com o seletor
  rotulado "Simulação de quantidade" e a copy "Estimativa para 500 g. O valor final depende
  do peso." A V3 mostrava "R$ 4,00 · aprox. 500 g" grande — legível como "um frango inteiro
  pesa 500 g", que é a interpretação que o §4 mandou eliminar. Embalados não mudaram.
- **Primeira dobra da Home (§3, P0)** — o hero recompôs com a foto AO LADO do texto: a
  390 px a primeira dobra entrega marca + pill DEMO, busca, chips (linha única rolável),
  produto, R$ 7,99/kg, simulação, mercado com avatar, procedência e o CTA inteiro. Na V3 a
  foto 5:3 consumia a tela e o preço só aparecia na segunda dobra.
- **Catálogo clicável (§5/§6, P0)** — no catálogo e na busca o card inteiro é o link
  (chevron, ~3 produtos por dobra); o botão verde repetido 24× saiu. CTA sólido só no hero
  da Home e na ficha da oferta. "Comparar em N mercados" continua, como texto.
- **Ranking fora do logo (§8) e avatar 44 px (§7)** — o 1/2/3 mora numa coluna própria
  antes do avatar (`1 [logo] Safra`); quadro de logo uniforme de 44 px, fundo branco, borda
  discreta, padding interno — logo nunca encosta na borda. Monograma do Mota agora é **"M"**
  (palavra distintiva do nome), nunca "A" do tipo de loja; nenhuma marca foi inventada.
- **Menos ruído, mesma verdade (§9/§22/§23)** — nas linhas de lista a procedência encurtou
  para fonte + data curta ("Cartaz na loja · 09/08"; a forma completa, com relativo e ano,
  continua na ficha "Confiança da informação"); a diferença virou "R$ 1,00 a menos em
  500 g"; a faixa "AMBIENTE DE TESTE" virou a pill "DEMO" no header, com a frase completa
  em `title`/`sr-only` e o `noindex` técnico intacto (§16). O shell B2B mantém a faixa
  antiga — /para-mercados não foi tocado.
- **Frame único de imagem (§15)** — todo recorte/foto/placeholder compartilha raio, borda
  sutil e superfície; o placeholder usa o mesmo frame (§14) e segue fora de posição nobre.

## Image coverage report (§33) — 24 grupos, 28 SKUs

| Status | Qtde | Itens |
| ------ | ---- | ----- |
| **A** — imagem boa, IA fornecida pelo Founder (balcão sem marca, `alt` declara ilustração) | 4 | Frango inteiro, Bucho, Bisteca, Cebola |
| **A** — imagem boa, recorte do encarte/tabloide publicado pelo próprio mercado | 21 | Liza 900 ml, Farofa Yoki, Dolce Gusto, Lasanha Sadia, Tixan, Elseve 400 ml, Dreamies 80 g, Dreamies 40 g, Sanol 30 un, Linguiça toscana, Abóbora, Chuchu, Melão, Corona, Heineken, Original pack 12, Sempre Livre, Nivea, Rexona, Sanol eliminador 2 L, Pedigree 10,1 kg |
| **C** — placeholder deliberado (produto DE MARCA sem asset confiável; §13 proíbe gerar embalagem de marca) | 3 | Elseve 200 ml, Sanol 7 un, Original lata avulsa (Safra) |

Nenhum B (precisa crop), D (ruim) ou E (incorreta) restante: os crops problemáticos da V3
(Dreamies 40/80, linguiça, heineken, hortifruti) já haviam sido recortados de novo. Os 3
placeholders não ocupam hero, vitrine da Home nem primeira posição de comparação.

## A hierarquia do §2, medida nas telas

PRODUTO → PREÇO → MERCADO → COMPARAÇÃO → PROCEDÊNCIA. O número grande é **o que a placa
diz**: preço da embalagem no embalado; R$/kg observado no peso variável. O normalizado
(R$/kg, R$/L, R$/un) é derivado da quantidade estruturada pela mesma `computeUnitPrice` e
conferido ao centavo contra a planilha (duas exceções de empate de meio centavo,
documentadas nos testes: farofa no Safra 12,48 × 12,47; eliminador Sanol no Pague Menos
11,00 × 10,99). Fonte, data e validade permanecem em toda superfície — compactas nas
linhas, completas na ficha.

## Snapshot histórico (mantido)

Nenhuma data reancorada: oferta observada não some quando o encarte vence; a validade vira
"valeu até 09/08" (tempo verbal, nunca vigência), a tarja de urgência derivada do relógio
fica neutra na demo, e a nota única diz "Demonstração com preços observados em agosto de
2026". O caminho do piloto continua expirando pelo princípio 2 (`isValidPrice` + RLS,
intocados).

## Uma leitura que engana

- **A barra inferior fixa aparece no meio das capturas de página inteira** — artefato de
  `captureBeyondViewport` (`position: fixed` desenhada na posição do viewport). No
  aparelho ela fica colada embaixo.
- **Na prancha V3 \| V4, a coluna "catalogo/V3" é a página inteira** (a V3 não capturava a
  dobra do catálogo) — o formato de tira comprida é o registro fiel de como a tela era.

## Logos

`public/img/demo/mercados/` — recortados dos arquivos fornecidos pelo Founder (símbolo
quando a marca inteira não lê pequena: Savegnago oval, Safra carrinho, Pague Menos emblema;
Atacadão é o próprio símbolo). Açougue Mota não tem logo: monograma "M". Identificação,
nunca parceria — tamanho igual, nome sempre por extenso ao lado, ordem só pelo preço.
