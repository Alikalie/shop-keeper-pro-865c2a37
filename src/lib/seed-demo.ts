import { supabase } from '@/integrations/supabase/client';
import { DEMO_PRODUCTS, DEMO_CUSTOMERS } from './demo-data';

export async function seedDemoData(userId: string) {
  try {
    // Check if products already exist
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (existingProducts && existingProducts.length > 0) {
      return; // Already has products
    }

    // Insert demo products
    const products = DEMO_PRODUCTS.map(p => ({
      user_id: userId,
      name: p.name,
      category: p.category,
      buying_price: p.buyingPrice,
      selling_price: p.sellingPrice,
      quantity: p.quantity,
      low_stock_level: p.lowStockLevel,
    }));

    await supabase.from('products').insert(products);

    // Insert demo customers
    const customers = DEMO_CUSTOMERS.map(c => ({
      user_id: userId,
      name: c.name,
      phone: c.phone,
      address: c.address,
      total_debt: 0,
    }));

    await supabase.from('customers').insert(customers);

    console.log('Demo data seeded successfully');
  } catch (error) {
    console.error('Error seeding demo data:', error);
  }
}
