-- Preço Artemis — dados fictícios de demonstração (is_demo = true)
-- Aplique somente em ambientes de teste. Nunca use nomes reais de supermercados aqui.

-- Mercados fictícios
INSERT INTO public.markets (id, name, neighborhood, address, maps_url, is_active, is_demo) VALUES
  ('11111111-1111-1111-1111-000000000001', 'Mercado principal', 'Centro', 'Rua Exemplo, 100 - Artemis', 'https://maps.google.com/?q=-22.5,-47.5', true, true),
  ('11111111-1111-1111-1111-000000000002', 'Mercado local 2', 'Jardim Novo', 'Rua Exemplo, 200 - Artemis', 'https://maps.google.com/?q=-22.51,-47.51', true, true),
  ('11111111-1111-1111-1111-000000000003', 'Mercado local 3', 'Vila Antiga', 'Rua Exemplo, 300 - Artemis', NULL, true, true),
  ('11111111-1111-1111-1111-000000000004', 'Mercado local 4', 'Beira Rio', 'Rua Exemplo, 400 - Artemis', 'https://maps.google.com/?q=-22.52,-47.52', true, true)
ON CONFLICT (id) DO NOTHING;

-- Produtos fictícios
INSERT INTO public.products (id, name, brand, variant, size_text, gtin, category, is_active, is_demo) VALUES
  ('22222222-2222-2222-2222-000000000001', 'Arroz', 'Camil', 'Tipo 1', '5 kg', '7896006711117', 'Mercearia', true, true),
  ('22222222-2222-2222-2222-000000000002', 'Café', 'Pilão', 'Tradicional', '500 g', '7896089012345', 'Mercearia', true, true),
  ('22222222-2222-2222-2222-000000000003', 'Leite', 'Italac', 'Integral', '1 L', '7898080640611', 'Laticínios', true, true),
  ('22222222-2222-2222-2222-000000000004', 'Óleo de Soja', 'Liza', 'Tradicional', '900 ml', '7896036090015', 'Mercearia', true, true),
  ('22222222-2222-2222-2222-000000000005', 'Detergente', 'Ypê', 'Neutro', '500 ml', '7896098900116', 'Limpeza', true, true),
  ('22222222-2222-2222-2222-000000000006', 'Papel Higiênico', 'Neve', 'Folha Dupla', '12 rolos', '7891008140019', 'Higiene', true, true),
  ('22222222-2222-2222-2222-000000000007', 'Café', 'Pilão', 'Tradicional', '250 g', '7896089054321', 'Mercearia', true, true)
ON CONFLICT (id) DO NOTHING;

-- Preços fictícios
INSERT INTO public.prices (product_id, market_id, price, source_type, observed_at, valid_until, special_condition, source_reference, is_featured, is_active, is_demo) VALUES
  -- Arroz Camil 5 kg
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000001', 27.90, 'receipt',      now() - interval '2 days', NULL, NULL, 'Nota fiscal conferida', true,  true, true),
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000002', 29.50, 'weekly_audit', now() - interval '3 days', NULL, NULL, 'Pesquisa semanal', false, true, true),
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000003', 26.49, 'store_list',   now() - interval '1 day',  now() + interval '5 days', 'Limite de 2 unidades por cliente', 'Lista enviada pelo mercado', true, true, true),
  -- histórico do mesmo produto e mercado (deve ser ignorado na comparação)
  ('22222222-2222-2222-2222-000000000001', '11111111-1111-1111-1111-000000000001', 31.00, 'weekly_audit', now() - interval '25 days', NULL, NULL, 'Pesquisa semanal anterior', false, true, true),

  -- Café Pilão 500 g
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000001', 18.90, 'shelf_photo',  now() - interval '1 day', NULL, NULL, 'Foto da etiqueta', false, true, true),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000002', 17.49, 'social_media', now() - interval '2 days', now() + interval '3 days', 'Oferta válida enquanto durar o estoque', 'Anúncio na rede social do mercado', true, true, true),
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000004', 19.90, 'community',    now() - interval '4 days', NULL, NULL, 'Informado pela comunidade', false, true, true),
  -- preço vencido (não deve aparecer)
  ('22222222-2222-2222-2222-000000000002', '11111111-1111-1111-1111-000000000003', 15.90, 'social_media', now() - interval '20 days', now() - interval '10 days', 'Oferta encerrada', 'Anúncio antigo', false, true, true),

  -- Café Pilão 250 g (produto separado)
  ('22222222-2222-2222-2222-000000000007', '11111111-1111-1111-1111-000000000001', 10.90, 'receipt',      now() - interval '3 days', NULL, NULL, 'Nota fiscal conferida', false, true, true),
  ('22222222-2222-2222-2222-000000000007', '11111111-1111-1111-1111-000000000003', 11.49, 'weekly_audit', now() - interval '5 days', NULL, NULL, 'Pesquisa semanal', false, true, true),

  -- Leite Italac 1 L
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000001', 5.29, 'weekly_audit', now() - interval '1 day', NULL, NULL, 'Pesquisa semanal', false, true, true),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000002', 4.89, 'receipt',      now() - interval '2 days', NULL, 'Máximo de 6 unidades', 'Nota fiscal conferida', true, true, true),
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000004', 5.49, 'shelf_photo',  now() - interval '6 days', NULL, NULL, 'Foto da etiqueta', false, true, true),
  -- histórico do mesmo produto e mercado
  ('22222222-2222-2222-2222-000000000003', '11111111-1111-1111-1111-000000000002', 5.79, 'weekly_audit', now() - interval '18 days', NULL, NULL, 'Pesquisa semanal anterior', false, true, true),

  -- Óleo Liza 900 ml
  ('22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-000000000002', 7.49, 'store_list',   now() - interval '2 days', now() + interval '4 days', NULL, 'Lista enviada pelo mercado', false, true, true),
  ('22222222-2222-2222-2222-000000000004', '11111111-1111-1111-1111-000000000003', 7.99, 'community',    now() - interval '3 days', NULL, NULL, 'Informado pela comunidade', false, true, true),

  -- Detergente Ypê 500 ml
  ('22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-000000000001', 2.79, 'shelf_photo',  now() - interval '1 day', NULL, NULL, 'Foto da etiqueta', false, true, true),
  ('22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-000000000004', 2.49, 'receipt',      now() - interval '2 days', NULL, NULL, 'Nota fiscal conferida', true, true, true),
  ('22222222-2222-2222-2222-000000000005', '11111111-1111-1111-1111-000000000002', 2.99, 'weekly_audit', now() - interval '5 days', NULL, NULL, 'Pesquisa semanal', false, true, true),

  -- Papel higiênico Neve 12 rolos
  ('22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-000000000003', 24.90, 'store_list',   now() - interval '2 days', now() + interval '6 days', 'Preço válido para pagamento à vista', 'Lista enviada pelo mercado', true, true, true),
  ('22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-000000000004', 26.90, 'weekly_audit', now() - interval '4 days', NULL, NULL, 'Pesquisa semanal', false, true, true),
  -- preço inativo (não deve aparecer)
  ('22222222-2222-2222-2222-000000000006', '11111111-1111-1111-1111-000000000001', 19.90, 'community',    now() - interval '2 days', NULL, NULL, 'Registro desativado na revisão', false, false, true);
