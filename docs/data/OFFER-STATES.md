# Estados da oferta e preço anterior

**Status: NORMATIVO** para E2.8 e E2.10. **Nada aqui está implementado.** Esta é a área de maior
risco do roadmap: é a única que muda o contrato público de leitura. Exige gate próprio do
Founder/PMO e sincronia obrigatória entre o domínio TypeScript e o banco.

---

## 1. O problema

Hoje existem dois sinais — `is_active` e `valid_until` — e a policy RLS de `prices` filtra os dois
no `SELECT`:

```sql
is_active = true
AND observed_at <= now()
AND (valid_until IS NULL OR valid_until >= now())
```

A consequência é que **uma oferta que vence desaparece**. O cliente anônimo não recebe "esta oferta
expirou"; ele simplesmente deixa de receber a linha. `temporalState()` sabe calcular `"expirado"`,
mas só sobre dados que já estão na mão — vindo do banco, esse estado nunca chega.

Isso torna impossíveis, hoje, dois requisitos de E2: **evitar desaparecimento silencioso** e **preço
anterior rastreável** (Card v2, itens 7 e 8), porque o histórico existe na tabela e é invisível para
`anon`.

---

## 2. Os seis estados

| Estado      | Quem muda                       | Automático | Participa do ranking ativo | Visível                       | Por quanto tempo        |
| ----------- | ------------------------------- | ---------- | -------------------------- | ----------------------------- | ----------------------- |
| `active`    | operação                        | —          | **sim**                    | sim                           | enquanto vigente        |
| `expired`   | relógio (`valid_until < now()`) | **sim**    | não                        | sim, rotulada                 | **24 h** (configurável) |
| `ended`     | mercado, pelo canal manual      | não        | não                        | sim, rotulada                 | **24 h** (configurável) |
| `sold_out`  | mercado ou aviso de morador     | não        | não                        | sim, rotulada                 | **24 h** (configurável) |
| `corrected` | operação                        | não        | não                        | **não** como preço utilizável | —                       |
| `removed`   | operação                        | não        | não                        | **não**                       | —                       |

**Regra inicial do mandato §8, literal:** ativa participa da comparação; encerrada, esgotada ou
expirada não participam do ranking ativo e podem permanecer explicadas publicamente por até 24 horas;
o prazo é configurável; corrigida e removida não permanecem como preço utilizável; o histórico
interno preserva auditoria.

**Onde o prazo é configurado ainda não está decidido — P-05.** Constante versionada, variável de
ambiente ou coluna são as três formas plausíveis, e a escolha pertence a R8.

### Transições permitidas

```
active ──► expired     (relógio)
active ──► ended       (mercado)
active ──► sold_out    (mercado ou aviso)
active ──► corrected   (operação, junto com a publicação do preço novo)
qualquer ──► removed   (operação)
```

`expired`, `ended` e `sold_out` **não voltam** para `active`. Uma oferta que voltou a valer é uma
observação nova, com data nova. É o que preserva a procedência.

---

## 3. Leitura pública controlada

**O mandato §8 é explícito: não ampliar a policy pública da tabela `prices`.**

A razão é o princípio 4 — leitura pública mínima. Ampliar a policy daria ao anônimo acesso a toda a
linha de todo preço histórico, incluindo `source_reference`, que carrega texto operacional
("Nota fiscal conferida", "Lista enviada pelo mercado") e que ninguém revisou pensando em
publicação.

O desenho é uma **superfície de leitura própria**, expondo só os campos públicos necessários:

```
leitura pública de oferta (view, RPC ou equivalente)
 ├── product_id, market_id
 ├── price
 ├── source_type          (rótulo e nível de evidência já são públicos)
 ├── observed_at, valid_until
 ├── offer_state
 ├── promotion_type, promotion_params, special_condition
 └── previous_price, previous_observed_at    (derivados — §5)
     ✗ source_reference            — texto operacional, não revisado para público
     ✗ is_featured                 — não deve influenciar nem parecer influenciar
     ✗ created_at, updated_at      — sem uso público
     ✗ is_demo                     — não é separação (D9)
```

A superfície entrega apenas ofertas com `offer_state` em `{active, expired, ended, sold_out}` e,
para as três últimas, apenas dentro da janela configurada. `corrected` e `removed` **nunca** saem.

Forma concreta (view com `security_invoker`, função `SECURITY DEFINER` com `STABLE`, ou outra) é
decisão de R8, com revisão de segurança própria.

### A regra que não pode quebrar

`CLAUDE.md`, princípio inviolável #2: a regra de preço vigente vive em `isValidPrice()` **e** no
banco, e as duas ficam em sincronia sempre.

Depois desta mudança, a formulação continua a mesma — só muda onde cada metade age:

- **o banco** decide o que pode ser lido (ofertas recentes, não removidas, dentro da janela);
- **`isValidPrice()`** decide o que é vigente, e só o vigente entra em
  `latestValidPricePerMarket()`.

Uma oferta `expired` chega ao cliente, é rotulada, e **nunca** entra na lista orgânica — logo nunca
vira "menor preço". Migration e código no mesmo PR, com teste dos dois lados.

---

## 4. Histórico e auditoria

Tabela `price_events`, append-only, sem dado pessoal:

| Campo                    | Regra                                      |
| ------------------------ | ------------------------------------------ |
| `price_id`               | oferta afetada                             |
| `from_state`, `to_state` | transição                                  |
| `changed_at`             | instante                                   |
| `source`                 | `clock`, `market`, `operator`, `community` |
| `note`                   | texto curto, opcional, sem dado pessoal    |

É o que torna auditável a operação manual que hoje vive numa planilha fora do repositório
(`docs/mvp/MANUAL-OFFER-OPERATIONS.md` §8). **Não** é superfície pública: leitura só por
`service_role`.

---

## 5. Preço anterior

**Decisão (DL-008):** o preço anterior é derivado de uma **observação anterior real**. Nunca de um
campo livre.

### Regra de seleção

A observação anterior é aquela que satisfaz, ao mesmo tempo:

1. mesmo `product_id`;
2. mesmo `market_id`;
3. estado aprovado — publicada, e não `corrected` nem `removed`;
4. `observed_at` estritamente anterior ao da oferta atual;
5. `observed_at` **conhecido** — nunca inferido de `created_at`;
6. dentro da janela de comparação — **P-01, não decidida**.

Havendo mais de uma candidata, vence a mais recente. Empate em `observed_at` resolve por
`created_at` e depois por `id`, o mesmo desempate de `compareRecency()`.

### Ausência

Não havendo candidata, **não há preço anterior**, e a interface não exibe nada. Ausência é estado
normal: dois dos três Achados do fixture atual já existem sem `previous_price`, de propósito.

**Proibido:** preencher com o preço de outro mercado, com média, com preço "de tabela" ou com
qualquer valor sem procedência. É o que o princípio 2 protege.

### Percentual e arredondamento

```
variação = (price − previous_price) ÷ previous_price × 100
```

- exibido com **zero casas decimais** e sinal explícito;
- variação com módulo abaixo de 1% **não é exibida** — ruído de arredondamento não é notícia;
- o cálculo usa a precisão cheia; só a exibição arredonda;
- `previous_price` só entra no cálculo com `previous_observed_at` exibido ao lado. Percentual sem
  data é número sem procedência.

### Correção

Quando um preço é corrigido, o registro antigo vai para `corrected` e **deixa de ser candidato** a
preço anterior. Um erro de digitação corrigido não pode virar "caiu 40%".

### Testes necessários

1. observação anterior selecionada é a mais recente dentro da janela;
2. observação de **outro mercado** nunca é selecionada;
3. observação `corrected` ou `removed` nunca é selecionada;
4. ausência de candidata não exibe nada e não quebra o card;
5. percentual com módulo < 1% não é exibido;
6. arredondamento comercial em `.5`;
7. oferta `expired` nunca entra em `latestValidPricePerMarket()`;
8. a superfície pública nunca devolve `source_reference`, `is_featured` nem `is_demo`;
9. `isValidPrice()` e a leitura do banco concordam sobre o mesmo conjunto de vigentes;
10. `corrected` e `removed` nunca aparecem em nenhuma superfície pública.

---

## 6. Risco

Esta é a mudança que **o público enxerga**. Um erro aqui exibe preço vencido como vigente — o
oposto exato do que o produto promete. Mitigações obrigatórias:

- migration e código no mesmo PR;
- drill de reconstrução de schema (`db-schema-drill.yml`) verde antes do merge;
- revisão adversarial focada em "consigo fazer um preço não vigente aparecer como menor preço?";
- gate humano para aplicar, separado do gate para mergear.
