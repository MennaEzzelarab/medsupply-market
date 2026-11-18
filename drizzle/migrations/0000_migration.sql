CREATE TABLE public.brands (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL DEFAULT '', image_url text NOT NULL DEFAULT '', brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE, category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.pricing_tiers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, units_per_bundle integer NOT NULL CHECK (units_per_bundle > 0), bundle_price numeric(12,3) NOT NULL CHECK (bundle_price > 0), UNIQUE (product_id, units_per_bundle));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands, public.categories, public.products, public.pricing_tiers TO anon, authenticated;
GRANT ALL ON public.brands, public.categories, public.products, public.pricing_tiers TO service_role;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public all" ON public.brands FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public all" ON public.pricing_tiers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.brands (id, name) VALUES ('11111111-0000-0000-0000-000000000001','MediCare'),('11111111-0000-0000-0000-000000000002','PureHealth');
INSERT INTO public.categories (id, name) VALUES ('22222222-0000-0000-0000-000000000001','Wound Care'),('22222222-0000-0000-0000-000000000002','Diagnostics');
INSERT INTO public.products (id, name, description, image_url, brand_id, category_id) VALUES
('33333333-0000-0000-0000-000000000001','Product A — Sterile Gauze Pads','Soft, highly absorbent sterile gauze pads for everyday wound dressing.','https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000002','Product B — Digital Thermometer','Fast, accurate digital thermometer with fever alert.','https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000002'),
('33333333-0000-0000-0000-000000000003','Product C — Nitrile Exam Gloves','Powder-free nitrile examination gloves, box of 100.','https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=800','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000001');
INSERT INTO public.pricing_tiers (product_id, units_per_bundle, bundle_price) VALUES
('33333333-0000-0000-0000-000000000001',1,2.250),
('33333333-0000-0000-0000-000000000002',1,7.000),
('33333333-0000-0000-0000-000000000002',4,26.000),
('33333333-0000-0000-0000-000000000003',1,5.500),
('33333333-0000-0000-0000-000000000003',4,19.500),
('33333333-0000-0000-0000-000000000003',12,55.000);