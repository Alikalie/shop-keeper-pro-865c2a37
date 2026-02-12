import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Users, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  total_debt: number;
}

interface CustomerSale {
  id: string;
  receipt_id: string;
  total: number;
  paid: number;
  balance: number;
  payment_method: string;
  created_at: string;
}

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<CustomerSale[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  const fetchCustomers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [user]);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const handleAdd = async () => {
    if (!form.name || !user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name: form.name,
        phone: form.phone,
        address: form.address,
        total_debt: 0,
      });

    if (error) {
      toast.error('Failed to add customer');
      setSaving(false);
      return;
    }

    await fetchCustomers();
    setDialogOpen(false);
    setForm({ name: '', phone: '', address: '' });
    setSaving(false);
    toast.success('Customer added');
  };

  const viewCustomerSales = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingSales(true);
    const { data } = await supabase
      .from('sales')
      .select('id, receipt_id, total, paid, balance, payment_method, created_at')
      .eq('user_id', user!.id)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    setCustomerSales(data || []);
    setLoadingSales(false);
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
          <h1 className="text-2xl font-bold">Customers</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus size={16} className="mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                <Button onClick={handleAdd} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Add Customer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users size={40} className="mx-auto mb-2 opacity-50" />
            <p>No customers yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(c => (
              <button key={c.id} onClick={() => viewCustomerSales(c)} className="w-full text-left rounded-xl border bg-card p-3 flex items-center justify-between hover:border-accent/50 transition-colors">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {Number(c.total_debt) > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Owes</p>
                      <p className="font-semibold text-destructive">Le {Number(c.total_debt).toLocaleString()}</p>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Customer Sales History */}
        <Dialog open={!!selectedCustomer} onOpenChange={o => !o && setSelectedCustomer(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedCustomer?.name} — Sales History</DialogTitle>
            </DialogHeader>
            {loadingSales ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : customerSales.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No sales for this customer</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customerSales.map(sale => (
                  <div key={sale.id} className="rounded-lg border bg-secondary/30 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{sale.receipt_id}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), 'dd MMM yyyy HH:mm')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Le {Number(sale.total).toLocaleString()}</p>
                        <Badge variant="outline" className="text-xs">
                          {sale.payment_method === 'cash' ? 'Cash' : 'Loan'}
                        </Badge>
                      </div>
                    </div>
                    {Number(sale.balance) > 0 && (
                      <p className="text-xs text-destructive mt-1">Balance: Le {Number(sale.balance).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
