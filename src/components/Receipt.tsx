import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface SaleItem {
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

interface SaleData {
  id: string;
  receipt_id: string;
  customer_name: string;
  total: number;
  paid: number;
  balance: number;
  payment_method: string;
  sold_by_name: string;
  created_at: string;
  items: SaleItem[];
}

interface ReceiptProps { 
  sale: SaleData;
}

export default function Receipt({ sale }: ReceiptProps) {
  const { user } = useAuth();
  const [shop, setShop] = useState({ name: 'My Shop', address: '', phone: '', footerMessage: 'Thank you for your patronage!' });
  
  useEffect(() => {
    const fetchShop = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('shop_settings')
        .select('name, address, phone, footer_message')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setShop({
          name: data.name || 'My Shop',
          address: data.address || '',
          phone: data.phone || '',
          footerMessage: data.footer_message || 'Thank you for your patronage!',
        });
      }
    };
    fetchShop();
  }, [user]);

  const saleDate = new Date(sale.created_at);

  return (
    <div className="receipt-print bg-card p-4 rounded-lg border font-mono text-xs leading-relaxed">
      <div className="text-center mb-3">
        <p className="font-bold text-sm">{shop.name}</p>
        <p>{shop.address}</p>
        <p>{shop.phone}</p>
      </div>

      <p>Receipt ID: {sale.receipt_id}</p>
      <p>Customer: {sale.customer_name}</p>
      <p>Sold by: {sale.sold_by_name}</p>

      <div className="border-t border-dashed border-foreground/30 my-2" />

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2">
        <p className="font-medium">Item</p>
        <p className="font-medium text-right">Qty</p>
        <p className="font-medium text-right">Price</p>
        <p className="font-medium text-right">Total</p>
        {sale.items.map((item, i) => (
          <div key={i} className="contents">
            <p className="truncate">{item.productName}</p>
            <p className="text-right">{item.quantity}</p>
            <p className="text-right">{item.price.toLocaleString()}</p>
            <p className="text-right">{item.total.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-foreground/30 my-2" />

      <div className="space-y-0.5">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>Le {sale.total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>Le {sale.paid.toLocaleString()}</span>
        </div>
        {sale.balance > 0 && (
          <div className="flex justify-between font-medium">
            <span>Balance:</span>
            <span>Le {sale.balance.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Payment:</span>
          <span>{sale.payment_method.toUpperCase()}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-foreground/30 my-2" />

      <div className="text-center">
        <p>Date: {format(saleDate, 'dd MMM yyyy')}</p>
        <p>Time: {format(saleDate, 'HH:mm')}</p>
        <p className="mt-2 italic">{shop.footerMessage}</p>
      </div>
    </div>
  );
}
