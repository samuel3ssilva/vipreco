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
-- Se o `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES` do baseline parar de funcionar --
-- porque a sintaxe mudou, porque o papel da sessao mudou, porque alguem o apagou -- as
-- assercoes de privilegio voltariam a passar vazias, e em silencio. Esta tabela existe so
-- para provar que o grant automatico ESTA ativo antes de qualquer migration rodar.
--
-- R2.6: ela ganhou um segundo papel, e e por causa dele que a verificacao abaixo cobre a
-- lista inteira de privilegios em vez de so INSERT.
--
-- As seis tabelas reais sao criadas pela PRIMEIRA migration, ou seja, depois desta tabela e
-- sob exatamente o mesmo default privilege. Como nenhuma migration toca nesta tabela de
-- controle, ela permanece no estado em que as seis nasceram. `90-assertions.sql` compara os
-- dois lados: privilegio presente aqui e ausente la e a prova de que a revogacao e EFEITO
-- das migrations de hardening -- e nao um banco que nunca teve o grant. Sem esse par,
-- "anon nao tem DELETE em price_submissions" e uma frase que passa identica nos dois mundos.
CREATE TABLE public._drill_controle_de_acl (id int PRIMARY KEY);

DO $$
DECLARE
  papel text;
  privilegio text;
  faltando text[] := ARRAY[]::text[];
BEGIN
  -- SELECT, INSERT, UPDATE, DELETE e TRUNCATE: os cinco privilegios que o hardening remove
  -- das tabelas reais, e portanto os cinco que precisam estar comprovadamente presentes
  -- aqui para que a remocao la signifique alguma coisa.
  --
  -- MAINTAIN fica de fora de proposito: existe so a partir do PostgreSQL 17, e
  -- `has_table_privilege` levanta erro para nome desconhecido -- o drill roda em 16.
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    FOREACH privilegio IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']
    LOOP
      IF NOT has_table_privilege(papel, 'public._drill_controle_de_acl', privilegio) THEN
        faltando := array_append(faltando, format('%s.%s', papel, privilegio));
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(faltando, 1) > 0 THEN
    RAISE EXCEPTION
      'BASELINE IRREAL: o default privilege de tabela nao surtiu efeito para %. Sem ele, as assercoes de privilegio passariam por ausencia de grant, e nao por acao das migrations.',
      array_to_string(faltando, ', ');
  END IF;
END
$$;
