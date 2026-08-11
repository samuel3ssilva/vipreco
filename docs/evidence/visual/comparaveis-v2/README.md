# Demo V4.3 — Final Self-Review + Live Staging Release — evidência visual

Capturas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px) contra o servidor de
desenvolvimento na branch `feat/demo-comparaveis-v2`, geradas por
`scripts/visual/comparaveis-v2.ts`. Fonte da verdade dos dados: a planilha
`Comparativo_Precos_Supermercados_09-08-2026.xlsx` do Founder. **Nenhuma rodada desde a
V4 mudou um dado sequer** — mesmos 24 grupos, 49 ofertas, 5 mercados, preços, fontes e
datas da V3. A V4 mudou hierarquia, densidade e acabamento; a V4.1 fechou a cobertura de
imagem (28/28 SKUs, zero placeholders) com as três fotos reais fornecidas pelo Founder;
a V4.3 fez o preço da Original dizer o desembolso mínimo real.

| Arquivo                               | O quê                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `home-390.png` / `home-390-dobra.png` | 1–2 · Home completa e primeira dobra (herói: Frango, R$ 7,99/kg)        |
| `catalogo-390.png` / `-dobra.png`     | 3–4 · /buscar sem termo: o catálogo, 24 por categoria, clicável         |
| `busca-390.png`                       | Busca (`?q=cerveja` — 3 comparáveis)                                    |
| `comparacao-frango-390.png`           | 5 · Golden flow A — Frango, peso variável, R$/kg protagonista           |
| `comparacao-dreamies-390.png`         | 6 · Golden flow B — Dreamies, embalagens diferentes                     |
| `detalhe-390.png`                     | 7 · Detalhe — Frango inteiro no Safra                                   |
| `whatsapp-390.png`                    | 8 · WhatsApp / retenção                                                 |
| `comparacao-elseve-390.png`           | V4.1 · Elseve — a foto real do 200 ml na comparação                     |
| `comparacao-sanol-390.png`            | V4.1 · Sanol Dog — a foto real do 7 un na comparação                    |
| `ficha-original-390.png`              | V4.1 · Ficha da Original lata 350 ml com a foto real                    |
| `comparacao-original-390.png`         | V4.3 · Comparação da Original — R$ 45,48 (pack 12) × R$ 47,88           |
| `fonte-original-safra-tile.png`       | V4.3 · A FONTE do §1: tile do tabloide Safra, "(venda somente no pack)" |
| `v42-v43-compare-board.png`           | V4.3 · V4.2 \| V4.3 — só as telas alteradas, página inteira             |
| `v3-v4-compare-board.png`             | 9 · V3 \| V4 — primeira dobra de 5 telas, antes e depois                |
| `north-star-*-compare.png`            | 10 · NORTH STAR \| IMPLEMENTATION (Home, Busca, Comparação, Detalhe)    |
| `comparable-products-demo-board.png`  | A prancha final V4, com as notas de honestidade                         |
| `benchmark-lessons-board.png`         | 11 · Decisões adotadas/rejeitadas de cada benchmark                     |
| `benchmark-diagnosis.md`              | Diagnóstico por dimensão + matriz KEEP/ADAPT/REJECT (V2/V3)             |
| `*-390-dobra.png`                     | Primeira dobra de cada tela (insumo das pranchas)                       |

## O que o Final Self-Review mudou (10/08/2026 — antes do release em staging)

Três revisores independentes (sem o contexto da implementação) revisaram as 12 telas
renderizadas do head contra o North Star e as lições de benchmark; cada achado foi
verificado no DOM/app real antes de virar correção, e um quarto revisor confirmou cada
correção na tela recapturada (7/7 PASSOU, 0 FALHOU).

- **Pack obrigatório na identidade (P0)** — o card rank 1 da Original dizia "350 ml" ao
  lado de R$ 45,48 (uma lata a preço de doze); agora a quantidade exibida diz o que se
  COMPRA: **"pack 12 × 350 ml"**, na comparação e na ficha (`card-v2.ts`, com teste de
  contrato). O rank 2 segue "4,2 L" — cada linha carrega o próprio SKU.
- **Formato unitário unificado na ficha (P1)** — "R$ 3,79/lata" e "R$ 10,83 **por** L" a
  duas linhas de distância viraram o mesmo formato compacto ("/L"), o da comparação.
- **Separador de data sem linha órfã (P1)** — quando a linha de procedência quebra, o "·"
  fecha a primeira linha ("09/08 ·") em vez de abrir a segunda.
- **Títulos do catálogo em até 3 linhas (P1)** — "…Dolce Gusto…" e "…Sempre Livre 32…"
  truncavam exatamente a variante/contagem que identifica o SKU; agora aparecem inteiros.
- **Sete fundos de asset clareados para branco (P1)** — pack Original (teal), Elseve 400
  (azul), Corona e Heineken (teal), Liza (amarelo), Lasanha (rosa), Tixan (roxo): flood
  fill a partir das bordas, produto intocado, unificando os tiles dentro de cada lista.
- **Pipeline de evidência consertado de verdade (P1)** — `CARREGAR_IMAGENS` existia mas
  nunca era chamada; agora toda captura espera o decode (com teto de 8 s) e o viewport
  cresce até a altura real da página antes do screenshot — header/nav `fixed` pintam no
  topo/rodapé em vez de fatiar o meio da página, e imagens lazy não saem como tile branco.
- **Falsos positivos derrubados com evidência** — "R$ 19.95 com ponto" (o DOM mostra
  vírgula), "R$4,99 colado" (há espaço em todo preço), "12 tiles brancos no catálogo"
  (artefato da captura; o app real renderiza as 24 imagens).
- **Por design, não defeito** — ofertas "valeu até 09/08" ranqueadas: é o snapshot
  histórico declarado (§18; banner "Importante" + nota de demonstração em toda
  comparação); falsificar `valid_until` é proibido. Mercados reais com logos: decisão do
  Founder (a planilha é a coleta real dele; DL-040). Montagens multi-unidade do encarte
  (Dreamies, Heineken, Sanol 30, Nivea/Rexona variedades, Eliminador Sanol fragrâncias):
  arte da própria fonte com o SKU/oferta correto — isolar uma unidade exigiria edição
  que a política proíbe.
- **P2 residual documentado** — fundos de encarte remanescentes em 3 tiles do catálogo
  (Sempre Livre azul-degradê, Linguiça creme, Farofa bege — o clareamento comeria o
  produto) e o trio hortifruti em verde (conjunto intencional); numeral de ranking sem
  badge circular; "Menor preço observado" × "Melhor custo observado" (semânticas
  distintas e deliberadas); três rótulos de CTA de WhatsApp; datas com verbosidade
  diferente por superfície (curta na comparação, completa na ficha — deliberado).

## O que a V4.3 mudou (10/08/2026 — Final Micro-Remediation)

- **Verdade do preço da Original (§1, P0)** — a fonte foi reverificada na arte: o tabloide
  do Safra (verso, 06–12/08) anuncia "Cerveja Original lata 350ml pack com 12 unid.
  **(venda somente no pack)**", de R$ 4,29 por **R$ 3,79 UNID.**, e a planilha registra
  "preco por unidade, venda so no pack". Cenário B confirmado: não existe compra de uma
  lata. O protagonista virou o **desembolso mínimo real — R$ 45,48** (12 × 3,79,
  arredondamento monetário determinístico ao centavo), rotulado "pack 12", em busca,
  comparação, ficha e no texto de compartilhamento; "R$ 3,79/lata" e "R$ 10,83/L"
  continuam, secundários. O preço-fonte (3,79) não mudou. O pack é campo **declarado**
  (`pack_obrigatorio`, ignorado sem `unidade_de_venda`), nunca inferido do texto da
  condição; testes de contrato garantem que preço e condição não voltam a se contradizer
  e que o por-lata permanece derivado e secundário.
- **Original "cortada" na busca (§2)** — o defeito estava na **evidência**, não na tela:
  no app real a lata sempre rendeu inteira (asset 569² quadrado, frame quadrado,
  `object-cover`, medido ao vivo de 320 a 430 px). O PNG da V4.2 foi capturado antes de a
  imagem `loading="lazy"` abaixo da dobra terminar de decodificar — só as primeiras
  linhas do JPEG (o aro da lata) tinham sido pintadas. O pipeline de captura agora força
  eager e espera `decode()` de **toda** imagem antes do screenshot (`cdp.ts`), regra
  geral para qualquer tela.
- **Corona Extra (§3): ASSET SOURCE LIMITATION — ACCEPTED FOR DEMO** — ver a seção de
  dependências abaixo.
- **Sanol e Elseve reconferidos (§4)** — sem mudança: Sanol 1º Atacadão R$ 69,90/30 un
  (R$ 2,33/un, selo "Melhor custo/un") × 2º Pague Menos R$ 22,99/7 un (R$ 3,28/un);
  Elseve 1º Savegnago 400 ml R$ 25,90 (R$ 64,75/L, selo "Melhor custo/L") × 2º Safra
  200 ml R$ 16,99 (R$ 84,95/L). Package price grande, unitário secundário, nas duas.

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

- **Corona Extra lata 350 ml — ASSET SOURCE LIMITATION, ACCEPTED FOR DEMO (V4.3 §3).**
  Revisada uma última vez em alta resolução: nenhuma fonte legítima contém a lata inteira
  e limpa — no Savegnago a Extra está parcialmente atrás da Corona **Cero** (variante
  errada, não pode representá-la); no Atacadão a lata está inteira em largura, mas o selo
  "-18" carimba o ombro esquerdo (sobre o "C" de "Corona") e o balão do título cobre a
  base. Completar com IA é proibido (§13/princípio 11) — o asset atual (parcial, texto
  removido na V4.1) fica aceito para a demo; um asset novo do Founder substitui quando
  existir.
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

| Status                                                                                     | Qtde | Itens                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A** — imagem boa, IA fornecida pelo Founder (balcão sem marca, `alt` declara ilustração) | 4    | Frango inteiro, Bucho, Bisteca, Cebola                                                                                                                                                                                                                                   |
| **A** — imagem boa, recorte do encarte/tabloide publicado pelo próprio mercado             | 21   | Liza 900 ml, Farofa Yoki, Dolce Gusto, Lasanha Sadia, Tixan, Elseve 400 ml, Dreamies 80 g, Dreamies 40 g, Sanol 30 un, Linguiça toscana, Abóbora, Chuchu, Melão, Corona, Heineken, Original pack 12, Sempre Livre, Nivea, Rexona, Sanol eliminador 2 L, Pedigree 10,1 kg |
| **A** — foto real da embalagem fornecida pelo Founder (V4.1 §A; `alt` "— foto do produto") | 3    | Elseve Collagen Lifter 200 ml, Sanol Dog 7 un, Original lata 350 ml (Safra)                                                                                                                                                                                              |

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
