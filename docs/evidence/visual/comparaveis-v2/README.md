# Demo V4.2 — Last-Mile Consumer Polish — evidência visual

Capturas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px) contra o servidor de
desenvolvimento na branch `feat/demo-comparaveis-v2`, geradas por
`scripts/visual/comparaveis-v2.ts`. Fonte da verdade dos dados: a planilha
`Comparativo_Precos_Supermercados_09-08-2026.xlsx` do Founder. **Nem a V4 nem a V4.1
mudaram um dado sequer** — mesmos 24 grupos, 49 ofertas, 5 mercados, preços, fontes e
datas da V3. A V4 mudou hierarquia, densidade e acabamento; a V4.1 fechou a cobertura de
imagem (28/28 SKUs, zero placeholders) com as três fotos reais fornecidas pelo Founder.

| Arquivo                              | O quê                                                            |
| ------------------------------------ | ---------------------------------------------------------------- |
| `home-390.png` / `home-390-dobra.png`| 1–2 · Home completa e primeira dobra (herói: Frango, R$ 7,99/kg) |
| `catalogo-390.png` / `-dobra.png`    | 3–4 · /buscar sem termo: o catálogo, 24 por categoria, clicável  |
| `busca-390.png`                      | Busca (`?q=cerveja` — 3 comparáveis)                             |
| `comparacao-frango-390.png`          | 5 · Golden flow A — Frango, peso variável, R$/kg protagonista    |
| `comparacao-dreamies-390.png`        | 6 · Golden flow B — Dreamies, embalagens diferentes              |
| `detalhe-390.png`                    | 7 · Detalhe — Frango inteiro no Safra                            |
| `whatsapp-390.png`                   | 8 · WhatsApp / retenção                                          |
| `comparacao-elseve-390.png`          | V4.1 · Elseve — a foto real do 200 ml na comparação              |
| `comparacao-sanol-390.png`           | V4.1 · Sanol Dog — a foto real do 7 un na comparação             |
| `ficha-original-390.png`             | V4.1 · Ficha da Original lata 350 ml com a foto real             |
| `v3-v4-compare-board.png`            | 9 · V3 \| V4 — primeira dobra de 5 telas, antes e depois         |
| `north-star-*-compare.png`           | 10 · NORTH STAR \| IMPLEMENTATION (Home, Busca, Comparação, Detalhe) |
| `comparable-products-demo-board.png` | A prancha final V4, com as notas de honestidade                  |
| `benchmark-lessons-board.png`        | 11 · Decisões adotadas/rejeitadas de cada benchmark              |
| `benchmark-diagnosis.md`             | Diagnóstico por dimensão + matriz KEEP/ADAPT/REJECT (V2/V3)      |
| `*-390-dobra.png`                    | Primeira dobra de cada tela (insumo das pranchas)                |

## O que a V4.2 mudou (10/08/2026 — Last-Mile Consumer Polish)

- **Preço da Original inequívoco (§4)** — "R$ 3,79**/lata**" em toda superfície (busca,
  comparação, ficha), via campo declarado `unidade_de_venda` (nunca inferido); a condição
  encurtou para "Venda somente no pack de 12." e o prefixo "Condição desta oferta." saiu.
  R$ 10,83/L segue como normalização secundária. Nenhum dado mudou de valor.
- **Zero repetição de identidade (§5)** — regra visual genérica (`formatProductDetails` +
  o mesmo princípio no Card v2): o que o título já disse não aparece na linha de apoio.
  "Cerveja Original lata 350 ml" + "lata 350 ml" acabou; informação que o título não
  carrega continua aparecendo.
- **Metadata sem quebra feia (§6)** — "09/08" e "· valeu até 09/08" são segmentos
  indivisíveis; a quebra só acontece no separador.
- **Presença óptica (§1)** — os 3 assets reais recompostos com respiro 8%→4% por lado;
  **Elseve 400 re-recortado do PDF original em alta resolução** (garrafa completa em
  largura e fundo, "400 ml" legível — antes o crop cortava topo E fundo em 354 px).

### Founder dependencies (declaradas, não escondidas)

- **NEEDS FOUNDER ASSET — Corona Extra lata 350 ml.** Nenhuma fonte legítima contém a
  lata inteira e limpa: no Savegnago a Extra está parcialmente atrás da Corona **Cero**
  (variante errada, não pode representá-la); no Atacadão a lata está inteira mas o selo
  "-18" carimba o topo. Completar com IA é proibido (§13/princípio 11) — o asset atual
  (meia lata, texto removido na V4.1) permanece até material novo.
- **NEEDS FOUNDER ASSET — Elseve Collagen Lifter 400 ml (tampa).** No único material com
  a garrafa (Savegnago p4), os dígitos do preço impresso cobrem a tampa. O re-recorte da
  V4.2 entrega o máximo que a fonte permite; a tampa só vem com material novo.

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

## Image coverage report (V4.1) — 24 grupos, 28 SKUs, **28/28 com asset legítimo**

| Status | Qtde | Itens |
| ------ | ---- | ----- |
| **A** — imagem boa, IA fornecida pelo Founder (balcão sem marca, `alt` declara ilustração) | 4 | Frango inteiro, Bucho, Bisteca, Cebola |
| **A** — imagem boa, recorte do encarte/tabloide publicado pelo próprio mercado | 21 | Liza 900 ml, Farofa Yoki, Dolce Gusto, Lasanha Sadia, Tixan, Elseve 400 ml, Dreamies 80 g, Dreamies 40 g, Sanol 30 un, Linguiça toscana, Abóbora, Chuchu, Melão, Corona, Heineken, Original pack 12, Sempre Livre, Nivea, Rexona, Sanol eliminador 2 L, Pedigree 10,1 kg |
| **A** — foto real da embalagem fornecida pelo Founder (V4.1 §A; `alt` "— foto do produto") | 3 | Elseve Collagen Lifter 200 ml, Sanol Dog 7 un, Original lata 350 ml (Safra) |

**Zero placeholders de produto.** Os três SKUs que seguravam placeholder deliberado desde a
V2 receberam na V4.1 a fotografia da embalagem real — recortada pelo produto, centrada num
quadrado com o próprio fundo (#f9f9f9) e ~8% de respiro, no mesmo frame dos demais. Nada
foi gerado por IA, nada foi aproximado, nada foi baixado por conta própria. Na mesma rodada
o recorte da Corona perdeu o resto de texto do encarte ("KŞ") e foi recentrado — mesma
arte, mesma origem. O placeholder continua existindo apenas para o produto-GRUPO das
comparações de embalagens diferentes (um grupo não tem uma embalagem), e nunca em posição
nobre — no catálogo e na busca o card do grupo herda a foto da oferta mais barata.

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
