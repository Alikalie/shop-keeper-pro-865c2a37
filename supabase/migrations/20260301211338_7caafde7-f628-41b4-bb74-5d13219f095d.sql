-- Allow deleting sales, loans, sale_items, loan_payments, stock_entries for reset feature
-- Sales delete
CREATE POLICY "Owners can delete own sales" ON public.sales FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Loans delete
CREATE POLICY "Owners can delete own loans" ON public.loans FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Sale items delete
CREATE POLICY "Owners can delete sale items" ON public.sale_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.user_id = auth.uid()));

-- Loan payments delete
CREATE POLICY "Owners can delete loan payments" ON public.loan_payments FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM loans WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid()));

-- Stock entries delete
CREATE POLICY "Owners can delete stock entries" ON public.stock_entries FOR DELETE TO authenticated USING (user_id = auth.uid());