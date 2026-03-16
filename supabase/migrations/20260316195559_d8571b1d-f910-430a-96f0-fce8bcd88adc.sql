
-- 1. Fix privilege escalation: Prevent users from changing their own org_id
-- Drop existing update policy and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- org_id must remain unchanged (prevent privilege escalation)
      org_id IS NOT DISTINCT FROM (SELECT p.org_id FROM public.profiles p WHERE p.user_id = auth.uid())
    )
  );

-- 2. Fix exposed PINs: Create a secure view that hides PINs from org members
-- Create a view without PIN for org member access
CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = on) AS
  SELECT id, user_id, name, role, org_id, account_type, created_at, updated_at
  FROM public.profiles;

-- 3. Create a function so users can only read their own PIN
CREATE OR REPLACE FUNCTION public.get_my_pin()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin FROM public.profiles WHERE user_id = auth.uid()
$$;
