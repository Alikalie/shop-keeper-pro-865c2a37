import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  sold_by_name: string;
  created_at: string;
}

export default function DailyReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState({ name: 'My Shop' });
  const [todaySales, setTodaySales] = useState<Sale[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get shop settings
      const { data: shopData } = await supabase
        .from('shop_settings')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (shopData) setShop({ name: shopData.name || 'My Shop' });

      // Get today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: salesData } = await supabase
        .from('sales')
        .select('id, total, payment_method, sold_by_name, created_at')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())
        .order('created_at');

      setTodaySales(salesData || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const totalSales = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const cashSales = todaySales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
  const creditSales = todaySales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + Number(s.total), 0);

  // Sales by staff
  const staffMap = new Map<string, number>();
  todaySales.forEach(s => {
    const name = s.sold_by_name || 'Unknown';
    staffMap.set(name, (staffMap.get(name) || 0) + Number(s.total));
  });
  const staffSales = Array.from(staffMap.entries()).map(([name, total]) => ({ name, total })).filter(s => s.total > 0);

  // Hourly sales
  const hourly: Record<string, number> = {};
  todaySales.forEach(s => {
    const hour = new Date(s.created_at).getHours();
    const label = `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
    hourly[label] = (hourly[label] || 0) + Number(s.total);
  });

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
      <div className="animate-fade-in max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <Button variant="outline" onClick={() => window.print()}><Printer size={14} className="mr-1" /> Print</Button>
        </div>

        <div className="bg-card rounded-xl border p-5 font-mono text-sm space-y-3 print:border-none">
          <div className="text-center">
            <p className="font-bold text-base">{shop.name}</p>
            <p className="font-bold">DAILY SALES REPORT</p>
            <p>Date: {format(new Date(), 'dd MMM yyyy')}</p>
          </div>

          <div className="border-t border-dashed my-3" />

          <div className="space-y-1">
            <div className="flex justify-between"><span>Total Sales:</span><span className="font-bold">Le {totalSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Cash Sales:</span><span>Le {cashSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Credit Sales:</span><span>Le {creditSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Total Transactions:</span><span>{todaySales.length}</span></div>
          </div>

          {staffSales.length > 0 && (
            <>
              <div className="border-t border-dashed my-3" />
              <p className="font-bold">Sales by Staff:</p>
              {staffSales.map(s => (
                <div key={s.name} className="flex justify-between">
                  <span>- {s.name}:</span><span>Le {s.total.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}

          {Object.keys(hourly).length > 0 && (
            <>
              <div className="border-t border-dashed my-3" />
              <p className="font-bold">Hourly Sales:</p>
              {Object.entries(hourly).sort().map(([hour, total]) => (
                <div key={hour} className="flex justify-between">
                  <span>{hour}:</span><span>Le {total.toLocaleString()}</span>
                </div>
              ))}
            </>
          )}

          <div className="border-t border-dashed my-3" />
          <p className="text-center text-xs">Printed at: {format(new Date(), 'HH:mm')}</p>
        </div>
      </div>
    </Layout>
  );
}
