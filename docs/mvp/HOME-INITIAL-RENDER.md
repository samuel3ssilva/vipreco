# Home — o que chega no HTML inicial

Decisão registrada em 31/07/2026. Complementa o que o PR #31 fez com os Achados, agora cobrindo o
seletor "Seu mercado habitual".

## Objetivo

Nenhum carregamento visível na primeira dobra da Home. Quem abre a página — inclusive com
JavaScript ainda em execução — vê conteúdo, não "Carregando…".

## Estado

| Bloco da Home         | Origem                    | Carregamento visível |
| --------------------- | ------------------------- | -------------------- |
| Três Achados          | loader SSR (fixture demo) | não                  |
| Seletor de mercados   | loader SSR (fixture demo) | não                  |
| Busca, avisos, rodapé | estáticos                 | não                  |

## Arquitetura escolhida para os mercados: loader SSR com degradação para o cliente

Três opções foram consideradas:

1. **Loader SSR** — o servidor resolve a lista e ela chega renderizada. **Escolhida.**
2. **Prefetch no cliente** — reduz a espera, mas o HTML inicial continua saindo com o estado de
   carregamento. Não resolve o problema, só o encurta.
3. **Fallback versionado no bundle** — elimina o carregamento, mas congela a lista de mercados no
   build. No piloto, um mercado novo só apareceria no deploy seguinte.

A escolhida é a única que entrega conteúdo no HTML inicial **e** continua refletindo a fonte real
quando o piloto começar.

### Como a Home não fica frágil

- `loadHomeMarkets()` usa a mesma resolução de modo dos Achados. Em **DEMO** — o modo de hoje —
  lê o fixture versionado e **não** consulta o Supabase.
- No modo **piloto**, uma falha do Supabase não vira exceção: é registrada e devolve `null`. O
  loader da Home não quebra, e os Achados continuam aparecendo.
- `null` significa "o servidor não resolveu" e devolve ao `UsualMarketPicker` o comportamento que
  ele já tinha: buscar no cliente, com "Tentar novamente" se também falhar lá. **Nunca uma tela
  vazia.**
- Fora da Home (página do produto), o componente é usado sem `initialMarkets` e continua
  exatamente como antes — este PR não muda aquele caminho.
- O skeleton/carregamento continua permitido **apenas** depois de uma ação do usuário.

### Coerência com o modo DEMO

Os quatro mercados do fixture são os mesmos quatro do seed fictício (`supabase/seed.sql`), com os
mesmos `id`. Assim a escolha feita no seletor continua válida na página do produto, que lê preço
por mercado do banco. Todos têm `is_demo: true` e nomes genéricos — **nenhum mercado real aparece
como participante do piloto**.

## Rollback

Reverter o commit. A mudança é aditiva: `initialMarkets` é uma prop opcional e, sem ela, o
`UsualMarketPicker` volta a carregar no cliente. Sem migration, sem schema, sem dado.
