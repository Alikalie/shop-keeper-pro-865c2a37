
-- Function to get the owner's user_id for any user in an org
-- If the user is in an org, returns the org owner's user_id
-- Otherwise returns the user's own id
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
     JOIN profiles p ON p.org_id = o.id
     WHERE p.user_id = _user_id
     LIMIT 1),
    _user_id
  )
$$;

-- Function to check if two users are in the same org
CREATE OR REPLACE FUNCTION public.is_same_org(_user_id1 uuid, _user_id2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p1.org_id = p2.org_id AND p1.org_id IS NOT NULL
    WHERE p1.user_id = _user_id1 AND p2.user_id = _user_id2
  )
$$;

-- Drop old restrictive policies and create org-aware ones

-- PRODUCTS
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view org products" ON public.products
  FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert org products" ON public.products
  FOR INSERT WITH CHECK (
    user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update org products" ON public.products
  FOR UPDATE USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete org products" ON public.products
  FOR DELETE USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

-- CUSTOMERS
DROP POLICY IF EXISTS "Users can view own customers" ON public.customers;
CREATE POLICY "Users can view org customers" ON public.customers
  FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own customers" ON public.customers;
CREATE POLICY "Users can insert org customers" ON public.customers
  FOR INSERT WITH CHECK (
    user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own customers" ON public.customers;
CREATE POLICY "Users can update org customers" ON public.customers
  FOR UPDATE USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own customers" ON public.customers;
CREATE POLICY "Users can delete org customers" ON public.customers
  FOR DELETE USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

-- SALES
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
CREATE POLICY "Users can view org sales" ON public.sales
  FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
CREATE POLICY "Users can insert org sales" ON public.sales
  FOR INSERT WITH CHECK (
    user_id = get_org_owner_id(auth.uid())
  );

-- SALE_ITEMS (uses join to sales)
DROP POLICY IF EXISTS "Users can view sale items" ON public.sale_items;
CREATE POLICY "Users can view org sale items" ON public.sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND (sales.user_id = auth.uid() OR sales.user_id = get_org_owner_id(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can insert sale items" ON public.sale_items;
CREATE POLICY "Users can insert org sale items" ON public.sale_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.id = sale_items.sale_id
      AND (sales.user_id = auth.uid() OR sales.user_id = get_org_owner_id(auth.uid()))
    )
  );

-- LOANS
DROP POLICY IF EXISTS "Users can view own loans" ON public.loans;
CREATE POLICY "Users can view org loans" ON public.loans
  FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own loans" ON public.loans;
CREATE POLICY "Users can insert org loans" ON public.loans
  FOR INSERT WITH CHECK (
    user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own loans" ON public.loans;
CREATE POLICY "Users can update org loans" ON public.loans
  FOR UPDATE USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

-- LOAN_PAYMENTS
DROP POLICY IF EXISTS "Users can view loan payments" ON public.loan_payments;
CREATE POLICY "Users can view org loan payments" ON public.loan_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND (loans.user_id = auth.uid() OR loans.user_id = get_org_owner_id(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can insert loan payments" ON public.loan_payments;
CREATE POLICY "Users can insert org loan payments" ON public.loan_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM loans
      WHERE loans.id = loan_payments.loan_id
      AND (loans.user_id = auth.uid() OR loans.user_id = get_org_owner_id(auth.uid()))
    )
  );

-- STOCK_ENTRIES
DROP POLICY IF EXISTS "Users can view own stock entries" ON public.stock_entries;
CREATE POLICY "Users can view org stock entries" ON public.stock_entries
  FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own stock entries" ON public.stock_entries;
CREATE POLICY "Users can insert org stock entries" ON public.stock_entries
  FOR INSERT WITH CHECK (
    user_id = get_org_owner_id(auth.uid())
  );

-- SHOP_SETTINGS
DROP POLICY IF EXISTS "Users can view own shop" ON public.shop_settings;
CREATE POLICY "Users can view org shop" ON public.shop_settings
  FOR SELECT USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own shop" ON public.shop_settings;
CREATE POLICY "Users can update org shop" ON public.shop_settings
  FOR UPDATE USING (
    user_id = auth.uid() OR user_id = get_org_owner_id(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own shop" ON public.shop_settings;
CREATE POLICY "Users can insert org shop" ON public.shop_settings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- PROFILES: allow org members to see each other's profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view org profiles" ON public.profiles
  FOR SELECT USING (
    user_id = auth.uid() OR is_same_org(auth.uid(), user_id)
  );

-- Allow orgs to also view org data
DROP POLICY IF EXISTS "Users can view own org" ON public.organizations;
CREATE POLICY "Users can view own org" ON public.organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR EXISTS (
      SELECT 1 FROM org_members om WHERE om.org_id = organizations.id AND om.user_id = auth.uid()
    )
  );
