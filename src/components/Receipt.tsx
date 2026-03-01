import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerId } from '@/hooks/useOwnerId';
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
  const { ownerId } = useOwnerId();
  const [shop, setShop] = useState({ name: 'My Shop', address: '', phone: '', footerMessage: 'Thank you for your patronage!' });
  
  useEffect(() => {
    const fetchShop = async () => {
      if (!ownerId) return;
      const { data } = await supabase
        .from('shop_settings')
        .select('name, address, phone, footer_message')
        .eq('user_id', ownerId)
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
  }, [ownerId]);

  const saleDate = new Date(sale.created_at);

  return (
    <div className="receipt-print border-2 border-foreground bg-card p-6 rounded-lg font-mono text-xs leading-relaxed"
         style={{ width: '210mm', minHeight: '148mm', maxWidth: '100%' }}>
      {/* A5 Landscape: 210mm x 148mm */}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-4 border-b-2 border-foreground pb-3">
          <p className="font-bold text-lg tracking-wide">{shop.name}</p>
          {shop.address && <p className="text-sm">{shop.address}</p>}
          {shop.phone && <p className="text-sm">Tel: {shop.phone}</p>}
        </div>

        {/* Receipt Info - two columns for landscape */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p><span className="font-semibold">Receipt:</span> {sale.receipt_id}</p>
            <p><span className="font-semibold">Customer:</span> {sale.customer_name}</p>
            <p><span className="font-semibold">Sold by:</span> {sale.sold_by_name}</p>
          </div>
          <div className="text-right">
            <p><span className="font-semibold">Date:</span> {format(saleDate, 'dd MMM yyyy')}</p>
            <p><span className="font-semibold">Time:</span> {format(saleDate, 'HH:mm')}</p>
            <p><span className="font-semibold">Payment:</span> {sale.payment_method.toUpperCase()}</p>
          </div>
        </div>

        <div className="border-t-2 border-dashed border-foreground/40 my-2" />

        {/* Items table */}
        <div className="flex-1">
          <div className="grid grid-cols-[2fr_auto_auto_auto] gap-x-4 text-sm">
            <p className="font-bold border-b border-foreground/30 pb-1">Item</p>
            <p className="font-bold text-right border-b border-foreground/30 pb-1">Qty</p>
            <p className="font-bold text-right border-b border-foreground/30 pb-1">Price</p>
            <p className="font-bold text-right border-b border-foreground/30 pb-1">Total</p>
            {sale.items.map((item, i) => (
              <div key={i} className="contents">
                <p className="truncate py-0.5">{item.productName}</p>
                <p className="text-right py-0.5">{item.quantity}</p>
                <p className="text-right py-0.5">{item.price.toLocaleString()}</p>
                <p className="text-right py-0.5">{item.total.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t-2 border-dashed border-foreground/40 my-2" />

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between font-bold text-base border-b border-foreground/30 pb-1">
              <span>TOTAL:</span>
              <span>Le {sale.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid:</span>
              <span>Le {sale.paid.toLocaleString()}</span>
            </div>
            {sale.balance > 0 && (
              <div className="flex justify-between font-semibold">
                <span>Balance:</span>
                <span>Le {sale.balance.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t-2 border-dashed border-foreground/40 my-2" />

        {/* Footer */}
        <div className="text-center mt-2">
          <p className="italic text-sm">{shop.footerMessage}</p>
        </div>
      </div>
    </div>
  );
}
