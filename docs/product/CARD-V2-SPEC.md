# Card v2 — especificação de anatomia

**Status: NORMATIVO** para o alvo. **Nada aqui está implementado. O Card v2 não foi iniciado.**

O Card v2 **evolui** o `AchadoCard` da Parte 2; não o substitui. A anatomia atual foi auditada e
sobreviveu sem reparo — o que falta é dado, não desenho.

---

## 1. O que o card não faz — e continua não fazendo

Regras da Parte 2, herdadas integralmente e cobertas por teste:

- **não inventa validade.** Sem `valid_until`, nenhum chip e nenhum estado "termina em breve";
- **não inventa preço anterior.** A ausência é o estado normal;
- **não afirma gôndola observada** fora das origens que de fato observaram a gôndola
  (`weekly_audit`, `shelf_photo`);
- **não cria urgência.** Nenhuma contagem regressiva, nenhum "publicado agora", nenhum "últimas
  unidades";
- **cor nunca é o único canal.** A tarja temporal é decorativa (`aria-hidden`) e tudo o que ela
  sugere está escrito em texto na linha de procedência;
- o preço composto em dois tamanhos fica fora da árvore de acessibilidade, e `spokenPrice()` entrega
  "26 reais e 49 centavos" no lugar.

---

## 2. Os 17 itens

| #   | Item                           | Estado     | O que falta                                                                               |
| --- | ------------------------------ | ---------- | ----------------------------------------------------------------------------------------- |
| 1   | foto ou placeholder            | **novo**   | [`../data/IMAGE-POLICY.md`](../data/IMAGE-POLICY.md)                                      |
| 2   | nome canônico                  | parcial    | hoje concatena nome+marca+variante no título; separar                                     |
| 3   | marca                          | parcial    | campo próprio, não embutido no título                                                     |
| 4   | variante                       | parcial    | idem                                                                                      |
| 5   | tamanho                        | **pronto** | passa a vir de `quantity_value`+`quantity_unit`                                           |
| 6   | preço atual                    | **pronto** | —                                                                                         |
| 7   | preço anterior rastreável      | **novo**   | [`../data/OFFER-STATES.md`](../data/OFFER-STATES.md) §5 · depende de P-01                 |
| 8   | percentual calculável          | **novo**   | consequência do item 7                                                                    |
| 9   | preço por kg / litro / unidade | **novo**   | [`../data/MVP-DATA-CONTRACT.md`](../data/MVP-DATA-CONTRACT.md) §2                         |
| 10  | mercado                        | **pronto** | —                                                                                         |
| 11  | bairro                         | parcial    | o card mostra a localidade do piloto fixa; passar a mostrar `neighborhood` + `city` (D12) |
| 12  | fonte                          | **pronto** | `SourceBadge`, 6 origens, 4 níveis de evidência                                           |
| 13  | atualização                    | **pronto** | data absoluta + dia relativo, no fuso do piloto                                           |
| 14  | validade                       | **pronto** | chip, só quando informada                                                                 |
| 15  | promoção                       | parcial    | tipificada — [`../data/PROMOTION-TYPES.md`](../data/PROMOTION-TYPES.md)                   |
| 16  | estado                         | parcial    | os quatro estados públicos, em texto                                                      |
| 17  | CTA "Comparar em X mercados"   | parcial    | contagem — [`COMPARISON-SPEC.md`](COMPARISON-SPEC.md) §6                                  |

**6 prontos · 6 parciais · 5 novos.** Nenhum exige redesenho estrutural do componente.

---

## 3. Ordem visual

De cima para baixo, preservando a anatomia atual e encaixando o que é novo:

```
┌─ tarja temporal (decorativa)
│  imagem ou placeholder                    ← novo (1)
│  chip de origem            chip de validade
│  nome · marca · variante                  ← separados (2,3,4)
│  quantidade                               ← estruturada (5)
│  PREÇO         antes R$ X  (−12%)         ← novo (7,8)
│  preço por kg / L / un                    ← novo (9)
│  mercado · bairro · cidade                ← cidade (11)
│  data · dia relativo · origem
│  condição (tipificada + texto)            ← tipificada (15)
│  estado, quando não ativo                 ← novo (16)
│  [ Comparar em N mercados ]               ← contagem (17)
└─ [ compartilhar ]  (só no destaque)
```

---

## 4. Regras de exibição dos itens novos

**Imagem (1).** Só com `image_review_status = approved` **e** `image_variant_match = exact`.
Qualquer outra combinação renderiza placeholder de categoria. Nenhuma aproximação.

**Preço anterior e percentual (7, 8).** Só com observação anterior real do mesmo produto no mesmo
mercado. Percentual com módulo abaixo de 1% não é exibido. Nunca aparece sem a data da observação
anterior ao lado — percentual sem data é número sem procedência.

**Preço unitário (9).** Só com `calculation_status = ok`. Nunca é o número principal. Nunca é o
critério de ordenação da lista orgânica.

**Estado (16).** Quando `active`, nada é escrito — o estado normal não precisa de rótulo. Quando
`expired`, `ended` ou `sold_out`, o rótulo é explícito, em texto, e o card sai da lista orgânica.

**Promoção (15).** O preço efetivo, quando exibido, aparece **dentro** da linha da condição, com a
quantidade que o produz escrita. Nunca sozinho, nunca como número principal.

---

## 5. Acessibilidade

Herdado e obrigatório:

- alvo de toque de no mínimo 48 × 48 px em todo controle;
- foco visível;
- `h2` para o título do card, porque ele vive sob o `h1` da primeira dobra;
- preço composto fora da árvore de acessibilidade, com `spokenPrice()` no lugar;
- imagem de produto é ilustrativa: `alt` curto e factual, sem repetir o card inteiro; placeholder é
  decorativo (`alt=""`, `aria-hidden`);
- variação percentual precisa de rótulo textual — "12% mais barato que em 28/07", não só "−12%" com
  cor.

---

## 6. Duas ênfases, uma anatomia

`destaque` e `secundario` continuam sendo as duas ênfases da **mesma** anatomia. O destaque domina a
composição e é o único que recebe a ação de compartilhar — repetir o compartilhamento em cada card
transforma a lista num mural de botões.

Com imagem, o destaque passa a carregar o LCP da Home: `fetchpriority="high"` só nele, `lazy` nos
demais, e nenhuma imagem no carrossel secundário antes do primeiro scroll.
