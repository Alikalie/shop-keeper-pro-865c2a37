
-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'personal' CHECK (account_type IN ('personal', 'organization')),
  owner_id UUID NOT NULL,
  max_staff INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org" ON public.organizations FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own org" ON public.organizations FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own org" ON public.organizations FOR UPDATE USING (owner_id = auth.uid());

-- Create org_members table
CREATE TABLE public.org_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view members" ON public.org_members FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = org_members.org_id AND om.user_id = auth.uid()));
CREATE POLICY "Org owners can insert members" ON public.org_members FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Org owners can delete members" ON public.org_members FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()));

-- Add account_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'personal';

-- Add org_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id);

-- Update handle_new_user to not auto-create (we'll handle it in signup flow)
-- Trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create admin user account function (for seeding default admin)
-- We'll handle admin login through the edge function
