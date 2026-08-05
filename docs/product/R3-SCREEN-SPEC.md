# Especificação das cinco telas do North Star — R3 a R7

**Registrado em 2026-08-05.** Normativo para implementação visual.
Subordinado a [`VISUAL-IMPLEMENTATION-CONTRACT.md`](./VISUAL-IMPLEMENTATION-CONTRACT.md) e aos
contratos funcionais da `main`.

> **Nada aqui foi implementado.** Este documento descreve o que construir quando R3 for
> autorizada. Nenhum componente, CSS ou rota foi criado na missão que o escreveu.

---

## Como ler este documento

Cada tela tem doze seções fixas: **objetivo · hierarquia · componentes · dados obrigatórios ·
dados opcionais · estados · ações · acessibilidade · responsividade · testes · screenshot ·
Gate do Founder**.

Três convenções valem para todas as telas e não se repetem em cada uma:

- **O bloco de procedência é inseparável.** Preço, mercado, fonte, data e validade aparecem
  juntos ou não aparecem. Não existe card com preço e sem data.
- **Campo condicional some, não vira traço.** Sem quantidade estruturada não há preço unitário;
  sem histórico não há preço anterior. Renderizar "—" comunica ausência de dado como se fosse
  um dado, e o usuário lê como "grátis", "zero" ou "erro".
- **`is_featured` nunca reordena.** Vale em toda tela onde há lista.

---

## A. Home / Achados — `/`

### Objetivo

Provar em cinco segundos que o ViPreço tem preço **real**, **daqui**, **recente**. Não é
vitrine de catálogo: é prova de vida do piloto de Artemis.

### Hierarquia

```
1. Header — marca
2. Título "Achados de Artemis" + linha de contexto
3. Busca                          ← primeira dobra, sempre
4. Destaque do dia                ← um card, fundo diferenciado
5. Outros achados                 ← lista compacta
6. CTA de WhatsApp
7. Navegação inferior
```

A busca fica **acima** do destaque. O usuário que já sabe o que quer não deve rolar para
procurar onde digitar.

### Componentes

`AppShell` · `Header` · `SearchField` · `FeaturedOfferCard` · `ProductCard v2` ·
`ProvenanceBlock` · `WhatsAppCTA` · `BottomNavigation` · `EmptyState` · `ErrorState` ·
`Skeleton`

### Dados obrigatórios

Por achado: identidade exata (nome, marca, variante, quantidade) · preço · mercado · bairro ·
`source_type` · `observed_at` · `valid_until` · estado temporal derivado.

### Dados opcionais

Imagem (só com correspondência exata; senão `ImagePlaceholder`) · preço unitário (só com
quantidade estruturada) · condição de promoção (com a condição junto).

### Estados

| Estado            | Comportamento                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------- |
| carregando        | `Skeleton` com `aria-live="polite"`                                                      |
| com achados       | destaque + lista                                                                         |
| **vazio**         | nenhum preço válido: explica que ainda não há achados **hoje**, oferece busca e WhatsApp |
| **sem achados**   | há dados, mas nenhum destacável: lista normal sem destaque — **não** promove um qualquer |
| erro              | `ErrorState` com `role="alert"` e ação de tentar de novo                                 |
| **desatualizado** | preço válido porém antigo: rótulo temporal explícito, sem alarme e sem esconder          |

"Vazio" e "sem achados" são estados **diferentes** e a distinção é de produto: no primeiro não
há o que mostrar; no segundo há, e a tentação seria eleger um destaque artificial. Eleger um
destaque sem critério é o primeiro passo para um ranking que não é neutro.

### Ações

Buscar · abrir comparação de um achado · abrir detalhe · WhatsApp.

### Acessibilidade

Ordem de foco = ordem visual, sem duplicação · alvos ≥ 44 px · `<h1>` único ·
`aria-live` no carregamento · `role="alert"` no erro · preço legível por leitor de tela como
valor monetário, não como sequência de caracteres.

### Responsividade

360 px: coluna única. Nada de rolagem horizontal. Nome de produto em até 2 linhas com
reticências — **quantidade e variante nunca truncam**, porque são o que distingue o SKU.

### Testes

Renderiza os cinco estados · procedência presente em todo card · preço unitário ausente sem
quantidade · promoção sempre com condição · `is_featured` não reordena · ordem determinística ·
sem `Math.random`/`Date.now` no render (hidratação).

### Screenshot

Obrigatório: 360 px e desktop, nos estados **com achados**, **vazio** e **erro**.

### Gate do Founder

Obrigatório. A Home só entra depois do `ProductCard v2` aprovado isoladamente.

---

## B. Resultados da busca — `/buscar`

### Objetivo

Levar de um termo digitado ("café") a um **SKU exato**. A busca sugere candidatos; ela nunca
junta produtos diferentes.

### Hierarquia

```
1. Campo de busca persistente, com o termo e botão de limpar
2. "Resultados para «termo»" + contagem
3. Lista de produtos exatos
4. Bloco de sugestão quando não encontrar
```

### Componentes

`SearchField` · `ProductCard v2` · `ProductIdentity` · `ProductImage` / `ImagePlaceholder` ·
`UnitPrice` · `MarketBadge` · `EmptyState` · `Skeleton`

### Dados obrigatórios

Identidade exata · **menor preço observado** com a data da observação · mercado onde foi
observado · contagem de mercados com preço válido.

### Dados opcionais

Imagem · preço unitário condicionado.

### Regra que não se negocia

**Exato e similar não se misturam.** Resultado exato é lista principal. Outro tamanho, outra
gramatura ou outra variante vive em **seção própria, rotulada**, e só se compara por preço
unitário — quando houver quantidade confiável. Ver
[`CANONICAL-PRODUCT-SPEC.md`](./CANONICAL-PRODUCT-SPEC.md).

O texto é sempre "menor preço **observado**", com data. Nunca "menor preço".

### Estados

carregando · com resultados · **sem resultados** (oferece sugerir o produto para o piloto
monitorar) · resultados só similares (explica que não há exato) · erro.

### Ações

Refinar busca · limpar · abrir comparação · sugerir produto.

### Acessibilidade

Campo com `<label>` associado · resultados anunciados por `aria-live` · contagem em texto, não
só visual · botão de limpar com nome acessível.

### Responsividade

360 px em coluna única; imagem com tamanho fixo para a linha não "pular" entre itens com e sem
imagem.

### Testes

Termo sem resultado · resultado só similar · similar nunca na lista exata · normalização
idêntica ao banco (`pa_normalize_text()`) · ausência de promessa absoluta na copy.

### Screenshot

360 px e desktop, nos estados **com resultados** e **sem resultados**.

### Gate do Founder

Obrigatório.

---

## C. Comparação do produto — `/produto/$productId`

### Objetivo

O núcleo do produto: mostrar **o mesmo SKU** em mercados diferentes, ordenado por preço, com
procedência visível em cada linha.

### Hierarquia

```
1. Voltar + compartilhar
2. Identidade do produto + selo "Produto exato"
3. "Comparação em N mercados · Mais baratos primeiro"
4. Linhas de mercado, ordenadas
5. Aviso de variação
```

### Componentes

`ProductIdentity` · `ProductImage` · `MarketPriceRow` · `ProvenanceBlock` ·
`PromotionCondition` · `UnitPrice` · `NeighborhoodLabel` · `ValidityLabel` · `ShareAction`

### Dados obrigatórios

Um único `product_id` · por mercado: **um** preço — o válido mais recente · mercado · bairro ·
fonte · data · validade.

### Dados opcionais

Preço unitário · promoção **com** condição · limite por cliente.

### Ordenação — normativa

```
preço crescente  →  observed_at mais recente  →  id
```

O terceiro critério não é enfeite: sem ele a mesma consulta devolve listas diferentes, e
"a mesma consulta muda de resposta" destrói a confiança mais rápido que um preço errado.

Implementado em `src/lib/comparison.ts` e coberto por teste. Ver
[`COMPARISON-SPEC.md`](./COMPARISON-SPEC.md).

### Neutralidade

Nenhuma influência comercial. `is_featured` não participa da ordem. Promoção estruturada
tampouco: **a ordem é pelo preço de prateleira**, nunca pelo preço efetivo — senão o ranking
passa a depender de quem faz mais promoção, e não de quem é mais barato.

### Estados

carregando · comparação com 2+ mercados · **um único mercado** (mostra, sem fingir comparação) ·
nenhum preço válido · algum preço desatualizado · erro.

### Ações

Voltar · compartilhar · abrir detalhe de uma oferta.

### Acessibilidade

Lista semântica ordenada · posição no ranking anunciada · o "1, 2, 3" não pode ser só cor ou só
tamanho · condição de promoção lida junto com o preço, nunca separada.

### Responsividade

360 px: preço e preço unitário empilhados à direita sem colidir com o nome do mercado.

### Testes

Ordem determinística com empates · um preço por mercado · preço inválido fora · `is_featured`
não reordena · promoção não reordena · condição sempre presente quando há promoção.

### Screenshot

360 px e desktop, com 3 mercados, com 1 mercado e com preço desatualizado.

### Gate do Founder

Obrigatório.

---

## D. Detalhe da oferta

### Objetivo

Responder "posso confiar neste preço?" antes de o usuário sair de casa.

### Hierarquia

```
1. Voltar + compartilhar
2. Identidade completa + imagem
3. Preço, preço unitário, preço anterior (condicional), estado da oferta
4. Mercado, bairro, procedência
5. Promoção com condição
6. Ações: WhatsApp, compartilhar
7. Confiança da informação
```

### Componentes

`ProductIdentity` · `ProductImage` · `UnitPrice` · `OfferStatus` · `ProvenanceBlock` ·
`PromotionCondition` · `WhatsAppCTA` · `ShareAction` · `ConfidencePanel`

### Dados obrigatórios

Identidade completa · preço observado · mercado · bairro · fonte · `observed_at` ·
`valid_until` · estado da oferta.

### Dados opcionais, e a condição de cada um

| Campo              | Só aparece quando                                         |
| ------------------ | --------------------------------------------------------- |
| imagem             | correspondência exata de variante e gramatura, revisada   |
| preço unitário     | há quantidade estruturada confiável                       |
| **preço anterior** | há histórico válido do **mesmo SKU** no **mesmo mercado** |
| promoção           | há condição explícita para exibir junto                   |
| limite por cliente | a condição registra o limite                              |

O preço anterior é o mais perigoso da lista: exibido sem histórico do mesmo mercado, vira
desconto inventado — que é propaganda enganosa, não bug de UI.

### Confiança da informação

Painel explícito com mercado, fonte, atualização e validade. É a tradução literal do princípio
10 do contrato visual: procedência não é rodapé, é conteúdo.

### Estados

ativa · **expirada** · desatualizada · sem promoção · sem imagem · erro.

### Ações

Voltar · compartilhar · WhatsApp.

### Acessibilidade

Estado da oferta em texto, não só em cor · `ShareAction` com feedback semântico
(`aria-live`), não só visual · borda visível no botão secundário · sem duplicação na ordem de
foco.

### Responsividade

360 px: painel de confiança em lista vertical, rótulo acima do valor.

### Testes

Preço anterior ausente sem histórico · oferta expirada renderiza como expirada · procedência
completa · compartilhamento anuncia resultado.

### Screenshot

360 px e desktop: **ativa**, **expirada** e **sem imagem**.

### Gate do Founder

Obrigatório.

---

## E. WhatsApp / retenção

### Objetivo

Converter interesse em retorno, sem prometer o que o piloto não entrega e sem coletar dado que
o MVP não precisa.

### Hierarquia

```
1. Proposta de valor
2. Três benefícios concretos
3. CTA único
4. Linha de saída fácil
```

### Componentes

`WhatsAppCTA` · `EmptyState` (reaproveitado para a ilustração) · `AppShell`

### Dados obrigatórios

Nenhum dado do usuário. O CTA é `wa.me` com número configurável — **não há formulário**,
não há coleta, não há login. Ver CLAUDE.md, princípio 9.

### Conteúdo obrigatório

Achados locais · preço e mercado · **expectativa de frequência** · **sem spam** · saída simples
e explícita · consentimento claro pela própria ação de iniciar a conversa.

### Copy — o que não pode

Nenhuma promessa absoluta de menor preço · nenhuma urgência fabricada ("últimas horas") ·
nenhuma sugestão de exclusividade que não existe · nenhum mercado citado como parceiro.

Se a frequência prometida não for cumprível pela operação manual do piloto, a frase muda —
prometer diariamente e entregar semanalmente custa mais confiança do que não prometer nada.

### Estados

padrão · WhatsApp indisponível/não configurado (some, não quebra).

### Ações

Abrir WhatsApp · voltar.

### Acessibilidade

CTA com nome acessível descritivo · alvo ≥ 44 px · contraste AA no botão verde · a linha de
saída fácil é texto real, não imagem.

### Responsividade

360 px: CTA fixo e alcançável com o polegar.

### Testes

Número ausente não quebra a tela · copy sem promessa absoluta · CTA aponta para `wa.me`
configurado.

### Screenshot

360 px e desktop.

### Gate do Founder

Obrigatório — inclusive na copy, que é compromisso operacional e não texto de interface.

---

## Resumo dos Gates

| Tela              | Precede              | Screenshot | Gate do Founder |
| ----------------- | -------------------- | ---------- | --------------- |
| Card v2 (isolado) | tudo                 | sim        | **sim**         |
| A. Home / Achados | depois do Card v2    | sim        | **sim**         |
| B. Busca          | depois da Home       | sim        | **sim**         |
| C. Comparação     | depois da busca      | sim        | **sim**         |
| D. Detalhe        | depois da comparação | sim        | **sim**         |
| E. WhatsApp       | por último           | sim        | **sim**         |

Nenhuma tela é base para a seguinte antes de ser aprovada. Empilhar telas sobre uma base não
revisada é como aplicar migrations sobre um schema não verificado — o erro só aparece quando
já custou caro.
