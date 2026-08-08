# Arquitetura da imagem em R6 — o caminho do arquivo até o card

**Nada aqui está implementado.** É o desenho proposto, com o que ele exige de migration, de Worker e
de CSP — cada um com o seu gate.

---

## 1. O caminho, em cinco etapas

```
[1] captura          foto tirada em loja, com autorização
        ↓
[2] processamento    recorte, fundo, redimensionamento, compressão   (local, script versionado)
        ↓
[3] revisão          uma pessoa confere item, variante e gramatura   (humana, obrigatória)
        ↓
[4] publicação       arquivo entra no repositório sob `public/img/produto/`  (PR, revisão de código)
        ↓
[5] vínculo          a linha de `products` aponta para o arquivo      (migration + operação manual)
```

**A etapa 3 não é automatizável, e não deve ser.** O que o validador da etapa 2 consegue medir é
formato, tamanho, proporção e nome; ele **não** consegue medir se aquela foto é do item certo. A
única coisa que separa "500 g" de "1 kg" é alguém olhando.

## 2. Onde o arquivo mora, e por quê

**Proposta: no próprio repositório, sob `public/img/produto/<slug>.webp`, servido pelo Worker.**

O motivo é o CSP: `img-src 'self' data:`. Servir do próprio domínio é a única opção que **não exige
alterar a política de segurança**. E alterar CSP é mudança de segurança, com revisão adversarial e
gate do Founder — um custo que não se paga para 10 a 20 arquivos de poucos KB cada.

Alternativas, e por que perdem no MVP:

| Alternativa            | Por que não agora                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Storage       | Exigiria acrescentar `*.supabase.co` a `img-src`. Ganho real só aparece com centenas de imagens e upload por não-desenvolvedor. |
| R2 / CDN da Cloudflare | Mesmo problema de CSP, mais um serviço a configurar e pagar. Faz sentido quando o catálogo crescer.                             |
| Data URI embutido      | Infla o HTML, quebra o cache do navegador por imagem e piora o LCP exatamente no card de destaque.                              |

**Quando reabrir:** quando o catálogo passar de ~200 imagens, ou quando alguém que não é
desenvolvedor precisar subir imagem sem abrir PR. Os dois gatilhos são de R7+.

### Convenção de nome

`<categoria>-<marca-slug>-<variante-slug>-<quantidade>.webp`

Exemplo: `cafe-marca-fictícia-tradicional-500g.webp`.

O nome carrega a gramatura de propósito: um arquivo chamado `...-500g.webp` linkado a um produto de
1 kg é um erro que **se lê no diff do PR**, antes de chegar a qualquer tela.

## 3. O que a migration precisa criar

As sete colunas da `IMAGE-POLICY.md` §2, em `products`. **Nenhuma existe hoje.**

```sql
-- PROPOSTA. Não aplicar. Migration é escrita pelo CTO e aplicada por decisão do Founder/PMO.
alter table products
  add column image_url            text,
  add column image_source         text check (image_source in ('curadoria','mercado','fabricante','gtin_lookup')),
  add column image_source_url     text,
  add column image_review_status  text check (image_review_status in ('pending','approved','rejected')),
  add column image_reviewed_at    timestamptz,
  add column image_reviewed_by    text,
  add column image_variant_match  text check (image_variant_match in ('exact','size_variant','brand_only','generic'));
```

Três invariantes que a migration precisa garantir, e que **não podem viver só na aplicação**:

1. **`image_variant_match` é obrigatório quando há `image_url`.** Uma imagem sem declaração de
   correspondência é uma imagem que alguém vai assumir exata.
2. **`image_review_status` é obrigatório quando há `image_url`**, e o padrão é `pending`.
3. **A policy RLS de leitura anônima não pode expor `image_url` de linha não aprovada.** O portão de
   `resolverImagem()` é da aplicação; se o dado sair do banco, um cliente diferente do nosso o
   exibiria. Manter os dois em sincronia é a mesma disciplina de `isValidPrice()`.

## 4. O que o Worker precisa

**Nada.** Arquivo estático sob `public/` já é servido, já entra no cache do Cloudflare e já cabe no
CSP atual. É a maior virtude desta proposta: a etapa de infraestrutura é vazia.

O que muda é o `_headers`: convém um `Cache-Control` longo com `immutable` para `/img/produto/*`,
já que o nome do arquivo carrega a identidade do conteúdo. Isso é uma linha, e não é urgente.

## 5. O que o frontend precisa

**Nada de novo.** `ProductImage` já faz tudo o que a `IMAGE-POLICY.md` §6 pede: proporção fixa em
`rem`, `width`/`height` explícitos, `loading="lazy"` em tudo exceto o destaque, `fetchPriority="high"`
só no destaque, `alt` curto e factual. `resolverImagem()` já é o portão.

A única mudança prevista é o adaptador que traduz as sete colunas para `ImagemDeProduto` — e ele é
pequeno, porque o tipo já existe e já é opcional.

## 6. Formato e tamanhos

| Decisão    | Valor                               | Por quê                                                                                                                                                                  |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Formato    | **WebP**                            | Suporte universal nos navegadores que o produto atende, e metade do peso de um PNG equivalente. AVIF economiza mais, mas o ganho não paga a complexidade em 20 arquivos. |
| Lado maior | **512 px**                          | O maior uso é 128 px no destaque a `sm`. 512 cobre 2× em telas retina com folga, e o §6 da política proíbe "acima do necessário para 2× do tamanho de exibição".         |
| Proporção  | **1:1**                             | O card reserva um quadrado. Qualquer outra proporção causa recorte ou salto de layout.                                                                                   |
| Peso alvo  | **≤ 40 KB**                         | Numa Home com um destaque e três linhas, são ~160 KB de imagem. Aceitável em 4G de bairro.                                                                               |
| Fundo      | **branco ou muito claro, uniforme** | O card tem superfície clara e superfície escura; fundo sujo aparece nas duas.                                                                                            |

## 7. O que o validador cobre, e o que não cobre

`scripts/image/validar-imagens.ts` reprova: formato fora da lista, lado maior acima do teto,
proporção diferente de 1:1, peso acima do alvo, nome fora da convenção, e arquivo em `public/img/`
que ninguém referencia.

**Ele não cobre — e é importante dizer:** se a foto é do item certo, se a gramatura confere, se a
embalagem é a atual, e se existe direito de uso. **Essas quatro são humanas**, e estão no checklist
de `OPERACAO-FOTO.md`. Um validador que desse "verde" sem elas seria pior do que nenhum, porque
pareceria garantia.

## 8. Riscos, e o que cada um exige

| Risco                                       | Consequência                                                          | Mitigação                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Foto de outra gramatura passar pela revisão | O produto mente sobre o item exato, que é a única coisa que ele vende | Nome do arquivo carrega a gramatura; o revisor confere contra o registro, não contra a memória |
| Embalagem mudar na gôndola                  | A foto envelhece em silêncio                                          | Registrar `image_reviewed_at`; revisar o pacote junto com a atualização de preço               |
| Imagem de terceiro entrar sem direito       | Exposição jurídica real                                               | Só as origens A e B do `FONTES-E-DIREITOS.md`, e a cessão no aceite do piloto                  |
| CSP alterado por conveniência               | Superfície de segurança ampliada para economizar trabalho             | O caminho de alteração está escrito na política §3, com gate. Não há atalho                    |
| Catálogo crescer e o repositório inchar     | Clone lento, PR pesado                                                | Gatilho de ~200 imagens para reabrir a decisão de armazenamento                                |
| Placeholder virar exceção em vez de padrão  | Pressão para aceitar aproximação "só desta vez"                       | `resolverImagem()` não tem caminho alternativo, e é função pura testada                        |
