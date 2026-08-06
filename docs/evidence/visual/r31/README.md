# R3.1A — evidência visual da fundação

Screenshots do laboratório visual (`/laboratorio-visual`), gerados em navegador de verdade
por `scripts/visual/screenshot.ts`, contra o servidor de desenvolvimento local.

| Arquivo                 | Viewport CSS | PNG (DPR 2)  |
| ----------------------- | ------------ | ------------ |
| `screenshot-320.png`    | 320 px       | 640 × 15848  |
| `screenshot-390.png`    | 390 px       | 780 × 14716  |
| `screenshot-desktop.png`| 1280 px      | 2560 × 10498 |

Para regerar:

```bash
bun run dev
bun scripts/visual/screenshot.ts
```

## O que estas imagens provam

- **A tipografia de marca renderiza** — Bricolage Grotesque nos títulos, Public Sans no
  corpo, IBM Plex Mono nos nomes de token e nos preços. Sem fallback de sistema, e sem
  nenhuma chamada de rede: as três famílias são servidas pelo próprio build desde R3.1A.
- **O preço aparece no peso que o produto usa** (700). Antes esta amostra herdava 400 —
  e como a face 400 não é carregada, ela caía na 500. O laboratório mostrava um preço que
  a comparação nunca desenha.
- **O estado desabilitado consome `--vp-action-disabled`.** Os dois botões "Desabilitado"
  na seção 4 saem em `#c9d6cf`, medido no navegador como `rgb(201, 214, 207)`, com
  `opacity: 1` — e não mais desbotados por `opacity: 0.6`.
- **Nada estoura horizontalmente** em nenhum dos três tamanhos.

## Uma armadilha que quase virou evidência falsa

A primeira versão deste script usava `chrome --headless --screenshot --window-size`. O PNG
de 390 px saiu com o título cortado no meio da palavra e a segunda coluna da paleta
atravessando a borda direita — o retrato de uma página que estoura horizontalmente.

A página **não** estoura. Medido no navegador, nos três tamanhos:

```
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Os únicos elementos que passam da borda são as células da tabela de contraste, cujo pai tem
`overflow-x: auto` — que é justamente o padrão correto para conteúdo largo.

O que acontecia é que `--window-size` dimensiona a **janela**, não o viewport de layout: o
headless diagramava numa largura maior e recortava o PNG na largura pedida. A correção foi
falar CDP direto (`Emulation.setDeviceMetricsOverride`), que dimensiona o viewport de
verdade, mais uma checagem que lê a largura no cabeçalho IHDR do próprio PNG e falha se ela
não for a esperada — para que um recorte silencioso não volte a passar por evidência.

Fica registrado porque o erro era convincente: uma imagem cortada não parece um defeito de
ferramenta, parece um defeito do produto.

## Limite desta evidência

O script depende do Chrome instalado na máquina de quem roda. **Não é reproduzível em CI
hoje**, e portanto não é gate — é evidência para revisão humana. Um gate que depende do que
existe na máquina de alguém não é gate. Se um dia virar gate, aí sim vale a dependência
versionada de navegador.

Nenhuma das imagens contém dado real: o laboratório usa rótulos abstratos, `R$ 00,00` e
nomes de token. Não há mercado, produto, preço ou oferta.
