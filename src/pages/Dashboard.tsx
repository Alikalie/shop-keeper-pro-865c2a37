import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, ShoppingCart, Users, CreditCard, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  low_stock_level: number;
}

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
}

interface Loan {
  id: string;
  balance: number;
  status: string;
}

export default function Dashboard() {
  const { user } = useAuth();
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

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileData) setProfile(profileData);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('id, total, payment_method, created_at')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      const sales = salesData || [];
      const totalSalesToday = sales.reduce((sum, s) => sum + Number(s.total), 0);
      const cashSales = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
      const creditSales = sales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + Number(s.total), 0);

      // Get products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get outstanding loans
      const { data: loansData } = await supabase
        .from('loans')
        .select('id, balance, status')
        .eq('user_id', user.id)
        .neq('status', 'paid');

      const outstandingLoans = (loansData || []).reduce((sum, l) => sum + Number(l.balance), 0);

      // Get low stock products
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, quantity, low_stock_level')
        .eq('user_id', user.id);

      const lowStockItems = (productsData || []).filter(p => p.quantity <= p.low_stock_level);

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

    fetchData();
  }, [user]);

  if (loading) {
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

        {profile?.role === 'owner' && stats.outstandingLoans > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-amber-500" />
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
      </div>
    </Layout>
  );
}
