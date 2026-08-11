# Evidência LIVE — o que está publicado em staging

Gerado por `scripts/visual/live-staging-golden-flow.ts`, que **clica** a jornada inteira em
`https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev` e fotografa o que aparece.

Isto não é a mesma coisa que a pasta acima. Lá as capturas vêm do servidor de
desenvolvimento e provam **o que o código faz**; aqui vêm da borda e provam **o que está no
ar** — que é o que o Founder vai abrir no próprio celular.

| Arquivo                          | Tela                    | URL de chegada                           |
| -------------------------------- | ----------------------- | ---------------------------------------- |
| `live-b2c-home-390.png`          | 1 · Home / Achados      | `/`                                      |
| `live-b2c-search-390.png`        | 2 · Resultados da busca | `/buscar?q=Café`                         |
| `live-b2c-comparison-390.png`    | 3 · Comparação          | `/produto/22222222-…-000000000002`       |
| `live-b2c-detail-390.png`        | 4 · Detalhe da oferta   | `…/oferta/demo-price-cafe-serra-alta-m2` |
| `live-b2c-whatsapp-390.png`      | 5 · WhatsApp            | `/whatsapp`                              |
| `live-b2b-para-mercados-390.png` | B2B, só smoke test      | `/para-mercados`                         |

390 px de largura CSS, `deviceScaleFactor: 2` — cada PNG tem 780 px, conferidos do cabeçalho
IHDR do próprio arquivo depois de escrito.

## O que a jornada conferiu, passo a passo

Cada seta abaixo é um clique de mouse de verdade no elemento que o usuário vê, não uma
navegação por URL. O script para com o passo nomeado se o CTA sumir ou mudar de texto.

1. **HOME** — "Achados em Artemis", "ARTEMIS · PIRACICABA, SP", Café Serra Alta Tradicional
   500 g, R$ 17,49, Mercado local 2, e a embalagem `cafe-serra-alta.svg` decodificada pelo
   navegador.
2. clique em **"Café"** → **BUSCA** (`/buscar?q=Café`) — o mesmo café, 500 g, com "Comparar".
3. clique em **"Comparar"** → **COMPARAÇÃO** — "Comparação em 3 mercados", 17,49, Mercado
   local 2, **e a mesma embalagem da Home** (comparação de `src`, não de aparência).
4. clique em **"Mercado local 2"** → **DETALHE** — mesmo produto, mesma gramatura, mesma
   embalagem.
5. clique em **"Receber achados no WhatsApp"** → **`/whatsapp`** — com link `wa.me` presente.
6. **`/para-mercados`** — só carregado e fotografado. Nenhum clique: a superfície está
   congelada.

O passo 3 e o passo 4 comparam `img.currentSrc` com o da Home. É o §8 do mandato — "não
permitir que a embalagem mude entre telas" — virado em asserção executável, em vez de
inspeção visual.

## Uma leitura que engana, dita em voz alta

A barra inferior fixa ("Achados / Buscar") aparece **no meio** de cada captura, cobrindo
um pedaço do conteúdo. Isso é artefato de `captureBeyondViewport`: a barra é
`position: fixed` e o Chrome a desenha uma vez, na posição que ela ocupava no viewport, ao
fotografar a página inteira. **No aparelho ela fica colada embaixo e não cobre nada.** A
página rolada de verdade está correta — foi por ela que a jornada acima passou.

## O que estas capturas não provam

Que o dado venha do banco. Staging roda em `VITE_APP_MODE` ausente, ou seja **modo demo**:
todas as cinco telas leem `src/lib/demo-catalog.ts`, versionado. Nenhuma consulta ao
Supabase acontece no caminho de ouro, e nenhuma migration foi aplicada para esta entrega.
