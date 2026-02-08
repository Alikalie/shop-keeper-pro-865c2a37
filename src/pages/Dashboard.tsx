import Layout from '@/components/Layout';
import { getSales, getProducts, getCustomers, getLoans, getCurrentUser } from '@/lib/store';
import { Package, ShoppingCart, Users, CreditCard, TrendingUp, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const user = getCurrentUser();
  const allSales = getSales();
  const products = getProducts();
  const customers = getCustomers();
  const loans = getLoans();

  const today = new Date().toISOString().split('T')[0];
  const todaySales = allSales.filter(s => s.date === today);
  const sales = user?.role === 'owner' ? todaySales : todaySales.filter(s => s.soldBy === user?.id);

  const totalSalesToday = sales.reduce((sum, s) => sum + s.total, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const creditSales = sales.filter(s => s.paymentMethod === 'loan').reduce((sum, s) => sum + s.total, 0);
  const lowStock = products.filter(p => p.quantity <= p.lowStockLevel);
  const outstandingLoans = loans.filter(l => l.status !== 'paid').reduce((sum, l) => sum + l.balance, 0);

  const stats = [
    { label: "Today's Sales", value: totalSalesToday.toLocaleString(), icon: TrendingUp, accent: true },
    { label: 'Cash Sales', value: cashSales.toLocaleString(), icon: ShoppingCart },
    { label: 'Credit Sales', value: creditSales.toLocaleString(), icon: CreditCard },
    { label: 'Transactions', value: sales.length.toString(), icon: ShoppingCart },
    { label: 'Total Products', value: products.length.toString(), icon: Package },
    { label: 'Customers', value: customers.length.toString(), icon: Users },
  ];

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}</h1>
          <p className="text-muted-foreground text-sm">{new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {stats.map(stat => (
            <div key={stat.label} className={`rounded-xl border p-4 ${stat.accent ? 'bg-accent/10 border-accent/30' : 'bg-card'}`}>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <stat.icon size={16} className={stat.accent ? 'text-accent' : ''} />
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.accent ? 'text-accent' : ''}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {user?.role === 'owner' && outstandingLoans > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={16} className="text-warning" />
              <span className="text-sm font-medium">Outstanding Loans</span>
            </div>
            <p className="text-lg font-bold">{outstandingLoans.toLocaleString()}</p>
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
