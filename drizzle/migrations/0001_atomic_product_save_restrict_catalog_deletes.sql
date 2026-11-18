ALTER TABLE public.products DROP CONSTRAINT products_brand_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE RESTRICT;
ALTER TABLE public.products DROP CONSTRAINT products_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;
ALTER TABLE public.pricing_tiers DROP CONSTRAINT pricing_tiers_product_id_units_per_bundle_key;
ALTER TABLE public.pricing_tiers ADD CONSTRAINT pricing_tiers_product_id_units_per_bundle_key UNIQUE (product_id, units_per_bundle) DEFERRABLE INITIALLY IMMEDIATE;

CREATE OR REPLACE FUNCTION public.save_product(
  p_id uuid, p_name text, p_description text, p_image_url text,
  p_brand_id uuid, p_category_id uuid, p_tiers jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  saved_id uuid;
  tier record;
BEGIN
  IF p_name IS NULL OR btrim(p_name) = '' OR p_brand_id IS NULL OR p_category_id IS NULL THEN
    RAISE EXCEPTION 'Name, brand and category are required';
  END IF;
  IF p_tiers IS NULL OR jsonb_typeof(p_tiers) <> 'array' THEN
    RAISE EXCEPTION 'Pricing tiers must be an array';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_tiers) AS t(id uuid, units_per_bundle integer, bundle_price numeric)
    WHERE units_per_bundle IS NULL OR units_per_bundle <= 0 OR bundle_price IS NULL OR bundle_price <= 0
      OR bundle_price::text IN ('NaN', 'Infinity', '-Infinity')
  ) THEN
    RAISE EXCEPTION 'Each tier needs a whole number of packs and a price above 0';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_tiers) t WHERE jsonb_typeof(t) <> 'object'
    OR jsonb_typeof(t->'units_per_bundle') IS DISTINCT FROM 'number'
    OR (t->>'units_per_bundle')::numeric <> trunc((t->>'units_per_bundle')::numeric)) THEN
    RAISE EXCEPTION 'Each tier needs a whole number of packs';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_tiers) AS t(units_per_bundle integer) GROUP BY units_per_bundle HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Each tier must have a different pack count';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_tiers) AS t(id uuid) WHERE id IS NOT NULL GROUP BY id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Each existing tier may appear only once';
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT id INTO saved_id FROM public.products WHERE id = p_id FOR UPDATE;
    IF saved_id IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_tiers) AS t(id uuid)
    WHERE t.id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.pricing_tiers pt WHERE pt.id = t.id AND pt.product_id = saved_id
    )
  ) THEN RAISE EXCEPTION 'A pricing tier does not belong to this product'; END IF;

  IF saved_id IS NULL THEN
    INSERT INTO public.products(name, description, image_url, brand_id, category_id)
    VALUES (btrim(p_name), coalesce(p_description, ''), coalesce(p_image_url, ''), p_brand_id, p_category_id)
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.products SET name = btrim(p_name), description = coalesce(p_description, ''),
      image_url = coalesce(p_image_url, ''), brand_id = p_brand_id, category_id = p_category_id
    WHERE id = saved_id;
  END IF;

  SET CONSTRAINTS public.pricing_tiers_product_id_units_per_bundle_key DEFERRED;
  DELETE FROM public.pricing_tiers pt WHERE pt.product_id = saved_id
    AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(p_tiers) AS t(id uuid) WHERE t.id = pt.id);
  FOR tier IN SELECT * FROM jsonb_to_recordset(p_tiers) AS t(id uuid, units_per_bundle integer, bundle_price numeric) LOOP
    IF tier.id IS NULL THEN
      INSERT INTO public.pricing_tiers(product_id, units_per_bundle, bundle_price)
      VALUES (saved_id, tier.units_per_bundle, tier.bundle_price);
    ELSE
      UPDATE public.pricing_tiers SET units_per_bundle = tier.units_per_bundle, bundle_price = tier.bundle_price
      WHERE id = tier.id AND product_id = saved_id;
    END IF;
  END LOOP;
  SET CONSTRAINTS public.pricing_tiers_product_id_units_per_bundle_key IMMEDIATE;
  RETURN saved_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_product(uuid, text, text, text, uuid, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_product(uuid, text, text, text, uuid, uuid, jsonb) TO anon, authenticated, service_role;