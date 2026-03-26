import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Store, Users, Package, ShoppingCart, CreditCard, Loader2,
  Search, ChevronDown, ChevronUp, Trash2, TrendingUp, Trophy,
  UserCircle, Pencil, Receipt as ReceiptIcon
} from 'lucide-react';
import { format } from 'date-fns';
import Receipt from '@/components/Receipt';

interface ShopData {
  user_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  owner_name: string;
  owner_email: string;
  org_name: string | null;
  account_type: string;
  staff_count: number;
  product_count: number;
  total_sales: number;
  total_customers: number;
  outstanding_loans: number;
  today_sales: number;
}

export default function AdminShops() {
  const [shops, setShops] = useState<ShopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedShop, setExpandedShop] = useState<string | null>(null);
  const [shopDetails, setShopDetails] = useState<Record<string, any>>({});
  const [receiptSale, setReceiptSale] = useState<any>(null);
  const [receiptOwnerId, setReceiptOwnerId] = useState<string | null>(null);

  useEffect(() => {
    loadShops();
    const channel = supabase
      .channel('admin-shops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => loadShops())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadShops())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => loadShops())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadShops = async () => {
    const { data: shopSettings } = await supabase
      .from('shop_settings')
      .select('user_id, name, address, phone');
    if (!shopSettings) { setLoading(false); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shopDataPromises = shopSettings.map(async (shop) => {
      const [profileRes, orgRes, productsRes, salesRes, todaySalesRes, customersRes, loansRes] = await Promise.all([
        supabase.from('profiles').select('name, account_type, org_id').eq('user_id', shop.user_id).maybeSingle(),
        supabase.from('organizations').select('name, id').eq('owner_id', shop.user_id).maybeSingle(),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', shop.user_id),
        supabase.from('sales').select('total').eq('user_id', shop.user_id),
        supabase.from('sales').select('total').eq('user_id', shop.user_id).gte('created_at', today.toISOString()),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('user_id', shop.user_id),
        supabase.from('loans').select('balance').eq('user_id', shop.user_id).neq('status', 'paid'),
      ]);

      let staffCount = 0;
      if (orgRes.data) {
        const { count } = await supabase
          .from('org_members')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgRes.data.id);
        staffCount = (count || 1) - 1;
      }

      const { data: usersData } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'list_users' },
      });
      const ownerUser = usersData?.users?.find((u: any) => u.id === shop.user_id);

      return {
        user_id: shop.user_id,
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        owner_name: profileRes.data?.name || 'Unknown',
        owner_email: ownerUser?.email || 'unknown',
        org_name: orgRes.data?.name || null,
        account_type: profileRes.data?.account_type || 'personal',
        staff_count: staffCount,
        product_count: productsRes.count || 0,
        total_sales: (salesRes.data || []).reduce((sum, s) => sum + Number(s.total), 0),
        total_customers: customersRes.count || 0,
        outstanding_loans: (loansRes.data || []).reduce((sum, l) => sum + Number(l.balance), 0),
        today_sales: (todaySalesRes.data || []).reduce((sum, s) => sum + Number(s.total), 0),
      } as ShopData;
    });

    const allShops = await Promise.all(shopDataPromises);
    setShops(allShops.filter(s => s.product_count > 0 || s.total_sales > 0 || s.staff_count > 0 || allShops.length <= 1));
    if (allShops.length === 0) setShops(allShops);
    setLoading(false);
  };

  const loadShopDetails = async (userId: string) => {
    if (shopDetails[userId]) {
      setExpandedShop(expandedShop === userId ? null : userId);
      return;
    }

    const [salesRes, productsRes] = await Promise.all([
      supabase.from('sales')
        .select('id, receipt_id, total, payment_method, sold_by_name, created_at, customer_name, paid, balance')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('products')
        .select('id, name, quantity, selling_price, low_stock_level')
        .eq('user_id', userId)
        .order('name'),
    ]);

    // Get staff for this shop
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', userId)
      .maybeSingle();

    let staffList: any[] = [];
    if (orgData) {
      const { data: members } = await supabase
        .from('org_members')
        .select('user_id, role')
        .eq('org_id', orgData.id);

      const memberIds = (members || []).map(m => m.user_id);
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, role')
          .in('user_id', memberIds);

        const { data: usersData } = await supabase.functions.invoke('manage-admin', {
          body: { action: 'list_users' },
        });

        staffList = (profiles || []).map(p => {
          const member = members?.find(m => m.user_id === p.user_id);
          const authUser = usersData?.users?.find((u: any) => u.id === p.user_id);
          return { ...p, email: authUser?.email, org_role: member?.role };
        });
      }
    }

    // Staff performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = (salesRes.data || []).filter(s => new Date(s.created_at) >= today);
    const perfMap = new Map<string, { name: string; revenue: number; transactions: number }>();
    todaySales.forEach(s => {
      const name = s.sold_by_name || 'Owner';
      const existing = perfMap.get(name) || { name, revenue: 0, transactions: 0 };
      existing.revenue += Number(s.total);
      existing.transactions += 1;
      perfMap.set(name, existing);
    });
    const staffPerformance = Array.from(perfMap.values()).sort((a, b) => b.revenue - a.revenue);

    setShopDetails(prev => ({
      ...prev,
      [userId]: {
        sales: salesRes.data || [],
        staff: staffList,
        products: productsRes.data || [],
        staffPerformance,
      },
    }));
    setExpandedShop(userId);
  };

  const viewReceipt = async (sale: any, shopUserId?: string) => {
    const { data } = await supabase
      .from('sale_items')
      .select('product_name, quantity, price, total')
      .eq('sale_id', sale.id);
    setReceiptOwnerId(shopUserId || sale.user_id || null);
    setReceiptSale({
      ...sale,
      items: (data || []).map(i => ({
        productName: i.product_name,
        quantity: i.quantity,
        price: i.price,
        total: i.total,
      })),
    });
  };

  const deleteStaffFromShop = async (shopUserId: string, staffUserId: string, staffName: string) => {
    if (!confirm(`Remove ${staffName} from this shop?`)) return;
    const { data, error } = await supabase.functions.invoke('manage-admin', {
      body: { action: 'admin_delete_staff', shopOwnerId: shopUserId, staffUserId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Failed to remove staff');
      return;
    }
    toast.success('Staff removed');
    setShopDetails(prev => { const n = { ...prev }; delete n[shopUserId]; return n; });
    await loadShops();
  };

  const deleteShopData = async (userId: string) => {
    if (!confirm('Delete ALL data for this shop? This cannot be undone.')) return;

    const { data: sales } = await supabase.from('sales').select('id').eq('user_id', userId);
    if (sales) {
      for (const s of sales) {
        await supabase.from('sale_items').delete().eq('sale_id', s.id);
      }
    }
    const { data: loans } = await supabase.from('loans').select('id').eq('user_id', userId);
    if (loans) {
      for (const l of loans) {
        await supabase.from('loan_payments').delete().eq('loan_id', l.id);
      }
    }
    await supabase.from('sales').delete().eq('user_id', userId);
    await supabase.from('loans').delete().eq('user_id', userId);
    await supabase.from('stock_entries').delete().eq('user_id', userId);
    await supabase.from('products').delete().eq('user_id', userId);
    await supabase.from('customers').delete().eq('user_id', userId);

    toast.success('Shop data deleted');
    setShopDetails(prev => { const n = { ...prev }; delete n[userId]; return n; });
    await loadShops();
  };

  // Sort shops by today's sales (best performing first)
  const sorted = [...shops].sort((a, b) => b.today_sales - a.today_sales);
  const filtered = sorted.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_name.toLowerCase().includes(search.toLowerCase()) ||
    s.owner_email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const bestShop = sorted.length > 0 ? sorted[0] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Store className="w-5 h-5" /> All Shops ({shops.length})
        </h2>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search shops, owners..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Shops</p>
          <p className="text-xl font-bold">{shops.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold">Le {shops.reduce((s, sh) => s + sh.total_sales, 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Today's Sales</p>
          <p className="text-xl font-bold text-accent">Le {shops.reduce((s, sh) => s + sh.today_sales, 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-3">
          <p className="text-xs text-muted-foreground">Outstanding Loans</p>
          <p className="text-xl font-bold text-destructive">Le {shops.reduce((s, sh) => s + sh.outstanding_loans, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Best Performing Shop */}
      {bestShop && bestShop.today_sales > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-accent" />
            <span className="text-sm font-semibold">Top Performing Shop Today</span>
          </div>
          <p className="text-lg font-bold">{bestShop.name}</p>
          <p className="text-sm text-muted-foreground">Le {bestShop.today_sales.toLocaleString()} in sales today · Owner: {bestShop.owner_name}</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((shop, shopIdx) => (
          <div key={shop.user_id} className="rounded-xl border bg-card overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => loadShopDetails(shop.user_id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {shopIdx === 0 && shop.today_sales > 0 && <Trophy size={14} className="text-accent" />}
                    <h3 className="font-semibold text-lg">{shop.name}</h3>
                    <Badge variant="outline" className="text-xs">{shop.account_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Owner: {shop.owner_name} ({shop.owner_email})</p>
                  {shop.org_name && <p className="text-xs text-muted-foreground">Org: {shop.org_name}</p>}
                </div>
                {expandedShop === shop.user_id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
                <div className="flex items-center gap-1 text-xs"><Package className="w-3 h-3 text-muted-foreground" /><span>{shop.product_count} products</span></div>
                <div className="flex items-center gap-1 text-xs"><Users className="w-3 h-3 text-muted-foreground" /><span>{shop.staff_count} staff</span></div>
                <div className="flex items-center gap-1 text-xs"><ShoppingCart className="w-3 h-3 text-muted-foreground" /><span>{shop.total_customers} customers</span></div>
                <div className="flex items-center gap-1 text-xs"><TrendingUp className="w-3 h-3 text-accent" /><span className="text-accent">Le {shop.today_sales.toLocaleString()} today</span></div>
                <div className="flex items-center gap-1 text-xs"><ShoppingCart className="w-3 h-3 text-primary" /><span>Le {shop.total_sales.toLocaleString()} total</span></div>
                <div className="flex items-center gap-1 text-xs"><CreditCard className="w-3 h-3 text-destructive" /><span className="text-destructive">Le {shop.outstanding_loans.toLocaleString()} debt</span></div>
              </div>
            </div>

            {expandedShop === shop.user_id && shopDetails[shop.user_id] && (
              <div className="border-t p-4 space-y-4 bg-muted/10">
                {/* Staff Performance */}
                {shopDetails[shop.user_id].staffPerformance?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Trophy className="w-4 h-4 text-accent" /> Staff Performance Today
                    </h4>
                    <div className="grid gap-1">
                      {shopDetails[shop.user_id].staffPerformance.map((sp: any, idx: number) => (
                        <div key={sp.name} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                              idx === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                            }`}>{idx + 1}</span>
                            <span>{sp.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">Le {sp.revenue.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground ml-2">({sp.transactions} sales)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff */}
                {shopDetails[shop.user_id].staff.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> Staff Members</h4>
                    <div className="grid gap-1">
                      {shopDetails[shop.user_id].staff.map((s: any) => (
                        <div key={s.user_id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-background">
                          <div className="flex items-center gap-2">
                            <UserCircle size={14} className="text-muted-foreground" />
                            <span>{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{s.email}</span>
                            <Badge variant="outline" className="text-xs">{s.role}</Badge>
                            {s.user_id !== shop.user_id && (
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                onClick={(e) => { e.stopPropagation(); deleteStaffFromShop(shop.user_id, s.user_id, s.name); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Sales with receipt view */}
                <div>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1"><ShoppingCart className="w-4 h-4" /> All Transactions</h4>
                  {shopDetails[shop.user_id].sales.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sales yet</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {shopDetails[shop.user_id].sales.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-background hover:bg-muted/50 cursor-pointer"
                          onClick={() => viewReceipt(s, shop.user_id)}>
                          <div className="min-w-0">
                            <span className="font-mono text-xs">{s.receipt_id}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {s.customer_name} · by {s.sold_by_name || 'Owner'}
                            </span>
                            <p className="text-xs text-muted-foreground">{format(new Date(s.created_at), 'dd MMM yyyy HH:mm')}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">{s.payment_method}</Badge>
                            <span className="font-medium">Le {Number(s.total).toLocaleString()}</span>
                            <ReceiptIcon size={12} className="text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Low Stock */}
                {shopDetails[shop.user_id].products.filter((p: any) => p.quantity <= p.low_stock_level).length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-destructive">⚠️ Low Stock Items</h4>
                    <div className="space-y-1">
                      {shopDetails[shop.user_id].products
                        .filter((p: any) => p.quantity <= p.low_stock_level)
                        .map((p: any) => (
                          <div key={p.id} className="flex justify-between text-sm py-1 px-2 rounded bg-background">
                            <span>{p.name}</span>
                            <span className="text-destructive font-medium">{p.quantity} left</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="destructive" onClick={() => deleteShopData(shop.user_id)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Delete Shop Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">
            {shops.length === 0 ? 'No shops registered yet' : 'No shops match your search'}
          </p>
        )}
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptSale} onOpenChange={(o) => !o && setReceiptSale(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ReceiptIcon size={18} /> Receipt</DialogTitle>
          </DialogHeader>
          {receiptSale && <Receipt sale={receiptSale} />}
          <Button onClick={() => window.print()} variant="outline" className="no-print">Print</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
