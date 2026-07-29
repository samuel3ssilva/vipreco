# Prompt CTO — Onda 2 (registro de governança)

**Status:** aprovado pelo PMO, entregue ao CTO em 2026-07-29 junto com `PLANO-MESTRE.md`.
**Natureza:** instrução operacional endereçada ao CTO/Staff Engineer para a adoção do
Plano Mestre v2.1 e o fechamento da Onda 2. Registrado aqui como histórico de governança —
não é reexecutado automaticamente a partir deste arquivo; a missão em si já foi concluída
(ou está em andamento) conforme o restante deste repositório e do PR referenciado.

---

# Prompt para o CTO — adoção do Plano Mestre v2.1 e fechamento da Onda 2

Você continua como CTO / Staff Engineer do ViPreço.

O arquivo **PLANO-MESTRE_ViPreco-v2.1.md** passa a ser a referência estratégica e operacional aprovada pelo PMO. O `CLAUDE.md` continua governando como trabalhar no código. Não renumere, reabra ou apague Ondas já concluídas.

## Regra de prioridade

A única missão executável agora é **encerrar a Onda 2 — separação real de staging e produção**.

Não inicie Onda 3, Onda 4, dados reais, piloto Artemis ou implementação do MVP. A trilha de produto do plano é referência futura e exigirá uma missão separada.

## Autonomia

Trabalhe com autonomia operacional ampliada em tudo que for local, técnico, reversível e dentro da Onda 2. Não peça ao Founder para executar comandos, editar arquivos ou realizar verificações que você mesmo possa fazer.

Você pode:

- ler arquivos locais ignorados pelo Git sem imprimir valores;
- editar configurações locais;
- executar scripts, lint, testes, build e dry-runs;
- consultar staging e produção em modo seguro;
- atualizar código, testes, documentação e PR #11;
- corrigir achados dentro do escopo;
- verificar CI e CodeQL;
- realizar revisão adversarial;
- continuar até um checkpoint humano real.

Pare antes de credenciais, GitHub secrets, token Cloudflare, custos, primeiro deploy, DNS, merge, exclusões, dados reais ou ação irreversível.

## Estado atual confirmado

- PR #11 aberto e não mergeado;
- Fase A da Onda 2 concluída;
- Supabase `vipreco-production` criado no plano Free, região São Paulo;
- quatro migrations aplicadas;
- validação estrutural: 6 tabelas, 6 policies, 6 tabelas com RLS, 4 funções e `pg_trgm` ativa;
- `.env.production` criado e ignorado pelo Git;
- Project IDs e Publishable Keys corretos;
- `SUPABASE_URL` e `VITE_SUPABASE_URL` contêm indevidamente `/rest/v1/` e precisam ser corrigidos;
- nenhum GitHub Environment criado;
- nenhum secret cadastrado;
- nenhum token Cloudflare dedicado à produção criado;
- nenhum Worker de produção implantado;
- nenhum deploy executado;
- DNS inalterado;
- staging legado preservado;
- nenhum dado real.

## Missão técnica imediata

1. Leia `.env.production` localmente, sem imprimir valores.
2. Remova somente o sufixo `/rest/v1/` de `SUPABASE_URL` e `VITE_SUPABASE_URL`.
3. Confirme o formato `https://<project-ref>.supabase.co`.
4. Execute `bun run verify-env:production`.
5. Valide conexão de leitura e RLS no Supabase de produção, sem escrita real.
6. Atualize `config/environments.json` com o Project Reference real.
7. Verifique que scripts e workflow falham fechados contra:
   - secrets ausentes;
   - URL com sufixo incorreto;
   - Project ID divergente;
   - credenciais de staging em production;
   - credenciais de production em staging;
   - fallback silencioso entre ambientes.
8. Execute lint, test e build.
9. Atualize PR #11 sem incluir `.env.production`, `HANDOFF-2026-07-27.md` ou qualquer relatório privado.
10. Verifique CI e CodeQL no novo HEAD.
11. Faça revisão adversarial do escopo da Onda 2.
12. Prepare um único checkpoint humano consolidado.

## Checkpoint humano esperado

O relatório deve orientar o Founder, uma ação por vez, para:

1. criar os GitHub Environments `staging` e `production`;
2. cadastrar em cada ambiente:
   - `CLOUDFLARE_API_TOKEN`;
   - `SUPABASE_URL`;
   - `SUPABASE_PROJECT_ID`;
   - `SUPABASE_PUBLISHABLE_KEY`;
3. criar token Cloudflare dedicado à produção, com menor privilégio suficiente e escopo correto;
4. configurar required reviewer do Environment `production`, quando suportado;
5. autorizar explicitamente o primeiro deploy.

Não peça valores no chat e não imprima valores. Para validar, use presença, formato, chamadas seguras ou fingerprints não reversíveis.

## Depois do checkpoint humano

Não faça o primeiro deploy até receber autorização explícita.

Após autorização:

- implante o Worker de produção em `workers.dev`;
- não altere `vipreco.com.br`;
- execute smoke tests;
- prove isolamento staging/production com dados fictícios identificados;
- valide rollback;
- conclua documentação e auditoria;
- confirme CI e CodeQL verdes;
- deixe PR #11 pronto, mas não faça merge.

## Proibições

- não alterar DNS;
- não coletar ou cadastrar dados reais;
- não remover staging ou aviso de teste;
- não remover `approve_submission()`;
- não mexer nos PRs do Dependabot;
- não misturar tarefas de produto com PR #11;
- não iniciar Onda 3;
- não fazer merge;
- não expor credenciais em log, diff, mensagem ou artefato.

## Formato do próximo relatório

1. estado inicial verificado;
2. alterações realizadas;
3. testes e evidências;
4. estado do PR #11, CI e CodeQL;
5. riscos e itens NOT VERIFIED;
6. checkpoint humano consolidado;
7. rollback;
8. veredito: `READY FOR HUMAN CHECKPOINT`, `BLOCKED` ou `NOT READY`.
