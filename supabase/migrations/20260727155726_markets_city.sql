-- A0.5 - pre-requisito barato da expansao para Piracicaba

ALTER TABLE public.markets ADD COLUMN city text NOT NULL DEFAULT 'Artemis';
CREATE INDEX markets_city_idx ON public.markets (city);
