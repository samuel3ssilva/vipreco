# Política de imagens

**Status: NORMATIVO** para E1.9–E1.10. **Nada aqui está implementado. Nenhuma imagem foi cadastrada.
O CSP não foi alterado.**

Decisão do Founder/PMO (D4/DL-006): **imagem revisada entra no MVP.**

---

## 1. A regra que governa todas as outras

**Nenhuma imagem aproximada** (princípio 6).

- imagem de **outra gramatura** é proibida — 1 L num card de 900 ml;
- imagem de **outra variante** é proibida — tradicional num card de extraforte;
- imagem "da marca" ou "da linha" no lugar da do item é aproximação, e portanto proibida.

Imagem errada destrói exatamente a confiança que o produto vende. **Placeholder é resposta correta;
aproximação não é.**

---

## 2. Campos

| Campo                 | Tipo                                               | Regra                                                                                    |
| --------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `image_url`           | text                                               | caminho servido por **origem controlada**. Nunca URL de terceiro renderizada diretamente |
| `image_source`        | enum `curadoria, mercado, fabricante, gtin_lookup` | de onde veio                                                                             |
| `image_source_url`    | text                                               | **procedência, para auditoria** — registrada, não necessariamente renderizada            |
| `image_review_status` | enum `pending, approved, rejected`                 | só `approved` é exibida                                                                  |
| `image_reviewed_at`   | timestamptz                                        |                                                                                          |
| `image_reviewed_by`   | text                                               | identificação operacional, **sem dado pessoal**                                          |
| `image_variant_match` | enum `exact, size_variant, brand_only, generic`    | **o campo que evita a imagem errada**                                                    |

**`image_variant_match` é obrigatório** quando há imagem. Qualquer valor diferente de `exact`
renderiza **placeholder**, não a imagem. O campo existe para registrar o que se tem, não para
autorizar exibição.

---

## 3. Origem controlada

Imagem servida pelo próprio domínio do produto — hoje, o Worker.

A razão é o CSP em `src/lib/security-headers.ts`:

```
img-src 'self' data:
```

Com essa diretiva:

- host externo (fabricante, GS1, CDN de terceiro): **bloqueado**;
- Supabase Storage (`https://<ref>.supabase.co/storage/...`): **bloqueado** — `*.supabase.co` está em
  `connect-src`, não em `img-src`;
- arquivo servido do próprio domínio: **permitido hoje, sem nenhuma mudança**.

### Alteração futura de CSP — documentada, não executada

Se a origem escolhida em R7 não for o próprio domínio, o CSP precisará de uma origem a mais em
`img-src`. Isso é mudança de segurança, e o caminho é:

1. decidir a origem (R7);
2. alterar `CSP_DIRECTIVES` com o host exato — **nunca** curinga amplo;
3. atualizar `src/lib/security-headers.test.ts`;
4. revisão adversarial da diretiva;
5. gate do Founder/PMO.

**O CSP não é alterado nesta rodada.**

---

## 4. Revisão manual

Toda imagem passa por revisão humana antes de ser exibida. `pending` nunca aparece.

Checklist mínimo, para incorporar a `docs/mvp/MANUAL-OFFER-OPERATIONS.md`:

1. É o **mesmo item**? Marca, variante, embalagem e **gramatura** conferem com o registro?
2. A embalagem na foto é a que está na loja hoje, e não uma versão antiga?
3. A imagem tem fundo limpo o suficiente para o card, em claro e em escuro?
4. A procedência está registrada em `image_source_url`?
5. Há direito de uso? Foto do próprio mercado e foto de curadoria própria estão cobertas; imagem de
   terceiro sem autorização, não.

Reprovou em qualquer item → `rejected` + placeholder.

---

## 5. Placeholder

- **por categoria**, não genérico único — mercearia, laticínios, limpeza, higiene;
- SVG servido do próprio domínio, dentro do CSP atual;
- mesmo aspect ratio da imagem real, para não haver salto de layout entre um card com foto e um sem;
- decorativo: `alt=""` e `aria-hidden`, porque não acrescenta informação ao que já está escrito.

---

## 6. Apresentação

| Regra                      | Como                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| aspect ratio estável       | proporção fixa reservada em CSS; `width`/`height` explícitos no elemento                                                            |
| sem layout shift relevante | espaço reservado antes do carregamento; CLS não pode piorar                                                                         |
| compressão                 | ativo otimizado no build; nada acima do necessário para 2× do tamanho de exibição                                                   |
| lazy loading               | `loading="lazy"` em tudo, **exceto** o Achado de destaque                                                                           |
| LCP                        | a imagem do destaque passa a ser o LCP da Home; `fetchpriority="high"` só nela                                                      |
| carrossel secundário       | nenhuma imagem carregada antes do primeiro scroll                                                                                   |
| acessibilidade             | imagem de produto é ilustrativa: o nome, a marca e a gramatura já estão em texto. `alt` curto e factual, sem repetir o card inteiro |

---

## 7. Cobertura

| Superfície          | Meta            |
| ------------------- | --------------- |
| Achados destacados  | **100%**        |
| Categoria promovida | **90%** inicial |
| Demais              | placeholder     |

Metas operacionais, não técnicas: dependem de curadoria manual e de um catálogo pequeno. Não
autorizam relaxar §1 — abaixo da meta usa-se placeholder, nunca aproximação.

---

## 8. Importação por GTIN

Registrada como `image_source = gtin_lookup` e **fora do MVP**: licença incerta e cobertura fraca no
varejo brasileiro. Reabrir exige verificação de direito de uso e decisão do PMO.

## Adendo IMAGE-0 (08/08/2026) — o caminho até aqui virar código

O §30 do mandato PRE-WEEKEND VISUAL DEMO FREEZE pediu a estratégia completa de imagem. Ela está em
[`docs/data/image-0/`](./image-0/README.md), e **nada nela altera esta política** — os documentos
dizem como chegar ao que já está escrito aqui.

**Três fatos que este documento não dizia, e que a medição de IMAGE-0 encontrou:**

1. **As sete colunas da §2 não existem em nenhuma migration.** `grep` em `supabase/migrations/`
   devolve zero linhas para `image_url`, `image_variant_match` e `image_review_status`. O cabeçalho
   já avisava "nada aqui está implementado"; o inventário mede o tamanho disso: o primeiro trabalho
   de R6 é uma migration, e migration não é aplicada sem gate humano.
2. **O produto tem zero fotografia de produto.** Tem três ilustrações genéricas de categoria, e elas
   vivem numa branch que ainda não foi mergeada.
3. **O CSP `img-src 'self' data:` decide a arquitetura sozinho.** Ele elimina host externo, Supabase
   Storage e CDN de terceiro sem que ninguém precise argumentar, e deixa uma opção que não exige
   alterar nada: arquivo servido pelo próprio domínio.

**A §8 (importação por GTIN fora do MVP) foi confirmada, não revisada.** A pesquisa de catálogo está
em [`FONTES-E-DIREITOS.md`](./image-0/FONTES-E-DIREITOS.md) §2, com as cinco perguntas que precisam
de resposta antes de qualquer linha de código. A quarta delas — se a imagem devolvida é do item
exato ou "da linha" — provavelmente elimina a opção sozinha: a força de um catálogo por GTIN é
cobertura, e a §1 desta política é justamente onde cobertura larga costuma falhar.

**O validador não substitui a revisão da §4.** `scripts/image/validar-imagens.ts` reprova formato,
dimensão, proporção, peso e nome fora da convenção. Ele **não** sabe se a foto é do produto certo,
se a gramatura confere, se a embalagem é a atual, nem se há direito de uso — as quatro perguntas que
mais importam continuam humanas, e o próprio validador imprime isso junto de todo verde.
