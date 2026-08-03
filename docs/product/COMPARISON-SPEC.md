# Comparação confiável — especificação

**Status: NORMATIVO** para o épico E2. **Nada aqui está implementado**, exceto o desempate
determinístico (§4), entregue pelo PR técnico A desta rodada.

---

## 1. O que já está certo

A auditoria R0 encontrou o núcleo da comparação implementado e correto:

- `latestValidPricePerMarket()` mantém **um preço por mercado** — o válido mais recente — e ordena do
  menor para o maior;
- `isValidPrice()` e a policy RLS de `prices` implementam a mesma regra dos dois lados;
- `is_featured` **não** entra na comparação: destaque não reordena nada;
- a busca **não** exige escolher mercado antes (E2.2, já atendido);
- `/produto/$productId` já é, em substância, a tela de comparação: melhor preço, mercado, bairro,
  data, dia relativo, procedência, validade, condição, diferença ao mercado habitual e link do mapa.

E2 não é reconstrução. É completar o que falta em volta desse núcleo.

---

## 1.1 A rota canônica

**Decisão do Founder/PMO, 03/08/2026 (D8, DL-014):** a rota canônica da comparação no MVP é e
continua sendo:

```
/produto/$productId
```

Ela representa **um SKU exato** e exibe as ofertas desse SKU em diferentes mercados.

O CTA público muda de rótulo — passa a ser **"Comparar em X mercados"** (§6) — e continua levando
à mesma rota. A mudança que E2 pede é de **jornada e apresentação, não de roteamento**.

**Não criar:** `/comparar/$productId`, redirect, alias, rota nova. E **nenhuma alteração de código
por causa desta decisão**: ela confirma o que já existe.

O motivo é prático, não estético. A tela já é a comparação; trocar a URL pagaria churn, quebraria
links já compartilhados no WhatsApp e acrescentaria rota, entrada de sitemap e testes por um ganho
apenas semântico.

`sitemap.xml`, `canonical` e `og:url` continuam apontando para a rota que já existe — o PR #44 não
precisa de emenda por causa disto.

Uma rota dedicada fica registrada **apenas como hipótese futura**, condicionada a necessidade
comprovada: por exemplo, se a comparação passar a aceitar mais de um SKU por tela, aí a URL
deixaria de descrever o que a página é. Enquanto uma tela = um SKU, `/produto/$productId` é o nome
certo.

---

## 2. Contrato da tela

```
Produto exato (nome, marca, variante, embalagem, quantidade, imagem)
 │
 ├── ofertas do mesmo SKU  ─────────────►  LISTA ORGÂNICA
 │    ├── mercado + bairro + cidade
 │    ├── preço
 │    ├── preço unitário            (só com calculation_status = ok)
 │    ├── condição                  (tipificada + texto original)
 │    ├── atualização               (data absoluta + dia relativo)
 │    ├── validade                  (só quando o mercado informa)
 │    ├── estado                    (active | expired | ended | sold_out)
 │    ├── preço anterior            (só com observação anterior real)
 │    └── ação externa              (mapa)
 │
 ├── outro tamanho  ──────────────────►  SEÇÃO ROTULADA
 │    └── comparação permitida: SOMENTE preço unitário
 │
 └── similar  ─────────────────────────►  SEÇÃO ROTULADA
      └── comparação numérica: NENHUMA
```

Ofertas não ativas aparecem **fora** da lista orgânica, rotuladas, dentro da janela de 24 h
configurável — ver [`../data/OFFER-STATES.md`](../data/OFFER-STATES.md).

---

## 3. Ranking

Regras, em ordem:

1. **somente ofertas vigentes participam do ranking ativo.** `expired`, `ended`, `sold_out`,
   `corrected` e `removed` estão fora, sem exceção;
2. **preço crescente**;
3. **observação mais recente** desempata preços iguais;
4. **identificador estável** desempata o resto — ver §4;
5. **pagamento e destaque não interferem.** `is_featured` e qualquer camada futura de parceria vivem
   em seção separada e rotulada, e jamais reordenam a lista orgânica;
6. **outros tamanhos e similares não entram na mesma lista**;
7. **estados não ativos aparecem fora da lista vigente.**

Promoção estruturada **não** reordena (ver [`../data/PROMOTION-TYPES.md`](../data/PROMOTION-TYPES.md)
§2): a ordem é pelo preço de prateleira, porque ordenar pelo efetivo faria a comparação depender de
quantas unidades a pessoa vai levar.

---

## 4. Desempate determinístico

**Implementado nesta rodada** — PR técnico A, dívida TD-002.

O estado anterior: `latestValidPricePerMarket()` ordenava por preço e, no empate, por `observed_at`
decrescente. Sem terceiro critério. Com dois mercados no mesmo preço e na mesma data de observação, a
ordem passava a depender da ordem de inserção no `Map`, que depende da ordem de retorno do banco — e
a mesma consulta podia produzir duas listas diferentes.

O critério final:

```
1. price          crescente
2. observed_at    decrescente  (mais recente primeiro)
3. id             crescente, comparação lexicográfica estável
```

`id` é uuid, único por linha e estável entre requisições. É o mesmo terceiro critério que
`compareRecency()` já usava para escolher qual preço vence **dentro** de um mercado; agora a ordem
**entre** mercados tem a mesma garantia.

O que **não** mudou: preço crescente continua primeiro, recência continua em segundo, e nada de
destaque, pagamento ou mercado habitual entra na ordenação.

---

## 5. Busca

| Requisito                                 | Estado                            | Onde muda   |
| ----------------------------------------- | --------------------------------- | ----------- |
| visível na primeira dobra                 | **não** — hoje abaixo dos Achados | R4 (D2)     |
| sem seleção prévia de mercado             | atendido                          | —           |
| por nome, marca e aliases                 | parcial — aliases não existem     | R2 + R4     |
| resultado ligado ao produto exato         | atendido                          | —           |
| exato / outro tamanho / similar separados | **não**                           | R4          |
| autocomplete futuro                       | não                               | fora do MVP |

Arquitetura proposta para R4:

1. **GTIN exato** quando o termo é um código válido;
2. **AND de substrings** sobre o texto de busca normalizado, já incluindo aliases;
3. **fallback por similaridade** (`pg_trgm`, hoje instalado e não usado) acima de um limiar,
   rotulado como sugestão — nunca misturado com o resultado exato;
4. ordenação por relevância: GTIN > marca+nome > similaridade > alfabética;
5. três blocos visualmente separados;
6. `limit` explícito em `getProductsPriceStats` (TD-004).

Pré-requisito de tudo isso: o contrato único de normalização
([`../data/PRODUCT-IDENTIFIERS.md`](../data/PRODUCT-IDENTIFIERS.md) §2), entregue pelo PR técnico B.

---

## 6. CTA "Comparar em X mercados"

Hoje o rótulo é "Ver preços por mercado", sem contagem. O número já existe:
`getProductsPriceStats().marketCount`, calculado pelas mesmas regras da comparação.

Regras do rótulo:

- com 2 ou mais mercados: "Comparar em {n} mercados";
- com 1: "Ver o preço neste mercado" — "comparar em 1 mercado" é promessa que a tela não cumpre;
- com 0: o card não é exibido;
- a contagem conta **apenas** ofertas vigentes, pelas regras de §3.

---

## 7. Migração da Home para o contrato único (D1)

**A Home não é alterada nesta rodada.** O alvo, para R4:

| Hoje                                                    | Alvo                            |
| ------------------------------------------------------- | ------------------------------- |
| `loadHomeOpportunities` decide entre fixture e catálogo | `CatalogPort` com dois adapters |
| `loadHomeMarkets` repete a mesma decisão                | idem, um só ponto de escolha    |
| a Home lê de fixture; busca e produto leem do banco     | um contrato, duas fontes        |

Garantias a preservar na migração:

- em DEMO, o caminho do Supabase **não é avaliado** — `import()` dinâmico, coberto por
  `index.demo-source.test.ts`;
- o HTML inicial continua completo, sem nenhum estado de carregamento;
- `generatedAt` continua vindo do servidor, para que "ontem" seja igual antes e depois da
  hidratação;
- falha do Supabase **não derruba** a Home: `loadHomeMarkets` devolve `null` e o componente degrada
  para o próprio comportamento de cliente.

---

## 8. Compartilhamento e prévia

- a rota de comparação já é compartilhável;
- falta **botão de compartilhar** na tela de comparação — hoje ele só existe no Achado de destaque;
- falta **`og:image` por produto**: a rota declara `twitter:card: summary` e não declara `og:image`
  própria, então um link de produto compartilhado exibe a prévia genérica de demonstração da raiz;
- gerador dinâmico de imagem por oferta continua **fora do MVP**.

---

## 9. O que esta especificação não decide

- a **janela** do preço anterior (P-01);
- o **mecanismo de configuração** do prazo de 24 h (P-05).
