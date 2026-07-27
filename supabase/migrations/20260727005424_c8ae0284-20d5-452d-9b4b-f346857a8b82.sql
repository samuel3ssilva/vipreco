-- Preço Artemis - schema inicial

CREATE OR REPLACE FUNCTION public.pa_normalize_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(translate(coalesce(input, ''),
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'));
$$;

CREATE OR REPLACE FUNCTION public.pa_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- markets
CREATE TABLE public.markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  neighborhood text,
  address text,
  maps_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.markets TO anon, authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mercados ativos sao publicos" ON public.markets
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE TRIGGER markets_updated_at BEFORE UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.pa_set_updated_at();

-- products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  variant text,
  size_text text,
  gtin text,
  category text,
  search_text text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.pa_products_search_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_text := public.pa_normalize_text(
    concat_ws(' ', NEW.name, NEW.brand, NEW.variant, NEW.size_text, NEW.gtin, NEW.category)
  );
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_search_text
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.pa_products_search_text();

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Produtos ativos sao publicos" ON public.products
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX products_search_text_idx ON public.products USING gin (search_text extensions.gin_trgm_ops);
CREATE INDEX products_active_idx ON public.products (is_active);
CREATE INDEX products_gtin_idx ON public.products (gtin);

-- prices
CREATE TABLE public.prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  source_type text NOT NULL CHECK (source_type IN ('receipt','store_list','weekly_audit','shelf_photo','community','social_media')),
  observed_at timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  special_condition text,
  source_reference text,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.prices TO anon, authenticated;
GRANT ALL ON public.prices TO service_role;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Precos validos sao publicos" ON public.prices
  FOR SELECT TO anon, authenticated USING (
    is_active = true
    AND observed_at <= now()
    AND (valid_until IS NULL OR valid_until >= now())
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active)
    AND EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.is_active)
  );

CREATE TRIGGER prices_updated_at BEFORE UPDATE ON public.prices
  FOR EACH ROW EXECUTE FUNCTION public.pa_set_updated_at();

CREATE INDEX prices_product_idx ON public.prices (product_id, observed_at DESC);
CREATE INDEX prices_market_idx ON public.prices (market_id, observed_at DESC);
CREATE INDEX prices_active_idx ON public.prices (is_active, valid_until);
CREATE INDEX prices_featured_idx ON public.prices (is_featured, observed_at DESC) WHERE is_featured;

-- price_submissions
CREATE TABLE public.price_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  submitted_price numeric(10,2) NOT NULL CHECK (submitted_price > 0),
  source_type text NOT NULL CHECK (source_type IN ('receipt','shelf_photo','community','social_media')),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 280),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

GRANT INSERT ON public.price_submissions TO anon, authenticated;
GRANT ALL ON public.price_submissions TO service_role;
ALTER TABLE public.price_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitantes podem enviar sugestoes pendentes" ON public.price_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (
    status = 'pending'
    AND reviewed_at IS NULL
    AND submitted_price > 0
    AND (comment IS NULL OR char_length(comment) <= 280)
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active)
    AND EXISTS (SELECT 1 FROM public.markets m WHERE m.id = market_id AND m.is_active)
  );

CREATE INDEX price_submissions_pending_idx ON public.price_submissions (status, created_at DESC);

-- product_watch_requests
CREATE TABLE public.product_watch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.product_watch_requests TO anon, authenticated;
GRANT ALL ON public.product_watch_requests TO service_role;
ALTER TABLE public.product_watch_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitantes podem registrar interesse" ON public.product_watch_requests
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active)
  );

CREATE INDEX product_watch_requests_product_idx ON public.product_watch_requests (product_id, created_at DESC);

-- decision_feedback
CREATE TABLE public.decision_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  helpfulness text NOT NULL CHECK (helpfulness IN ('yes','not_yet','no')),
  decision_type text CHECK (decision_type IN ('confirmed_usual_market','considered_other_market','found_opportunity','avoided_trip','waited_or_anticipated')),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.decision_feedback TO anon, authenticated;
GRANT ALL ON public.decision_feedback TO service_role;
ALTER TABLE public.decision_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitantes podem enviar feedback" ON public.decision_feedback
  FOR INSERT TO anon, authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_active)
  );

CREATE INDEX decision_feedback_product_idx ON public.decision_feedback (product_id, created_at DESC);