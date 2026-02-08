import { useState } from 'react';
import Layout from '@/components/Layout';
import { getProducts, addStockEntry, getCurrentUser } from '@/lib/store';
import { StockEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { PlusCircle } from 'lucide-react';

export default function AddStock() {
  const products = getProducts();
  const user = getCurrentUser();
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [supplier, setSupplier] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity) { toast.error('Select a product and quantity'); return; }
    const entry: StockEntry = {
      id: crypto.randomUUID(), productId, quantity: Number(quantity),
      buyingPrice: Number(buyingPrice), supplier,
      date: new Date().toISOString(), addedBy: user?.id || '',
    };
    addStockEntry(entry);
    toast.success('Stock added successfully');
    setProductId(''); setQuantity(''); setBuyingPrice(''); setSupplier('');
  };

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
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle size={16} className="mr-1" /> Add Stock
          </Button>
        </form>
      </div>
    </Layout>
  );
}
