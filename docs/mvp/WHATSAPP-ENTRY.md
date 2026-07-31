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

## Ação humana pendente

Cadastrar `VITE_WHATSAPP_NUMBER` no ambiente de staging (e depois no de produção) com o número
operacional real. Enquanto isso não acontece, o código, os testes e a configuração de exemplo já
estão prontos e o CTA simplesmente não aparece.

> Envie **apenas o número**. Nunca junto de senha, token ou segredo.

## Rollback

Reverter o commit, ou apenas remover a variável do ambiente — o CTA deixa de ser renderizado na
publicação seguinte, sem mudança de código.
