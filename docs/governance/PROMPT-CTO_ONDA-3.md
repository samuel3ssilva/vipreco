# Prompt CTO — Onda 3 (registro de governança)

**Status:** aprovado pelo PMO/Founder, entregue ao CTO em 2026-07-29, imediatamente após o
fechamento formal da Onda 2 (PR #11 mergeado em `main`, commit `559e9f6`).
**Natureza:** mandato de execução (não apenas diagnóstico) endereçado ao CTO/Staff Engineer
para conduzir a Onda 3 — segurança da aplicação, banco e borda — do início ao checkpoint
humano final. Registrado aqui como histórico de governança, na íntegra, conforme recebido.
Um segundo bloco, "Atualização — Brand System ViPreço v2 aprovado", foi entregue no mesmo
turno e está anexado ao final deste documento.

---

# MANDATO EXECUTIVO — ONDA 3 DO VIPREÇO

## SEGURANÇA DA APLICAÇÃO, BANCO E BORDA

Você continua como CTO / Staff Engineer do ViPreço.

A Onda 2 foi formalmente encerrada pelo Founder e pelo PMO. Staging e
produção estão separados e comprovadamente isolados.

Sua única missão executável agora é:

ONDA 3 — SEGURANÇA DA APLICAÇÃO, BANCO E BORDA.

Este é um mandato de execução, não apenas de diagnóstico ou planejamento.

Trabalhe com autonomia operacional máxima controlada. Investigue, implemente,
teste, corrija, documente, abra PR e execute revisões independentes sem pedir
confirmações intermediárias para atividades técnicas, locais, reversíveis e
dentro do escopo.

Não inicie Onda 4, trilha de produto, MVP, spike de NFC-e ou uso de dados
reais.

======================================================================

1. FONTES DE VERDADE
   \======================================================================

Use esta hierarquia:

1. `origin/main` de `samuel3ssilva/vipreco` para código, migrations,
   workflows, dependências e documentação versionada.
2. Estado ao vivo de GitHub, Cloudflare e Supabase para configurações e
   recursos externos.
3. `CLAUDE.md` para governar como trabalhar.
4. `PLANO-MESTRE.md` para governar escopo, ordem, gates e prioridades.
5. Este mandato para governar a execução imediata da Onda 3.
6. Relatórios anteriores e chat apenas como contexto, nunca como substitutos
   da evidência atual.

Não presuma que uma configuração continua igual apenas porque foi reportada.
Verifique o estado real.

====================================================================== 2. ESTADO INICIAL CONFIRMADO
======================================================================

Estado de referência ao encerrar a Onda 2:

- `main` no merge commit:
  `559e9f6287b1b066c0420e55956feea74faeadf2`;
- PR #11 mergeado;
- CI e CodeQL verdes;
- 0 alertas de code scanning;
- GitHub Environments `staging` e `production` criados;
- `production` restrito à branch `main`;
- Founder configurado como required reviewer;
- quatro secrets próprios em cada Environment;
- Supabase de staging e produção separados;
- Worker de staging:
  `samuel3ssilva-vipreco`;
- Worker de produção:
  `vipreco-production`;
- produção em `workers.dev`, sem DNS próprio;
- produção com zero linhas nas tabelas de negócio;
- staging com dados fictícios;
- leitura anônima permitida conforme as policies atuais;
- escrita anônima em `prices` bloqueada;
- DNS de `vipreco.com.br` sem A/AAAA;
- nenhum dado real cadastrado;
- Onda 3 ainda não iniciada.

URLs técnicas conhecidas:

STAGING
`https://samuel3ssilva-vipreco.samuel-bortoletto.workers.dev/`

PRODUCTION
`https://vipreco-production.samuel-bortoletto.workers.dev/`

Essas URLs não são lançamento público.

Antes de trabalhar, confirme o estado atual e use o estado real caso algum
item tenha mudado.

====================================================================== 3. GOVERNANÇA DA BRANCH E DO PR
======================================================================

1. Faça `git fetch --prune`.
2. Confirme que `origin/main` está íntegra e com CI/CodeQL verdes.
3. Preserve qualquer alteração local não relacionada.
4. Não faça reset forçado, rebase destrutivo, clean, force-push ou amend de
   trabalho alheio.
5. Crie uma branch exclusiva, sugerida:

   `security/onda-3-hardening`

6. Use um único PR para a Onda 3, salvo se surgir justificativa técnica
   comprovada para separar uma mudança crítica.
7. Não faça commit direto em `main`.
8. Não faça merge.
9. Não altere nem faça merge dos PRs do Dependabot como atalho.
10. Uma vulnerabilidade direta e material encontrada em dependência pode ser
    corrigida dentro do PR da Onda 3, com justificativa e atualização mínima.
    Não use isso para atualizar dependências sem relação com o risco.

====================================================================== 4. ATUALIZAÇÃO DOCUMENTAL INICIAL
======================================================================

No início da branch:

1. adicione este mandato integralmente em:

   `docs/governance/PROMPT-CTO_ONDA-3.md`

2. atualize apenas o estado operacional de `PLANO-MESTRE.md`:

   - Onda 2: concluída;
   - Onda 3: em execução;
   - preservar estratégia, tese, gates e escopo;
   - não reescrever conteúdo substantivo por iniciativa própria.

3. ajuste ponteiros de status em `README.md` ou documentação equivalente
   somente quando estiverem objetivamente desatualizados;

4. preserve o histórico da Onda 2;

5. faça um commit documental separado, sugerido:

   `docs: inicia Onda 3 e registra encerramento da Onda 2`

Não marque a Onda 3 como concluída antes da implantação e das verificações
finais.

====================================================================== 5. MODELO DE AUTONOMIA
======================================================================

Você está autorizado a executar autonomamente:

- investigação e threat modeling;
- leitura de arquivos locais ignorados pelo Git, sem imprimir valores;
- inspeção read-only de GitHub, Supabase e Cloudflare;
- criação de branch, código, migrations, scripts, testes e documentação;
- testes em banco descartável;
- lint, test, build e análise de bundle;
- atualização do PR;
- correção de falhas dentro do escopo;
- monitoramento de CI e CodeQL;
- revisão adversarial;
- preparação de rollout;
- validação read-only de staging e produção;
- criação de commits pequenos e coerentes.

Não peça ao Founder para:

- executar comandos que você pode executar;
- inspecionar arquivos;
- abrir PR;
- acompanhar CI;
- editar código;
- rodar testes;
- verificar configurações acessíveis à sua sessão;
- repetir informação já verificável.

Pare somente diante de:

- criação, inserção, rotação ou revogação de credencial;
- custo, assinatura ou mudança de plano;
- alteração de DNS;
- merge;
- escrita ou migration remota em produção;
- deploy de mudança da Onda 3;
- exclusão ou ação destrutiva;
- redução de proteção;
- dados reais;
- decisão jurídica;
- conflito material de produto;
- decisão visual dependente do novo PMO de Design.

Agrupe todas as ações humanas em um único checkpoint sempre que possível.

====================================================================== 6. PRINCÍPIOS DE SEGURANÇA
======================================================================

- Nenhum secret em código, Git, logs, relatórios, argumentos visíveis ou
  bundle.
- Nenhuma chave administrativa no frontend.
- Nenhum `service_role`, `sb_secret_` ou equivalente em variável `VITE_*`.
- Publishable keys podem existir no cliente somente com RLS e grants seguros.
- Produção não é ambiente de teste.
- Não inserir nem mesmo dados sintéticos em produção antes do gate final.
- Migrations já aplicadas nunca são editadas.
- Correções entram em migrations novas.
- Não depender de segurança apenas no frontend.
- Falhar fechado quando configuração ou secret estiver ausente.
- Não implementar controle que apenas pareça seguro sem proteger uma
  superfície real.
- Não criar login, autenticação de usuário ou feature fora do MVP.
- Não criar nova credencial Turnstile apenas para cumprir checklist.
- Não usar ferramenta paga ou recurso com custo sem autorização.
- Não enfraquecer staging ou produção para facilitar testes.
- Usar `NOT VERIFIED` quando a evidência não for possível.

====================================================================== 7. FASE A — RECUPERAÇÃO E THREAT MODEL
======================================================================

Faça primeiro uma recuperação read-only completa.

Mapeie:

1. ativos;
2. dados;
3. papéis;
4. superfícies públicas;
5. fronteiras de confiança;
6. caminhos de leitura;
7. caminhos de escrita;
8. funções RPC;
9. Worker e rotas;
10. chamadas ao Supabase;
11. armazenamento local;
12. dependências externas;
13. build e deploy;
14. staging e produção;
15. possíveis atacantes;
16. abusos plausíveis;
17. impacto e probabilidade.

Inclua pelo menos:

- visitante anônimo;
- usuário malicioso sem conta;
- comerciante futuro;
- operador interno futuro;
- script automatizado;
- crawler;
- comprometimento de publishable key;
- erro de configuração entre staging e produção;
- XSS por conteúdo de produto ou mercado;
- abuso de endpoints;
- vazamento por logs, bundle ou source map;
- uso indevido de função `SECURITY DEFINER`;
- falha de RLS;
- dado demo em produção;
- conteúdo patrocinado confundido com orgânico;
- recurso dormente exposto acidentalmente.

Produza:

`docs/security/THREAT-MODEL-ONDA-3.md`

Use uma tabela com:

- ativo;
- ameaça;
- superfície;
- controle existente;
- falha;
- severidade;
- correção;
- evidência;
- risco residual.

Não pare para apresentar o plano. Continue para implementação, salvo bloqueio
material.

====================================================================== 8. FASE B — AUDITORIA DE BANCO E SUPABASE
======================================================================

Audite o estado versionado e, quando a sessão permitir, o estado ao vivo de
staging e produção.

Inspecione:

- schemas expostos;
- `USAGE` por role;
- grants de tabelas;
- grants de sequences;
- grants de funções;
- grants de views;
- RLS por tabela;
- policies para `anon`, `authenticated`, `service_role` e `PUBLIC`;
- policies permissivas que se somam de forma perigosa;
- funções `SECURITY DEFINER`;
- `search_path`;
- owner;
- execute privileges;
- SQL dinâmico;
- views;
- triggers;
- extensões;
- Storage;
- buckets;
- policies de Storage;
- autenticação;
- signup;
- redirects;
- RPCs;
- Data API;
- tabelas dormentes;
- dados `is_demo`;
- exposição de colunas desnecessárias;
- diferença entre migrations e banco vivo.

Crie uma matriz antes/depois:

`docs/security/DATABASE-AUTHORIZATION-MATRIX.md`

A matriz deve mostrar, sem valores sensíveis:

- recurso;
- role;
- SELECT;
- INSERT;
- UPDATE;
- DELETE;
- EXECUTE;
- policy aplicável;
- justificativa;
- estado antes;
- estado depois.

====================================================================== 9. REGRAS ESPECÍFICAS DE RLS E GRANTS
======================================================================

Critérios mínimos:

1. Toda tabela exposta pela API deve ter RLS habilitado.
2. Nenhuma escrita por `anon` ou `authenticated` sem necessidade explícita,
   teste e justificativa.
3. Nenhum `GRANT ALL` genérico sem necessidade comprovada.
4. Nenhuma sequence com privilégio excessivo.
5. Nenhuma policy cujo nome pareça restritivo, mas cuja expressão permita
   acesso amplo.
6. Toda policy deve possuir teste de regressão.
7. Leitura pública deve expor apenas dados destinados ao consumidor.
8. Dado operacional ou confidencial não pode ficar acessível por chave
   publicável.
9. Staging e produção devem ter comportamento de autorização equivalente,
   exceto dados demo e banner.
10. Toda correção deve entrar em migration nova e idempotente quando aplicável.

Não aplique migration remotamente antes do gate humano final.

Valide migrations em banco descartável.

Caso a stack Supabase completa continue inviável no host por memória:

- não force o host;
- use Postgres descartável ou mecanismo equivalente;
- registre claramente o que foi validado;
- mantenha `supabase start` como `NOT VERIFIED`;
- não trate isso como sucesso completo da stack.

====================================================================== 10. `approve_submission()` E RECURSOS DORMENTES
======================================================================

A moderação pública saiu do MVP.

Audite:

- dependências da função;
- grants;
- owner;
- `search_path`;
- SQL interno;
- tabelas relacionadas;
- chamadas no frontend;
- chamadas no Worker;
- chamadas em testes;
- possibilidade de abuso;
- necessidade de permanência.

Regra padrão:

- manter dormente;
- remover acesso de `PUBLIC`, `anon` e `authenticated`;
- permitir somente o papel estritamente necessário;
- não expor interface;
- não ampliar função;
- não apagar dados ou estrutura por conveniência.

Só prepare remoção destrutiva caso:

- não exista dependência;
- exista ganho real de segurança;
- haja migration separada;
- haja plano de reversão;
- a remoção seja apresentada no gate humano.

Não execute remoção destrutiva autonomamente.

====================================================================== 11. STORAGE E AUTENTICAÇÃO
======================================================================

O MVP não usa login nem upload público no app.

Portanto:

- não crie login;
- não crie signup;
- não crie bucket apenas para antecipar fotos;
- não crie upload público;
- não crie perfil de usuário;
- não crie sessão persistente.

Audite o que já existe.

Caso Storage não seja usado:

- confirme ausência de buckets públicos;
- confirme ausência de policies amplas;
- documente como "não utilizado e fechado";
- não crie infraestrutura desnecessária.

Caso Auth esteja tecnicamente habilitado por padrão:

- confirme que nenhuma interface do app expõe signup/login;
- confira redirects e configurações públicas;
- documente o risco residual;
- não altere configurações que possam afetar terceiros sem necessidade.

====================================================================== 12. FASE C — APLICAÇÃO E FRONTEND
======================================================================

Audite:

- usos de `dangerouslySetInnerHTML`;
- HTML inserido diretamente;
- sanitização;
- parâmetros de URL;
- query strings;
- redirects;
- links externos;
- `target="_blank"` sem proteção;
- conteúdo de produto e mercado;
- mensagens de erro;
- exposição de stack;
- logs;
- localStorage;
- sessionStorage;
- cookies;
- source maps;
- variáveis públicas;
- bundle;
- service worker;
- cache;
- fetches;
- CORS;
- origem de fontes, scripts e imagens;
- dependências carregadas externamente;
- tratamento de URLs do Supabase;
- comportamento em configuração ausente.

Procure no bundle gerado:

- `service_role`;
- `sb_secret_`;
- database password;
- Cloudflare token;
- chaves privadas;
- endpoints administrativos;
- valores de `.env.production`;
- source maps públicos indevidos.

Nunca imprima valor encontrado.

Registre apenas:

- tipo;
- arquivo;
- origem;
- severidade;
- correção.

====================================================================== 13. HEADERS E CSP
======================================================================

Implemente headers no Worker, adequados à arquitetura real.

Avalie e teste, entre outros:

- `Content-Security-Policy`;
- `X-Content-Type-Options`;
- `Referrer-Policy`;
- `Permissions-Policy`;
- proteção contra framing;
- `Strict-Transport-Security`;
- política de cache;
- `X-Robots-Tag` para URLs técnicas não lançadas;
- remoção de headers desnecessários;
- CORS quando aplicável.

A CSP deve:

- nascer do inventário real de origens;
- evitar wildcards amplos;
- bloquear objetos;
- restringir `base-uri`;
- restringir framing;
- restringir scripts;
- restringir conexões;
- permitir apenas o necessário para o Supabase e ativos reais;
- justificar qualquer `unsafe-inline`;
- não usar `unsafe-eval` em produção;
- ter testes automatizados;
- não quebrar staging ou produção.

Diferencie desenvolvimento local, staging e produção quando tecnicamente
necessário.

Não implemente uma CSP "bonita no papel" que impeça o app de carregar.

Produza:

`docs/security/EDGE-SECURITY-POLICY.md`

Inclua matriz por ambiente e justificativa de cada origem autorizada.

====================================================================== 14. TURNSTILE, RATE LIMITS E ANTI-SPAM
======================================================================

A implementação deve ser orientada pela superfície real.

Primeiro determine:

- existe endpoint público de escrita?
- existe formulário público?
- existe submissão de preço ativa?
- existe RPC chamável por anônimo?
- existe rota que possa gerar custo?
- existe ação automatizável que produza efeito persistente?

Caso não exista superfície pública de escrita no MVP atual:

- não crie Turnstile;
- não peça site key ou secret;
- não crie rate limiter artificial;
- feche e teste as superfícies desnecessárias;
- documente Turnstile como controle futuro condicionado à criação de uma
  ação pública;
- adicione checklist ou teste que impeça uma futura rota de escrita de ser
  adicionada sem proteção.

Caso exista superfície pública real:

- implemente proteção server-side;
- valide token server-side;
- não confie no widget do cliente;
- aplique rate limit por risco;
- não use apenas IP quando isso causar bloqueio indevido;
- não armazenar dado pessoal desnecessário;
- não contratar produto pago sem autorização;
- qualquer nova credencial deve virar checkpoint humano consolidado.

Nunca criar proteção apenas no frontend.

====================================================================== 15. COMPORTAMENTO DE STAGING E PRODUÇÃO
======================================================================

Confirme e fortaleça:

STAGING

- banner visível de ambiente de teste;
- aviso de preços fictícios;
- dados demo permitidos;
- não indexável;
- Worker e Supabase próprios;
- sem acesso a secrets de produção.

PRODUCTION

- sem banner de staging;
- sem seed demo por padrão;
- tabelas de negócio vazias;
- não indexável enquanto estiver apenas em `workers.dev`;
- sem exposição pública do domínio oficial;
- Worker e Supabase próprios;
- sem acesso a secrets de staging.

Adicione testes que falhem quando:

- produção usa ref de staging;
- staging usa ref de produção;
- produção recebe seed demo;
- o nome do Worker é trocado;
- variável obrigatória falta;
- URL contém `/rest/v1/`;
- chave administrativa entra em variável pública;
- ambiente desconhecido tenta fazer deploy.

Não renomeie o Worker de staging nesta Onda.

====================================================================== 16. ACESSIBILIDADE
======================================================================

Faça auditoria técnica de acessibilidade compatível com WCAG 2.2 AA:

- HTML semântico;
- landmarks;
- ordem de headings;
- labels;
- navegação por teclado;
- foco visível;
- estados de foco;
- tamanho de alvo;
- contraste;
- zoom em 200%;
- leitor de tela;
- mensagens de erro;
- redução de movimento;
- estados vazios;
- idioma da página;
- títulos;
- links;
- botões;
- tabelas;
- componentes interativos.

Implemente correções técnicas e visuais pequenas que não dependam da nova
identidade.

Não execute agora:

- rebranding completo;
- novo logo;
- nova paleta;
- nova arquitetura visual;
- telas de Achados;
- mudança de posicionamento;
- implementação do Brand Book v2;
- redesenho do MVP.

O PMO de Design está atualizando a identidade para o novo Plano Mestre.

Até existir um handoff explicitamente aprovado pelo Founder e PMO:

- preserve a aparência atual;
- corrija apenas problemas objetivos de acessibilidade;
- evite mudanças que produzam retrabalho;
- registre pontos que deverão ser resolvidos pelo novo design system.

Se o material de Design v2 chegar durante esta execução, não o incorpore ao
PR da Onda 3. Prepare integração em trilha ou PR separado.

Produza:

`docs/accessibility/ACCESSIBILITY-AUDIT-ONDA-3.md`

====================================================================== 17. SUPPLY CHAIN E DEPENDÊNCIAS
======================================================================

Audite:

- dependências de runtime;
- dependências de build;
- scripts de instalação;
- registries;
- lockfile;
- pacotes não usados;
- pacotes com postinstall;
- vulnerabilidades conhecidas reportadas pelas ferramentas disponíveis;
- versões diretamente exploráveis no runtime atual;
- GitHub Actions e versões de actions;
- permissões de workflows.

Não atualize tudo indiscriminadamente.

Corrija apenas:

- vulnerabilidade relevante;
- dependência abandonada diretamente ligada à superfície;
- action insegura;
- permissão excessiva;
- risco de supply chain comprovado.

Mantenha Dependabot e CodeQL ativos.

Workflows devem utilizar o menor conjunto possível de permissões.

====================================================================== 18. TESTES DE SEGURANÇA OBRIGATÓRIOS
======================================================================

Crie testes para os controles implementados.

Inclua, quando aplicável:

- matriz de RLS;
- leitura permitida;
- escrita negada;
- `approve_submission()` sem acesso público;
- função com `search_path` seguro;
- grants esperados;
- ambiente misturado;
- secret em variável pública;
- headers;
- CSP;
- framing;
- robots/noindex;
- URLs inválidas;
- source maps;
- links externos;
- XSS por conteúdo;
- comportamento sem variável obrigatória;
- produção sem dados demo;
- staging preservado;
- build de staging;
- build de produção.

Use fixtures e dados sintéticos.

Não escrever em produção.

Base mínima obrigatória:

`bun run lint`
`bun run test`
`bun run build`
`bun run verify-env:staging`
`bun run verify-env:production`

Execute também as novas suítes de segurança.

Nenhuma tarefa pode ser marcada como concluída apenas porque o código
"parece correto".

====================================================================== 19. REVISÃO INDEPENDENTE
======================================================================

Antes do checkpoint humano, faça pelo menos duas revisões isoladas:

REVISÃO A — BANCO E AUTORIZAÇÃO

Revisor separado deve procurar:

- bypass de RLS;
- grants excessivos;
- função insegura;
- `search_path`;
- policies permissivas;
- vazamento por view;
- Storage;
- inconsistência migration versus banco;
- acesso indevido de `anon` e `authenticated`.

REVISÃO B — APLICAÇÃO E BORDA

Revisor separado deve procurar:

- XSS;
- CSP incompleta;
- header ausente;
- cache inseguro;
- CORS;
- source map;
- segredo no bundle;
- workflow excessivo;
- ambiente misturado;
- proteção de abuso falsa;
- regressão de acessibilidade.

Os revisores não devem apenas confirmar sua implementação.

Eles devem tentar quebrá-la.

Registre:

- método;
- achados;
- severidade;
- correções;
- itens contestados;
- veredicto independente.

Produza:

`docs/security/ADVERSARIAL-REVIEW-ONDA-3.md`

====================================================================== 20. COMMITS E DOCUMENTAÇÃO
======================================================================

Prefira commits pequenos e coerentes, por exemplo:

- `docs: inicia Onda 3`
- `security(db): restringe grants e recursos dormentes`
- `security(edge): adiciona headers e CSP`
- `security(app): fortalece fronteiras e configuração`
- `test(security): adiciona regressões da Onda 3`
- `docs(security): registra threat model e evidências`

Os nomes são sugestões, não obrigação.

Atualize:

- documentação de segurança;
- descrição do PR;
- matriz de riscos;
- limitações;
- rollout;
- rollback ou compensating migration;
- `NOT VERIFIED`;
- instruções operacionais necessárias.

Não colocar valores de secrets, chaves, IDs sensíveis completos ou dados
pessoais.

====================================================================== 21. VALIDAÇÃO REMOTA ANTES DO GATE
======================================================================

Antes do checkpoint final, faça tudo que for possível sem escrita remota:

- confirme secrets apenas por nome;
- confirme GitHub Environments e proteções;
- confirme Worker de staging e produção;
- confirme Supabase refs distintos;
- confira DNS read-only;
- confira produção vazia;
- confira staging com dados demo;
- confira leitura pública;
- confira escrita anônima bloqueada;
- confira headers atuais;
- prepare comparação antes/depois;
- confira CI e CodeQL;
- varra o diff inteiro por secrets;
- confirme ausência de arquivos privados.

Não aplique migration, não faça deploy e não faça merge.

====================================================================== 22. ÚNICO CHECKPOINT HUMANO FINAL
======================================================================

Pare somente quando:

- auditoria estiver concluída;
- correções estiverem implementadas;
- migrations estiverem testadas localmente;
- PR estiver aberto e mergeável;
- CI e CodeQL estiverem verdes;
- revisões independentes estiverem concluídas;
- diff estiver limpo;
- rollout estiver pronto;
- staging e produção continuarem isolados;
- não houver dado real;
- DNS estiver inalterado.

No checkpoint, entregue:

1. veredito;
2. branch;
3. PR;
4. commits;
5. threat model;
6. matriz de grants/RLS antes e depois;
7. migrations novas;
8. funções e recursos dormentes;
9. headers e CSP;
10. Turnstile/rate limit implementados ou justificadamente não aplicáveis;
11. achados de frontend;
12. acessibilidade;
13. testes;
14. CI e CodeQL;
15. revisões independentes;
16. riscos bloqueantes;
17. riscos não bloqueantes;
18. `NOT VERIFIED`;
19. plano de rollout em staging;
20. plano de rollout em produção;
21. rollback ou compensating migration;
22. ações humanas exatas;
23. confirmação de que DNS e dados reais permanecerão intocados.

Caso seja necessário aplicar migration ou configuração remota, agrupe isso no
mesmo checkpoint.

A autorização esperada deve ser apresentada em uma única frase, adaptada ao
estado real, semelhante a:

"AUTORIZO O MERGE DO PR DA ONDA 3, A APLICAÇÃO DAS MUDANÇAS NÃO DESTRUTIVAS
E O DEPLOY PRIMEIRO EM STAGING E, APÓS VALIDAÇÃO VERDE, EM PRODUÇÃO,
SEM ALTERAR DNS, SEM DADOS REAIS E SEM INICIAR O MVP."

A proteção de `production` por required reviewer deve continuar ativa.

Depois do merge:

1. implante e valide staging;
2. investigue autonomamente qualquer falha reversível;
3. só prossiga para produção se staging estiver integralmente verde;
4. deixe produção aguardar a aprovação do required reviewer;
5. após aprovação, execute deploy e smoke tests;
6. valide isolamento, RLS, headers e aplicação;
7. não altere DNS;
8. não inserir dados;
9. entregue o relatório final da Onda 3.

====================================================================== 23. BLOQUEIOS EXCEPCIONAIS
======================================================================

Só interrompa antes do checkpoint final se houver:

- necessidade inevitável de nova credencial;
- custo;
- mudança de plano;
- decisão de produto;
- conflito com o Plano Mestre;
- risco de perda de dados;
- migration destrutiva;
- impossibilidade de auditar autorização ao vivo;
- vulnerabilidade crítica ativa;
- falta de acesso que torne a continuação insegura.

Nesse caso, não devolva uma lista longa de tarefas.

Entregue:

1. o bloqueio exato;
2. evidência;
3. impacto;
4. o que já foi concluído;
5. menor ação humana possível;
6. comando ou passo único;
7. ponto exato em que retomará.

====================================================================== 24. FORA DE ESCOPO
======================================================================

Não iniciar:

- Onda 4;
- backups e restore real;
- observabilidade completa;
- plano de incidente;
- runbooks de resiliência;
- MVP;
- Achados do dia;
- pipeline de ingestão;
- ledger fiscal;
- NFC-e;
- cashback;
- Pix;
- login;
- geolocalização;
- cesta;
- crawler;
- dados reais;
- participantes;
- comerciantes reais;
- domínio;
- SEO;
- divulgação;
- nova identidade visual;
- PRs de produto.

Não misture segurança com desenvolvimento de features.

====================================================================== 25. CRITÉRIOS DE ENCERRAMENTO
======================================================================

A Onda 3 só pode ser recomendada como concluída quando:

- não existir escrita pública não intencional;
- RLS e grants tiverem evidência e testes;
- funções privilegiadas estiverem restritas;
- recursos dormentes estiverem fechados;
- Storage e Auth estiverem auditados;
- frontend e bundle estiverem sem segredo;
- headers estiverem ativos e testados;
- CSP estiver ativa e funcional;
- staging e produção continuarem isolados;
- produção continuar sem dados demo;
- superfícies de abuso estiverem protegidas ou comprovadamente ausentes;
- acessibilidade técnica crítica estiver corrigida;
- CI e CodeQL estiverem verdes;
- revisões independentes não tiverem bloqueios;
- rollout tiver sido validado;
- DNS e dados reais permanecerem intocados.

Vereditos permitidos:

- `WAVE READY FOR PMO REVIEW`
- `WAVE READY WITH NON-BLOCKING FINDINGS`
- `WAVE INTERRUPTED AT SAFE CHECKPOINT`
- `WAVE BLOCKED`

Comece agora pela recuperação read-only de `origin/main`, registre este
mandato no repositório, execute a Onda 3 integralmente e retorne somente em
um checkpoint humano real.

---

# ANEXO — ATUALIZAÇÃO: BRAND SYSTEM VIPREÇO V2 APROVADO

O PMO de Design concluiu e o Founder/PMO aprovou o Brand System v2.

Antes de executar a Onda 3, localize e inspecione integralmente o pacote
entregue pelo Founder.

Hierarquia específica de Design:

1. PLANO-MESTRE.md — estratégia, escopo e gates;
2. HANDOFF-DESIGN-CTO.md — critérios técnicos e regras de adoção;
3. vipreco-tokens-v2.css e vipreco-tokens-v2.json — fonte canônica dos tokens;
4. documentos ViPreço v2 — referência de experiência, marca e operação;
5. arquivos v1 — somente histórico e migração.

Quando houver divergência entre exemplos visuais, não faça interpretação
criativa. Use a hierarquia acima.

Nesta Onda 3, está autorizado a:

- incorporar os artefatos canônicos de Design ao repositório;
- validar JSON, CSS e SVG;
- garantir que documentos e arquivos gerados não entrem no bundle público;
- instalar os tokens v2 de forma reversível;
- preservar aliases v1 por uma release quando necessário;
- implementar foco, contraste, tipografia, semântica e acessibilidade;
- aplicar ou fortalecer a faixa obrigatória de staging;
- self-host das fontes somente se isso for compatível com CSP, licença e
  tamanho do bundle;
- substituir logo, favicon e assinatura quando os SVGs forem tecnicamente
  validados;
- criar testes automatizados de contraste e regras não negociáveis.

Antes de adotar os valores de contraste, recalcule todos os pares pelo
algoritmo WCAG. Não confiar apenas nos números escritos no JSON.

Achados conhecidos a verificar:

- `--vp-time-expired` pode não atingir 4,5:1 sobre seu fundo;
- `--vp-text-faint` não deve ser usado em texto normal quando não atingir AA;
- os valores declarados de contraste devem coincidir com os valores
  recalculados.

Corrija tokens semânticos com a menor mudança possível. Não altere
silenciosamente as cores centrais da marca. Registre antes/depois e teste.

Não implementar nesta branch:

- nova arquitetura da home;
- Achados do dia;
- contagem regressiva como feature;
- cards PNG;
- Open Graph dinâmico;
- página completa "Como funciona";
- fluxo do lojista;
- coleta;
- NFC-e;
- cupom concierge;
- Pix ou cashback;
- kit comercial;
- features de produto.

Esses itens permanecem na Trilha de Produto, em branch e PR separados.

Os HTMLs offline, `support.js` e materiais de referência nunca devem ser
copiados para `public/`, servidos pelo Worker ou incluídos no bundle da
aplicação sem justificativa explícita.

Toda alegação operacional do Service Blueprint relacionada a métricas,
cupom, retenção, participantes ou pagamento é provisória e bloqueada pelo
Gate R0. Não tratá-la como autorização de operação.

Os arquivos do pacote de marca estão em
`~/Downloads/Estratégia de marca e identidade visual_new/` (fora do
repositório Git, não versionado — consultar localmente quando necessário).
