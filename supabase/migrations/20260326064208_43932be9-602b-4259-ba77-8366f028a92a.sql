INSERT INTO storage.buckets (id, name, public) VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload shop logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-logos');

CREATE POLICY "Public can view shop logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'shop-logos');

CREATE POLICY "Users can update shop logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shop-logos');

CREATE POLICY "Users can delete shop logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-logos');