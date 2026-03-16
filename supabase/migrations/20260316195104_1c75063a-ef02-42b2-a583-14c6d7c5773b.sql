
-- Create the trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile for existing super admin user if missing
INSERT INTO public.profiles (user_id, name, role)
SELECT 'ae30daf2-2f99-48b8-ac24-2d117984f478', 'Super Admin', 'owner'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = 'ae30daf2-2f99-48b8-ac24-2d117984f478'
);

-- Insert shop_settings for existing super admin if missing
INSERT INTO public.shop_settings (user_id, name)
SELECT 'ae30daf2-2f99-48b8-ac24-2d117984f478', 'My Shop'
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop_settings WHERE user_id = 'ae30daf2-2f99-48b8-ac24-2d117984f478'
);

-- Delete all existing shop data (products, sales, customers, loans, stock_entries)
DELETE FROM public.sale_items;
DELETE FROM public.loan_payments;
DELETE FROM public.stock_entries;
DELETE FROM public.sales;
DELETE FROM public.loans;
DELETE FROM public.customers;
DELETE FROM public.products;
