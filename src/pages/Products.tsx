import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  category: string;
  buying_price: number;
  selling_price: number;
  quantity: number;
  low_stock_level: number;
}

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', buyingPrice: '', sellingPrice: '', quantity: '', lowStockLevel: '5' });

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [user]);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => setForm({ name: '', category: '', buyingPrice: '', sellingPrice: '', quantity: '', lowStockLevel: '5' });

  const handleSave = async () => {
    if (!form.name || !form.sellingPrice || !user) return;
    
    setSaving(true);
    
    if (editing) {
      const { error } = await supabase
        .from('products')
        .update({
          name: form.name,
          category: form.category || 'General',
          buying_price: Number(form.buyingPrice) || 0,
          selling_price: Number(form.sellingPrice),
          quantity: Number(form.quantity) || 0,
          low_stock_level: Number(form.lowStockLevel) || 5,
        })
        .eq('id', editing.id);
      
      if (error) {
        toast.error('Failed to update product');
        setSaving(false);
        return;
      }
      toast.success('Product updated');
    } else {
      const { error } = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: form.name,
          category: form.category || 'General',
          buying_price: Number(form.buyingPrice) || 0,
          selling_price: Number(form.sellingPrice),
          quantity: Number(form.quantity) || 0,
          low_stock_level: Number(form.lowStockLevel) || 5,
        });
      
      if (error) {
        toast.error('Failed to add product');
        setSaving(false);
        return;
      }
      toast.success('Product added');
    }
    
    await fetchProducts();
    setDialogOpen(false);
    setEditing(null);
    resetForm();
    setSaving(false);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      buyingPrice: String(p.buying_price),
      sellingPrice: String(p.selling_price),
      quantity: String(p.quantity),
      lowStockLevel: String(p.low_stock_level),
    });
    setDialogOpen(true);
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
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Products</h1>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus size={16} className="mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Product</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. Groceries" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Buying Price</Label><Input type="number" value={form.buyingPrice} onChange={e => setForm({...form, buyingPrice: e.target.value})} /></div>
                  <div><Label>Selling Price *</Label><Input type="number" value={form.sellingPrice} onChange={e => setForm({...form, sellingPrice: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} /></div>
                  <div><Label>Low Stock Level</Label><Input type="number" value={form.lowStockLevel} onChange={e => setForm({...form, lowStockLevel: e.target.value})} /></div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editing ? 'Update' : 'Add'} Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package size={40} className="mx-auto mb-2 opacity-50" />
            <p>No products yet. Add your first product!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button key={p.id} onClick={() => openEdit(p)} className="w-full text-left rounded-xl border bg-card p-3 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Le {p.selling_price.toLocaleString()}</p>
                    <p className={`text-xs ${p.quantity <= p.low_stock_level ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      {p.quantity} in stock
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
