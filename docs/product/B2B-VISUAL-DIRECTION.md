# B2B VISUAL DIRECTION — FUTURE POLISH REFERENCE

**Status:** referência de backlog. **Nada aqui está implementado, e nada aqui autoriza implementar.**
**Rota afetada no futuro:** `/para-mercados` · **Rota alterada nesta rodada:** nenhuma.

R3.3C §13 mandou registrar a direção visual da frente B2B e proibiu tocá-la:

> "NÃO alterar /para-mercados dentro do PR #97. B2B-0 já foi mergeada. Registrar a referência
> como: B2B VISUAL DIRECTION — FUTURE POLISH REFERENCE. Registrar no backlog/documentação
> visual, sem implementar agora. Não abrir nova frente B2B nesta missão."

Este arquivo é esse registro. `/para-mercados` não foi tocada no PR #97, e o guarda de escopo de
`src/routes/index.escopo.test.ts` reprova qualquer alteração nela — a rota está na lista de
`INTOCAVEIS`, junto com busca, comparação, detalhe e banco.

---

## O que existe hoje, e o que foi recebido

**O que existe:** `/para-mercados` na versão **B2B-0**, mergeada no PR
[#93](https://github.com/samuel3ssilva/vipreco/pull/93), com shell próprio, CTA fixo de WhatsApp e
a copy decidida pelo Founder. As capturas dela vivem em `docs/evidence/visual/`.

**NOT VERIFIED — a imagem de referência não chegou.** O mandato de R3.3C anexou duas referências
visuais: "A. ViPreço MVP — visão final do cliente" e "B. /para-mercados — versão final". **A
mensagem recebida nesta sessão continha apenas texto: nenhum dos dois anexos veio junto.** O que
está registrado abaixo, portanto, é a direção que o **texto do mandato** descreve — não a leitura
de um mockup que eu não vi. Quando o arquivo da referência B for versionado em
`docs/product/visual-north-star-v2/telas/` (ou onde o PMO decidir), este documento deve ser
reaberto e confrontado com ele.

A direção estética descrita em §1 vale para as duas frentes e é a mesma já aprovada para o
consumidor: aparência premium, produto reconhecível, hierarquia forte, preços grandes, cards
limpos, espaço respirável, verde e creme usados com intenção, menos aparência de relatório.

---

## A LIMPEZA OBRIGATÓRIA — antes de qualquer implementação

O §13 é explícito, e a lista não é sugestão:

> "Antes de qualquer futura implementação, remover da referência as promessas não comprovadas."

| O que a referência promete                   | Por que não pode ser implementado como está                                                                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "milhares de moradores"                      | Número inventado. O piloto é de um bairro e não tem base de usuários medida. Prova social fictícia é a forma mais barata de perder a única coisa que o produto tem para vender.                                                                                                 |
| "mais clientes"                              | Resultado de negócio prometido a um terceiro. O ViPreço não controla o movimento da loja de ninguém, e não há estudo que sustente a relação.                                                                                                                                    |
| "mais visibilidade" como resultado garantido | Garantia de efeito. Pode-se descrever o que o produto **faz** (o preço aparece na comparação); não o que isso **causa**.                                                                                                                                                        |
| "destaque nas buscas"                        | Descreve exatamente o que o princípio de neutralidade proíbe. Conteúdo destacado ou pago vive em seção separada e rotulada e **jamais** reordena a lista orgânica (`PLANO-MESTRE.md`, princípio 4). Vender destaque em busca não é uma feature adiada: é uma feature vetada.    |
| "seguro" como promessa ampla                 | Afirmação de segurança sem escopo. O que se pode dizer é o que existe: RLS em toda tabela, anônimo só lê, sem superfície pública de escrita.                                                                                                                                    |
| "parceiro oficial"                           | Não existe programa de parceria, contrato ou selo. Um mercado real tratado como parceiro numa tela de demonstração é afirmação sobre uma empresa de verdade.                                                                                                                    |
| Cadastro/edição de oferta pelo lojista       | Não existe. A operação de oferta é **manual e server-side** (`docs/mvp/MANUAL-OFFER-OPERATIONS.md`); a comunidade não escreve em `prices` e não há superfície pública de escrita. Desenhar o formulário antes de a mecânica existir cria expectativa numa entrevista comercial. |

**A regra geral, para quem pegar isto depois:** o que o mockup afirma sobre resultado, volume ou
parceria não entra. O que ele propõe sobre **hierarquia, espaço, tipografia, cor e composição**
entra — essa é a parte da referência que é autoridade.

---

## O que da direção estética JÁ pode ser reaproveitado sem decisão nova

A convergência feita na Home em R3.3B/R3.3C produziu peças que a frente B2B herda de graça, sem
copy nova e sem promessa nova:

- a composição do Card v2 — imagem, identidade e preço numa coluna só;
- as ilustrações genéricas de categoria de `public/img/demo/`, com a mesma regra: sem embalagem,
  marca, logotipo ou trade dress de terceiro, e nunca apresentadas como correspondência de SKU;
- o par "superfície calma + botão único" dos blocos de apoio, no lugar de cards que competem;
- a disciplina de §14: menos divisores, menos aparência de tabela, amarelo só como acento pontual.

---

## O que este documento NÃO faz

Não abre frente B2B, não altera `/para-mercados`, não cria rota, não muda copy publicada, não
autoriza deploy e não decide prioridade. A ordem de execução continua sendo a de
`docs/pmo/MVP-EXECUTION-PLAN.md`, e o Founder/PMO decide quando (e se) esta rodada de polimento
B2B acontece.

**Ver também:** [`docs/mvp/MANUAL-OFFER-OPERATIONS.md`](../mvp/MANUAL-OFFER-OPERATIONS.md) ·
[`PLANO-MESTRE.md`](../../PLANO-MESTRE.md) §12 (neutralidade e ações proibidas) ·
[`docs/product/ROADMAP-MVP-v3.md`](./ROADMAP-MVP-v3.md) §4 ("Fora do MVP").
