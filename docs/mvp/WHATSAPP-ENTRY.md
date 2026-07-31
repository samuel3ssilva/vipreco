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

Em staging, `.github/workflows/deploy-staging.yml` escreve `VITE_WHATSAPP_NUMBER` no `.env` a
partir do **secret** do Environment `staging`, junto das credenciais do Supabase, e só então roda
`bun run build`.

Por que _secret_ e não _variable_, se o valor é público? Porque o GitHub mascara sozinho apenas
`secrets.*`. Com `vars.*`, o valor aparecia em texto claro no bloco `env:` impresso no log da
etapa que o lia — e não havia como evitar isso mantendo o cadastro como variable. Como secret,
o log mostra `***` em toda parte e o workflow dispensa qualquer etapa de `add-mask`.

Vale lembrar o que está e o que não está sendo protegido: o número é **público por construção** —
vai no bundle do cliente e no link que qualquer visitante enxerga. Isso é higiene de log, não
sigilo.

## Estado da configuração

| Ambiente | `VITE_WHATSAPP_NUMBER`                                        |
| -------- | ------------------------------------------------------------- |
| staging  | _secret_ do Environment `staging` (31/07/2026)                |
| produção | **pendente** — cadastrar, como secret, no rollout de produção |

> Envie **apenas o número**. Nunca junto de senha, token ou segredo.

## Rollback

Reverter o commit, ou apenas remover a variável do ambiente — o CTA deixa de ser renderizado na
publicação seguinte, sem mudança de código.
