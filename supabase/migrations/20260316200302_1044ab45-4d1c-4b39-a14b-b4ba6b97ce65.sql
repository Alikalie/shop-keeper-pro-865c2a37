
-- Fix PIN exposure: Move PIN to a separate table
CREATE TABLE IF NOT EXISTS public.staff_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pin text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.staff_pins ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own PIN
CREATE POLICY "Users can view own pin" ON public.staff_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own pin" ON public.staff_pins FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pin" ON public.staff_pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Migrate existing PINs
INSERT INTO public.staff_pins (user_id, pin)
SELECT user_id, pin FROM public.profiles WHERE pin IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Remove pin from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pin;
