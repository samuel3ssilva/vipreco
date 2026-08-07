# Política de segurança de borda — Onda 3

Implementação: `src/lib/security-headers.ts` (função pura, testada em
`src/lib/security-headers.test.ts`), aplicada pelo wrapper `fetch` do Worker em `src/server.ts`
a toda **rota servida pelo Worker** (SSR/document — `/`, `/buscar`, `/produto/$id`,
`/como-funciona`, `/para-mercados`, `/robots.txt`, `/sitemap.xml`). O mesmo código roda em staging
e produção; a única bifurcação é o `X-Robots-Tag`, decidido por `src/lib/indexing.ts` a partir do
host da requisição e da origem pública declarada pelo build.

**Limitação conhecida (achado de revisão adversarial desta Onda):** assets estáticos
(`/assets/*`, `/favicon.ico`, `/logo/*`, `/og/*`) são servidos pelo binding `ASSETS` do Cloudflare
Workers, que tem precedência de roteamento sobre o `fetch` handler — essas respostas **não**
passam por `src/server.ts`. Nenhuma página HTML é servida como asset estático hoje (só JS/CSS/
ícone/texto), então CSP/X-Frame-Options continuam garantidos em todo documento navegável; ainda
assim, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` e `Strict-Transport-Security`
foram replicados via `public/_headers` (mecanismo nativo do Cloudflare para assets estáticos,
mesclado automaticamente pelo Nitro com a regra de cache que ele já gera) para cobrir esse
caminho também — verificado por `fetch` real contra `/favicon.ico` e `/robots.txt` via
`wrangler dev`.

## Verificação realizada

Validado contra o **Worker real** (não apenas o dev server do Vite, que não passa pelo
`fetch` handler de `src/server.ts`): build de produção (`bun run build`) + `wrangler dev`
local contra `.output/server/wrangler.json` (script `preview:worker`, adicionado nesta Onda).
Confirmado por `fetch('/')` no navegador que todos os headers abaixo chegam na resposta real,
e por navegação manual em `/` e `/buscar` que a CSP não quebra render nem hidratação (nenhum
erro de console, nenhum bloqueio de CSP reportado).

**Revalidado no PR `fix/staging-noindex`**, no mesmo Worker local, agora com a regra invertida —
`localhost` não é o host público declarado, então tudo abaixo vem bloqueado:

| Caminho                   | Status | `X-Robots-Tag`                 | Corpo                                   |
| ------------------------- | ------ | ------------------------------ | --------------------------------------- |
| `/`                       | 200    | `noindex, nofollow, noarchive` | `<meta name="robots">` presente no HTML |
| `/para-mercados`          | 200    | `noindex, nofollow, noarchive` | `<meta name="robots">` presente no HTML |
| `/robots.txt`             | 200    | `noindex, nofollow, noarchive` | `User-agent: *` + `Disallow: /`         |
| `/sitemap.xml`            | 404    | `noindex, nofollow, noarchive` | `Not Found` — nenhuma rota do produto   |
| `/og/vipreco-og-demo.png` | 200    | **ausente**                    | asset estático — ver residual 3 abaixo  |

O `X-Robots-Tag` em `/robots.txt` é a prova de que ele deixou de ser asset estático: antes, essa
era a única rota que voltava sem o header.

## Headers aplicados (toda rota servida pelo Worker, todo ambiente)

| Header                      | Valor                                                          | Motivo                                                                                                                         |
| --------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Content-Security-Policy`   | ver abaixo                                                     | Superfície principal contra XSS, exfiltração e conteúdo injetado                                                               |
| `X-Content-Type-Options`    | `nosniff`                                                      | Impede MIME-sniffing de assets servidos                                                                                        |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                              | Não vaza path/query completo para origens externas (ex.: link do Google Maps)                                                  |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Nenhuma dessas APIs é usada pelo produto (geolocalização é explicitamente fora de escopo) — nega por padrão                    |
| `X-Frame-Options`           | `DENY`                                                         | Defesa redundante contra clickjacking para navegadores que ainda priorizam este header sobre `frame-ancestors`                 |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                 | `workers.dev` e o futuro `vipreco.com.br` são servidos apenas via HTTPS; força isso no cliente                                 |
| `X-Robots-Tag`              | `noindex, nofollow, noarchive` (condicional)                   | Aplicado a **todo host que não seja o host público declarado pelo build** (`src/lib/indexing.ts`). Ver "Indexabilidade" abaixo |

## Indexabilidade — a regra foi invertida

Até aqui a pergunta era _"este host é técnico?"_: `*.workers.dev` recebia `noindex` e qualquer
outro host era tratado como público. Isso é **aberto por omissão** — um domínio novo, um preview
de outra plataforma ou um host de teste com nome bonito virariam indexáveis sem decisão de
ninguém.

A pergunta agora é _"este host foi **declarado** como o host público?"_. Um ambiente só é
indexável quando as três condições valem ao mesmo tempo:

1. o build declara uma origem pública (`VITE_PUBLIC_SITE_URL`);
2. o host que serve a resposta é exatamente o host dessa origem;
3. esse host não é técnico (`*.workers.dev`) nem local.

A condição 3 é o que impede a configuração de errar para o lado perigoso: staging **precisa**
declarar `VITE_PUBLIC_SITE_URL` (é de onde saem as URLs absolutas de `og:image`) e mesmo assim
continua bloqueado, porque a origem declarada dele termina em `.workers.dev`.

São quatro camadas, e cada uma cobre uma falha que as outras não cobrem:

| Camada                         | Onde                          | Cobre                                                     |
| ------------------------------ | ----------------------------- | --------------------------------------------------------- |
| `X-Robots-Tag`                 | `src/lib/security-headers.ts` | Toda resposta do Worker, decidida pelo host da requisição |
| `<meta name="robots">`         | `src/routes/__root.tsx`       | O HTML lido sem os headers (salvo em disco, outro proxy)  |
| `robots.txt` com `Disallow: /` | `src/routes/robots[.]txt.ts`  | A **chegada** do rastreador, inclusive aos assets         |
| `sitemap.xml` com `404`        | `src/routes/sitemap[.]xml.ts` | O convite explícito para rastrear                         |

`robots.txt` deixou de ser arquivo estático em `public/` e virou rota: como asset, ele era servido
pelo binding `ASSETS` — mesmo conteúdo em todo ambiente e, medido em staging, a **única** rota que
voltava sem `X-Robots-Tag`.

A tensão entre as camadas é real e foi escolhida de propósito: quem obedece ao `Disallow` não
busca a página e portanto não lê o `noindex` do header. Para uma demonstração privada de
entrevista, impedir a chegada vale mais do que impedir a listagem — e o header continua lá para o
rastreador que ignorar o `Disallow`.

## Content-Security-Policy — origem por diretiva

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://*.supabase.co;
object-src 'none';
base-uri 'none';
form-action 'self';
frame-src 'none';
frame-ancestors 'none';
```

| Diretiva                        | Origem permitida                              | Justificativa                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`                   | `'self'`                                      | Base restritiva; toda diretiva mais específica abaixo sobrescreve apenas o necessário                                                                                                                                                                                                                                                                                                          |
| `script-src`                    | `'self' 'unsafe-inline'`                      | **`unsafe-inline` é necessário e foi verificado como tal**: o bootstrap de hidratação SSR do TanStack Router (`$_TSR` em `tsrScript.ts`, injetado inline pelo framework) carrega estado por requisição que não pode ser fixado por hash, e o framework não threading um nonce nesta versão. `unsafe-eval` **nunca** é usado — CSP ainda bloqueia scripts de qualquer origem remota não listada |
| `style-src`                     | `'self' 'unsafe-inline' fonts.googleapis.com` | Componentes Radix UI (usados em Dialog/Sheet/Popover/Carousel) aplicam `style="..."` inline via DOM para posicionamento de overlay; removido nesta Onda o único `style={{}}` que a própria aplicação controlava (`SubmitPriceForm.tsx`, substituído pela classe utilitária `sr-only` do Tailwind) — o que sobra é 100% de bibliotecas de terceiros, fora do nosso controle de nonce            |
| `font-src`                      | `'self' fonts.gstatic.com`                    | Único CDN de fonte usado (Google Fonts, ver `src/routes/__root.tsx`)                                                                                                                                                                                                                                                                                                                           |
| `img-src`                       | `'self' data:`                                | Favicon/ícones; nenhuma imagem remota é carregada hoje (fotos de produto são opcionais e não implementadas)                                                                                                                                                                                                                                                                                    |
| `connect-src`                   | `'self' https://*.supabase.co`                | Único backend de dados; wildcard de subdomínio cobre staging (`wjurqpclauwtbjhhvigy.supabase.co`) e produção (`wpgglxgddnekzojozqlm.supabase.co`) sem hardcode de ref específico                                                                                                                                                                                                               |
| `object-src`                    | `'none'`                                      | Nenhum `<object>`/`<embed>`/Flash — bloqueado por completo, conforme mandato                                                                                                                                                                                                                                                                                                                   |
| `base-uri`                      | `'none'`                                      | Impede injeção de `<base>` que redirecionaria URLs relativos                                                                                                                                                                                                                                                                                                                                   |
| `form-action`                   | `'self'`                                      | O único formulário HTML nativo do app (`SubmitPriceForm`) envia via JS para o Supabase, não via submit de formulário para outra origem; nega qualquer submit cross-origin                                                                                                                                                                                                                      |
| `frame-src` / `frame-ancestors` | `'none'`                                      | App não usa iframes e não deve ser enquadrado por terceiros                                                                                                                                                                                                                                                                                                                                    |

## Matriz por ambiente

| Ambiente                                          | Headers                                                                        | Diferença                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Desenvolvimento local (`bun run dev`)             | **Nenhum** — Vite dev server não passa pelo wrapper `fetch` de `src/server.ts` | Não é um risco: dev nunca é exposto publicamente. Documentado como limitação conhecida, não como lacuna a fechar nesta Onda    |
| Staging (`samuel3ssilva-vipreco.workers.dev`)     | Todos os headers acima, incluindo `X-Robots-Tag: noindex, nofollow, noarchive` | `robots.txt` com `Disallow: /`, `sitemap.xml` em 404, `<meta name="robots">` no HTML                                           |
| Produção (`vipreco-production.workers.dev`, hoje) | Todos os headers acima, incluindo `X-Robots-Tag: noindex, nofollow, noarchive` | Idêntico a staging exceto pela origem Supabase (mesma diretiva `connect-src`, wildcard cobre ambos)                            |
| Produção (`vipreco.com.br`, quando lançado)       | Todos os headers acima, **sem** `X-Robots-Tag`                                 | **Não é automático.** Exige `VITE_PUBLIC_SITE_URL=https://vipreco.com.br` no Environment de produção; sem isso, fica bloqueado |

## Riscos residuais conhecidos

1. `unsafe-inline` em `script-src`/`style-src` — ver justificativa acima. Mitigação futura (fora
   desta Onda): avaliar se uma versão futura do TanStack Start permite nonce threading; se sim,
   substituir por `'nonce-<valor por requisição>'` e remover `unsafe-inline`.
2. ~~`X-Robots-Tag` só cobre o header HTTP — `public/robots.txt` continua com `Allow: /`.~~
   **Fechado** pelo PR `fix/staging-noindex`: `robots.txt` virou rota do Worker e responde
   `Disallow: /` em todo ambiente que não seja o host público declarado.
3. **Assets estáticos não recebem `X-Robots-Tag`.** `/og/*.png`, `/logo/*`, `/favicon.ico` e
   `/assets/*` são servidos pelo binding `ASSETS`, que não passa por `src/server.ts`; `_headers` é
   estático e não pode variar por ambiente sem também bloquear a produção futura. Medido no Worker
   local: `/og/vipreco-og-demo.png` volta `200` com `nosniff` e **sem** `X-Robots-Tag`. A mitigação
   é o `Disallow: /` do `robots.txt`, que impede o rastreador obediente de chegar ao asset. O
   residual é um rastreador que ignore `robots.txt` e indexe uma og:image — que já carrega a faixa
   "EXEMPLO FICTÍCIO" gravada na própria imagem. Não bloqueante para a demonstração privada;
   reavaliar se algum ambiente não público passar a servir HTML como asset estático.
