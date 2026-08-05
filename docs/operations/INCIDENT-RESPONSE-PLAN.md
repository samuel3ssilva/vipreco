# Plano de resposta a incidente

**Onda:** 4 — Resiliência operacional (`PLANO-MESTRE.md` §12.3).
**Escopo:** ViPreço tem hoje uma equipe de uma pessoa (Founder) e nenhum dado real em
produção. Este plano é deliberadamente enxuto — proporcional ao estágio do produto — e
deve crescer quando houver equipe, comerciantes e dado real (pós-Gate R0), não antes.

---

## 1. Papéis

| Papel                 | Quem, hoje                                                         |
| --------------------- | ------------------------------------------------------------------ |
| Detecção e triagem    | `uptime-check.yml` (automatizado) + Founder (observação manual)    |
| Decisão e comunicação | Founder (único papel com acesso a credenciais, painel e deploy)    |
| Execução técnica      | CTO (este agente) sob autorização do Founder, ou o próprio Founder |

Quando a equipe crescer, este documento precisa ganhar uma tabela de escalonamento com
mais de uma pessoa e um canal de plantão — registrado aqui como item a revisitar, não
implementado agora porque não existe a quem escalar.

## 2. Severidade

| Nível              | Definição                                                                                                                           | Exemplo                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **SEV1 — Crítico** | Indisponibilidade total de produção, vazamento de segredo (`service_role`, token Cloudflare) ou escrita não autorizada em dado real | Worker de produção fora do ar; achado como o de `approve_submission` na Onda 3, mas com dado real já cadastrado |
| **SEV2 — Alto**    | Degradação parcial (uma rota falha, headers de segurança ausentes) sem exposição de dado real                                       | `uptime-check.yml` reporta headers faltando em produção                                                         |
| **SEV3 — Médio**   | Staging indisponível ou degradado; produção não afetada                                                                             | Worker de staging fora do ar                                                                                    |
| **SEV4 — Baixo**   | Achado de auditoria/revisão sem exploração ativa conhecida                                                                          | Item `NOT VERIFIED` ou risco aceito registrado em threat model                                                  |

## 3. Detecção

| Fonte                                                                  | O que cobre                                                                                                              |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `.github/workflows/uptime-check.yml` (a cada 6h)                       | HTTP 200 + headers de segurança em staging e produção                                                                    |
| `.github/workflows/db-schema-drill.yml` (a cada mudança em migrations) | Regressão de autorização no schema antes mesmo de chegar a staging                                                       |
| CodeQL (`codeql.yml`, a cada push/PR)                                  | Vulnerabilidades de código conhecidas                                                                                    |
| Observação manual do Founder                                           | Painel do Supabase (logs de API, uso), painel da Cloudflare (Analytics, Logs do Worker via `wrangler tail` ou dashboard) |

## 4. Resposta

1. **Confirmar o alcance real.** Não agir sobre uma suspeita não confirmada — reproduzir
   o problema (ex.: `curl` direto no host afetado, ver o log do run que falhou).
2. **Classificar a severidade** (§2) — determina se produção precisa ser tirada do ar
   (nunca fazer isso sem necessidade real; produção fora do ar é, ela mesma, um SEV1).
3. **Conter.** Para SEV1 por vazamento de segredo: rotacionar a credencial imediatamente
   (Founder, via painel — não requer o CTO). Para SEV1 por escrita indevida: revogar o
   `GRANT`/`EXECUTE` específico via migration corretiva nova (nunca editar migration já
   aplicada — mesma regra de `CLAUDE.md`), seguindo o padrão de
   `supabase/migrations/20260730120000_fix_function_grants_explicit_revoke.sql`.
4. **Comunicar.** Hoje, o único stakeholder é o próprio Founder — registrar o incidente
   na issue aberta automaticamente pelo `uptime-check.yml` (SEV2/SEV3) ou, para SEV1,
   também num registro manual em `docs/operations/` (incidentes reais, não hipotéticos,
   merecem um arquivo próprio quando acontecerem — este plano não cria um arquivo vazio
   de antemão).
5. **Corrigir.** Aplicar o menor fix coerente (`CLAUDE.md` §"Processo por tarefa"),
   nunca um atalho que esconda o erro.
6. **Verificar.** Confirmar ao vivo que a correção funcionou (mesmo padrão da Onda 3:
   nenhuma correção de segurança é considerada concluída sem verificação contra o
   sistema real, dentro do que for possível sem dado real).
7. **Postmortem.** Para SEV1/SEV2: registrar o que aconteceu, causa raiz, o que
   detectou (ou por que nada detectou, se foi achado manual), e se algum teste
   automatizado deveria ter pego isso antes — se sim, esse teste vira tarefa imediata,
   não item de backlog. Ver `docs/security/THREAT-MODEL-ONDA-3.md` §5.3 como exemplo do
   nível de detalhe esperado.

## 5. Comunicação

Não há usuário externo, comerciante ou participante real hoje — nenhuma comunicação
externa é necessária. Quando o piloto Artemis tiver comerciantes reais (pós-Gate R0),
este plano precisa ganhar uma seção de comunicação externa (o que informar a um
comerciante se o app ficar fora do ar, por exemplo) — registrado como item a revisitar
antes do Gate R0, não implementado agora.

## 6. O que este plano deliberadamente não cobre ainda

- **Falha de controle de processo** (push direto, PR sem check, gate humano pulado) sem
  indisponibilidade, exposição de segredo ou escrita em dado real. Isso tem registro
  próprio em [`PROCESS-CONTROL-INCIDENTS.md`](PROCESS-CONTROL-INCIDENTS.md) e classificação
  própria (`PROCESS CONTROL INCIDENT`), justamente para não diluir a escala SEV1–SEV4 deste
  plano com eventos que não tocaram dado nem disponibilidade.
- Escalonamento entre múltiplas pessoas (não existe equipe).
- Comunicação com usuário/comerciante externo (não existe usuário real).
- SLA formal (não existe contrato pago ainda).
- Retenção/descarte de dado pessoal em caso de incidente com dado real — isso é o
  domínio do Gate R0 (`PLANO-MESTRE.md` §10, item "processo de exclusão e atendimento ao
  titular"), não desta Onda.
