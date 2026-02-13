import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerId } from '@/hooks/useOwnerId';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Search, Loader2, Printer, Receipt as ReceiptIcon } from 'lucide-react';
import Receipt from '@/components/Receipt';

interface SaleItem {
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Sale {
  id: string;
  receipt_id: string;
  customer_name: string;
  total: number;
  paid: number;
  balance: number;
  payment_method: string;
  sold_by_name: string;
  created_at: string;
}

export default function SalesHistory() {
  const { user } = useAuth();
  const { ownerId, loading: ownerLoading } = useOwnerId();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  useEffect(() => {
    const fetchSales = async () => {
      if (!ownerId) return;
      const { data } = await supabase
        .from('sales')
        .select('id, receipt_id, customer_name, total, paid, balance, payment_method, sold_by_name, created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });
      setSales(data || []);
      setLoading(false);
    };
    if (ownerId) fetchSales();
  }, [ownerId]);

  const handleViewReceipt = async (sale: Sale) => {
    setSelectedSale(sale);
    const { data } = await supabase
      .from('sale_items')
      .select('product_name, quantity, price, total')
      .eq('sale_id', sale.id);
    setSaleItems(data || []);
  };

  const filtered = sales.filter(s =>
    s.receipt_id.toLowerCase().includes(search.toLowerCase()) ||
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.sold_by_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || ownerLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const receiptSale = selectedSale ? {
    ...selectedSale,
    items: saleItems.map(i => ({
      productName: i.product_name,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
    })),
  } : null;

  return (
    <Layout>
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold">Sales History</h1>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by receipt ID, customer, or staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ReceiptIcon size={40} className="mx-auto mb-2 opacity-50" />
            <p>No sales found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(sale => (
              <button key={sale.id} onClick={() => handleViewReceipt(sale)}
                className="w-full text-left rounded-xl border bg-card p-3 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{sale.receipt_id}</p>
                    <p className="text-xs text-muted-foreground">{sale.customer_name} • {sale.sold_by_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(sale.created_at), 'dd MMM yyyy HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Le {Number(sale.total).toLocaleString()}</p>
                    <Badge variant="outline" className="text-xs">
                      {sale.payment_method === 'cash' ? 'Cash' : 'Loan'}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <Dialog open={!!selectedSale} onOpenChange={(o) => !o && setSelectedSale(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Printer size={18} /> Receipt</DialogTitle>
            </DialogHeader>
            {receiptSale && <Receipt sale={receiptSale} />}
            <Button onClick={() => window.print()} variant="outline"><Printer size={14} className="mr-1" /> Print</Button>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
