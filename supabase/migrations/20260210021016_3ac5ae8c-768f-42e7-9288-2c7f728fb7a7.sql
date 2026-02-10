
-- 1. User roles system (per security instructions)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'owner', 'staff');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: users can see their own roles, super_admins can see all
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

-- Only super_admins can insert/update/delete roles
CREATE POLICY "Super admins can manage roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- 2. CMS Content table for landing page management
CREATE TABLE public.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text,
  subtitle text,
  body text,
  image_url text,
  video_url text,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- Everyone can read CMS content (public landing page)
CREATE POLICY "Anyone can view cms content"
  ON public.cms_content FOR SELECT
  USING (true);

-- Only super admins can modify CMS
CREATE POLICY "Super admins can insert cms"
  ON public.cms_content FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update cms"
  ON public.cms_content FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete cms"
  ON public.cms_content FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Seed default CMS content
INSERT INTO public.cms_content (section_key, title, subtitle, body, is_visible, sort_order) VALUES
  ('hero', 'Manage Your Shop. Track Sales. Print Receipts. No Stress.', 'Trusted by 500+ shops', 'Everything you need to run your shop professionally. Inventory, sales, credit tracking, and beautiful receipts—all in one place.', true, 1),
  ('metrics', 'Real-Time Demo', 'See your shop at a glance', NULL, true, 2),
  ('demo', 'Try it yourself', NULL, 'Experience how easy it is to make a sale. Click products to add them to cart, then checkout to see the receipt.', true, 3),
  ('offline', 'Works even offline', NULL, 'Your business doesn''t stop when the internet does. Keep selling and everything syncs when you''re back online.', true, 4),
  ('features', 'Why Shop Owners Love It', NULL, 'Built specifically for African retail shops. Simple, powerful, and works everywhere.', true, 5),
  ('cta', 'Ready to take control of your shop?', NULL, 'Join hundreds of shop owners who''ve simplified their business with DESWIFE. Start free, upgrade when you''re ready.', true, 6),
  ('footer', 'DESWIFE', NULL, 'Made for African businesses.', true, 7),
  ('demo_video', 'Watch How It Works', NULL, NULL, false, 0);

-- 3. Storage bucket for CMS media (demo video, images)
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-media', 'cms-media', true);

CREATE POLICY "Anyone can view cms media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cms-media');

CREATE POLICY "Super admins can upload cms media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cms-media' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update cms media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cms-media' AND public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete cms media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cms-media' AND public.has_role(auth.uid(), 'super_admin'));

-- 4. Trigger to auto-update updated_at on cms_content
CREATE TRIGGER update_cms_content_updated_at
  BEFORE UPDATE ON public.cms_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
