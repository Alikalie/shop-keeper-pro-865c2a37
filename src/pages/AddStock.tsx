import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
}

export default function AddStock() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ id: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [supplier, setSupplier] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, quantity')
        .eq('user_id', user.id)
        .order('name');
      setProducts(productsData || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !user || !profile) { 
      toast.error('Select a product and quantity'); 
      return; 
    }

    setSaving(true);
    try {
      // Add stock entry
      await supabase.from('stock_entries').insert({
        user_id: user.id,
        product_id: productId,
        quantity: Number(quantity),
        buying_price: Number(buyingPrice) || 0,
        supplier,
        added_by: profile.id,
      });

      // Update product quantity
      const product = products.find(p => p.id === productId);
      if (product) {
        await supabase
          .from('products')
          .update({ 
            quantity: product.quantity + Number(quantity),
            buying_price: Number(buyingPrice) || undefined,
          })
          .eq('id', productId);
      }

      // Refresh products
      const { data: newProducts } = await supabase
        .from('products')
        .select('id, name, quantity')
        .eq('user_id', user.id)
        .order('name');
      setProducts(newProducts || []);

      toast.success('Stock added successfully');
      setProductId(''); 
      setQuantity(''); 
      setBuyingPrice(''); 
      setSupplier('');
    } catch (error) {
      toast.error('Failed to add stock');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in max-w-lg">
        <h1 className="text-2xl font-bold mb-6">Add Stock</h1>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-xl border p-5">
          <div>
            <Label>Product *</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quantity *</Label><Input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} min="1" /></div>
            <div><Label>Buying Price</Label><Input type="number" value={buyingPrice} onChange={e => setBuyingPrice(e.target.value)} /></div>
          </div>
          <div><Label>Supplier</Label><Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Optional" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <PlusCircle size={16} className="mr-1" /> Add Stock
          </Button>
        </form>
      </div>
    </Layout>
  );
}
