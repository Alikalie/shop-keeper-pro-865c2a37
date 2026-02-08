import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { getProducts, getCustomers, addSale, addLoan, addCustomer, generateReceiptId, getCurrentUser } from '@/lib/store';
import { CartItem, Sale, SaleItem, Loan, Customer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Trash2, Printer, Search } from 'lucide-react';
import Receipt from '@/components/Receipt';

export default function POS() {
  const user = getCurrentUser();
  const [products] = useState(getProducts());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('walk-in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'loan'>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', address: '' });

  const customers = useMemo(() => getCustomers(), [showNewCustomer]);
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) && p.quantity > 0);
  const total = cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const paid = paymentMethod === 'cash' ? total : Number(paidAmount) || 0;
  const balance = total - paid;

  const addToCart = (product: typeof products[0]) => {
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

  const handleCheckout = () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    if (paymentMethod === 'loan' && customerId === 'walk-in') { toast.error('Select a customer for loan'); return; }

    const receiptId = generateReceiptId();
    const items: SaleItem[] = cart.map(c => ({
      productId: c.product.id, productName: c.product.name,
      quantity: c.quantity, price: c.product.sellingPrice, total: c.product.sellingPrice * c.quantity,
    }));

    const customerName = customerId === 'walk-in' ? 'Walk-in Customer' : customers.find(c => c.id === customerId)?.name || 'Unknown';

    const sale: Sale = {
      id: crypto.randomUUID(), receiptId, items, customerId, customerName,
      total, paid, balance: Math.max(0, balance),
      paymentMethod, soldBy: user?.id || '', soldByName: user?.name || '',
      date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(),
    };

    addSale(sale);

    if (paymentMethod === 'loan' && balance > 0) {
      const loan: Loan = {
        id: crypto.randomUUID(), saleId: sale.id, customerId, customerName,
        totalAmount: balance, paidAmount: 0, balance, status: 'unpaid', payments: [],
        date: new Date().toISOString(),
      };
      addLoan(loan);
    }

    setLastSale(sale);
    setShowReceipt(true);
    setCart([]);
    setPaidAmount('');
    setCustomerId('walk-in');
    setPaymentMethod('cash');
    toast.success('Sale completed!');
  };

  const handleAddCustomer = () => {
    if (!newCust.name) return;
    const customer: Customer = {
      id: crypto.randomUUID(), name: newCust.name, phone: newCust.phone,
      address: newCust.address, totalDebt: 0, createdAt: new Date().toISOString(),
    };
    addCustomer(customer);
    setCustomerId(customer.id);
    setShowNewCustomer(false);
    setNewCust({ name: '', phone: '', address: '' });
    toast.success('Customer added');
  };

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
                  <p className="font-semibold text-sm mt-1">{p.sellingPrice.toLocaleString()}</p>
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
                      <p className="text-xs text-muted-foreground">{item.product.sellingPrice} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Minus size={12} /></button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="h-6 w-6 rounded bg-secondary flex items-center justify-center"><Plus size={12} /></button>
                      <button onClick={() => removeFromCart(item.product.id)} className="h-6 w-6 rounded bg-destructive/10 text-destructive flex items-center justify-center ml-1"><Trash2 size={12} /></button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right">{(item.product.sellingPrice * item.quantity).toLocaleString()}</p>
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
                <span>{total.toLocaleString()}</span>
              </div>
              {paymentMethod === 'loan' && balance > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Balance (Loan)</span>
                  <span>{balance.toLocaleString()}</span>
                </div>
              )}

              <Button onClick={handleCheckout} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={cart.length === 0}>
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
