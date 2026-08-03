# Taxonomia de eventos do MVP

**Status: NORMATIVO** para E3.5–E3.7. **Nada aqui está implementado. Nenhuma ferramenta foi
instalada. Nenhum evento é coletado hoje.**

Decisão de arquitetura (D5/DL-010): **analytics first-party, endpoint no Worker.**

---

## 1. Arquitetura decidida

- **first-party** — o dado não sai para terceiro;
- **endpoint no Worker**, no mesmo domínio do produto. `connect-src 'self'` do CSP atual já cobre;
- **lista fechada de eventos.** Evento fora da lista é rejeitado, não "aceito e ignorado";
- **validação server-side.** O navegador propõe; o servidor decide;
- **nenhuma escrita pública direta em tabela de negócio** (princípio 5). `markets`, `products` e
  `prices` continuam sem escrita de anônimo, por nenhum caminho;
- **nenhuma SDK de publicidade. Nenhuma ferramenta de terceiro nesta fase.**

### O que isto exige antes de existir

O endpoint é uma **superfície de escrita nova**. As três superfícies fechadas na Onda 3 foram
fechadas exatamente por serem escrita anônima sem proteção server-side. Reabrir uma — mesmo em
tabela que não é de negócio — exige o mesmo rito: endpoint controlado, validação, proteção
anti-abuso, teste de bypass, migration própria e gate do Founder/PMO.

---

## 2. Eventos

| Evento                 | Quando                                         | Propriedades                                   |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `page_view`            | carregamento de rota                           | `route`, `app_mode`                            |
| `search_started`       | primeira tecla numa sessão                     | `entry_point`                                  |
| `search_submitted`     | consulta disparada (≥ 2 letras, após debounce) | `term_length`, `looks_like_gtin`               |
| `search_result`        | resultado com itens                            | `result_count`, `has_exact`                    |
| `search_empty`         | resultado vazio                                | `term_length`                                  |
| `product_selected`     | escolha na lista de resultados                 | `product_id`, `position`, `match_type`         |
| `comparison_opened`    | abertura da tela de comparação                 | `product_id`, `market_count`, `discovery_mode` |
| `market_viewed`        | oferta visível por ≥ 1 s                       | `market_id`, `rank`                            |
| `map_opened`           | clique em "Ver endereço"                       | `market_id`                                    |
| `finding_shared`       | desfecho do compartilhamento                   | `outcome`, `product_id`                        |
| `whatsapp_cta_clicked` | clique em CTA de WhatsApp                      | `surface`, `variant`                           |
| `opt_in_started`       | início de opt-in                               | `surface`                                      |

Valores fechados:

- `match_type`: `exact` \| `size_variant` \| `similar`
- `discovery_mode`: **`finding_discovery`** \| **`intentional_search`** \| `external_link`
- `outcome`: `compartilhado` \| `whatsapp-aberto` \| `link-copiado` \| `cancelado` \| `erro`
  — os mesmos desfechos que `src/lib/share.ts` já distingue
- `surface`: `home` \| `para-mercados` \| `comparacao`
- `variant`: `fluxo` \| `fixo`
- `app_mode`: `demo` \| `piloto`

### A separação que define o funil

`discovery_mode` distingue as duas maneiras de chegar à comparação:

- **`finding_discovery`** — a pessoa não procurava aquilo. Viu um Achado e clicou;
- **`intentional_search`** — a pessoa procurava aquilo. Digitou e escolheu;
- `external_link` — chegou por um link compartilhado.

Sem essa separação o funil não responde a pergunta que importa: os Achados **criam** demanda ou
apenas **atendem** demanda que já existia? Uma propriedade resolve isso sem nenhum evento a mais:

```
visita → (search_submitted | finding_discovery) → comparison_opened → (map_opened | finding_shared | opt_in_started)
```

---

## 3. Proibido no payload

Nenhum evento pode carregar:

- telefone
- mensagem do WhatsApp
- nome
- e-mail
- CPF
- cupom fiscal
- **texto livre** — inclusive o termo de busca. Só o **tamanho** do termo é coletado
- fingerprint de dispositivo ou de navegador
- identificador persistente desnecessário

**Sessão:** identificador efêmero em memória, gerado por carregamento de documento, **não
persistido** — sem cookie, sem `localStorage`, sem `sessionStorage`. Ele serve para ligar eventos da
mesma visita e morre com a aba. Não liga visitas, não liga dispositivos, não liga pessoas.

**Instante:** truncado na hora. Minuto e segundo não acrescentam nada à análise do piloto e
aproximam o registro de identificar uma visita específica.

**IP:** não é armazenado. O Worker o vê para responder e não o repassa.

Isso é o princípio 7 aplicado: o produto funciona sem login e sem rastreio, e um evento que precisa
de dado pessoal para ser útil é um evento errado.

---

## 4. ADR — tecnologia de armazenamento (**não decidida**)

O mandato §13 exige registrar alternativas e proíbe escolher ou instalar sem spike e novo gate.
Esta seção é o registro. **Pergunta aberta P-02.**

### Contexto

O endpoint no Worker já está decidido. Falta decidir **onde os eventos validados são gravados** e
como são lidos para o dashboard mínimo do piloto.

### Alternativa A — logs estruturados

Evento validado vira uma linha de log estruturado do próprio Worker; a leitura é por consulta ao
mecanismo de logs da plataforma.

- **a favor:** nenhuma tabela nova, nenhuma migration, nenhuma superfície de leitura nova; custo
  próximo de zero no volume do piloto;
- **contra:** retenção curta e fora do nosso controle; agregação trabalhosa; nada de consulta SQL
  ad-hoc; o dado não sobrevive a uma troca de plataforma.

### Alternativa B — mecanismo analítico da plataforma

Usar o recurso analítico do próprio provedor de borda, alimentado pelo Worker.

- **a favor:** agregação e retenção resolvidas; sem infraestrutura própria;
- **contra:** modelo de dado imposto (dimensões e índices limitados); acoplamento a um fornecedor;
  precisa ser verificado se opera sem script no cliente — com script, cai em `script-src` e vira
  mudança de CSP e de política de terceiros.

### Alternativa C — armazenamento agregado first-party

Tabela própria no Supabase, **fora** das tabelas de negócio, escrita apenas pelo Worker com
`service_role` no servidor, com agregação diária e descarte do detalhe.

- **a favor:** controle total do esquema e da retenção; consulta SQL direta para o dashboard do
  piloto; sem terceiros;
- **contra:** é a que mais se aproxima de "superfície de escrita nova" e por isso a que exige o gate
  mais pesado; precisa de política de retenção explícita e de RLS que negue leitura pública.

### Decisão

**Nenhuma.** Requer spike (medir volume real, custo e esforço de leitura) e novo gate do
Founder/PMO. Enquanto isso, nada é instalado.

Restrição que vale para as três: **nenhuma delas pode introduzir script de terceiro no cliente.**
Isso mudaria `script-src` e a política de terceiros, e não está autorizado.

---

## 5. Dashboard mínimo do piloto

Sete números por semana, e nada além disso:

1. visitas
2. buscas submetidas
3. buscas vazias
4. comparações abertas — separadas por `discovery_mode`
5. mapas abertos
6. compartilhamentos concluídos
7. cliques em CTA de WhatsApp

Não precisa de ferramenta. Precisa de uma consulta e de alguém lendo uma vez por semana.

---

## 6. Opt-in

`opt_in_started` está na lista, mas **o fluxo de opt-in não existe** e não é especificado aqui. Ele
depende de decisão de produto e de privacidade que ainda não foi tomada. O evento fica reservado na
taxonomia para não precisar renumerar depois.
