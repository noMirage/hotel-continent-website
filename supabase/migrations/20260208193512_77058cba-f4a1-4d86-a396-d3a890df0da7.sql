
-- Create storage bucket for room images
INSERT INTO storage.buckets (id, name, public) VALUES ('room-images', 'room-images', true);

-- Public can view room images
CREATE POLICY "Public can view room images"
ON storage.objects FOR SELECT
USING (bucket_id = 'room-images');

-- Admins can upload room images
CREATE POLICY "Admins can upload room images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update room images
CREATE POLICY "Admins can update room images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete room images
CREATE POLICY "Admins can delete room images"
ON storage.objects FOR DELETE
USING (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'::app_role));
