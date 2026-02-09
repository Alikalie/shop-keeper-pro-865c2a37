import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Trash2, Printer, Search, Loader2 } from 'lucide-react';
import Receipt from '@/components/Receipt';

interface Product {
  id: string;
  name: string;
  selling_price: number;
  quantity: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

interface SaleData {
  id: string;
  receipt_id: string;
  customer_name: string;
  total: number;
  paid: number;
  balance: number;
  payment_method: string;
  sold_by_name: string;
  created_at: string;
  items: { productName: string; quantity: number; price: number; total: number }[];
}

export default function POS() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('walk-in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'loan'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<SaleData | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);

      // Get products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, selling_price, quantity')
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .order('name');
      setProducts(productsData || []);

      // Get customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      setCustomers(customersData || []);

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const paid = paymentMethod === 'cash' ? total : Number(paidAmount) || 0;
  const balance = total - paid;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) { toast.error('Not enough stock'); return prev; }
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.quantity) { toast.error('Not enough stock'); return c; }
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(c => c.product.id !== productId));

  const generateReceiptId = async () => {
    const { data: shopData } = await supabase
      .from('shop_settings')
      .select('name')
      .eq('user_id', user!.id)
      .maybeSingle();
    
    const prefix = (shopData?.name || 'SHOP').split(' ')[0]?.toUpperCase().slice(0, 4) || 'SHOP';
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    
    // Get today's sales count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .gte('created_at', today.toISOString());
    
    const num = String((count || 0) + 1).padStart(5, '0');
    return `${prefix}-${dateStr}-${num}`;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (paymentMethod === 'loan' && customerId === 'walk-in') { toast.error('Select a customer for loan'); return; }
    if (!user || !profile) return;

    setSaving(true);
    
    try {
      const receiptId = await generateReceiptId();
      const customerName = customerId === 'walk-in' ? 'Walk-in Customer' : customers.find(c => c.id === customerId)?.name || 'Unknown';

      // Create sale
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          receipt_id: receiptId,
          customer_id: customerId === 'walk-in' ? null : customerId,
          customer_name: customerName,
          total,
          paid,
          balance: Math.max(0, balance),
          payment_method: paymentMethod,
          sold_by: profile.id,
          sold_by_name: profile.name,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(c => ({
        sale_id: saleData.id,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        price: c.product.selling_price,
        total: c.product.selling_price * c.quantity,
      }));

      await supabase.from('sale_items').insert(saleItems);

      // Update product quantities
      for (const item of cart) {
        await supabase
          .from('products')
          .update({ quantity: item.product.quantity - item.quantity })
          .eq('id', item.product.id);
      }

      // Create loan if needed
      if (paymentMethod === 'loan' && balance > 0) {
        await supabase.from('loans').insert({
          user_id: user.id,
          sale_id: saleData.id,
          customer_id: customerId,
          customer_name: customerName,
          total_amount: balance,
          paid_amount: 0,
          balance: balance,
          status: 'unpaid',
        });

        // Update customer debt
        const { data: customerData } = await supabase
          .from('customers')
          .select('total_debt')
          .eq('id', customerId)
          .single();
        
        if (customerData) {
          await supabase
            .from('customers')
            .update({ total_debt: Number(customerData.total_debt) + balance })
            .eq('id', customerId);
        }
      }

      setLastSale({
        id: saleData.id,
        receipt_id: receiptId,
        customer_name: customerName,
        total,
        paid,
        balance: Math.max(0, balance),
        payment_method: paymentMethod,
        sold_by_name: profile.name,
        created_at: new Date().toISOString(),
        items: cart.map(c => ({
          productName: c.product.name,
          quantity: c.quantity,
          price: c.product.selling_price,
          total: c.product.selling_price * c.quantity,
        })),
      });

      // Refresh products
      const { data: newProducts } = await supabase
        .from('products')
        .select('id, name, selling_price, quantity')
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .order('name');
      setProducts(newProducts || []);

      setShowReceipt(true);
      setCart([]);
      setPaidAmount('');
      setCustomerId('walk-in');
      setPaymentMethod('cash');
      toast.success('Sale completed!');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to complete sale');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCust.name || !user) return;
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name: newCust.name,
        phone: newCust.phone,
        address: newCust.address,
        total_debt: 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add customer');
      return;
    }

    setCustomers(prev => [...prev, { id: data.id, name: data.name }]);
    setCustomerId(data.id);
    setShowNewCustomer(false);
    setNewCust({ name: '', phone: '', address: '' });
    toast.success('Customer added');
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
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold mb-4">Point of Sale</h1>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Products */}
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {filtered.map(p => (
                <button key={p.id} onClick={() => addToCart(p)}
                  className="text-left rounded-lg border bg-card p-3 hover:border-accent/50 transition-colors">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.quantity} in stock</p>
                  <p className="font-semibold text-sm mt-1">Le {p.selling_price.toLocaleString()}</p>
                </button>
              ))}
              {filtered.length === 0 && <p className="col-span-2 text-center py-8 text-muted-foreground text-sm">No products available</p>}
            </div>
          </div>

          {/* Cart */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-accent" />
              <h2 className="font-semibold">Cart ({cart.length})</h2>
            </div>

            {cart.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Add products to start a sale</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{item.product.selling_price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Minus size={12} /></button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Plus size={12} /></button>
                      <button onClick={() => removeFromCart(item.product.id)} className="h-6 w-6 rounded bg-destructive/10 text-destructive flex items-center justify-center ml-1"><Trash2 size={12} /></button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right">{(item.product.selling_price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-3 space-y-3">
              <div>
                <Label className="text-xs">Customer</Label>
                <div className="flex gap-2">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setShowNewCustomer(true)}><Plus size={14} /></Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Payment</Label>
                <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as 'cash' | 'loan')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="loan">Loan / Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'loan' && (
                <div><Label className="text-xs">Amount Paid</Label><Input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0" /></div>
              )}

              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>TOTAL</span>
                <span>Le {total.toLocaleString()}</span>
              </div>
              {paymentMethod === 'loan' && balance > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Balance (Loan)</span>
                  <span>Le {balance.toLocaleString()}</span>
                </div>
              )}

              <Button onClick={handleCheckout} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={cart.length === 0 || saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Complete Sale
              </Button>
            </div>
          </div>
        </div>

        {/* New Customer Dialog */}
        <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={newCust.name} onChange={e => setNewCust({...newCust, name: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={newCust.phone} onChange={e => setNewCust({...newCust, phone: e.target.value})} /></div>
              <div><Label>Address</Label><Input value={newCust.address} onChange={e => setNewCust({...newCust, address: e.target.value})} /></div>
              <Button onClick={handleAddCustomer} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Add Customer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Dialog */}
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Printer size={18} /> Receipt</DialogTitle></DialogHeader>
            {lastSale && <Receipt sale={lastSale} />}
            <Button onClick={() => window.print()} variant="outline"><Printer size={14} className="mr-1" /> Print</Button>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
