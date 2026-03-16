
-- 1. Fix profiles INSERT policy to prevent org_id injection
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id
    AND (
      org_id IS NULL
      OR EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = profiles.org_id AND om.user_id = auth.uid())
    )
  );

-- 2. Fix get_org_owner_id to use org_members instead of profiles
CREATE OR REPLACE FUNCTION public.get_org_owner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT o.owner_id 
     FROM organizations o
     JOIN org_members om ON om.org_id = o.id
     WHERE om.user_id = _user_id
     LIMIT 1),
    _user_id
  )
$$;

-- 3. Fix is_same_org to use org_members instead of profiles
CREATE OR REPLACE FUNCTION public.is_same_org(_user_id1 uuid, _user_id2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members om1
    JOIN org_members om2 ON om1.org_id = om2.org_id
    WHERE om1.user_id = _user_id1 AND om2.user_id = _user_id2
  )
$$;

-- 4. Add trigger to nullify profiles.org_id when removed from org_members
CREATE OR REPLACE FUNCTION public.handle_org_member_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET org_id = NULL WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER on_org_member_removed
  AFTER DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_org_member_removal();

-- 5. Enable RLS on profiles_safe view (it inherits from profiles via security_invoker)
-- The view uses security_invoker=on so it inherits the profiles RLS policies automatically
