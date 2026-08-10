# Comparable Products Demo v2 + Final Visual Polish — evidência visual

Capturas a 390 px CSS (`deviceScaleFactor: 2`, PNG de 780 px) contra o servidor de
desenvolvimento na branch `feat/demo-comparaveis-v2`, geradas por
`scripts/visual/comparaveis-v2.ts`. Fonte da verdade dos dados: a planilha
`Comparativo_Precos_Supermercados_09-08-2026.xlsx` do Founder (abas Comparativo Geral,
Detalhe por item e Conferência 2 fontes), auditada antes de qualquer linha de código.
A rodada de 10/08/2026 (Final Visual Polish) partiu do benchmark registrado em
[`benchmark-diagnosis.md`](benchmark-diagnosis.md).

| Arquivo                                | O quê                                                 |
| -------------------------------------- | ----------------------------------------------------- |
| `home-390.png`                         | 1 · Home / Achados (herói: Bucho bovino, Açougue Mota) |
| `busca-390.png`                        | 2 · Busca (`?q=frango`)                                |
| `comparacao-mota-390.png`              | 3a · Golden flow A — Bucho, peso variável              |
| `comparacao-dreamies-390.png`          | 3b · Golden flow B — Dreamies, embalagens diferentes   |
| `detalhe-390.png`                      | 4 · Detalhe — Bucho no Açougue Mota                    |
| `whatsapp-390.png`                     | 5 · WhatsApp / retenção                                |
| `north-star-*-compare.png`             | NORTH STAR \| IMPLEMENTATION (Home, Busca, Comparação, Detalhe) |
| `comparable-products-demo-board.png`   | A prancha final, com as notas de honestidade           |
| `benchmark-lessons-board.png`          | §26-I — decisões adotadas/rejeitadas de cada benchmark |
| `benchmark-diagnosis.md`               | §2 — diagnóstico por dimensão + matriz KEEP/ADAPT/REJECT |
| `*-390-dobra.png`                      | Primeira dobra de cada tela (insumo das pranchas)      |

## O que o Final Visual Polish mudou (10/08/2026)

- **Imagens novas do Founder** — bucho trocado pela foto correta (prato), bisteca saiu do
  placeholder; ambas ilustrativas de IA declaradas no `alt`, só em corte sem marca.
- **Snapshot histórico (§18)** — nenhuma data reancorada: oferta observada não some quando
  o encarte vence; a validade vira "valeu até 09/08/2026" (tempo verbal, nunca vigência), a
  tarja de urgência derivada do relógio fica neutra na demo, e a nota única diz
  "Demonstração com preços observados em agosto de 2026". O caminho do piloto continua
  expirando pelo princípio 2 (`isValidPrice` + RLS, intocados).
- **Diferença de preço (§12)** — "R$ 0,50 a menos que o 2º mercado em 500 g", só com mesmo
  produto e mesma quantidade, acompanhando o seletor de peso; nunca vocabulário de promoção.
- **Banner de ambiente virou pill (§16)**; copy de demonstração reduzida a uma frase por
  tela (§17); relativo de data passou a dia civil no fuso do piloto ("hoje" nunca aparece ao
  lado de uma data de ontem); thumbs dos cards 80→96 px; busca ganhou "Continue explorando";
  detalhe com "Comparar preços" como ação primária (§14).

## A hierarquia do §0, medida nas telas

O número grande é **quanto se paga**: o preço da embalagem, ou o calculado para a
quantidade escolhida no peso variável (250 g / 500 g / 1 kg, padrão 500 g, sempre
"aprox."). O normalizado — R$/kg, R$/L, R$/un — fica logo abaixo, menor, **derivado** da
quantidade estruturada pela mesma `computeUnitPrice` de sempre e conferido ao centavo
contra a planilha (exceção única e documentada: farofa no Safra, 12,48 × 12,47, empate de
meio centavo de arredondamento).

## Uma leitura que engana

- **A barra inferior fixa aparece no meio das capturas de página inteira** — artefato de
  `captureBeyondViewport` (`position: fixed` desenhada na posição do viewport). No
  aparelho ela fica colada embaixo.

## Imagens

- **IA fornecida pelo Founder** só nos itens de balcão sem marca (frango inteiro, bucho,
  bisteca, cebola), com `alt` que declara ilustração e IA.
- **Recorte de encarte/tabloide fornecido** para produto de marca — a arte que o próprio
  mercado publicou, nunca embalagem gerada (§10).
- **Placeholder deliberado** em Elseve 200 ml e Sanol 7 un (só existe foto de tabloide
  impresso, sem qualidade de recorte), fora de posição nobre. Imagem errada é pior que
  nenhuma.
