# Entrada no WhatsApp — CTA único via wa.me

Decisão do PMO registrada em **30/07/2026 — horário de Brasília** (North Star v1.2.2, Assets §6,
variante B). Implementação: `src/lib/whatsapp.ts`, `src/components/WhatsAppCta.tsx`.

## O que é

Um **link**. Nada além disso.

1. O morador toca em "Receber os Achados no WhatsApp".
2. Abre a conversa individual com a mensagem já escrita: **"Quero receber os Achados de
   Artemis"**. Ele só aperta enviar.
3. A resposta de onboarding é manual, por pessoa.
4. Saída: "para sair, é só avisar aqui" — pedido honrado sem fricção.

## O que **não** é

- Nenhum SDK, nenhuma biblioteca, nenhuma requisição a servidor da Meta.
- Nenhuma automação de mensagens.
- Nenhum Canal do WhatsApp nesta fase (documentado na North Star como alternativa futura, **não**
  é o destino atual).
- Nenhum número no código.

## Configuração

| Variável               | Onde        | Formato                                    |
| ---------------------- | ----------- | ------------------------------------------ |
| `VITE_WHATSAPP_NUMBER` | build (env) | internacional, só dígitos: `5519999999999` |

- **Não é segredo.** O número aparece no link público — é o mesmo que estaria impresso num
  cartaz. Nunca deve ser enviado junto de senha, token ou qualquer credencial.
- Configuração malformada (letras, sem DDI, fora do tamanho E.164) é recusada: vira `null`, não
  vira link errado.
- **Sem a variável, o CTA não é renderizado.** Um botão que abre um link quebrado — ou pior, uma
  conversa com um número errado — é pior do que a ausência do botão. A Home continua completa.

## Como o valor chega ao build

`VITE_*` é resolvida em **tempo de build**: se o valor não estiver no `.env` antes de
`bun run build`, o CTA não é renderizado — nem no HTML do servidor, nem depois da hidratação.

Em staging, `.github/workflows/deploy-staging.yml` faz, nesta ordem:

1. lê a variável do Environment `staging` e registra o valor em `::add-mask::`, para que ele não
   apareça em texto claro no log das etapas seguintes;
2. repassa por `$GITHUB_ENV` e escreve `VITE_WHATSAPP_NUMBER` no `.env`;
3. só então roda `bun run build` e publica.

Ressalva honesta sobre log: `vars.*` **não** é mascarada automaticamente pelo GitHub, e o bloco
`env:` de uma etapa é impresso no log. O valor aparece uma única vez — no `env:` da etapa que
faz o mascaramento — e vem mascarado em tudo que vier depois. Para chegar a **zero** ocorrências,
basta recadastrar `VITE_WHATSAPP_NUMBER` como _secret_ do Environment em vez de _variable_:
segredos são mascarados em toda parte, inclusive nesse bloco. É uma troca de cadastro, sem
mudança de código — o workflow lê `vars.VITE_WHATSAPP_NUMBER`, então a troca exige apenas mudar
essa referência para `secrets.VITE_WHATSAPP_NUMBER`.

Vale lembrar o que está sendo protegido: o número é **público por construção** — vai no bundle do
cliente e no link que qualquer visitante enxerga. O mascaramento é higiene de log, não sigilo.

## Estado da configuração

| Ambiente | `VITE_WHATSAPP_NUMBER`                                           |
| -------- | ---------------------------------------------------------------- |
| staging  | cadastrada como _variable_ do Environment `staging` (31/07/2026) |
| produção | **pendente** — cadastrar junto do rollout de produção            |

> Envie **apenas o número**. Nunca junto de senha, token ou segredo.

## Rollback

Reverter o commit, ou apenas remover a variável do ambiente — o CTA deixa de ser renderizado na
publicação seguinte, sem mudança de código.
