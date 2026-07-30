# Requisitos de privacidade e consentimento — Gate R0

> **Este é um documento de trabalho técnico preparatório, não constitui parecer
> jurídico.** Foi escrito pelo CTO técnico do projeto, não por um advogado. Toda
> premissa, prazo, base legal e classificação de dado aqui proposta precisa ser
> validada por advogado brasileiro especialista em proteção de dados (LGPD)
> antes de qualquer dado real de participante, comerciante ou parceiro ser
> coletado. Nenhum conteúdo deste documento autoriza a Onda 5, coleta real,
> deploy, DNS, custo ou credencial nova — ver `PLANO-MESTRE.md` §10 (Gate R0) e
> §17 (Decisão de execução, item 5).

**Onda de referência:** preparação do Gate R0 (`PLANO-MESTRE.md` §10, §12.4).
**Autor:** CTO técnico, sob mandato do Founder/PMO descrito no prompt desta
tarefa. Não autoriza a Onda 5.
**Documentos relacionados (mapeamento factual, em preparação em branches
paralelas, não incorporados aqui por conteúdo):**

- `docs/r0/DATA-INVENTORY.md` — inventário fluxo-a-fluxo dos 10 fluxos de dados
  do produto.
- `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md` — mapa de ciclo de vida de cada
  fluxo (coleta → uso → retenção → descarte).
- `docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md` — proposta de arquitetura segura
  para suportar os controles descritos aqui.
- `docs/operations/INCIDENT-RESPONSE-PLAN.md` — plano de resposta a incidente
  já publicado (Onda 4), referenciado na seção 10.
- `CLAUDE.md` §9 "Dados e privacidade" e "Deduplicação fiscal e retenção" —
  regras invioláveis que este documento detalha operacionalmente.

Cada seção onde uma decisão jurídica é necessária termina com uma marcação
`**Requer validação jurídica:**` explícita. A ausência dessa marcação numa
seção não significa que ela dispensa revisão jurídica no conjunto — significa
apenas que não há uma pergunta pontual adicional além da revisão geral do
documento.

---

## 1. Inventário de dados (resumo)

O inventário fluxo-a-fluxo completo — os 10 fluxos de dados do produto
(comparação pública, submissão de preço, WhatsApp do comerciante, cadastro de
comerciante, NFC-e, cashback, Pix, campanhas da indústria, relatórios
agregados, suporte/exclusão) — vive em `docs/r0/DATA-INVENTORY.md` e não é
duplicado aqui. Esta seção apenas situa o leitor.

Em alto nível, os fluxos se dividem em três grupos, relevantes para as
decisões de retenção e consentimento das seções seguintes:

- **Sem dado pessoal vinculável a uma pessoa física identificável hoje**:
  comparação pública de preço, catálogo de produtos e mercados. Já em produção
  desde a Onda 2, sem dado real de participante.
- **Dado pessoal de comerciante (pessoa física ou representante de pessoa
  jurídica)**: WhatsApp do comerciante, cadastro de mercado. Volume pequeno,
  relação contratual direta (`PLANO-MESTRE.md` §9 "Contrato do comerciante").
- **Dado pessoal de participante do piloto (consumidor)**: NFC-e, cashback,
  Pix, submissão de preço da comunidade (hoje dormente, ver
  `docs/security/DATABASE-AUTHORIZATION-MATRIX.md`), suporte/exclusão. Este é
  o grupo de maior risco e o foco principal deste documento — inclui dado
  fiscal (chave de acesso da NFC-e), dado financeiro (chave Pix) e o conteúdo
  do histórico de compra que a nota fiscal revela.

Campanhas da indústria e relatórios agregados não devem conter dado pessoal
individualizável quando implementados corretamente (ver seção 8 e
`PLANO-MESTRE.md` §9 "indústria recebe somente agregado, com coorte mínima e
supressão de raridade; nenhum recibo individual para indústria").

**Requer validação jurídica:** confirmar se o cadastro de comerciante pessoa
física (nome, telefone, WhatsApp) e o histórico de compra revelado pela NFC-e
recebem o mesmo regime de proteção sob a LGPD, ou se algum desses fluxos
enseja tratamento diferenciado (ex.: dado de criança/adolescente, dado
sensível por natureza vs. dado sensível de fato — ver seção 11).

---

## 2. Mapa de ciclo de vida (resumo)

O mapa completo de ciclo de vida (quando cada dado é coletado, por quanto
tempo permanece em cada estado, quando é anonimizado/pseudonimizado, quando é
descartado) vive em `docs/r0/DATA-LIFECYCLE-AND-RETENTION.md` e não é
duplicado aqui.

O princípio geral que este documento assume, para as seções 3–9, é o de
minimização temporal: cada dado pessoal deve ter uma finalidade operacional
ativa e clara em cada momento da sua existência no sistema; quando a
finalidade termina, o dado bruto correspondente deve ser eliminado ou reduzido
a uma forma que não permita mais identificar a pessoa, salvo obrigação legal
de retenção (fiscal, contábil ou antifraude) — que deve ser documentada
explicitamente por fluxo, não assumida por padrão.

---

## 3. Proposta de retenção

Alinhada a `CLAUDE.md` §9 "Deduplicação fiscal e retenção", que trata como
requisito inviolável impedir que a mesma chave fiscal gere benefício mais de
uma vez, sem autorizar reter a chave bruta indefinidamente.

### 3.1 Princípios gerais

1. **Chave fiscal bruta (chave de acesso da NFC-e) só existe em texto claro
   durante três janelas**: consulta ao webservice/portal da SEFAZ, validação
   do cupom pela equipe, e a janela de verificação de cancelamento antes do
   pagamento do cashback (`PLANO-MESTRE.md` §9 "janela de verificação de
   cancelamento antes do pagamento"). Fora dessas janelas, a chave bruta não
   deve estar acessível em nenhuma tabela de consulta rotineira.
2. **Deduplicação usa identificador protegido, não a chave bruta.** Proposta
   técnica: HMAC-SHA256 da chave de acesso, com segredo (`pepper`) mantido
   separado do banco de dados operacional (ex.: variável de ambiente do
   backoffice, nunca no mesmo local de armazenamento do HMAC resultante). O
   HMAC resultante é o que fica indexado para detectar duplicidade; a chave
   bruta não precisa ser reconsultável a partir dele.
3. **Descarte da chave bruta após o fim da janela de cancelamento.** Depois
   que o Pix é confirmado (ou a nota é rejeitada/expira sem confirmação), a
   chave bruta é eliminada da tabela operacional. O HMAC permanece, pelo prazo
   de retenção que a deduplicação exigir — ver 3.3.
4. **Nunca em log, analytics ou mensagem de erro.** Chave de acesso, número de
   documento, chave Pix e qualquer outro identificador de alta cardinalidade
   não podem aparecer em texto claro em logs de aplicação, logs de borda
   (Cloudflare), analytics ou mensagens de erro exibidas ao usuário. Isso é
   uma extensão direta de `CLAUDE.md` princípio #5 e #6 (nenhum segredo em
   log) aplicada a dado pessoal, não só a credencial de sistema.
5. **Retenção diferenciada por finalidade, não um prazo único para tudo.** A
   tabela abaixo propõe categorias; os prazos exatos (especialmente os
   fiscais/contábeis) são placeholders técnicos até revisão jurídica.

### 3.2 Categorias de retenção propostas

| Categoria de dado                                           | Retenção proposta em forma identificável                                            | O que acontece depois                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Chave de acesso NFC-e (bruta)                               | Até confirmação do Pix ou expiração/rejeição da submissão (dias, não meses)         | Eliminada; permanece apenas o HMAC para deduplicação                                     |
| HMAC da chave de acesso (deduplicação)                      | Enquanto o programa de cashback estiver ativo, prazo a definir com o advogado       | Avaliar expurgo após encerramento definitivo do programa, sujeito a obrigação fiscal     |
| Conteúdo estruturado da nota (itens, preços, mercado, data) | Prazo operacional do piloto + retenção fiscal/contábil a confirmar                  | Agregação/pseudonimização quando a finalidade individual terminar                        |
| Dado de Pix (chave Pix informada pelo participante)         | Apenas o necessário para processar o pagamento; não armazenar histórico ampliado    | Eliminar ou minimizar após confirmação do pagamento, exceto obrigação contábil           |
| Número de WhatsApp do comerciante                           | Duração da relação contratual                                                       | Eliminar ou anonimizar após encerramento do contrato, exceto obrigação fiscal/contratual |
| Conteúdo de mensagem do WhatsApp (foto/áudio de remarcação) | Duração operacional do Achado (dias) + cópia mínima para auditoria de qualidade     | Eliminar após esse prazo, salvo amostra de auditoria já anonimizada                      |
| Registro de consentimento (seção 6)                         | Duração da relação + prazo probatório a definir com o advogado                      | Não eliminar antes do prazo probatório mesmo se o restante do dado for eliminado         |
| Dado agregado para indústria (seção 8)                      | Sem prazo de descarte específico — já não é dado pessoal se a agregação for correta | N/A, condicionado à supressão de raridade e coorte mínima estarem corretamente aplicadas |

Prazos em "dias", "meses" e "a definir" são intencionalmente vagos nesta
versão: o CTO não tem base para propor números defensáveis sem (a) o volume
real de operação do piloto e (b) o prazo mínimo de guarda fiscal aplicável a
documento fiscal eletrônico e a registro de pagamento via Pix no Brasil.

**Requer validação jurídica:** (1) prazo mínimo de retenção fiscal/contábil
para dado vinculado a NFC-e e a pagamento via Pix, incluindo se esse prazo se
aplica ao dado da pessoa física participante ou apenas ao registro fiscal da
empresa ViPreço; (2) se o HMAC de deduplicação, por si só, ainda é
"informação pessoal" para efeito de LGPD (dado pseudonimizado permanece dado
pessoal sob a lei) e portanto está sujeito às mesmas obrigações de retenção
finita, acesso e exclusão que o dado identificável; (3) prazo probatório
mínimo recomendado para o registro de consentimento.

---

## 4. Procedimento de exclusão

### 4.1 Canal de solicitação

Proposta: o mesmo canal concierge usado para envio do cupom (WhatsApp/suporte
humano no piloto, dado o volume pequeno do MVP — ver `PLANO-MESTRE.md` §4.3).
Não propor formulário web de autoatendimento no MVP; o volume da coorte (20–25
domicílios, `PLANO-MESTRE.md` §6, G2) não justifica a complexidade, e um canal
humano permite confirmar identidade do solicitante antes de excluir dado de
outra pessoa por engano.

### 4.2 Prazo de atendimento

Proposta técnica de trabalho: reconhecer o pedido em até 2 dias úteis e
concluir a exclusão tecnicamente possível em até 15 dias corridos, alinhado à
ordem de grandeza usual de pedidos de titular sob a LGPD — mas este número é
um placeholder até confirmação jurídica, não uma citação de prazo legal.

### 4.3 O que é tecnicamente excluível vs. o que precisa ser retido

| Dado                                                    | Excluível a pedido do titular?                       | Observação                                                                                                                                                            |
| ------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dado de cadastro/perfil do participante (nome, contato) | Sim                                                  | Sem obstáculo técnico conhecido                                                                                                                                       |
| Chave Pix informada                                     | Sim, se não houver pagamento pendente                | Se houver Pix em processamento, aguardar conclusão antes de excluir                                                                                                   |
| Conteúdo da nota fiscal já processada                   | Parcial — depende de obrigação fiscal/contábil       | **Requer validação jurídica** — ver abaixo                                                                                                                            |
| HMAC de deduplicação da chave fiscal                    | Provavelmente não, enquanto o programa estiver ativo | Excluir compromete a garantia antifraude de toda a plataforma, não só do titular — **requer validação jurídica** sobre como equilibrar isso com o direito de exclusão |
| Registro de consentimento (seção 6)                     | Não, durante o prazo probatório                      | Retido como evidência de que o consentimento existiu e foi revogado                                                                                                   |
| Dado já agregado/anonimizado para indústria             | Não aplicável                                        | Se a anonimização foi feita corretamente, não há mais titular identificável                                                                                           |

O caso mais delicado é o conteúdo da nota fiscal e o HMAC de deduplicação:
existe uma tensão real entre o direito de exclusão do titular e (a) a
obrigação fiscal/contábil da empresa e (b) a necessidade de impedir que a
mesma nota gere benefício duplicado no futuro, mesmo depois que o titular
pediu exclusão. Este documento não resolve essa tensão — ela é, por natureza,
uma decisão jurídica.

### 4.4 Confirmação de exclusão efetiva

Proposta técnica: manter um registro mínimo (não o dado excluído em si, mas o
fato da exclusão) — id pseudonimizado, data do pedido, data da execução,
categorias de dado afetadas, o que foi mantido e por quê. Esse registro serve
para provar ao titular, se solicitado, que a exclusão ocorreu, sem precisar
reter o dado original para isso. Verificação técnica: consulta pós-exclusão
nas tabelas afetadas confirmando ausência do registro identificável (mesmo
padrão de "verificar ao vivo" usado nas Ondas 2–4, aplicado aqui ao invés de
autorização/RLS).

**Requer validação jurídica:** (1) o que exatamente deve ou pode ser retido
por obrigação fiscal/contábil quando o titular pede exclusão do conteúdo da
nota fiscal; (2) se o HMAC de deduplicação pode legitimamente sobreviver a um
pedido de exclusão, e sob qual base legal (legítimo interesse antifraude?
obrigação legal?); (3) prazo de atendimento real exigido por lei, para
substituir o placeholder de 15 dias corridos.

---

## 5. Procedimento de correção de dados

Exemplo do mandato: telefone errado no cadastro de WhatsApp do comerciante.

1. **Canal**: mesmo canal concierge (WhatsApp/suporte humano) usado para
   exclusão — sem formulário de autoatendimento no MVP, pela mesma razão de
   volume da seção 4.1.
2. **Verificação de identidade mínima**: confirmar que quem pede a correção é
   o titular do cadastro (ex.: responder pelo mesmo número de WhatsApp já
   cadastrado, ou por outro canal combinado no onboarding). Não exigir
   documento de identidade no MVP — desproporcional ao risco e ao volume.
3. **Aplicação da correção**: atualização direta do campo, feita por pessoa
   com acesso de backoffice (ver matriz de acesso, seção 9), nunca por
   autoatendimento anônimo.
4. **Registro da correção**: manter um log mínimo de auditoria (quem
   corrigiu, quando, campo alterado — não precisa reter o valor antigo em
   texto claro além do necessário para auditoria de abuso).
5. **Confirmação ao titular**: responder no mesmo canal confirmando que a
   correção foi aplicada.

Este fluxo não tem a mesma tensão jurídica da exclusão (não há obrigação legal
de manter um dado cadastral _incorreto_), então não recebe marcação de
validação jurídica própria — mas segue sujeito à revisão geral do documento.

---

## 6. Registro de consentimento

`CLAUDE.md` §9 exige consentimentos separados para cashback, personalização e
compartilhamento. Proposta de estrutura de registro:

### 6.1 O que fica registrado por consentimento

| Campo                    | Conteúdo                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Identificador do titular | Referência pseudonimizada (não o CPF ou nome em texto claro no próprio registro de consentimento)                 |
| Finalidade               | Um de: `cashback`, `personalizacao`, `compartilhamento_industria` — nunca um consentimento genérico "aceito tudo" |
| Versão do termo aceito   | Identificador de versão do texto do aviso de privacidade/termo (ex.: `v1-2026-07`)                                |
| Timestamp                | Data e hora do aceite, em UTC                                                                                     |
| Canal                    | Onde o consentimento foi coletado (ex.: `whatsapp-onboarding`, `formulario-concierge`)                            |
| Status                   | `ativo` ou `revogado`, com timestamp de revogação quando aplicável                                                |

Deliberadamente fora do registro de consentimento: CPF, chave Pix, chave
fiscal, conteúdo de mensagem, número de telefone em texto claro. O registro de
consentimento não deve, ele mesmo, virar mais uma cópia do dado sensível que
está autorizando tratar — ele referencia o titular por um identificador
pseudonimizado que já existe em outra tabela, não duplica o dado pessoal.

### 6.2 Princípios operacionais

- Consentimento é **opt-in explícito** por finalidade, nunca pré-marcado.
- Revogação deve ser tão fácil quanto o consentimento original (mesmo canal).
- Revogar consentimento de `personalizacao` ou `compartilhamento_industria`
  não deve impedir o participante de continuar participando do cashback, se
  as finalidades forem realmente independentes na implementação — isso é um
  requisito de arquitetura, registrado aqui para o
  `docs/r0/SECURE-ARCHITECTURE-PROPOSAL.md` considerar.
- Consentimento para `compartilhamento_industria` só é relevante se e quando
  existir de fato uma finalidade de compartilhamento agregado (seção 8); não
  coletar esse consentimento antecipadamente "para o caso de precisar".

**Requer validação jurídica:** (1) se a base legal apropriada para cada
finalidade é consentimento (Art. 7º, I) ou outra base (ex.: execução de
contrato para o cashback em si); coletar consentimento como base legal quando
outra base seria mais apropriada pode gerar obrigações desnecessárias de
revogação sobre uma relação que na verdade é contratual; (2) formato mínimo
exigido para prova de consentimento válido sob a LGPD (o registro proposto em
6.1 é suficiente como evidência?).

---

## 7. Aviso de privacidade para o piloto (rascunho)

> **Nota importante antes do rascunho:** o texto abaixo é um ponto de partida
> técnico, escrito pelo CTO para ilustrar estrutura e nível de linguagem — não
> é o aviso de privacidade final e **não pode ser usado com participantes
> reais sem revisão e aprovação de advogado brasileiro especialista em
> proteção de dados**. Datas, prazos, nome de razão social e base legal citados
> abaixo são placeholders.

---

**Aviso de privacidade do piloto ViPreço em Artemis**

_Versão de rascunho — não aprovada para uso real._

O ViPreço é um projeto em fase de teste (piloto) em Artemis, Piracicaba-SP.
Este aviso explica o que fazemos com os dados de quem participa do piloto
enviando cupom fiscal em troca de cashback.

**O que coletamos.** Quando você envia um cupom fiscal (NFC-e), coletamos os
dados que aparecem nele: os produtos comprados, o preço, o mercado, a data e a
chave de acesso da nota. Também coletamos seu nome, telefone e a chave Pix que
você informar para receber o cashback.

**Para que usamos.** Usamos esses dados para conferir se o cupom é válido,
pagar o cashback combinado, e alimentar a comparação de preços do ViPreço.
Nunca usamos seu cupom para identificar você publicamente — o preço que
mostramos no site não tem seu nome nem qualquer dado que leve até você.

**Por quanto tempo guardamos.** Guardamos seus dados pelo tempo necessário
para processar o pagamento e cumprir obrigações fiscais e contábeis. Depois
disso, apagamos ou transformamos o dado de forma que ele não identifique mais
você. [Nota técnica: prazo exato pendente de definição jurídica — ver seção
3.]

**Como pedir para corrigir ou apagar seus dados.** Você pode pedir a
correção ou a exclusão dos seus dados a qualquer momento, pelo mesmo canal de
WhatsApp usado para enviar o cupom. Respondemos em até [prazo pendente de
definição jurídica]. Alguns dados podem precisar ser mantidos por obrigação
legal (por exemplo, fiscal), mesmo depois do seu pedido — se isso acontecer,
explicamos por quê.

**Sobre o cashback.** O cashback é pago apenas depois de conferirmos o cupom.
Existe um limite de valor e de quantidade de cupons por pessoa e por
domicílio durante o piloto.

**Este é um piloto experimental.** Estamos testando se esse formato funciona
antes de decidir os próximos passos. Podemos encerrar, pausar ou mudar as
regras do piloto, sempre avisando com antecedência quem está participando.

**Dúvidas.** Fale com a gente pelo mesmo canal de WhatsApp do piloto.

---

**Requer validação jurídica:** o rascunho inteiro, incluindo (1) se a
linguagem cobre todos os elementos exigidos pela LGPD para aviso de
privacidade (finalidade, base legal, direitos do titular, controlador,
encarregado/DPO se aplicável, forma de contato); (2) se falta menção
obrigatória a compartilhamento com terceiros (ex.: instituição parceira do
Pix, ver seção 8); (3) se o piloto precisa nomear um encarregado (DPO) mesmo
em escala pequena.

---

## 8. Registro de operações de tratamento

Inspirado na lógica de um Registro de Operações de Tratamento de Dados
Pessoais (ROPA), próxima do espírito do Art. 37 da LGPD, **mas este documento
não se apresenta como cumprimento formal do artigo** — é um rascunho técnico a
ser formalizado com apoio jurídico.

| Operação                             | Finalidade                                                | Base legal proposta (a validar)                       | Dados tratados                                                       | Retenção (ver seção 3)              | Compartilhamento com terceiros          | Medidas de segurança propostas                                                          |
| ------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- |
| Comparação pública de preço          | Núcleo do produto — mostrar preço ao consumidor           | Não aplicável (sem dado pessoal identificável)        | Produto, preço, mercado (sem vínculo a pessoa)                       | Sem prazo de descarte específico    | Nenhum                                  | RLS pública somente leitura, sem PII (`docs/security/DATABASE-AUTHORIZATION-MATRIX.md`) |
| Cadastro de comerciante              | Operar o canal de WhatsApp e o relatório competitivo      | Execução de contrato                                  | Nome, telefone, nome do mercado                                      | Duração do contrato                 | Nenhum                                  | Acesso restrito a backoffice (`service_role`), RLS                                      |
| Ingestão de foto/áudio de remarcação | Gerar o Achado do dia                                     | Execução de contrato / legítimo interesse             | Imagem/áudio, texto extraído, mercado, horário                       | Curta (dias) + amostra de auditoria | Nenhum                                  | Acesso restrito ao pipeline de ingestão                                                 |
| Submissão de NFC-e                   | Validar cupom e habilitar cashback                        | Consentimento + execução de contrato (a validar)      | Chave de acesso, itens, preço, mercado, data                         | Ver seção 3.2                       | Consulta ao webservice/portal da SEFAZ  | Chave bruta fora de log; HMAC para deduplicação; janela de acesso limitada              |
| Pagamento de cashback via Pix        | Remunerar contribuição fiscal elegível                    | Execução de contrato                                  | Chave Pix, valor, status do pagamento                                | Ver seção 3.2                       | Instituição parceira de pagamento (Pix) | Acesso restrito, sem retenção de histórico ampliado                                     |
| Campanha da indústria                | Vincular oferta patrocinada a um Achado                   | Execução de contrato com a indústria                  | Dados agregados de conversão, nunca por pessoa                       | Sem prazo de descarte específico    | Indústria/patrocinador, apenas agregado | Supressão de raridade, coorte mínima (`PLANO-MESTRE.md` §9)                             |
| Relatório agregado para indústria    | Licenciar insight estatístico agregado                    | Legítimo interesse / execução de contrato (a validar) | Estatística agregada de compra, sem identificação individual         | Sem prazo de descarte específico    | Indústria/distribuidor licenciado       | Nenhum recibo individual; cláusula contratual de proibição de reidentificação           |
| Suporte e exclusão                   | Atender pedido de correção/exclusão do titular            | Obrigação legal (exercício de direito do titular)     | Identificador pseudonimizado, categoria de dado, histórico do pedido | Prazo probatório (a validar)        | Nenhum                                  | Acesso restrito, registro de auditoria da própria exclusão (seção 4.4)                  |
| Registro de consentimento            | Provar que o consentimento existiu e foi/não foi revogado | Obrigação legal / cumprimento de dever legal          | Ver seção 6.1                                                        | Prazo probatório (a validar)        | Nenhum                                  | Sem dado sensível no próprio registro (seção 6.1)                                       |

**Requer validação jurídica:** (1) confirmar/ajustar a base legal proposta em
cada linha — em especial se "execução de contrato" é defensável para o
participante do piloto, que não tem um contrato formal no mesmo sentido que o
comerciante; (2) se alguma dessas operações, pelo volume e natureza do piloto,
exige Relatório de Impacto à Proteção de Dados Pessoais (RIPD) antes de
iniciar — `PLANO-MESTRE.md` §9 já prevê "relatório de impacto ou avaliação
equivalente antes de painéis B2B ou tratamento de maior risco", mas não define
o gatilho exato para o piloto em si.

---

## 9. Matriz de acesso

| Papel                             | Dado acessado                                                                     | Finalidade do acesso                                   | Controle técnico proposto                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Founder                           | Todos os dados operacionais (via painel Supabase, `service_role`)                 | Operação geral, decisão de negócio, suporte ao titular | `service_role` restrito a ambiente com MFA (já vigente desde a Onda 1C); nunca em `VITE_*` (`CLAUDE.md` #5) |
| Comerciante                       | Relatório competitivo do próprio mercado; conteúdo publicado do Achado            | Gestão da própria loja                                 | Sem acesso direto ao banco; recebe relatório processado, não query direta                                   |
| Participante (consumidor)         | Seus próprios dados de cadastro, histórico de cupons enviados, status do cashback | Exercício de direitos do titular (correção, exclusão)  | Canal concierge humano no MVP; não há autoatendimento com query direta ao banco                             |
| Parceiro Pix (instituição)        | Chave Pix e valor da transação, no momento do pagamento                           | Processar a transferência                              | Escopo mínimo de API do parceiro; ViPreço não retém credencial do parceiro no frontend                      |
| Sistema automatizado (pipeline)   | Foto/áudio de remarcação, texto extraído                                          | Gerar o Achado do dia                                  | Acesso de serviço (`service_role`) restrito ao pipeline, sem exposição a `anon`                             |
| Indústria/parceiro de campanha    | Apenas dado agregado, nunca dado individual (seção 8)                             | Avaliar performance de campanha, licenciar insight     | Sem acesso a tabela transacional; recebe extrato agregado com supressão de raridade                         |
| CI/automação (migrations, drills) | Estrutura de schema, dados fictícios (`is_demo=true`)                             | Reproduzir schema, testar RLS                          | Ambiente efêmero, sem dado real (`docs/operations/RESILIENCE-RUNBOOK.md`, drill de schema)                  |

O princípio geral (`CLAUDE.md` #5, `PLANO-MESTRE.md` §10 "controles de
acesso") é acesso mínimo necessário por papel, auditável — nenhum papel além
do Founder/backoffice tem acesso de leitura direta a dado pessoal bruto de
outro titular.

**Requer validação jurídica:** confirmar se o acesso do Founder como pessoa
física única (hoje a única pessoa com `service_role`, conforme
`docs/operations/INCIDENT-RESPONSE-PLAN.md` §1) precisa de formalização
adicional (termo de confidencialidade, registro de acesso auditável mais
granular) antes do primeiro dado real.

---

## 10. Resposta a incidente de privacidade

`docs/operations/INCIDENT-RESPONSE-PLAN.md` já define papéis, severidade,
detecção e resposta para o estágio atual do projeto — deliberadamente enxuto,
porque hoje não há dado real em produção (ver §6 desse documento: "Retenção/
descarte de dado pessoal em caso de incidente com dado real — isso é o domínio
do Gate R0 (...), não desta Onda").

Esta seção propõe o que muda quando o incidente envolve dado pessoal real, sem
reescrever o plano existente:

1. **Classificação de severidade permanece a mesma estrutura**, mas todo
   incidente SEV1 que envolva exposição de dado pessoal real (não apenas
   segredo de sistema) deve ser tratado como candidato a exigir notificação
   externa, não apenas correção técnica interna.
2. **Novo passo antes do "Comunicar" (item 4 do plano atual)**: avaliar se o
   incidente envolveu dado pessoal de participante/comerciante real e, se sim,
   se há dever de notificar o titular afetado e/ou a Autoridade Nacional de
   Proteção de Dados (ANPD). **Este documento não afirma prazo ou obrigação de
   notificação** — é uma pergunta para o advogado, não uma resposta técnica.
3. **Registro do incidente** deve, quando envolver dado pessoal real, incluir
   quais categorias de dado (seção 1) e quantos titulares foram afetados —
   informação que hoje o plano de incidente não precisa capturar porque não há
   dado real, mas que se torna essencial para a avaliação jurídica do item 2.
4. **O papel de "Decisão e comunicação" (Founder, conforme §1 do plano
   existente)** passa a incluir a decisão de quando e como notificar o
   titular/ANPD, com apoio jurídico — não uma decisão técnica solitária.
5. **Postmortem (item 7 do plano existente)** passa a incluir, quando houver
   dado pessoal real: se o dado exposto estava pseudonimizado/protegido por
   HMAC (o que reduz o dano) ou em texto claro (o que agrava), e se o desenho
   de retenção da seção 3 deste documento teria evitado ou reduzido a
   exposição caso já estivesse implementado.

**Requer validação jurídica:** (1) prazo legal de notificação à ANPD e ao
titular em caso de incidente de segurança com dado pessoal, e os critérios que
tornam essa notificação obrigatória (não apenas recomendável); (2) se o
Founder, sozinho, pode tomar essa decisão ou se o piloto precisa de um
encarregado (DPO) formalmente designado antes do primeiro dado real, dado que
`docs/operations/INCIDENT-RESPONSE-PLAN.md` hoje reflete uma equipe de uma
pessoa.

---

## 11. Riscos específicos

### 11.1 NFC-e

A chave de acesso da NFC-e é um identificador quase único por nota — em
volume pequeno como o do piloto (até 50 cupons, `PLANO-MESTRE.md` §10, §11),
mesmo sem CPF explícito, o conjunto (mercado + data/hora + itens comprados)
pode ser suficiente para identificar ou reidentificar uma pessoa específica,
especialmente combinado com o cadastro do participante que já vincula nome e
telefone ao envio do cupom. O risco central não é vazamento da chave em si,
mas a possibilidade de reconstruir o histórico de compra de uma pessoa
identificável a partir do conjunto de notas que ela enviou — que é exatamente
o dado necessário para operar o cashback, então não pode simplesmente ser
descartado; precisa ser protegido em acesso e minimizado em retenção (seção
3). O uso de HMAC para deduplicação não protege o conteúdo da nota em si,
apenas evita reuso da mesma chave — a mitigação do conteúdo depende de
controle de acesso (seção 9) e retenção (seção 3).

**Requer validação jurídica:** se o histórico de compra vinculado a uma pessoa
identificável, mesmo de um piloto pequeno, já configura tratamento de dado
pessoal sensível de fato (ver 11.2 sobre a mesma questão para Pix) por
permitir inferências sobre hábitos de consumo.

### 11.2 Cashback

Dois riscos distintos: fraude (uma pessoa tentando reivindicar o mesmo
benefício mais de uma vez, mitigado pelo HMAC de deduplicação da seção 3) e
múltiplas identidades reivindicando o mesmo benefício (uma pessoa cadastrando
mais de um número de telefone, conta ou domicílio para multiplicar o
cashback). O segundo risco não é resolvido pela deduplicação de chave fiscal
sozinha — a chave é única por nota, não por pessoa. `PLANO-MESTRE.md` §9 já
prevê "limites por pessoa, domicílio, conta e dispositivo, quando aplicável" e
§7 exige "uma identidade de coorte por domicílio" documentada antes de iniciar
a coorte; este documento reforça que esse controle precisa existir tecnicamente
antes do primeiro pagamento real, não apenas como regra declarada.

### 11.3 Pix

A chave Pix (CPF, telefone, e-mail ou chave aleatória) não é, por definição
legal estrita, necessariamente um dado sensível sob a LGPD (que reserva a
categoria "dado sensível" para origem racial/étnica, convicção religiosa,
opinião política, saúde, vida sexual, dado genético/biométrico). Mas, na
prática, uma chave Pix é dado bancário vinculado diretamente à identidade
financeira de uma pessoa — o tratamento inadequado gera risco concreto de
fraude financeira contra o titular, mesmo que a classificação legal formal
seja diferente da de um dado sensível "por natureza". Este documento trata a
chave Pix com o mesmo rigor de acesso e retenção mínima que um dado sensível
receberia (seção 3, seção 9), independentemente da classificação legal final.

**Requer validação jurídica:** confirmar a classificação legal da chave Pix
para efeito de LGPD e se algum regime adicional (ex.: regulação do Banco
Central sobre o arranjo Pix) impõe obrigação de segurança ou retenção
específica além da LGPD genérica.

### 11.4 WhatsApp

Dois riscos distintos: (a) o número de telefone é, ele mesmo, dado pessoal, e
hoje é usado tanto para comerciante quanto potencialmente para participante do
piloto — precisa do mesmo tratamento de acesso mínimo e retenção finita das
demais categorias; (b) o **conteúdo** de uma mensagem de WhatsApp (foto de
remarcação, áudio, texto) pode conter dado de terceiros sem consentimento —
por exemplo, uma foto de gôndola que capture, sem querer, o rosto de um
cliente ou funcionário ao fundo, ou um áudio que mencione o nome de outra
pessoa. O pipeline de ingestão (`PLANO-MESTRE.md` §4.2) processa essas
imagens/áudios automaticamente; não há hoje um controle técnico que detecte ou
mitigue a presença acidental de dado de terceiro nesse material antes de ele
ser usado para gerar um Achado publicado.

**Requer validação jurídica:** se é necessário algum aviso específico ao
comerciante sobre a possibilidade de terceiros aparecerem incidentalmente em
material enviado, e se o produto final publicado (o card do Achado) precisa
de alguma checagem antes da publicação quando a imagem original tiver pessoas
reconhecíveis.

---

## 12. Síntese das pendências jurídicas

Lista consolidada de todas as marcações `Requer validação jurídica` deste
documento, para facilitar o encaminhamento a um advogado:

1. Classificação de dado de comerciante pessoa física vs. histórico de compra
   do participante sob a LGPD (seção 1).
2. Prazo mínimo de retenção fiscal/contábil para NFC-e e Pix; status legal do
   HMAC de deduplicação como dado pessoal; prazo probatório do registro de
   consentimento (seção 3).
3. O que pode/deve ser retido de conteúdo de nota fiscal e do HMAC de
   deduplicação mesmo após pedido de exclusão; prazo real de atendimento ao
   titular (seção 4).
4. Base legal apropriada por finalidade (consentimento vs. execução de
   contrato vs. legítimo interesse); formato mínimo de prova de consentimento
   (seção 6).
5. Completude e adequação legal do rascunho de aviso de privacidade; menção a
   compartilhamento com terceiros; necessidade de encarregado/DPO (seção 7).
6. Base legal de cada operação do registro de tratamento; necessidade de
   Relatório de Impacto à Proteção de Dados antes do piloto (seção 8).
7. Formalização do acesso do Founder como controlador único de dado real
   (seção 9).
8. Prazo e critério de notificação de incidente ao titular/ANPD; necessidade
   de DPO formal antes do primeiro dado real (seção 10).
9. Classificação de histórico de compra individualizável como dado sensível
   de fato (seção 11.1).
10. Classificação legal da chave Pix e regime regulatório adicional aplicável
    (seção 11.3).
11. Necessidade de aviso/checagem adicional para dado de terceiro capturado
    incidentalmente em material de WhatsApp (seção 11.4).

Nenhum dado real deve ser coletado antes que esta lista seja revisada por
advogado brasileiro especialista em proteção de dados e as respostas
incorporadas a uma versão revisada deste documento — ver `PLANO-MESTRE.md`
§10, item "revisão jurídica/privacidade do piloto".
