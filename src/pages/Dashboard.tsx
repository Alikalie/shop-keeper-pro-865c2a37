import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerId } from '@/hooks/useOwnerId';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { Package, ShoppingCart, Users, CreditCard, TrendingUp, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  quantity: number;
  low_stock_level: number;
}

interface RecentActivity {
  id: string;
  type: 'sale' | 'stock' | 'loan';
  description: string;
  amount?: number;
  by: string;
  time: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { ownerId, loading: ownerLoading } = useOwnerId();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null);
  const [stats, setStats] = useState({
    totalSalesToday: 0,
    cashSales: 0,
    creditSales: 0,
    transactions: 0,
    totalProducts: 0,
    totalCustomers: 0,
    outstandingLoans: 0,
  });
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  const fetchData = useCallback(async () => {
    if (!user || !ownerId) return;

    const loadDashboard = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: salesData } = await supabase
        .from('sales')
        .select('id, total, payment_method, created_at')
        .eq('user_id', ownerId)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const sales = salesData || [];
      const totalSalesToday = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const cashSales = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
      const creditSales = sales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + Number(s.total), 0);

      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId);

      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ownerId);

      const { data: loansData } = await supabase
        .from('loans')
        .select('id, balance, status')
        .eq('user_id', ownerId)
        .neq('status', 'paid');

      const outstandingLoans = (loansData || []).reduce((sum, l) => sum + Number(l.balance), 0);

      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, quantity, low_stock_level')
        .eq('user_id', ownerId);

      const lowStockItems = (productsData || []).filter(p => p.quantity <= p.low_stock_level);

      // Fetch recent activities (last 10 sales + stock entries)
      const activities: RecentActivity[] = [];

      const { data: recentSales } = await supabase
        .from('sales')
        .select('id, receipt_id, total, sold_by_name, created_at, payment_method')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(8);

      (recentSales || []).forEach(s => {
        activities.push({
          id: `sale-${s.id}`,
          type: 'sale',
          description: `Sale ${s.receipt_id} (${s.payment_method})`,
          amount: Number(s.total),
          by: s.sold_by_name || 'Owner',
          time: s.created_at,
        });
      });

      const { data: recentStock } = await supabase
        .from('stock_entries')
        .select('id, quantity, buying_price, created_at, products(name), profiles!stock_entries_added_by_fkey(name)')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(5);

      (recentStock || []).forEach((s: any) => {
        activities.push({
          id: `stock-${s.id}`,
          type: 'stock',
          description: `Added ${s.quantity}x ${s.products?.name || 'item'}`,
          amount: Number(s.buying_price) * s.quantity,
          by: s.profiles?.name || 'Owner',
          time: s.created_at,
        });
      });

      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setRecentActivities(activities.slice(0, 10));

      setStats({
        totalSalesToday,
        cashSales,
        creditSales,
        transactions: sales.length,
        totalProducts: productsCount || 0,
        totalCustomers: customersCount || 0,
        outstandingLoans,
      });
      setLowStock(lowStockItems);
      setLoading(false);
    };

    loadDashboard();
  }, [user, ownerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtimeDashboard(ownerId, fetchData);

  if (loading || ownerLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const statCards = [
    { label: "Today's Sales", value: `Le ${stats.totalSalesToday.toLocaleString()}`, icon: TrendingUp, accent: true },
    { label: 'Cash Sales', value: `Le ${stats.cashSales.toLocaleString()}`, icon: ShoppingCart },
    { label: 'Credit Sales', value: `Le ${stats.creditSales.toLocaleString()}`, icon: CreditCard },
    { label: 'Transactions', value: stats.transactions.toString(), icon: ShoppingCart },
    { label: 'Total Products', value: stats.totalProducts.toString(), icon: Package },
    { label: 'Customers', value: stats.totalCustomers.toString(), icon: Users },
  ];

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {profile?.name || 'User'}</h1>
          <p className="text-muted-foreground text-sm">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {statCards.map(stat => (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.accent ? 'bg-accent/10 border-accent/30' : 'bg-card'}`}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <stat.icon size={16} className={stat.accent ? 'text-accent' : ''} />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.accent ? 'text-accent' : ''}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {stats.outstandingLoans > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-warning" />
              <span className="text-sm font-medium">Outstanding Loans</span>
            </div>
            <p className="text-lg font-bold">Le {stats.outstandingLoans.toLocaleString()}</p>
          </div>
        )}

        {lowStock.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-destructive" />
              <span className="text-sm font-medium">Low Stock Alert ({lowStock.length} items)</span>
            </div>
            <div className="space-y-1">
              {lowStock.slice(0, 5).map(p => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-medium text-destructive">{p.quantity} left</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity Feed */}
        {recentActivities.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-accent" />
              <span className="text-sm font-semibold">Recent Activity</span>
            </div>
            <div className="space-y-2">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      activity.type === 'sale' ? 'bg-accent' : activity.type === 'stock' ? 'bg-primary' : 'bg-warning'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">by {activity.by} · {format(new Date(activity.time), 'dd MMM HH:mm')}</p>
                    </div>
                  </div>
                  {activity.amount !== undefined && (
                    <span className="text-sm font-medium shrink-0 ml-2">Le {activity.amount.toLocaleString()}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
