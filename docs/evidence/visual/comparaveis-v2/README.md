# Comparable Products Demo v2 — evidência visual

Capturas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px) contra o servidor de
desenvolvimento na branch `feat/demo-comparaveis-v2`, geradas por
`scripts/visual/comparaveis-v2.ts`. Fonte da verdade dos dados: a planilha
`Comparativo_Precos_Supermercados_09-08-2026.xlsx` do Founder (abas Comparativo Geral,
Detalhe por item e Conferência 2 fontes), auditada antes de qualquer linha de código.

| Arquivo                                | O quê                                                 |
| -------------------------------------- | ----------------------------------------------------- |
| `home-390.png`                         | 1 · Home / Achados (herói: Bucho bovino, Açougue Mota) |
| `busca-390.png`                        | 2 · Busca (`?q=frango`)                                |
| `comparacao-mota-390.png`              | 3a · Golden flow A — Bucho, peso variável              |
| `comparacao-dreamies-390.png`          | 3b · Golden flow B — Dreamies, embalagens diferentes   |
| `detalhe-390.png`                      | 4 · Detalhe — Bucho no Açougue Mota                    |
| `whatsapp-390.png`                     | 5 · WhatsApp / retenção                                |
| `north-star-*-compare.png`             | NORTH STAR \| IMPLEMENTATION (Home, Busca, Comparação, Detalhe) |
| `comparable-products-demo-board.png`   | A prancha final do §20, com as notas de honestidade    |
| `*-390-dobra.png`                      | Primeira dobra de cada tela (insumo das pranchas)      |

## A hierarquia do §0, medida nas telas

O número grande é **quanto se paga**: o preço da embalagem, ou o calculado para a
quantidade escolhida no peso variável (250 g / 500 g / 1 kg, padrão 500 g, sempre
"aprox."). O normalizado — R$/kg, R$/L, R$/un — fica logo abaixo, menor, **derivado** da
quantidade estruturada pela mesma `computeUnitPrice` de sempre e conferido ao centavo
contra a planilha (exceção única e documentada: farofa no Safra, 12,48 × 12,47, empate de
meio centavo de arredondamento).

## Duas leituras que enganam

- **A barra inferior fixa aparece no meio das capturas de página inteira** — artefato de
  `captureBeyondViewport` (`position: fixed` desenhada na posição do viewport). No
  aparelho ela fica colada embaixo.
- **"válido até 09/08/2026" nas ofertas de encarte é a validade real do encarte.** Depois
  dessa data (12/08 para o tabloide Safra) essas ofertas expiram na demo, porque as datas
  são as reais (§15). As ofertas de balcão (Mota, Safra açougue) não anunciam validade e
  não expiram.

## Imagens

- **IA fornecida pelo Founder** só nos itens de balcão sem marca (frango inteiro, bucho,
  cebola), com `alt` que declara ilustração e IA.
- **Recorte de encarte/tabloide fornecido** para produto de marca — a arte que o próprio
  mercado publicou, nunca embalagem gerada (§10).
- **Placeholder deliberado** em bisteca bovina (nenhuma IA fornecida corresponde ao
  corte), Elseve 200 ml e Sanol 7 un (só existe foto de tabloide impresso, sem qualidade
  de recorte). Imagem errada é pior que nenhuma.
