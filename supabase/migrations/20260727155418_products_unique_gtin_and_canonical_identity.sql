-- A0.3 - protege contra duplicacao de produto

-- gtin unico entre os produtos que tem gtin preenchido
DROP INDEX IF EXISTS public.products_gtin_idx;
CREATE UNIQUE INDEX products_gtin_unique_idx ON public.products (gtin) WHERE gtin IS NOT NULL;

-- identidade canonica (name+brand+variant+size_text normalizados) unica
CREATE UNIQUE INDEX products_canonical_identity_idx ON public.products (
  pa_normalize_text(name),
  pa_normalize_text(coalesce(brand, '')),
  pa_normalize_text(coalesce(variant, '')),
  pa_normalize_text(coalesce(size_text, ''))
);
