# 📘 Como usar o quadro do ViPreço

**Status: OPERACIONAL.** Este documento explica **como o quadro funciona**. Ele não decide escopo,
não cria card e não autoriza trabalho — quem decide escopo é
[`../../product/ROADMAP-MVP-v3.md`](../../product/ROADMAP-MVP-v3.md), e quem lista os cards é
[`../TRELLO-MAPPING.md`](../TRELLO-MAPPING.md).

> **Objetivo:** alguém que nunca viu o projeto deve entender o quadro em **menos de dez minutos**.
> Se você tem dez minutos, leia tudo. Se tem dois, leia as seções 1, 2 e 11.

---

## 1. O que é este quadro

O quadro do Trello é onde o trabalho do ViPreço **fica visível**. Ele não é onde o trabalho é
**decidido**.

```
   🐙 GitHub (main)          📋 Trello                💬 Chat
   ─────────────────         ─────────────           ────────────────
   fonte da verdade    →     visualização      ←     discussão e
   o que vale                do trabalho             preparação
   de verdade                em que pé está          ainda não vale
```

Três frases que evitam quase todo mal-entendido:

- **A `main` do GitHub é a fonte da verdade.** Se está mergeado na `main`, vale. Se não está, não
  vale — por mais bonito que esteja o card;
- **o Trello espelha a execução.** Ele mostra em que pé cada coisa está. Mudar um card não muda o
  projeto;
- **conversa não é decisão.** Nada existe oficialmente só porque apareceu num chat ou num card
  manual. Decisão vive em [`../MVP-DECISION-LOG.md`](../MVP-DECISION-LOG.md).

**O quadro:** [ViPreço — MVP Artemis](https://trello.com/b/ThzNvV2Y/vipreco-mvp-artemis)

---

## 2. O caminho de um card

```
                        📥 Inbox
                           ↓
                   📚 Backlog aprovado
                           ↓
                       ✅ Ready
                           ↓
                  🛠️ Em desenvolvimento
                           ↓
                  🔍 Em revisão técnica
                           ↓
                  👤 Revisão do Founder
                           ↓
                      🏁 Concluído
```

Quando aparece um impedimento, em **qualquer** etapa:

```
   qualquer etapa  →  🚧 Bloqueado  →  dependência resolvida  →  volta para a etapa adequada
```

`Bloqueado` não é castigo nem fila de esquecimento. É a lista que responde à pergunta _"por que isso
parou?"_ com um motivo concreto e escrito. Um card bloqueado sem motivo escrito é um bug do quadro.

---

## 3. O que significa cada lista

| Lista                     | Significa                                                      |
| ------------------------- | -------------------------------------------------------------- |
| 📥 **Inbox**              | ideia ou item recebido, ainda **não** aprovado                 |
| 📚 **Backlog aprovado**   | faz parte do plano, mas ainda **não** está pronto para começar |
| ✅ **Ready**              | dependências, decisões e critérios **satisfeitos**             |
| 🛠️ **Em desenvolvimento** | trabalho ativo **autorizado**                                  |
| 🔍 **Em revisão técnica** | código, testes, segurança e evidências em revisão              |
| 👤 **Revisão do Founder** | validação de produto, negócio ou apresentação                  |
| 🚧 **Bloqueado**          | existe uma dependência **concreta** impedindo avanço           |
| 🏁 **Concluído**          | trabalho aceito **com evidência real**                         |

Três confusões que custam caro:

> 🚫 **"Documentado" não significa "Ready".**
> Ter a especificação escrita não fecha dependência nenhuma.
>
> 🚫 **"PR aberto" não significa "Concluído".**
> E "PR mergeado" também não, quando o gate do card é outra coisa — veja a seção 12.
>
> 🚫 **"Conversado" não significa "Aprovado".**
> Aprovação é ato registrado, não lembrança de conversa.

---

## 4. Como ler o ID de um card

Todo card oficial começa com o ID entre colchetes: `[ID] Título`.

```
   MVP-E1-03
   ───┬── ─┬ ─┬
      │    │  └── item 03 dentro do épico
      │    └───── Épico 1 (identidade exata)
      └────────── faz parte do MVP
```

| Exemplo           | Lê-se assim                             |
| ----------------- | --------------------------------------- |
| `MVP-E1-03`       | MVP · Épico 1 · item 03                 |
| `MVP-DATA-02`     | MVP · fundação de dados · item 02       |
| `MVP-DESIGN-05`   | MVP · design · item 05                  |
| `MVP-BUSINESS-01` | MVP · atividade de negócio · item 01    |
| `MVP-DOCS-02`     | MVP · decisão ou documentação · item 02 |
| `PM-DATA-05`      | **pós-MVP** · dados · item 05           |

O prefixo `PM-` é o aviso mais importante da lista: **não faz parte do MVP atual.**

---

## 5. Os três épicos

Cada épico responde a uma pergunta do usuário — não a uma pergunta técnica.

| Épico                            | A pergunta que ele responde                          |
| -------------------------------- | ---------------------------------------------------- |
| 🎯 **E1 — Identidade exata**     | _"Estamos falando exatamente do mesmo produto?"_     |
| ⚖️ **E2 — Comparação confiável** | _"O preço pode ser comparado sem enganar?"_          |
| 📣 **E3 — Aquisição e retenção** | _"Como a pessoa encontra valor e volta ao ViPreço?"_ |

A ordem não é acidental. Sem E1, a comparação de E2 compara coisas diferentes. Sem E2, E3 traz gente
para ver um número em que não se pode confiar.

---

## 6. O que significa cada etiqueta

**As onze etiquetas oficiais.** A cor não é normativa — **o significado está no nome**.

| Etiqueta                    | Cobre                                                    |
| --------------------------- | -------------------------------------------------------- |
| `E1 — Identidade exata`     | produto, marca, variante, tamanho, GTIN e equivalência   |
| `E2 — Comparação confiável` | preço, mercado, procedência, validade, ranking e estados |
| `E3 — Aquisição e retenção` | Achados, compartilhamento, WhatsApp, analytics e retorno |
| `DATA`                      | banco, contratos, migrations, normalização e qualidade   |
| `DESIGN`                    | interface, componentes, Card v2 e experiência            |
| `SECURITY`                  | RLS, acesso, proteção, secrets e revisão de risco        |
| `BUSINESS`                  | entrevistas, mercados, piloto e validação comercial      |
| `DOCS`                      | documentação, decisões, guias e fonte da verdade         |
| `POST-MVP`                  | **não faz parte do MVP atual**                           |
| `CONNECTOR`                 | ingestão automatizada futura por fonte                   |
| `LEGAL`                     | termos, uso de fonte, consentimento e revisão jurídica   |

As etiquetas **acumulam**: um card pode ser `E1` + `DATA` + `SECURITY` ao mesmo tempo. Todo card com
`SECURITY` exige **revisão adversarial** antes de sair de `Em revisão técnica`.

**Etiquetas antigas continuam existindo** no quadro (`Infraestrutura`, `P0 — Bloqueia o Piloto`,
`P1 — Importante`, `P2 — Futuro`, `Pesquisa`, `Dados`, `Produto`, `Segurança/Compliance`,
`(-)Bloqueado` e duas sem nome). Elas são **apoio manual do Founder** e não foram apagadas nem
renomeadas. Não substituem a taxonomia oficial, e não devem ser usadas no lugar dela.

---

## 7. O que significa `Ready`

`Ready` é a lista mais fácil de estragar, porque é tentador colocar ali o que já está bem escrito.

Um card só entra em `Ready` quando **todos** os sete itens são verdadeiros:

- [ ] escopo aprovado
- [ ] dependências satisfeitas
- [ ] decisões resolvidas
- [ ] critério de aceite escrito
- [ ] fonte normativa apontada
- [ ] gate de segurança resolvido, quando existir
- [ ] **nenhuma ação humana pendente**

Dois exemplos reais deste quadro:

> ✅ **`MVP-DATA-02` está em `Ready`** porque é um relatório _read-only_ de colisões: não escreve
> nada, não altera dado, e é o passo obrigatório **antes** de qualquer aplicação futura da migration.
>
> 📚 **`MVP-E3-04` continua no `Backlog aprovado`**, mesmo com dependências fechadas e aceite escrito,
> porque a decisão que ele destrava (P-02) bloqueia **R8**, não R1. Promover é decisão do Founder/PMO.

A diferença entre os dois não é maturidade do card. É **prioridade de sequência** — e essa é uma
decisão humana.

---

## 8. Cards oficiais e cards UNMAPPED

| Tipo              | Como reconhecer                        | O que fazer                       |
| ----------------- | -------------------------------------- | --------------------------------- |
| **Card oficial**  | tem `[ID]` no título e fonte normativa | seguir o fluxo normal             |
| **Card UNMAPPED** | não tem ID oficial                     | **preservar** e não reinterpretar |

Cards UNMAPPED são cards manuais criados antes da sincronização. Eles foram **mantidos exatamente
como estavam** — sem apagar, mover, renomear ou etiquetar.

> 🚫 **Não apague um UNMAPPED só porque parece antigo.**
> 🚫 **Não transforme um UNMAPPED em oficial por semelhança de título.**

Dois deles — `Crawler Supermercados região` e `Mapeamentos Supermercados Piracicaba` — contêm o que
parecem ser conclusões dos estudos de fontes que o Founder relata e que ninguém localizou. Eles são
**pistas** sobre `TD-009` / `PM-DATA-02`, e **não** são os relatórios. Nada neles foi promovido a
evidência confirmada. Ver [`../../evidence/price-sources/README.md`](../../evidence/price-sources/README.md) §10.

Os cards `R0` a `R8` em `Próximas tarefas` são a **visão manual do Founder** e não têm equivalência
automática com os cards oficiais.

---

## 9. Pós-MVP

Todo card com a etiqueta `POST-MVP`:

- 🚫 fica **fora** de `Ready`;
- 🚫 **não** pode começar automaticamente;
- 🚧 depende de **Gate humano** (`PM-DATA-0` em diante);
- ⚖️ **não** compete com o MVP atual.

A pergunta que o Gate pós-MVP responde **não** é _"conseguimos automatizar?"_. É _"o caminho manual
falhou?"_. Enquanto essa segunda pergunta não tiver resposta medida, a trilha não começa.

---

## 10. Como criar um card novo

```
1. registrar a necessidade
2. encontrar a fonte normativa      ← se não existe, o problema é anterior ao card
3. definir ID
4. definir dependências
5. definir critério de aceite
6. definir gate
7. definir evidência
8. inserir em TRELLO-MAPPING.md
9. mergear a documentação           ← só aqui a decisão passa a existir
10. sincronizar o Trello
```

> 🚫 **Não crie decisão oficial direto no Trello.** Um card sem entrada no `TRELLO-MAPPING.md` é uma
> anotação pessoal, não um item de execução — e some na próxima reconciliação.

---

## 11. O que não fazer

```
🚫 Não mover para Ready por entusiasmo.
🚫 Não apagar card manual sem revisão.
🚫 Não iniciar pós-MVP antes do Gate.
🚫 Não marcar concluído sem evidência.
🚫 Não colocar segredo, telefone, CPF ou credencial em card.
🚫 Não mudar escopo apenas no Trello.
🚫 Não confundir preço documentado com preço válido.
🚫 Não aplicar migration apenas porque o arquivo existe.
```

O último é o que mais aparece na prática: **existir uma migration escrita não autoriza aplicá-la.**
Aplicar é Gate humano, sempre — princípio 14 do [`CLAUDE.md`](../../../CLAUDE.md).

---

## 12. Exemplo de leitura de um card

Vale a pena ler um card real inteiro, porque ele mostra a diferença entre "código pronto" e "card
concluído".

**`[MVP-DATA-01] Contrato único de normalização — migration NÃO aplicada`**

| Campo            | Conteúdo                                                                        |
| ---------------- | ------------------------------------------------------------------------------- |
| **ID**           | `MVP-DATA-01`                                                                   |
| **Objetivo**     | alinhar `pa_normalize_text()` e `normalizeSearchText()`                         |
| **Dependências** | nenhuma                                                                         |
| **Critério**     | dezesseis vetores idênticos nos dois lados; migration **criada e não aplicada** |
| **Gate**         | aplicar a migration — **não cumprido**                                          |
| **Evidência**    | PR #47, mergeado; CI, CodeQL e drill de schema verdes                           |
| **Etiquetas**    | `DATA`                                                                          |
| **Lista atual**  | 🚧 `Bloqueado`                                                                  |

**Por que está em `Bloqueado` e não em `Concluído`?** O código foi escrito, revisado e mergeado na
`main`. Mas o **gate do card** é aplicar a migration `20260803000000_normalization_contract.sql`, e
ela não foi aplicada em nenhum ambiente. Antes de aplicar, é obrigatório rodar `MVP-DATA-02`.

Essa é a regra geral: **um card vai para `Concluído` quando o gate dele fecha — não quando o PR
mergeia.** Às vezes coincide. Aqui não coincidiu.

---

## 13. Glossário

| Termo                | Em uma frase                                                                       |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Gate**             | ponto onde uma **pessoa** precisa autorizar; nenhum agente atravessa sozinho       |
| **RLS**              | _Row Level Security_ — regra no banco que decide quem lê cada linha                |
| **migration**        | arquivo versionado que altera o banco; **escrever ≠ aplicar**                      |
| **SKU**              | o produto exato: marca, variante, tamanho e embalagem, todos batendo               |
| **GTIN**             | o código de barras. É texto (preserva zeros) e **não** é a chave de produto        |
| **alias (de busca)** | apelido que ajuda a **encontrar**; nunca vira identidade                           |
| **alias (de fonte)** | vínculo de **identidade** entre item da fonte e produto — pós-MVP, e é outra coisa |
| **shadow mode**      | coletar e auditar **sem publicar nada**                                            |
| **fixture**          | dado fictício versionado, usado no lugar do banco                                  |
| **staging**          | ambiente de teste, com dados fictícios                                             |
| **production**       | ambiente real, público                                                             |
| **UNMAPPED**         | card manual ainda não reconciliado com o roadmap                                   |
| **evidência**        | prova anexada de que o critério foi cumprido — não é a promessa dela               |
| **fonte normativa**  | o documento que **decide** o assunto; o card só aponta para ele                    |

---

## 14. Estado atual do quadro

**Registrado em 03/08/2026**, contra a `main` em `af624250b159039ac4922f6b0a3de5bfbe3c39e4`.

| O quê                         | Quanto                                   |
| ----------------------------- | ---------------------------------------- |
| cards oficiais                | **56**, todos com ID único e etiquetados |
| cards não oficiais preservados | **20** — 9 de onda `R0`–`R8`, 7 do próprio Trello, 4 avulsos (ver DL-021) |
| cards arquivados              | **1** — `Teste 1`, na lista `Ideias`     |
| listas oficiais               | **8** (mais as manuais, preservadas)     |
| etiquetas oficiais            | **11**                                   |
| cards em `Ready`              | **1** — `MVP-DATA-02`                    |
| cards em `Em desenvolvimento` | **0**                                    |
| cards `POST-MVP` em `Ready`   | **0**                                    |

Distribuição: `Inbox` 2 · `Backlog aprovado` 32 · `Ready` 1 · `Em desenvolvimento` 0 ·
`Em revisão técnica` 0 · `Revisão do Founder` 0 · `Bloqueado` 17 · `Concluído` 4.

Situações que valem lembrar:

- **`MVP-E3-04`** permanece no `Backlog aprovado` — a decisão que ele destrava bloqueia R8, não R1;
- **`MVP-BUSINESS-01`** está `PAUSADO PARA PLANO DE DELEGAÇÃO`, porque envolve contato com pessoa
  real e isso exige autorização específica;
- **R1 ainda não foi iniciado.** Nenhuma linha de código de produto foi escrita desde R0;
- **nenhum dado real** de mercado, produto ou preço foi cadastrado.

---

## 15. Onde cada coisa é decidida

| Assunto                       | Documento                                                            |
| ----------------------------- | -------------------------------------------------------------------- |
| escopo de produto             | [`../../product/ROADMAP-MVP-v3.md`](../../product/ROADMAP-MVP-v3.md) |
| lista completa dos cards      | [`../TRELLO-MAPPING.md`](../TRELLO-MAPPING.md)                       |
| decisões formais              | [`../MVP-DECISION-LOG.md`](../MVP-DECISION-LOG.md)                   |
| sequência R1–R9               | [`../MVP-EXECUTION-PLAN.md`](../MVP-EXECUTION-PLAN.md)               |
| dívida técnica                | [`../TECHNICAL-DEBT-REGISTER.md`](../TECHNICAL-DEBT-REGISTER.md)     |
| governança e ações proibidas  | [`../../../PLANO-MESTRE.md`](../../../PLANO-MESTRE.md)               |
| índice de toda a documentação | [`../../INDEX.md`](../../INDEX.md)                                   |

Na dúvida entre este guia e um documento normativo, **vale o documento normativo**. Este README
explica o quadro; ele não decide nada.
