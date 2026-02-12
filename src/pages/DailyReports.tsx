import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sales, setSales] = useState<Sale[]>([]);

  const fetchReport = async (date: Date) => {
    if (!user) return;
    setLoading(true);

    const { data: shopData } = await supabase
      .from('shop_settings')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle();
    if (shopData) setShop({ name: shopData.name || 'My Shop' });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const { data: salesData } = await supabase
      .from('sales')
      .select('id, total, payment_method, sold_by_name, created_at')
      .eq('user_id', user.id)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .order('created_at');

    setSales(salesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReport(selectedDate);
  }, [user, selectedDate]);

  const goDay = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta);
    if (next <= new Date()) setSelectedDate(next);
  };

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const cashSales = sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + Number(s.total), 0);
  const creditSales = sales.filter(s => s.payment_method === 'loan').reduce((sum, s) => sum + Number(s.total), 0);

  const staffMap = new Map<string, number>();
  sales.forEach(s => {
    const name = s.sold_by_name || 'Unknown';
    staffMap.set(name, (staffMap.get(name) || 0) + Number(s.total));
  });
  const staffSales = Array.from(staffMap.entries()).map(([name, total]) => ({ name, total })).filter(s => s.total > 0);

  const hourly: Record<string, number> = {};
  sales.forEach(s => {
    const hour = new Date(s.created_at).getHours();
    const label = `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
    hourly[label] = (hourly[label] || 0) + Number(s.total);
  });

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <Layout>
      <div className="animate-fade-in max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <Button variant="outline" onClick={() => window.print()}><Printer size={14} className="mr-1" /> Print</Button>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => goDay(-1)}>
            <ChevronLeft size={18} />
          </Button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-card">
            <Calendar size={16} className="text-muted-foreground" />
            <Input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={e => {
                const d = new Date(e.target.value);
                if (!isNaN(d.getTime()) && d <= new Date()) setSelectedDate(d);
              }}
              className="border-0 p-0 h-auto text-sm font-medium bg-transparent"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={() => goDay(1)} disabled={isToday}>
            <ChevronRight size={18} />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border p-5 font-mono text-sm space-y-3 print:border-none">
            <div className="text-center">
              <p className="font-bold text-base">{shop.name}</p>
              <p className="font-bold">DAILY SALES REPORT</p>
              <p>Date: {format(selectedDate, 'dd MMM yyyy')}</p>
            </div>

            <div className="border-t border-dashed my-3" />

            <div className="space-y-1">
              <div className="flex justify-between"><span>Total Sales:</span><span className="font-bold">Le {totalSales.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Cash Sales:</span><span>Le {cashSales.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Credit Sales:</span><span>Le {creditSales.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Total Transactions:</span><span>{sales.length}</span></div>
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

            {sales.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No sales on this date</p>
            )}

            <div className="border-t border-dashed my-3" />
            <p className="text-center text-xs">Report generated at: {format(new Date(), 'HH:mm')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
