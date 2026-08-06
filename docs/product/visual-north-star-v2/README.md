# North Star V2 — assets

**Estado em 06/08/2026: os binários chegaram.** O que este arquivo registrava até hoje de manhã
era a ausência deles; o que ele registra agora é a ficha de cada um, medida no arquivo recebido.

Origem: pacote `vipreco-north-star-v2-fable.zip`, exportado do Fable e enviado pelo Founder/PMO em
06/08/2026. SHA-256 do pacote: `c875d49ec6f4c5d5d2cf3d5954559f874fe1843a404a63eb955b36364fe7018e`,
3 489 401 bytes, 13 arquivos.

**Nada foi recomprimido, redimensionado ou reexportado.** Os arquivos versionados são idênticos
byte a byte aos recebidos, verificado por SHA-256 antes e depois da cópia.

---

## 1. Ficha dos arquivos versionados

### As cinco telas

Todas em 1206 × 2622 px, PNG, 72 dpi, sem perfil de cor embutido. O tamanho é o de um iPhone com
`@3x` (402 × 874 pt), e o quadro do aparelho faz parte da imagem: são exportações de tela
emolduradas, não recortes de conteúdo.

| Arquivo                       | Tela                | SHA-256    | Bytes   |
| ----------------------------- | ------------------- | ---------- | ------- |
| `telas/tela-1-home.png`       | Home / Achados      | `a6013d04` | 406 441 |
| `telas/tela-2-busca.png`      | Resultados da busca | `6d7aa573` | 380 239 |
| `telas/tela-3-comparacao.png` | Comparação          | `062bc9ed` | 361 609 |
| `telas/tela-4-detalhe.png`    | Detalhe da oferta   | `f79ed39d` | 346 046 |
| `telas/tela-5-whatsapp.png`   | WhatsApp contextual | `b22049a4` | 191 169 |

SHA-256 completos:

```
a6013d04704d55247be9ab226a7cfc04bf2e9565314a278082a1a7072a0badbc  telas/tela-1-home.png
6d7aa5735c76cd6e46cec9ddb23a8c7a638728f1b58fc39d909c491958316b89  telas/tela-2-busca.png
062bc9ed1a077324d8dd6d20f9088746b473de8501f830c950bc0b568ca6122f  telas/tela-3-comparacao.png
f79ed39db11bd4192d8b71aaacfd72aed48cffab788ede3efeac296efaf26eaa  telas/tela-4-detalhe.png
b22049a428b9eced5e368bfbb4bde4eb7d0a2411189775392c21295a3601608d  telas/tela-5-whatsapp.png
```

### Os dois documentos de origem

| Arquivo                     | Nome no pacote                   | SHA-256    | Bytes  |
| --------------------------- | -------------------------------- | ---------- | ------ |
| `fonte/north-star-v2.html`  | `ViPreco North Star v2.dc.html`  | `a356a665` | 62 218 |
| `fonte/mvp-assessment.html` | `ViPreco MVP Assessment.dc.html` | `f3f416ff` | 22 979 |

Os nomes foram passados para kebab-case; o conteúdo não mudou, e é o SHA-256 que prova isso:

```
a356a6650ea36686bd7f37a2b0e7b01bd48757c68b6f7c49bf53ab8ab2ab8897  fonte/north-star-v2.html
f3f416fffb6f1a386ea5a8323997a593ead4c84fc85e76cc5044aa4547f09edf  fonte/mvp-assessment.html
```

Os dois arquivos estão em [`.prettierignore`](../../../.prettierignore): um `bun run format` que
os reformatasse invalidaria os hashes acima e a ficha passaria a descrever arquivos que não
existem mais.

**O North Star V2 é o documento, não as cinco telas.** As telas são cinco das oito seções dele. O
que só existe no HTML: os **oito estados de ausência**, a tabela **antes/depois** contra o North
Star original, o **racional de design** tela a tela e a classificação de **impacto no roadmap** em
quatro faixas. Nada disso foi exportado como imagem.

### Como abrir os dois HTML

Os dois abrem no navegador com um duplo clique e leem-se bem sem nenhum arquivo extra: o layout é
CSS embutido. Duas ressalvas honestas:

- **`north-star-v2.html`** referencia `uploads/vipreco-mvp-north-star.png` na seção
  "Antes / Depois". Esse caminho não existe aqui de propósito, porque o arquivo é o North Star
  **original**, que já está versionado uma vez em [`../visual-north-star/`](../visual-north-star/).
  Versionar de novo seria 1,7 MB duplicado para a mesma imagem. Para ver a seção completa:

  ```bash
  mkdir -p /tmp/ns2/uploads
  cp fonte/north-star-v2.html /tmp/ns2/
  cp ../visual-north-star/vipreco-mvp-north-star.png /tmp/ns2/uploads/
  open /tmp/ns2/north-star-v2.html
  ```

- **`mvp-assessment.html`** usa um elemento customizado (`<doc-page>`) que precisa do
  `doc-page.js` do pacote do Fable para paginar. Sem ele o texto aparece inteiro, sem as quebras
  de página. Nenhum conteúdo se perde.

---

## 2. O que **não** foi versionado, e por quê

Cada item abaixo continua no pacote original, em `~/Downloads`. Nada foi descartado sem registro.

| Arquivo do pacote                    | SHA-256    | Bytes     | Por que fica fora                                                    |
| ------------------------------------ | ---------- | --------- | -------------------------------------------------------------------- |
| `uploads/vipreco-mvp-north-star.png` | `7b7a28b5` | 1 741 410 | **é o North Star original, byte a byte** — já versionado             |
| `ViPreco Redesign.dc.html`           | `dddbb469` | 48 198    | mockups com **marcas e redes reais** e prova social inventada        |
| `support.js`                         | `8fe7df74` | 69 150    | runtime da ferramenta, não é asset do produto                        |
| `doc-page.js`                        | `371bab66` | 37 185    | idem                                                                 |
| `ios-frame.jsx`                      | `24642b88` | 16 507    | idem                                                                 |
| `.thumbnail`                         | `96fd812f` | 5 745     | miniatura JPEG 640 × 465 da interface do Fable, sem conteúdo próprio |

### O North Star original não foi tocado, e há prova

O `uploads/vipreco-mvp-north-star.png` do pacote tem SHA-256
`7b7a28b5feeac4f23df770e6719e7492a8dc5298e42e23f5e104211b89cbb858`. O arquivo já versionado em
`../visual-north-star/vipreco-mvp-north-star.png` tem **o mesmo hash**. É o mesmo arquivo, e o
Fable o usou como referência dentro do documento do V2. Não havia o que substituir, e nada foi
substituído.

```bash
shasum -a 256 ../visual-north-star/vipreco-mvp-north-star.png
```

### O `Redesign` fica fora, e essa é uma decisão minha

**Este repositório é público.** O `ViPreco Redesign.dc.html` é o passo intermediário entre o
assessment e o North Star V2, e as telas dele mostram:

- **redes e marcas reais** — Bom Preço, Mix Mateus, Assaí Atacadista, Pilão, Tio João, Italac,
  Melitta, 3 Corações —, com uma delas exibindo o selo **"★ Parceiro Oficial"** do ViPreço;
- **prova social inventada**: "2.317 vizinhos do Jardim Atlântico já recebem";
- histórico de preço com percentual: "Você economiza R$ 2,50 (−12%)".

Publicar isso num repositório aberto é exibir supermercados reais rotulados como parceiros de um
produto que não está no ar, e um número de usuários que não existe. O próprio North Star V2
corrige as três coisas — a tabela "Antes / Depois" dele diz, na linha "Conteúdo": _"Sem risco
jurídico/reputacional; sem prova social inventada."_ Versionar o passo anterior desfaria a
correção no único lugar onde ela fica gravada para sempre, que é o histórico do Git.

**O documento não se perde:** ele está no pacote em `~/Downloads`, com o hash acima, e o que ele
propôs está integralmente resumido na tabela "Antes / Depois" do
[`north-star-v2.html`](./fonte/north-star-v2.html) e na §3 do
[`../NORTH-STAR-V2-ASSESSMENT.md`](../NORTH-STAR-V2-ASSESSMENT.md).

Se o Founder/PMO quiser o Redesign versionado assim mesmo, é um `cp` e um commit. É decisão dele,
e a decisão de deixar fora foi minha, tomada por causa da visibilidade do repositório.

---

## 3. O que estes assets **não** são

O mesmo que o North Star original não é, e pela mesma razão
([`../VISUAL-IMPLEMENTATION-CONTRACT.md`](../VISUAL-IMPLEMENTATION-CONTRACT.md) §1):

- **não são fonte de dado.** Nenhum preço, nome de mercado, bairro, data, validade, promoção ou
  confirmação que apareça neles pode ser tratado como real ou copiado para dentro do produto. O
  próprio documento marca isso com asterisco: _"Conteúdo ilustrativo para avaliação de layout"_;
- **não são contrato funcional.** Em qualquer conflito com `docs/product/`, `docs/data/` ou
  `docs/security/`, ganha o contrato;
- **não autorizam tela nenhuma.** O caminho para implementar uma tela continua sendo o da §4 do
  contrato visual: spec, inventário, contratos, testes, capturas, Gate.

O `mvp-assessment.html` tem um estatuto ainda mais fraco: ele é **entrada**, não decisão. É uma
revisão de UX externa, escrita antes do V2, e várias das recomendações dela foram **rejeitadas**
pelo próprio North Star V2 — prova social ("2.300 vizinhos de Artemis já recebem"), economia
contra preço anterior, sparkline de 30 dias, alerta de queda, e o selo "Parceiro oficial" com
presença mais rica para quem participa. Ler o assessment como plano de ação seria reinstalar
exatamente o que o V2 tirou.

---

## 4. O que o documento confirma sobre decisões abertas

Três coisas que já estavam decididas ficaram verificáveis com a chegada do documento, em vez de
apenas ditas:

**A barra inferior tem duas abas.** "Navegação com 2 abas · 1 CTA por tela" está na faixa
_"Necessária para o MVP"_ da classificação de roadmap, e a tabela antes/depois registra a troca de
cinco abas por duas. O app hoje mostra quatro (Achados, Buscar, Ajuda, Mercados). Pendência de
R3.3, e agora com fonte.

**Histórico de preço está fora do escopo atual.** A faixa 4 do documento, _"Fora do escopo
atual"_, lista literalmente "Histórico de preço e alertas de queda". É a mesma conclusão de
DL-030, que tirou o histórico do Card v2 por falta do contrato P-01 — só que por outro caminho.
A Home ainda exibe "antes R$ 29,90": mesma pendência de R3.3.

**A diferença que o V2 mostra não é histórica.** As telas dizem "R$ 0,50 abaixo da próxima oferta
observada": é a distância para o **segundo mercado da mesma comparação, no mesmo instante**, e não
para um preço passado. Essa não depende de P-01 nem de `price_events` — os dois preços já estão
na mesma consulta. É a substituta explícita de "economize", e o documento exige o universo
delimitado junto ("entre 3 mercados monitorados"). Ainda não está implementada, e não é o que
DL-030 removeu.

---

## Documentos relacionados

- [`../NORTH-STAR-V2-ASSESSMENT.md`](../NORTH-STAR-V2-ASSESSMENT.md) — a matriz elemento a
  elemento e as 17 decisões consolidadas
- [`../ROADMAP-MVP-V2.md`](../ROADMAP-MVP-V2.md) — as duas trilhas, B2C e B2B
- [`../VISUAL-IMPLEMENTATION-CONTRACT.md`](../VISUAL-IMPLEMENTATION-CONTRACT.md) — o que um north
  star autoriza e o que não autoriza
- [`../visual-north-star/`](../visual-north-star/) — o North Star **original**, intacto
