# Política de cache HTTP

Decisão registrada em 31/07/2026. Implementação: `src/lib/cache-headers.ts`, aplicada em
`src/server.ts`. Testes: `src/lib/cache-headers.test.ts`.

## Problema observado

Logo depois de um deploy de staging, uma aba aberta antes da publicação continuou servindo o
documento HTML anterior. O HTML velho referenciava um bundle com hash que já não era o publicado,
e a página ficou presa numa versão antiga — sem erro visível, o que é pior do que uma falha.

Causa: a resposta do SSR saía **sem** `Cache-Control`. Sem diretiva explícita, o navegador e
qualquer intermediário aplicam heurística própria (tipicamente uma fração do `Last-Modified`) e
podem reutilizar o documento sem perguntar nada ao servidor.

## Regra

| Recurso                                                         | `Cache-Control`                       | Quem define                    |
| --------------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| Documento HTML do SSR (`text/html`), inclusive a página de erro | `no-cache`                            | **este código** (novo)         |
| Assets versionados por hash (`/assets/*`)                       | `public, max-age=31536000, immutable` | camada de assets do Cloudflare |
| Estáticos sem hash (`favicon.ico`, `/logo/*`, `robots.txt`)     | `public, max-age=0, must-revalidate`  | camada de assets do Cloudflare |
| Qualquer outra resposta                                         | intocada                              | origem                         |

`no-cache` **não** proíbe armazenar: permite guardar a cópia e obriga a revalidar com o servidor
antes de usá-la. É o que garante que o primeiro request depois de um deploy receba a versão nova.

`no-store` foi descartado de propósito: além de proibir o armazenamento, desativa o cache de
navegação (voltar/avançar) nos navegadores baseados em Chromium — degrada a navegação sem nenhum
ganho de frescor sobre `no-cache`.

O código só preenche a lacuna: se a origem já definiu `Cache-Control`, o valor dela é respeitado.
Nenhum cache é desabilitado de forma indiscriminada — o cache longo dos assets com hash, que é o
que sustenta o carregamento rápido, permanece exatamente como está.

## Impacto

- Cada visita à Home passa a fazer uma revalidação do documento (uma requisição condicional de
  poucos bytes de header). O peso do HTML já era baixo e os assets, que são a maior parte dos
  bytes, continuam vindo do cache local sem tocar a rede.
- Deploys deixam de depender de expiração de cache para chegar ao visitante.
- Nenhuma mudança de schema, dado, DNS ou infraestrutura.

## Verificação

```bash
curl -sD - -o /dev/null https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/ | grep -i cache-control
```

Esperado: `cache-control: no-cache`. Nos assets com hash, o esperado continua sendo
`public, max-age=31536000, immutable`.

## Rollback

Reverter o commit. A mudança é aditiva e isolada em um módulo: remover a chamada a
`withCacheHeaders` em `src/server.ts` restaura exatamente o comportamento anterior (documento sem
`Cache-Control`). Não há migração, estado persistido nem dado a desfazer.
