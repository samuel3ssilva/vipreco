# Prompt CTO — Onda 4 (registro de governança)

**Status:** aprovado pelo PMO/Founder, entregue ao CTO em 2026-07-30, imediatamente após o
fechamento formal da Onda 3 (PR #14 mergeado em `main`, commit `8bbb50c`).
**Natureza:** mandato de execução (não apenas diagnóstico) endereçado ao CTO/Staff Engineer
para transformar a Onda 4 — resiliência operacional — em plano técnico executável e
implementar em branch tudo que for local, reversível, sem custo novo, sem credencial
adicional, sem alteração de DNS, sem dado real, sem deploy ou alteração em produção e sem
mudança direta nas configurações protegidas do GitHub. Registrado aqui como histórico de
governança, na íntegra, conforme recebido.

---

AUTORIZO O MERGE DO PR #14 PARA FECHAR FORMALMENTE A DOCUMENTAÇÃO DA ONDA 3.

Após confirmar o merge e o novo HEAD da main, AUTORIZO O INÍCIO DA ONDA 4 —
RESILIÊNCIA OPERACIONAL, conforme o PLANO-MESTRE.md §12.3.

Trabalhe de forma autônoma e encadeada:

1. releia o PLANO-MESTRE.md, CLAUDE.md e os documentos de fechamento da
   Onda 3, usando a main atualizada como única fonte de verdade;

2. transforme a Onda 4 em um plano técnico executável, com critérios objetivos
   de conclusão, riscos, testes e ordem de implementação;

3. implemente autonomamente tudo que seja:
   - realizado em branch;
   - reversível;
   - sem custo novo;
   - sem credenciais adicionais;
   - sem alteração de DNS;
   - sem dados reais;
   - sem deploy ou alteração em produção;
   - sem mudança direta nas configurações protegidas do GitHub;

4. inclua testes automatizados, documentação operacional, evidências de CI e
   validações locais compatíveis com os recursos disponíveis;

5. investigue prioritariamente o risco can_admins_bypass: true e prepare uma
   recomendação concreta para eliminá-lo, incluindo impacto, procedimento,
   validação e rollback seguro, mas NÃO altere o GitHub Environment sem novo
   gate humano;

6. abra um ou mais PRs pequenos e revisáveis quando a implementação estiver
   pronta. Não faça merge desses PRs sem autorização;

7. não interrompa para atualizações intermediárias. Só retorne quando:
   - encontrar bloqueio material que não consiga resolver sozinho;
   - precisar de credencial, custo, produção, DNS ou configuração protegida;
   - houver decisão relevante de arquitetura ou produto;
   - ou a Onda 4 estiver implementada, com PRs prontos, CI verde e relatório
     consolidado para decisão de merge.

MANTENHA FORA DE ESCOPO:

- dados reais;
- início do MVP;
- domínio público;
- mudanças em produção;
- custos ou novos serviços;
- alterações diretas no Environment production;
- merge dos PRs da Onda 4.
