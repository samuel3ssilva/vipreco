-- R2.3 — epílogo de toda consulta remota do preflight. Nunca roda sozinho.
--
-- `ROLLBACK` e não `COMMIT`, mesmo a transação sendo read-only e não havendo nada a
-- desfazer. É a forma de o arquivo dizer, sem depender de comentário, que nada daqui
-- foi feito para persistir.

ROLLBACK;
