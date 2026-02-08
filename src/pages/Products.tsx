import { useState } from 'react';
import Layout from '@/components/Layout';
import { getProducts, addProduct, updateProduct } from '@/lib/store';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Package } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState(getProducts());
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', category: '', buyingPrice: '', sellingPrice: '', quantity: '', lowStockLevel: '5' });

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const resetForm = () => setForm({ name: '', category: '', buyingPrice: '', sellingPrice: '', quantity: '', lowStockLevel: '5' });

  const handleSave = () => {
    if (!form.name || !form.sellingPrice) return;
    if (editing) {
      const updated = { ...editing, name: form.name, category: form.category, buyingPrice: Number(form.buyingPrice), sellingPrice: Number(form.sellingPrice), quantity: Number(form.quantity), lowStockLevel: Number(form.lowStockLevel) };
      updateProduct(updated);
    } else {
      const product: Product = {
        id: crypto.randomUUID(), name: form.name, category: form.category,
        buyingPrice: Number(form.buyingPrice), sellingPrice: Number(form.sellingPrice),
        quantity: Number(form.quantity), lowStockLevel: Number(form.lowStockLevel),
        createdAt: new Date().toISOString(),
      };
      addProduct(product);
    }
    setProducts(getProducts());
    setDialogOpen(false);
    setEditing(null);
    resetForm();
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, category: p.category, buyingPrice: String(p.buyingPrice), sellingPrice: String(p.sellingPrice), quantity: String(p.quantity), lowStockLevel: String(p.lowStockLevel) });
    setDialogOpen(true);
  };

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
                <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
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
                    <p className="font-semibold">{p.sellingPrice.toLocaleString()}</p>
                    <p className={`text-xs ${p.quantity <= p.lowStockLevel ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
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
