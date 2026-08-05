-- R2.5 - controle positivo do baseline de ACL. EXCLUSIVO DO DRILL.
--
-- POR QUE NAO ESTA EM 00-platform-baseline.sql
--
-- Porque aquele arquivo tambem alimenta o lado ESPERADO da comparacao de equivalencia
-- (scripts/r2/equivalence/run.sh). Uma tabela criada la apareceria no fingerprint efemero
-- e nao em staging -- e a comparacao acusaria MATERIAL DRIFT por causa de um andaime de
-- teste. O instrumento passaria a reprovar o banco por um objeto que so existe para
-- testar o instrumento.
--
-- Este arquivo roda so no drill, depois do baseline e antes das migrations.

-- CONTROLE POSITIVO DO PROPRIO BASELINE.
--
-- Se a linha acima parar de funcionar -- porque a sintaxe mudou, porque o papel da sessao
-- mudou, porque alguem a apagou -- as asserces de privilegio voltariam a passar vazias, e
-- em silencio. Esta tabela existe so para provar que o grant automatico ESTA ativo antes
-- de qualquer migration rodar. `90-assertions.sql` confere e depois a descarta.
CREATE TABLE public._drill_controle_de_acl (id int PRIMARY KEY);

DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public._drill_controle_de_acl', 'INSERT') THEN
    RAISE EXCEPTION 'BASELINE IRREAL: o default privilege de tabela nao surtiu efeito. Sem ele, as assercoes de privilegio passariam por ausencia de grant, e nao por acao das migrations.';
  END IF;
END
$$;
