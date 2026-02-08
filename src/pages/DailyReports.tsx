import Layout from '@/components/Layout';
import { getSales, getShop, getUsers } from '@/lib/store';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function DailyReports() {
  const shop = getShop();
  const sales = getSales();
  const users = getUsers();
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter(s => s.date === today);

  const totalSales = todaySales.reduce((sum, s) => sum + s.total, 0);
  const cashSales = todaySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
  const creditSales = todaySales.filter(s => s.paymentMethod === 'loan').reduce((sum, s) => sum + s.total, 0);

  // Sales by staff
  const staffSales = users.map(u => {
    const staffTotal = todaySales.filter(s => s.soldBy === u.id).reduce((sum, s) => sum + s.total, 0);
    return { name: u.name, total: staffTotal };
  }).filter(s => s.total > 0);

  // Hourly sales
  const hourly: Record<string, number> = {};
  todaySales.forEach(s => {
    const hour = new Date(s.timestamp).getHours();
    const label = `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
    hourly[label] = (hourly[label] || 0) + s.total;
  });

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
            <div className="flex justify-between"><span>Total Sales:</span><span className="font-bold">{totalSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Cash Sales:</span><span>{cashSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Credit Sales:</span><span>{creditSales.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Total Transactions:</span><span>{todaySales.length}</span></div>
          </div>

          {staffSales.length > 0 && (
            <>
              <div className="border-t border-dashed my-3" />
              <p className="font-bold">Sales by Staff:</p>
              {staffSales.map(s => (
                <div key={s.name} className="flex justify-between">
                  <span>- {s.name}:</span><span>{s.total.toLocaleString()}</span>
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
                  <span>{hour}:</span><span>{total.toLocaleString()}</span>
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
