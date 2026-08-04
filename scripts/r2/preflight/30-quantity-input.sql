-- =============================================================================
-- R2.3 - PREFLIGHT REMOTO DE STAGING, PARTE 4: ENTRADA DO PREVIEW DE QUANTIDADE
--
-- Devolve UMA linha, com um array JSON no formato que `scripts/backfill-preview.ts`
-- consome: id, name, brand, variant, size_text.
--
-- POR QUE ISSO SAI DO BANCO E NAO E PUBLICADO
--
-- O preview precisa do `size_text` real de cada produto -- e o texto livre e
-- justamente o que nao da para adivinhar. Mas o resultado do preview que vai para
-- o Job Summary e SO a contagem por estado. Nem esta saida, nem o relatorio linha
-- a linha, nem o arquivo intermediario sao publicados ou enviados como artefato.
--
-- Nome, marca e variante de produto nao sao dado pessoal. `products` nao tem
-- coluna de dado pessoal, e este arquivo nao consulta nenhuma outra tabela.
--
-- ESTRITAMENTE READ-ONLY. So SELECT.
-- =============================================================================

SELECT coalesce(
  json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'brand', p.brand,
      'variant', p.variant,
      'size_text', p.size_text
    )
    ORDER BY p.id
  )::text,
  '[]'
)
FROM public.products p;
