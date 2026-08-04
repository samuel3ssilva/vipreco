-- =============================================================================
-- R2.3 - PREFLIGHT REMOTO DE STAGING, PARTE 2: HISTORICO DE MIGRATIONS
--
-- Arquivo separado de proposito. `supabase_migrations.schema_migrations` pode nao
-- existir, e uma consulta a uma tabela ausente aborta a sessao inteira com
-- ON_ERROR_STOP. O runner so executa este arquivo depois que 00-structure.sql
-- respondeu `history.table_present = true`.
--
-- Este e o item G3 do gate. Em R2.2 ele reprovou como estado E (UNKNOWN) -- nao
-- porque o historico estivesse errado, mas porque nao havia como le-lo. A chave
-- anonima nao enxerga o catalogo do sistema, e isso e o comportamento correto.
--
-- ESTRITAMENTE READ-ONLY. So SELECT.
-- =============================================================================

SELECT 'history.version', m.version
FROM supabase_migrations.schema_migrations m
ORDER BY m.version;

SELECT 'history.count', count(*)::text
FROM supabase_migrations.schema_migrations;
