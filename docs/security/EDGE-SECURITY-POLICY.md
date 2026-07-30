# Política de segurança de borda — Onda 3

Implementação: `src/lib/security-headers.ts` (função pura, testada em
`src/lib/security-headers.test.ts`), aplicada a toda resposta pelo wrapper `fetch` do Worker
em `src/server.ts`. Nenhum header depende de configuração de ambiente — o mesmo código roda em
staging e produção; a única bifurcação é o `X-Robots-Tag` condicionado ao hostname.

## Verificação realizada

Validado contra o **Worker real** (não apenas o dev server do Vite, que não passa pelo
`fetch` handler de `src/server.ts`): build de produção (`bun run build`) + `wrangler dev`
local contra `.output/server/wrangler.json` (script `preview:worker`, adicionado nesta Onda).
Confirmado por `fetch('/')` no navegador que todos os headers abaixo chegam na resposta real,
e por navegação manual em `/` e `/buscar` que a CSP não quebra render nem hidratação (nenhum
erro de console, nenhum bloqueio de CSP reportado). `X-Robots-Tag` não aparece em `localhost`
(esperado — só ativa em hosts terminados em `.workers.dev`, comportamento coberto pelos testes
unitários, não pelo `wrangler dev` local).

## Headers aplicados (toda rota, todo ambiente)

| Header                      | Valor                                                          | Motivo                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | ver abaixo                                                     | Superfície principal contra XSS, exfiltração e conteúdo injetado                                                                                                                                         |
| `X-Content-Type-Options`    | `nosniff`                                                      | Impede MIME-sniffing de assets servidos                                                                                                                                                                  |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                              | Não vaza path/query completo para origens externas (ex.: link do Google Maps)                                                                                                                            |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Nenhuma dessas APIs é usada pelo produto (geolocalização é explicitamente fora de escopo) — nega por padrão                                                                                              |
| `X-Frame-Options`           | `DENY`                                                         | Defesa redundante contra clickjacking para navegadores que ainda priorizam este header sobre `frame-ancestors`                                                                                           |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`                 | `workers.dev` e o futuro `vipreco.com.br` são servidos apenas via HTTPS; força isso no cliente                                                                                                           |
| `X-Robots-Tag`              | `noindex, nofollow` (condicional)                              | Aplicado apenas quando o host termina em `.workers.dev` — impede indexação prematura de staging/produção antes do lançamento oficial. Some automaticamente quando o app for servido por `vipreco.com.br` |

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

| Ambiente                                          | Headers                                                                        | Diferença                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Desenvolvimento local (`bun run dev`)             | **Nenhum** — Vite dev server não passa pelo wrapper `fetch` de `src/server.ts` | Não é um risco: dev nunca é exposto publicamente. Documentado como limitação conhecida, não como lacuna a fechar nesta Onda |
| Staging (`samuel3ssilva-vipreco.workers.dev`)     | Todos os headers acima, incluindo `X-Robots-Tag: noindex, nofollow`            | —                                                                                                                           |
| Produção (`vipreco-production.workers.dev`, hoje) | Todos os headers acima, incluindo `X-Robots-Tag: noindex, nofollow`            | Idêntico a staging exceto pela origem Supabase (mesma diretiva `connect-src`, wildcard cobre ambos)                         |
| Produção (`vipreco.com.br`, quando lançado)       | Todos os headers acima, **sem** `X-Robots-Tag`                                 | Automático — basta o hostname deixar de terminar em `.workers.dev`; nenhuma mudança de código necessária no lançamento      |

## Riscos residuais conhecidos

1. `unsafe-inline` em `script-src`/`style-src` — ver justificativa acima. Mitigação futura (fora
   desta Onda): avaliar se uma versão futura do TanStack Start permite nonce threading; se sim,
   substituir por `'nonce-<valor por requisição>'` e remover `unsafe-inline`.
2. `X-Robots-Tag` só cobre o header HTTP — `public/robots.txt` continua com `Allow: /` (ver
   achado no threat model). Como o header HTTP tem precedência sobre `robots.txt` para a maioria
   dos crawlers relevantes (inclusive Googlebot), isso já mitiga o risco prático de indexação;
   ajustar `robots.txt` para refletir isso explicitamente fica registrado como melhoria futura de
   baixa prioridade, não bloqueante.
