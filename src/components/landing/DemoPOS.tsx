import { useState } from 'react';
import { ShoppingCart, Plus, Minus, Receipt, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DemoProduct {
  id: string;
  name: string;
  price: number;
  emoji: string;
}

const demoProducts: DemoProduct[] = [
  { id: '1', name: 'Rice', price: 400, emoji: '🍚' },
  { id: '2', name: 'Sugar', price: 300, emoji: '🧂' },
  { id: '3', name: 'Oil', price: 500, emoji: '🫒' },
  { id: '4', name: 'Bread', price: 200, emoji: '🍞' },
];

interface CartItem extends DemoProduct {
  quantity: number;
}

export default function DemoPOS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  const addToCart = (product: DemoProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter(item => item.id !== productId);
    });
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowReceipt(true);
    setTimeout(() => {
      setShowReceipt(false);
      setCart([]);
    }, 3000);
  };

  return (
    <div className="bg-card rounded-2xl border shadow-xl overflow-hidden">
      <div className="p-4 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <span className="font-semibold">Try the POS (Demo)</span>
        </div>
      </div>

      {showReceipt ? (
        <div className="p-6 text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h4 className="font-semibold text-lg mb-2">Sale Complete!</h4>
          <p className="text-muted-foreground text-sm mb-4">Receipt printed • Stock updated</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
            <Receipt className="w-4 h-4" />
            <span className="text-sm font-mono">DEMO-{Date.now().toString().slice(-5)}</span>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {/* Products grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {demoProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{product.emoji}</span>
                <span className="text-xs font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">Le {product.price}</span>
              </button>
            ))}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-2 mb-4 p-3 bg-muted/30 rounded-xl">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{item.emoji}</span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      Le {item.price * item.quantity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total & Checkout */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl">
            <div>
              <span className="text-sm text-muted-foreground">Total</span>
              <div className="text-xl font-bold">Le {total.toLocaleString()}</div>
            </div>
            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className={cn(
                "gap-2",
                cart.length === 0 && "opacity-50"
              )}
            >
              <Receipt className="w-4 h-4" />
              Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
