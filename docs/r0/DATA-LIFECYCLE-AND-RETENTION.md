# Ciclo de vida e retenção de dados — preparação do Gate R0

**Onda:** preparação documental do Gate R0 (`PLANO-MESTRE.md` §10), autorizada pelo
Founder/PMO como trabalho preparatório — **não é autorização da Onda 5, do piloto
Artemis ou de qualquer dado real** (`PLANO-MESTRE.md` §1 "Regras imediatas" e §17).

**Avisos obrigatórios:**

a. Este é um **documento de trabalho preparatório** para revisão jurídica futura, não
um parecer jurídico concluído. Nenhuma afirmação aqui substitui a avaliação de um
advogado brasileiro especialista em privacidade/LGPD.
b. Todos os prazos de retenção descritos abaixo são **propostas técnicas**, sujeitas a
validação jurídica antes de qualquer dado real ser coletado, tratado ou armazenado.
c. **Nenhum dado real foi coletado, tratado ou armazenado para produzir este
documento.** Todo nome, número, telefone, CNPJ, CPF, chave fiscal e valor usado como
exemplo abaixo é fictício/sintético.

## Como ler este documento

Companheiro operacional de `docs/r0/DATA-INVENTORY.md` (que mapeia origem, campos,
finalidade, acesso e riscos). Aqui o foco é o **ciclo de vida**: quando cada dado
nasce, por quanto tempo fica em uso ativo, quando vira agregado/arquivo e quando é
excluído — com prazos concretos propostos. Os mesmos 10 fluxos são cobertos na mesma
ordem, seguidos de uma tabela única consolidando todos os prazos propostos.

---

## 1. Comparação e achados públicos

| Etapa                  | O que acontece                                                                                                                                                             | Prazo proposto                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Criação                | Preço/produto/mercado cadastrado por coletor pago, pipeline de ingestão ou editorial, grava em `prices`/`products`/`markets`                                               | Imediato                                                               |
| Uso ativo              | Exibido na comparação enquanto `is_active AND observed_at <= now() AND (valid_until IS NULL OR valid_until >= now())` (`CLAUDE.md` princípio 2)                            | Enquanto válido — `valid_until` define o fim, quando presente          |
| Arquivamento/agregação | Preço expirado (`valid_until` passado) permanece na tabela como histórico, não aparece mais na comparação; alimenta o opcional "movimento de preço" (`PLANO-MESTRE.md` §5) | Sem prazo de expurgo proposto — não é dado pessoal                     |
| Exclusão               | `is_active = false` (soft delete editorial) ou hard delete por decisão de negócio                                                                                          | Sem prazo fixo — evento-driven (mercado fechou, produto descontinuado) |

---

## 2. Submissão de preço pela comunidade

| Etapa                  | O que acontece                                                                                                           | Prazo proposto                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Criação                | Visitante insere `price_submissions` com `status='pending'` — hoje impossível, superfície fechada desde a Onda 3         | Imediato, quando reaberta                                                                 |
| Uso ativo              | Fila de moderação; `service_role` chama `approve_submission()` para aprovar (gera linha em `prices`) ou marca `rejected` | Proposta: decisão em até 7 dias úteis após reabertura da fila                             |
| Arquivamento/agregação | Submissões decididas (`approved`/`rejected`) ficam como trilha de auditoria da moderação, sem novo uso ativo             | Proposta: 12 meses após `reviewed_at`                                                     |
| Exclusão               | `pending` sem decisão: expurgo/anonimização. Decididas: hard delete após o prazo de auditoria                            | Proposta: `pending` expurgada após 90 dias sem revisão; decididas excluídas após 12 meses |

---

## 3. Atendimento por WhatsApp (lojista)

| Etapa                  | O que acontece                                                                                                                                                | Prazo proposto                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Criação                | Lojista envia foto/áudio pelo WhatsApp; mensagem chega ao provedor (Meta Cloud API/BSP homologado)                                                            | Imediato                                                                                     |
| Uso ativo              | Pipeline de ingestão extrai produto/marca/preço da mídia (`PLANO-MESTRE.md` §4.2); mídia bruta fica acessível para reprocessamento em caso de erro de parsing | Proposta: 30 dias de janela de reprocessamento                                               |
| Arquivamento/agregação | O Achado estruturado resultante vira registro em `prices` (fluxo 1) — a mídia bruta não precisa ser retida depois disso                                       | N/A — o valor persiste como dado estruturado, não como mídia                                 |
| Exclusão               | Mídia bruta descartada ao fim da janela de reprocessamento; telefone do lojista apagado na descontinuação do contrato (fluxo 4)                               | Proposta: mídia expurgada em até 30 dias; telefone mantido enquanto o contrato estiver ativo |

---

## 4. Comerciante e estabelecimento

| Etapa                  | O que acontece                                                                                                                                                     | Prazo proposto                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Criação                | Onboarding comercial cria registro em `merchants` vinculado a um ou mais `market_id`                                                                               | No fechamento do contrato                                                                              |
| Uso ativo              | Dado usado para gestão comercial, faturamento e geração do relatório competitivo (fluxo 9)                                                                         | Durante toda a vigência do contrato                                                                    |
| Arquivamento/agregação | Pós-rescisão, o registro comercial (nome fantasia, período de contrato) é mantido como histórico do negócio; dado de contato pessoal do responsável é desvinculado | Proposta: arquivado por até 5 anos pós-rescisão (prazo fiscal/contábil — **a confirmar com jurídico**) |
| Exclusão               | Anonimização do nome do responsável, telefone e e-mail após o prazo de arquivamento; CNPJ/razão social podem persistir como registro comercial não pessoal         | Proposta: 5 anos pós-rescisão                                                                          |

---

## 5. NFC-e (cupom fiscal via canal concierge)

| Etapa                  | O que acontece                                                                                                                                                         | Prazo proposto                                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Criação                | Participante envia foto/link do cupom pelo canal concierge; chave de acesso bruta é recebida                                                                           | Imediato                                                                                                                 |
| Uso ativo              | Chave bruta usada para consultar o cupom, validar autenticidade e checar duplicidade                                                                                   | Proposta: até 7 dias (consulta + janela de cancelamento), conforme `PLANO-MESTRE.md` §9 "Deduplicação fiscal e retenção" |
| Arquivamento/agregação | Chave bruta é **substituída** por identificador protegido via HMAC com segredo separado; itens/valor total (sem a chave bruta) seguem como insumo de preço (fluxo 1)   | Chave bruta: descartada ao fim da janela. Itens/valor: sem prazo de expurgo proposto, tratados como o fluxo 1            |
| Exclusão               | Job automatizado sobrescreve/remove a chave bruta; exclusão sob pedido do titular (fluxo 10) desvincula `participant_id` da nota, preservando apenas a HMAC para dedup | Proposta: chave bruta eliminada em até 7 dias corridos após o recebimento                                                |

---

## 6. Cashback

| Etapa                  | O que acontece                                                                                                                                          | Prazo proposto                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Criação                | `cashback_ledger` cria linha `elegivel` a partir de um `fiscal_receipts` validado (fluxo 5)                                                             | Após validação do cupom                                                                               |
| Uso ativo              | Janela de verificação de cancelamento antes do pagamento (`PLANO-MESTRE.md` §9 "Cashback e fraude"); status evolui para `pago`, `negado` ou `estornado` | Proposta: janela de verificação de até 5 dias úteis antes de liberar o Pix                            |
| Arquivamento/agregação | Registro decidido (`pago`/`negado`/`estornado`) vira trilha de auditoria fiscal/contábil e antifraude                                                   | Proposta: retido por 5 anos (prazo fiscal/contábil típico — **a confirmar**)                          |
| Exclusão               | Registro financeiro não é excluído por obrigação legal de guarda; vínculo com dado de contato do participante é desvinculado após o prazo (fluxo 10)    | Desvinculação do participante após 5 anos; o lançamento contábil em si segue a regra de guarda fiscal |

---

## 7. Pix (pagamento do benefício)

| Etapa                  | O que acontece                                                                                                                  | Prazo proposto                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Criação                | `pix_payout_requests` é criado quando `cashback_ledger` fica `elegivel` e o pagamento é acionado junto ao parceiro              | No disparo do pagamento                                                                |
| Uso ativo              | Parceiro processa a chave Pix e confirma liquidação; `e2e_id` e status são atualizados                                          | Proposta: liquidação esperada em até 2 dias úteis (SLA típico de Pix)                  |
| Arquivamento/agregação | Metadado de transação (valor, status, `e2e_id`) vira registro contábil; chave Pix, se tiver transitado pelo banco, é minimizada | Metadado: 5 anos (fiscal/contábil). Chave Pix: expurgada em até 30 dias pós-liquidação |
| Exclusão               | Purge da chave Pix armazenada (se houver) pós-liquidação; metadado de transação mantido pelo prazo contábil                     | Proposta: chave Pix expurgada em até 30 dias; metadado contábil por 5 anos             |

---

## 8. Campanhas da indústria

| Etapa                  | O que acontece                                                                                                                                                      | Prazo proposto                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Criação                | Contrato B2B assinado; `campaigns` é criado com orçamento, curva de incentivo e vigência                                                                            | No fechamento do contrato comercial                               |
| Uso ativo              | `campaign_metrics` agregado é atualizado conforme cupons validados (fluxo 6) entram na campanha                                                                     | Durante a vigência da campanha                                    |
| Arquivamento/agregação | Ao encerrar, a campanha é reconciliada (receita, benefício pago, fee, reserva de fraude — exemplo do `PLANO-MESTRE.md` §6 "G4") e arquivada como registro comercial | Proposta: arquivada por 5 anos (auditoria/reconciliação contábil) |
| Exclusão               | Dado comercial agregado retido por obrigação contábil; nenhum recibo individual jamais existiu neste fluxo para excluir                                             | Segue o prazo de arquivamento — 5 anos                            |

---

## 9. Relatórios e dados agregados

| Etapa                  | O que acontece                                                                                                                                           | Prazo proposto                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Criação                | Job gera `merchant_reports` (por comerciante) ou `aggregated_insights` (para indústria) a partir de dados já existentes                                  | Periodicidade a definir (ex.: mensal)                                                                     |
| Uso ativo              | Comerciante consulta seu relatório; indústria recebe agregado sob contrato (fluxo 8), com coorte mínima e supressão de raridade aplicadas antes do envio | Enquanto comercialmente relevante                                                                         |
| Arquivamento/agregação | Relatórios antigos deixam de ser consultados ativamente mas podem ser mantidos como histórico de entrega contratual                                      | Proposta: relatórios individuais retidos por 24 meses; agregados sem prazo de expurgo definido nesta fase |
| Exclusão               | Relatórios individuais antigos podem ser purgados sem impacto contábil (diferente de `campaigns`, que segue prazo fiscal)                                | Proposta: 24 meses após a geração                                                                         |

---

## 10. Suporte, incidentes e exclusão

| Etapa                  | O que acontece                                                                                                                              | Prazo proposto                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Criação                | Titular abre solicitação (acesso/correção/exclusão/portabilidade) ou um incidente é detectado (`docs/operations/INCIDENT-RESPONSE-PLAN.md`) | No momento do pedido/detecção                                                                                       |
| Uso ativo              | Equipe (hoje só o Founder) processa a solicitação: identifica todas as tabelas com dado do titular, executa a ação pedida                   | Proposta: confirmação de recebimento em até 15 dias, atendimento completo em prazo a validar com jurídico           |
| Arquivamento/agregação | O registro da solicitação (não o dado-alvo) vira prova de conformidade LGPD                                                                 | Proposta: retido por 5 anos como evidência de atendimento                                                           |
| Exclusão               | O dado-alvo é excluído/anonimizado nas tabelas afetadas; a solicitação em si **não** é excluída dentro do prazo de prova                    | O dado-alvo segue a regra de cada fluxo (ex.: fluxo 6/7 têm retenção fiscal que pode postergar a exclusão completa) |

---

## Tabela consolidada de retenção proposta

| Fluxo                      | Dado                                                  | Retenção proposta                                 | Base para o prazo                                                           | Quem decide o prazo definitivo                                                     |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1. Comparação e achados    | Preço/produto/mercado (`prices`/`products`/`markets`) | Indefinida enquanto ativo; sem expurgo automático | Não é dado pessoal; utilidade de produto                                    | CTO/Founder (decisão de produto)                                                   |
| 2. Submissão da comunidade | `price_submissions` `pending` sem decisão             | 90 dias, depois expurgo/anonimização              | Higiene de fila operacional                                                 | CTO, com revisão jurídica do campo `comment` livre                                 |
| 2. Submissão da comunidade | `price_submissions` decididas (`approved`/`rejected`) | 12 meses após `reviewed_at`                       | Trilha de auditoria da moderação                                            | CTO/Founder                                                                        |
| 3. WhatsApp (lojista)      | Mídia bruta (foto/áudio)                              | 30 dias, depois descartada                        | Janela de reprocessamento do pipeline                                       | CTO, validar com jurídico se mídia capturar terceiros                              |
| 3. WhatsApp (lojista)      | Telefone/nome do responsável                          | Enquanto o contrato estiver ativo                 | Necessidade operacional do canal                                            | Founder + jurídico (base legal contratual)                                         |
| 4. Comerciante             | Dado de contato do responsável (PF)                   | 5 anos pós-rescisão, depois anonimizado           | Prazo prescricional civil/fiscal                                            | **Advogado — a confirmar**                                                         |
| 5. NFC-e                   | Chave de acesso bruta                                 | Até 7 dias (consulta + janela de cancelamento)    | `PLANO-MESTRE.md` §9 "Deduplicação fiscal e retenção"                       | **Advogado — validação final exigida antes do spike real**                         |
| 5. NFC-e                   | Itens/valor total (pós-HMAC)                          | Sem expurgo definido — tratado como fluxo 1       | Insumo de preço, não identifica o comprador                                 | CTO/Founder, com revisão jurídica sobre agregação suficiente                       |
| 6. Cashback                | Lançamento de elegibilidade/pagamento                 | 5 anos                                            | Prazo fiscal/contábil típico                                                | **Advogado/contador — a confirmar**                                                |
| 7. Pix                     | Chave Pix (se transitar pelo banco)                   | Até 30 dias pós-liquidação                        | Minimização — não é necessário reter após pagamento confirmado              | **Advogado — validação regulatória (BACEN/Pix)**                                   |
| 7. Pix                     | Metadado de transação (`e2e_id`, valor, status)       | 5 anos                                            | Prazo fiscal/contábil                                                       | Contador/advogado                                                                  |
| 8. Campanhas da indústria  | Registro de campanha e reconciliação                  | 5 anos                                            | Auditoria/reconciliação contábil                                            | Founder + contador                                                                 |
| 9. Relatórios              | Relatório individual do comerciante                   | 24 meses                                          | Relevância comercial, sem obrigação fiscal associada                        | CTO/Founder                                                                        |
| 9. Relatórios              | Insight agregado para indústria                       | Sem prazo definido nesta fase                     | Agregação reduz risco de dado pessoal, mas depende de coorte mínima efetiva | **Advogado — confirmar se agregação elimina natureza de dado pessoal caso a caso** |
| 10. Suporte e exclusão     | Registro da solicitação do titular                    | 5 anos                                            | Prova de conformidade LGPD                                                  | **Advogado — prazo legal de guarda de evidência**                                  |

Nenhum prazo desta tabela está em vigor — todos exigem validação jurídica antes de
qualquer dado real ser coletado, tratado ou armazenado, conforme o Gate R0
(`PLANO-MESTRE.md` §10).
