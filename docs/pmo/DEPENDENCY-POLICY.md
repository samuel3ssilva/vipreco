# Política de dependências

**Status: NORMATIVO.** Decisão do Founder/PMO de 03/08/2026, fechando a pergunta aberta P-04
(decisão D10 em [`MVP-DECISION-LOG.md`](MVP-DECISION-LOG.md)).

---

## 1. A política

| Situação                                  | Regra                                                               |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Qualquer atualização                      | **nenhum auto-merge**, em nenhuma hipótese                          |
| Vulnerabilidade **crítica ou alta**       | PR isolado, revisão prioritária, testes completos, **merge manual** |
| Vulnerabilidade **moderada ou baixa**     | revisão periódica, sem auto-merge                                   |
| Patch/minor **sem relação com segurança** | agrupáveis por ecossistema **quando comprovadamente seguras**       |
| **Major version**                         | PR próprio, breaking changes avaliadas uma a uma, aprovação humana  |
| Dependência **não utilizada**             | remoção em PR próprio                                               |
| CI ou CodeQL **vermelho**                 | **merge proibido**                                                  |
| Alteração inesperada de lockfile          | **investigação obrigatória** antes de qualquer merge                |

"Comprovadamente seguras" é literal: o agrupamento de patch/minor exige que alguém tenha
verificado que o conjunto passa em lint, teste e build juntos — não que o Dependabot os tenha
juntado.

"Alteração inesperada de lockfile" quer dizer qualquer mudança em `bun.lock` que não seja
consequência direta da versão declarada no PR. Um lockfile que muda mais do que deveria é a
assinatura clássica de comprometimento de cadeia de suprimentos, e o projeto já trata supply
chain como superfície de segurança (`docs/security/`).

---

## 2. Inventário dos seis PRs abertos

Auditoria **somente leitura** de 03/08/2026. **Nenhuma branch foi atualizada, nenhum PR foi
mergeado, fechado ou teve auto-merge habilitado, e nenhuma dependência foi alterada.**

**Alertas do Dependabot abertos no repositório: zero.** Os seis são manutenção, não segurança —
o que já os coloca fora da faixa de revisão prioritária da tabela acima.

| PR                                                    | Pacote                       | Atual   | Proposta | Tipo           | Natureza   | Breaking provável                                    | Estado registrado                    |
| ----------------------------------------------------- | ---------------------------- | ------- | -------- | -------------- | ---------- | ---------------------------------------------------- | ------------------------------------ |
| [#3](https://github.com/samuel3ssilva/vipreco/pull/3) | `actions/checkout`           | 4.4.0   | 7.0.1    | **major** (×3) | manutenção | **sim** — muda o runtime da action em seis workflows | CI verde · `MERGEABLE/BEHIND`        |
| [#4](https://github.com/samuel3ssilva/vipreco/pull/4) | `typescript` (dev)           | 5.9.3   | 7.0.2    | **major** (×2) | manutenção | **sim, confirmado**                                  | **CI vermelho** · `MERGEABLE/BEHIND` |
| [#5](https://github.com/samuel3ssilva/vipreco/pull/5) | `@eslint/js` (dev)           | 9.39.5  | 10.0.1   | **major**      | manutenção | **sim, confirmado**                                  | **CI vermelho** · `MERGEABLE/BEHIND` |
| [#6](https://github.com/samuel3ssilva/vipreco/pull/6) | `zod`                        | 3.25.76 | 4.4.3    | **major**      | manutenção | **sim** — API de v4 tem mudanças amplas              | CI verde · `MERGEABLE/BEHIND`        |
| [#7](https://github.com/samuel3ssilva/vipreco/pull/7) | `@vitejs/plugin-react` (dev) | 5.2.0   | 6.0.4    | **major**      | manutenção | provável                                             | CI verde · `MERGEABLE/BEHIND`        |
| [#8](https://github.com/samuel3ssilva/vipreco/pull/8) | `eslint` (dev)               | 9.39.5  | 10.8.0   | **major**      | manutenção | **sim**                                              | CI verde · `MERGEABLE/BEHIND`        |

Os seis são **major**. Nenhum é agrupável, pela regra da tabela §1.

Os resultados de CI são os últimos registrados (28–31/07), contra uma `main` anterior. Todos
estão `BEHIND` — nenhum foi rebaseado desde então, de propósito.

### As duas falhas, com a causa exata

- **#4 — TypeScript 7:** `Error: typescript-eslint does not support TS 7.0.` A ferramenta de
  lint do projeto ainda não suporta a versão. **Bloqueado por dependência externa**, não por
  código do ViPreço.
- **#5 — `@eslint/js` 10:** `error This assigned value is not used in subsequent statements
no-useless-assignment`. A regra `no-useless-assignment` passou a ser erro; um trecho do
  código precisa ser ajustado antes.

### Dependências entre PRs

| Vínculo                                                                        | Consequência                                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **#5 e #8** (`@eslint/js` e `eslint`)                                          | são o mesmo ecossistema e a mesma major. Mergear um sem o outro deixa o lint em versões incoerentes — **entram juntos ou não entram** |
| **#4** (TypeScript 7) depende de `typescript-eslint`                           | só pode avançar quando `typescript-eslint` publicar suporte a TS 7                                                                    |
| **#6** (zod 4) toca `validateSearch` de `/buscar` e os resolvers de formulário | precisa de leitura do código, não só de CI verde                                                                                      |
| **#3** (`actions/checkout`)                                                    | isolado dos demais — só workflows                                                                                                     |

### Ordem recomendada

Recomendação do CTO. **Nenhum destes passos está autorizado.**

1. **#3** — `actions/checkout`, o mais isolado e o único que não toca no bundle;
2. **#7** — `@vitejs/plugin-react`, atinge só o build;
3. **#5 + #8 juntos** — depois de corrigir o `no-useless-assignment` que o lint novo acusa;
4. **#6** — zod 4, com leitura do código que usa Zod, não só CI verde;
5. **#4** — TypeScript 7, **bloqueado** até `typescript-eslint` suportá-lo.

### Recomendação de janela

Não durante R1 e R2. Um schema novo e três majors de ferramenta chegando juntos tornam
impossível dizer qual dos dois quebrou o que. A janela natural é **depois de R2**, com a
estrutura de dados estabilizada.

---

## 3. O que esta política não faz

Não autoriza merge de nenhum dos seis. Não habilita auto-merge. Não altera nenhuma
dependência. Mergear qualquer um continua sendo gate humano, como todo merge neste projeto
(`PLANO-MESTRE.md` §0).
