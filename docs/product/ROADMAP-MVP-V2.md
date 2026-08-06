# Roadmap MVP V2 — duas trilhas, uma sequência

**Status: NORMATIVO** para o roadmap do MVP a partir de **06/08/2026**. Substitui
[`ROADMAP-MVP-v3.md`](./ROADMAP-MVP-v3.md) como roadmap, e o incorpora por referência no que
ele decidiu sobre **escopo**.

**Origem:** mandato do Founder/PMO de 06/08/2026 (R3.2B + Roadmap MVP V2 + B2B-0/B2B-1), que
aprovou o North Star V2 como proposta para consolidar o roadmap, **sujeito aos contratos
funcionais e de dados da `main`**.

---

## 0. O nome, antes que ele confunda alguém

**`V2` aqui não é uma versão anterior ao `v3`.** São duas numerações de coisas diferentes que
se cruzaram por acidente de nomenclatura:

| Documento           | O que numera                                               |
| ------------------- | ---------------------------------------------------------- |
| `ROADMAP-MVP-v3.md` | a **terceira revisão do escopo** de produto (02/08/2026)   |
| `ROADMAP-MVP-V2.md` | o **segundo roadmap**, o que acompanha o **North Star V2** |

O `v3` continua legível e continua valendo no que ele decidiu — os três épicos, a lista fechada
de "Fora do MVP", os habilitadores. O que este documento faz é o que o `v3` **não** fazia:
registrar **duas trilhas paralelas** (consumidor e mercado) e a ordem real de execução depois de
R3.1 ter sido entregue.

Nada do `v3` foi apagado. Ele recebeu a marcação de substituição no cabeçalho, com link para
cá, e permanece como registro histórico e como fonte das seções que este documento incorpora.

---

## 1. Definição do produto — inalterada

> O ViPreço ajuda o usuário a encontrar, reconhecer e comparar o mesmo produto entre diferentes
> mercados, com preço, mercado, fonte, data e validade.

**A comparação é o núcleo.** Achados e WhatsApp são aquisição, descoberta e retenção — não são
o produto. Isso não muda com o North Star V2, e o North Star V2 não teria autoridade para mudar:
mockup é direção visual, contrato é lei
([`VISUAL-IMPLEMENTATION-CONTRACT.md`](./VISUAL-IMPLEMENTATION-CONTRACT.md) §2).

---

## 2. O que este documento incorpora sem reescrever

Continuam valendo, na íntegra, e são lidos em [`ROADMAP-MVP-v3.md`](./ROADMAP-MVP-v3.md):

| Seção do `v3`               | O que continua valendo                                       |
| --------------------------- | ------------------------------------------------------------ |
| §2 — os três épicos         | E1 identidade exata · E2 comparação confiável · E3 aquisição |
| §3 — habilitadores          | segurança, RLS, SSR, performance, imagens, acessibilidade    |
| §4 — **Fora do MVP**        | lista **fechada**, incluindo a proibição de similar          |
| §6 — o que continua verdade | dados reais bloqueados, produção vazia, PR #44 preservado    |

Copiar essas listas para cá criaria duas verdades sobre o mesmo assunto. Elas ficam onde estão.

---

## 3. Trilha B2C — o produto do consumidor

| Etapa    | Entrega                                           | Estado                            |
| -------- | ------------------------------------------------- | --------------------------------- |
| **R0**   | Governança e rebaseline                           | **concluída**                     |
| **R1**   | Produto exato e equivalência                      | **concluída**                     |
| **R2**   | Dados e segurança em staging                      | **concluída**                     |
| **R3.0** | North Star original                               | **concluída**                     |
| **R3.1** | Fundação visual — tokens, primitivas, laboratório | **concluída** (PR #78, `4362efa`) |
| **R3.2** | Card v2 de produto exato                          | **concluída** (PR #89, `4222332`) |
| **R3.3** | Home / Achados                                    | **em desenvolvimento**            |
| **R4**   | Busca por produto exato                           | futura                            |
| **R5**   | Comparação do mesmo produto                       | futura                            |
| **R6**   | Detalhe, imagens, promoções e estados             | futura                            |
| **R7**   | WhatsApp, analytics, acessibilidade e QA          | futura                            |
| **R8**   | Produção, domínio e segurança final               | futura                            |
| **R9**   | Piloto Artemis                                    | preparação comercial iniciada     |

### A mudança de ordem, e o que ela custou registrar

Até 05/08/2026 conviviam duas ordens: o roadmap visual de
[`R3-COMPONENT-INVENTORY.md`](./R3-COMPONENT-INVENTORY.md) §2 punha o **Card v2 antes da Home**
(R3.2 → R3.3), e o [`MVP-EXECUTION-PLAN.md`](../pmo/MVP-EXECUTION-PLAN.md) punha o Card v2 em
**R6**, depois de busca e comparação.

O conflito estava registrado, não resolvido, e a nota que o registrava dizia o motivo de não o
resolver sozinho: mudar a etapa dos cards seria reescrever um plano normativo a partir de uma
ordem que veio em mandato mas nunca virou decisão.

**Este documento é a decisão.** Vale a ordem acima — a **opção A** daquela nota. O registro está
em [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) DL-028.

---

## 4. Trilha B2B — o mercado

Ela não é uma fase do produto do consumidor: **corre em paralelo**, e existe porque o piloto
depende de mercados reais que ainda não foram ouvidos.

| Etapa     | Entrega                                | Estado                                    |
| --------- | -------------------------------------- | ----------------------------------------- |
| **B2B-0** | página `/para-mercados` para validação | **concluída** (PR #93, `dd350b7`)         |
| **B2B-1** | roteiro, materiais e entrevistas       | materiais prontos; **campo não iniciado** |
| **B2B-2** | síntese dos aprendizados               | futura                                    |
| **B2B-3** | recrutamento e onboarding dos mercados | futura                                    |
| **B2B-4** | relatório simples do piloto            | futura                                    |
| **B2B-5** | painel para mercados                   | **pós-MVP**                               |

**B2B-1 tem um gate que não é técnico.** Contato com pessoa real exige autorização específica do
Founder — `PLANO-MESTRE.md` §11 e o card MVP-BUSINESS-01. Escrever o roteiro é trabalho do CTO;
ir a campo é decisão do Founder, e nenhuma entrevista foi realizada.

---

## 5. Dependências entre as trilhas

```
R3.2 Card v2 ──► R3.3 Home ──► R4 busca ──► R5 comparação ──► R6 detalhe ──► R7 QA ──► R8 produção ──► R9 piloto
      │                                                                                      ▲
      └──► B2B-0 /para-mercados ──► B2B-1 entrevistas ──► B2B-2 síntese ──► B2B-3 onboarding ─┘
                                          │
                                          └──► alimenta o escopo de R6/R7 com o que os mercados de fato conseguem enviar
```

As dependências que o mandato fixou, uma a uma:

| Dependência                                              | Por quê                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Card v2 antes da Home**                                | a Home é uma lista de cards; desenhar a lista antes da unidade é desenhar duas vezes |
| **Home antes da implementação final da busca**           | a busca desemboca na Home; a ordem da página decide onde ela nasce                   |
| **Entrevistas antes de consolidar promessas B2B**        | promessa feita antes de ouvir é promessa que o piloto vai ter que desdizer           |
| **Dados reais somente após os Gates**                    | `PLANO-MESTRE.md`; nenhum mercado real, nenhum preço real sem autorização registrada |
| **Produção somente em R8**                               | produção continua vazia, no `workers.dev`, sem DNS próprio                           |
| **Piloto somente após os Gates de qualidade e operação** | o piloto é o primeiro contato com pessoas de verdade                                 |

---

## 6. O que continua fechado

Nada aqui abre porta. Continuam bloqueados, cada um pelo seu gate:

- **backfill de quantidade (MVP-E1-08)** — proibido;
- **produção** — não contatada, e nada nesta trilha a contata;
- **deploy** — nenhum, em nenhuma das duas trilhas;
- **dado real, nome real de mercado, GTIN visível** — nenhum;
- **variante patrocinada do card** — sem contrato normativo na `main`, não se desenha;
- **migration** — nenhuma é aplicada sem gate humano;
- **`VALIDATE CONSTRAINT`** — segue no seu próprio gate;
- **painel para mercados (B2B-5)** — pós-MVP, e continua pós-MVP.

---

## Documentos relacionados

- [`ROADMAP-MVP-v3.md`](./ROADMAP-MVP-v3.md) — escopo: épicos, habilitadores, "Fora do MVP"
- [`NORTH-STAR-V2-ASSESSMENT.md`](./NORTH-STAR-V2-ASSESSMENT.md) — a matriz de decisões do North Star V2
- [`VISUAL-IMPLEMENTATION-CONTRACT.md`](./VISUAL-IMPLEMENTATION-CONTRACT.md) — direção visual e hierarquia de autoridade
- [`R3-COMPONENT-INVENTORY.md`](./R3-COMPONENT-INVENTORY.md) — componentes e critérios de entrada e saída por etapa
- [`../pmo/MVP-EXECUTION-PLAN.md`](../pmo/MVP-EXECUTION-PLAN.md) — o detalhamento por etapa
- [`../pmo/MVP-DECISION-LOG.md`](../pmo/MVP-DECISION-LOG.md) — DL-028 a DL-031
- [`../business/interviews/README.md`](../business/interviews/README.md) — o kit de B2B-1 (DL-031)
