import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerId } from '@/hooks/useOwnerId';
import { useRealtimeDashboard } from '@/hooks/useRealtimeDashboard';
import { Package, ShoppingCart, Users, CreditCard, TrendingUp, AlertTriangle, Clock, Trophy, UserCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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

interface StaffPerformance {
  name: string;
  sales: number;
  revenue: number;
  transactions: number;
}

interface DashboardSnapshot {
  profile: { name: string; role: string } | null;
  stats: {
    totalSalesToday: number;
    cashSales: number;
    creditSales: number;
    transactions: number;
    totalProducts: number;
    totalCustomers: number;
    outstandingLoans: number;
  };
  lowStock: Product[];
  recentActivities: RecentActivity[];
  staffPerformance: StaffPerformance[];
  cachedAt: number;
}

const emptyStats = {
  totalSalesToday: 0,
  cashSales: 0,
  creditSales: 0,
  transactions: 0,
  totalProducts: 0,
  totalCustomers: 0,
  outstandingLoans: 0,
};

const cacheKey = (ownerId: string) => `dashboard-cache:${ownerId}`;

function readCache(ownerId: string): DashboardSnapshot | null {
  try {
    const raw = localStorage.getItem(cacheKey(ownerId));
    if (!raw) return null;
    return JSON.parse(raw) as DashboardSnapshot;
  } catch {
    return null;
  }
}

function writeCache(ownerId: string, snap: DashboardSnapshot) {
  try {
    localStorage.setItem(cacheKey(ownerId), JSON.stringify(snap));
  } catch {
    /* ignore quota errors */
  }
}

export default function Dashboard() {
  const { user } = useAuth();
  const { ownerId, loading: ownerLoading } = useOwnerId();
  const [hasData, setHasData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null);
  const [stats, setStats] = useState(emptyStats);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);

  // Hydrate from cache instantly whenever ownerId is known
  useEffect(() => {
    if (!ownerId) return;
    const cached = readCache(ownerId);
    if (cached) {
      setProfile(cached.profile);
      setStats(cached.stats);
      setLowStock(cached.lowStock);
      setRecentActivities(cached.recentActivities);
      setStaffPerformance(cached.staffPerformance);
      setLastUpdated(cached.cachedAt);
      setHasData(true);
    }
  }, [ownerId]);

  const fetchData = useCallback(async () => {
    if (!user || !ownerId) return;

    setRefreshing(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        profileRes,
        salesRes,
        productsCountRes,
        customersCountRes,
        loansRes,
        productsDataRes,
        recentSalesRes,
        recentStockRes,
      ] = await Promise.all([
        supabase.from('profiles').select('name, role').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('sales')
          .select('id, total, payment_method, created_at, sold_by_name')
          .eq('user_id', ownerId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString()),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('user_id', ownerId),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('user_id', ownerId),
        supabase.from('loans').select('id, balance, status').eq('user_id', ownerId).neq('status', 'paid'),
        supabase.from('products').select('id, name, quantity, low_stock_level').eq('user_id', ownerId),
        supabase
          .from('sales')
          .select('id, receipt_id, total, sold_by_name, created_at, payment_method')
          .eq('user_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('stock_entries')
          .select('id, quantity, buying_price, created_at, products(name)')
          .eq('user_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const firstError =
        profileRes.error || salesRes.error || productsCountRes.error ||
        customersCountRes.error || loansRes.error || productsDataRes.error ||
        recentSalesRes.error || recentStockRes.error;
      if (firstError) throw firstError;

      const nextProfile = profileRes.data ?? null;

      const sales = salesRes.data || [];
      const totalSalesToday = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const cashSales = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
      const creditSales = sales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + Number(s.total), 0);

      const perfMap = new Map<string, StaffPerformance>();
      sales.forEach(s => {
        const name = s.sold_by_name || 'Owner';
        const existing = perfMap.get(name) || { name, sales: 0, revenue: 0, transactions: 0 };
        existing.revenue += Number(s.total);
        existing.transactions += 1;
        perfMap.set(name, existing);
      });
      const nextStaff = Array.from(perfMap.values()).sort((a, b) => b.revenue - a.revenue);

      const outstandingLoans = (loansRes.data || []).reduce((sum, l) => sum + Number(l.balance), 0);
      const lowStockItems = (productsDataRes.data || []).filter(p => p.quantity <= p.low_stock_level);

      const activities: RecentActivity[] = [];
      (recentSalesRes.data || []).forEach(s => {
        activities.push({
          id: `sale-${s.id}`,
          type: 'sale',
          description: `Sale ${s.receipt_id} (${s.payment_method})`,
          amount: Number(s.total),
          by: s.sold_by_name || 'Owner',
          time: s.created_at,
        });
      });
      (recentStockRes.data || []).forEach((s: any) => {
        activities.push({
          id: `stock-${s.id}`,
          type: 'stock',
          description: `Added ${s.quantity}x ${s.products?.name || 'item'}`,
          amount: Number(s.buying_price) * s.quantity,
          by: 'Staff',
          time: s.created_at,
        });
      });
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      const nextActivities = activities.slice(0, 10);

      const nextStats = {
        totalSalesToday,
        cashSales,
        creditSales,
        transactions: sales.length,
        totalProducts: productsCountRes.count || 0,
        totalCustomers: customersCountRes.count || 0,
        outstandingLoans,
      };

      setProfile(nextProfile);
      setStats(nextStats);
      setLowStock(lowStockItems);
      setRecentActivities(nextActivities);
      setStaffPerformance(nextStaff);
      setHasData(true);
      setError(null);
      const cachedAt = Date.now();
      setLastUpdated(cachedAt);

      writeCache(ownerId, {
        profile: nextProfile,
        stats: nextStats,
        lowStock: lowStockItems,
        recentActivities: nextActivities,
        staffPerformance: nextStaff,
        cachedAt,
      });
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setRefreshing(false);
    }
  }, [user, ownerId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtimeDashboard(ownerId, fetchData);

  // Full error state when we have nothing to show
  if (!ownerLoading && ownerId && error && !hasData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4 animate-fade-in">
          <AlertCircle className="w-10 h-10 text-destructive" />
          <div>
            <h2 className="text-lg font-semibold">Couldn't load your dashboard</h2>
            <p className="text-sm text-muted-foreground max-w-md mt-1">{error}</p>
          </div>
          <Button onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Try again
          </Button>
        </div>
      </Layout>
    );
  }

  const showSkeleton = (ownerLoading || (!hasData && refreshing));

  const statCards = [
    { label: "Today's Sales", value: `Le ${stats.totalSalesToday.toLocaleString()}`, icon: TrendingUp, accent: true },
    { label: 'Cash Sales', value: `Le ${stats.cashSales.toLocaleString()}`, icon: ShoppingCart },
    { label: 'Credit Sales', value: `Le ${stats.creditSales.toLocaleString()}`, icon: CreditCard },
    { label: 'Transactions', value: stats.transactions.toString(), icon: ShoppingCart },
    { label: 'Total Products', value: stats.totalProducts.toString(), icon: Package },
    { label: 'Customers', value: stats.totalCustomers.toString(), icon: Users },
  ];

  const isOwner = profile?.role === 'owner';

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            {showSkeleton ? (
              <>
                <Skeleton className="h-7 w-56 mb-2" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold">Welcome back, {profile?.name || 'User'}</h1>
                <p className="text-muted-foreground text-sm">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {lastUpdated && (
                    <span className="ml-2 text-xs">· Updated {format(new Date(lastUpdated), 'HH:mm')}</span>
                  )}
                </p>
              </>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={refreshing} className="shrink-0">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
        </div>

        {error && hasData && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle size={16} className="text-destructive shrink-0" />
              <p className="text-sm truncate">Showing cached data — refresh failed: {error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={fetchData} disabled={refreshing}>
              <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {showSkeleton
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4 bg-card">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))
            : statCards.map(stat => (
                <div key={stat.label} className={`rounded-xl border p-4 ${stat.accent ? 'bg-accent/10 border-accent/30' : 'bg-card'}`}>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <stat.icon size={16} className={stat.accent ? 'text-accent' : ''} />
                    <span className="text-xs">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${stat.accent ? 'text-accent' : ''}`}>{stat.value}</p>
                </div>
              ))}
        </div>

        {!showSkeleton && stats.outstandingLoans > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-warning" />
              <span className="text-sm font-medium">Outstanding Loans</span>
            </div>
            <p className="text-lg font-bold">Le {stats.outstandingLoans.toLocaleString()}</p>
          </div>
        )}

        {!showSkeleton && isOwner && staffPerformance.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-accent" />
              <span className="text-sm font-semibold">Staff Performance Today</span>
            </div>
            <div className="space-y-2">
              {staffPerformance.map((staff, idx) => (
                <div key={staff.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <UserCircle size={16} className="text-muted-foreground" />
                      <span className="text-sm font-medium">{staff.name}</span>
                      {idx === 0 && <Badge variant="outline" className="text-xs text-accent border-accent/30">Top</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">Le {staff.revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{staff.transactions} sale{staff.transactions !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!showSkeleton && lowStock.length > 0 && (
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

        {showSkeleton ? (
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : recentActivities.length > 0 && (
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
