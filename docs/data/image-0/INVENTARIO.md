# Inventário de imagem — o que existe hoje, medido

Medido em 08/08/2026, contra `origin/main` em `c50e774`. Números conferidos no repositório, não
estimados.

---

## 1. Imagens de produto na `main`: **zero**

`public/` na `main` contém exatamente dez arquivos, e nenhum deles é imagem de produto:

| Arquivo                                           | O que é                      |
| ------------------------------------------------- | ---------------------------- |
| `public/favicon.ico`                              | ícone do navegador           |
| `public/logo/vipreco-app-icon-1024.svg`           | marca                        |
| `public/logo/vipreco-favicon.svg`                 | marca                        |
| `public/logo/vipreco-simbolo-mono.svg`            | marca                        |
| `public/logo/vipreco-simbolo.svg`                 | marca                        |
| `public/og/vipreco-og-demo.{svg,png}`             | prévia de link do consumidor |
| `public/og/vipreco-og-para-mercados-v2.{svg,png}` | prévia de link do lojista    |
| `public/_headers`                                 | não é imagem                 |

**Consequência:** todo card do produto, hoje, renderiza placeholder. Isso é o comportamento correto
segundo a `IMAGE-POLICY.md` §1, e não um defeito.

## 2. Ilustrações genéricas de categoria: **três, e fora da `main`**

Vivem em `public/img/demo/`, na branch do PR #97, que **ainda não foi mergeada**.

| Arquivo     | Bytes | Categoria                                   |
| ----------- | ----- | ------------------------------------------- |
| `arroz.svg` | 2634  | mercearia — pacote travesseiro com janela   |
| `cafe.svg`  | 3461  | mercearia — pacote stand-up com solda       |
| `leite.svg` | 1911  | laticínios — caixa longa com tampa de rosca |

Cada uma declara dentro do arquivo o que é. Nenhuma tem `<text>`, nenhuma busca recurso externo,
nenhuma copia embalagem, marca, logotipo ou trade dress de terceiro.

**Critério de desenho, e ele é conferível:** ser reconhecível a **64 px**, que é o tamanho em que
aparecem na lista de Achados — não a 160, que é o tamanho em que se desenha. Uma folha de contato
nos quatro tamanhos reais é o instrumento; ela pegou o arroz lendo como pote e a solda do café
lendo como tampa de vidro de solúvel, e o conserto foi de silhueta, não de cor.

**Elas não são fotografia e não podem ser tratadas como tal.** A fronteira é medida por
`src/lib/demo-opportunities.ilustrativas.test.ts`: toda oferta com `ilustrativa: true` é `is_demo`
nas três entidades, todo `src` vive sob `/img/demo/`, e o `alt` declara que **não é a embalagem do
produto** e nunca usa a palavra "foto".

## 3. Campos de imagem no banco: **nenhum**

`grep -rn "image_url\|image_variant_match\|image_review_status" supabase/migrations/` devolve
**zero linhas**.

A `IMAGE-POLICY.md` §2 descreve sete colunas — `image_url`, `image_source`, `image_source_url`,
`image_review_status`, `image_reviewed_at`, `image_reviewed_by`, `image_variant_match` — e **nenhuma
delas existe em nenhuma migration**. O documento é normativo para E1.9–E1.10 e declara isso no
próprio cabeçalho ("Nada aqui está implementado"), mas vale dizer alto: **o primeiro trabalho de R6
é uma migration, e migration não é aplicada sem gate humano.**

O tipo `ImagemDeProduto` existe em `src/lib/card-v2.ts` e é **opcional** em toda oferta. O card
compila e funciona contra um banco que não tem nenhuma dessas colunas — que é exatamente o
comportamento desejado, e o motivo de o campo ser opcional.

## 4. O portão, e onde ele mora

`resolverImagem()` em `src/lib/card-v2.ts`:

```ts
if (img == null) return null;
if (img.src.trim().length === 0) return null;
if (img.review_status !== "approved") return null;
if (img.variant_match !== "exact") return null;
return img;
```

Quatro linhas, uma função pura, testada sem DOM. **Qualquer coisa que não seja "aprovada E exata"
vira placeholder.** Não há caminho alternativo, não há flag de contorno, e nenhum componente decide
isso por conta própria: `ProductImage` recebe a decisão já tomada.

É aqui que a política deixa de ser prosa e vira comportamento. Um pipeline de imagem que não
produza `approved` + `exact` simplesmente não aparece na tela — o que é a garantia certa.

## 5. CSP: `img-src 'self' data:`

`src/lib/security-headers.ts`, linha 21. Consequência direta:

- host de fabricante, GS1, CDN de terceiro: **bloqueado pelo navegador**;
- Supabase Storage: **bloqueado** — `*.supabase.co` está em `connect-src`, não em `img-src`;
- arquivo servido pelo próprio domínio: **permitido hoje, sem mudar nada**.

Isso não é obstáculo: é o desenho certo. Ele obriga o produto a **passar a imagem por um pipeline
próprio** antes de exibi-la, o que significa que "de onde veio esta imagem" é uma pergunta
respondida uma vez, na ingestão, e não a cada requisição do navegador de cada usuário.

## 6. O que está pronto e o que não está

| Peça                                                  | Estado                               |
| ----------------------------------------------------- | ------------------------------------ |
| Política escrita e normativa                          | **pronta** (`IMAGE-POLICY.md`)       |
| Portão em código, testado                             | **pronto** (`resolverImagem`)        |
| Placeholder por categoria                             | **pronto** (`ImagePlaceholder`)      |
| Comportamento de LCP, lazy, aspect ratio              | **pronto** (`ProductImage`)          |
| Ilustrações genéricas para demonstração               | **prontas**, aguardando merge do #97 |
| Colunas no banco                                      | **não existem**                      |
| Origem de armazenamento decidida                      | **não decidida**                     |
| Pipeline de processamento                             | **não existe**                       |
| Direito de uso resolvido para qualquer origem externa | **não resolvido**                    |
| Fotografia de produto real                            | **zero**                             |
