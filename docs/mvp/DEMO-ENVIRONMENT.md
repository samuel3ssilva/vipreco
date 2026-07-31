# Ambiente de demonstração — isolamento entre DEMO e PILOTO

Decisão registrada em 31/07/2026. Implementação: `src/lib/app-mode.ts`,
`src/components/StagingBanner.tsx`, `src/lib/og.ts`.

## A chave única

Toda a diferença entre demonstração e piloto passa por **uma** função: `appMode()`.

| Modo     | Quando                                   | Faixa de ambiente | Selo de dados fictícios | Achados e mercados  |
| -------- | ---------------------------------------- | ----------------- | ----------------------- | ------------------- |
| `demo`   | padrão — inclusive sem variável definida | obrigatória       | obrigatório             | fixture versionado  |
| `piloto` | só com `VITE_APP_MODE=piloto` no build   | não renderizada   | não renderizado         | catálogo (Supabase) |

Nenhum ambiente está configurado como `piloto` hoje. DEMO é o padrão seguro: um build sem a
variável nunca se apresenta como piloto nem busca dado real por acidente. O caminho contrário
exige decisão explícita de quem faz o build.

Como o modo vem de `import.meta.env` (fixado no build), servidor e navegador chegam sempre ao
mesmo valor — a faixa não pode aparecer só depois da hidratação.

## O que a demonstração mostra

- **Faixa de ambiente**, acima do header, em toda página: "AMBIENTE DE TESTE · esta não é a
  versão pública do ViPreço". É o primeiro elemento do documento.
- **Selo de dados fictícios**, logo abaixo dos Achados: "dados fictícios · exemplos para
  demonstrar o formato".
- O aviso de ambiente **saiu de dentro da página**: a faixa passou a ser o único lugar onde ele
  aparece na Home, para não repetir a mesma informação três vezes.
- Nenhum texto operacional do piloto ("resumo semanal", "Achado de hoje", horário de atualização,
  validade inventada) existe em modo demonstração — coberto por teste.

## Header

`Achados · Buscar produto · Como funciona · Para mercados` e a pill **"Tenho um mercado →"**, no
verde da ação, só no desktop — no celular a barra inferior já leva a "Mercados". As rotas não
mudaram: "Achados" é o rótulo de `/`.

## Prévia de link (og:image)

Fase inicial da North Star v1.2.2, Assets §3: **estática**. Nenhum gerador dinâmico por Achado —
isso depende de ofertas reais e de autorização.

- Asset: `public/og/vipreco-og-demo.png`, 1200×630, ~61 KB. Fonte vetorial ao lado
  (`vipreco-og-demo.svg`), renderizada com as fontes oficiais da marca.
- A imagem carrega uma faixa inferior fixa: **"EXEMPLO FICTÍCIO — demonstração do formato do
  ViPreço, sem preço real"**. Nenhum preço de demonstração circula sem essa marcação.
- O mercado do exemplo é genérico ("Mercado local 2"): nenhum mercado real aparece como
  participante.
- Declarados: `og:image`, `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt` e
  `twitter:card=summary_large_image`.
- A URL é absoluta quando o ambiente informa a sua origem (`VITE_PUBLIC_SITE_URL`) e relativa
  caso contrário. **Nenhum domínio fica fixado no código.** Staging já define a variável;
  produção ainda não — ver "Pendências".

## Pendências de configuração humana

- `VITE_PUBLIC_SITE_URL` no ambiente de **produção**, quando o domínio definitivo for decidido.
  Sem ela, a prévia de link em produção usa caminho relativo — funciona no navegador, mas alguns
  rastreadores exigem URL absoluta.

## Rollback

Reverter o commit. A faixa é um componente próprio; o selo é condicional; os metadados são
aditivos. Sem migration, sem schema, sem dado, sem infraestrutura.
