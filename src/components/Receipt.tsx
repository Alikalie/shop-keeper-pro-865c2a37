import { getShop } from '@/lib/store';
import { Sale } from '@/lib/types';
import { format } from 'date-fns';

interface ReceiptProps { sale: Sale; }

export default function Receipt({ sale }: ReceiptProps) {
  const shop = getShop();
  const saleDate = new Date(sale.timestamp);

  return (
    <div className="receipt-print bg-card p-4 rounded-lg border font-mono text-xs leading-relaxed">
      <div className="text-center mb-3">
        <p className="font-bold text-sm">{shop.name}</p>
        <p>{shop.address}</p>
        <p>{shop.phone}</p>
      </div>

      <p>Receipt ID: {sale.receiptId}</p>
      <p>Customer: {sale.customerName}</p>
      <p>Sold by: {sale.soldByName}</p>

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
          <span>{sale.total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>{sale.paid.toLocaleString()}</span>
        </div>
        {sale.balance > 0 && (
          <div className="flex justify-between font-medium">
            <span>Balance:</span>
            <span>{sale.balance.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Payment:</span>
          <span>{sale.paymentMethod.toUpperCase()}</span>
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
