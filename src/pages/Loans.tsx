import { useState } from 'react';
import Layout from '@/components/Layout';
import { getLoans, addLoanPayment, getCurrentUser } from '@/lib/store';
import { Loan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard } from 'lucide-react';

export default function Loans() {
  const [loans, setLoans] = useState(getLoans());
  const user = getCurrentUser();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  const handlePayment = () => {
    if (!selectedLoan || !paymentAmount || Number(paymentAmount) <= 0) return;
    const amount = Math.min(Number(paymentAmount), selectedLoan.balance);
    addLoanPayment(selectedLoan.id, {
      id: crypto.randomUUID(), amount, date: new Date().toISOString(),
      receivedBy: user?.name || '',
    });
    setLoans(getLoans());
    setSelectedLoan(null);
    setPaymentAmount('');
    toast.success(`Payment of ${amount.toLocaleString()} recorded`);
  };

  const statusColor = (status: string) => {
    if (status === 'paid') return 'bg-success/10 text-success border-success/30';
    if (status === 'part-paid') return 'bg-warning/10 text-warning border-warning/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  return (
    <Layout>
      <div className="animate-fade-in space-y-4">
        <h1 className="text-2xl font-bold">Loans / Credit</h1>

        {loans.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
            <p>No loans yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {loans.map(loan => (
              <button key={loan.id} onClick={() => { setSelectedLoan(loan); setPaymentAmount(''); }}
                className="w-full text-left rounded-xl border bg-card p-3 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loan.customerName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(loan.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <Badge variant="outline" className={statusColor(loan.status)}>{loan.status}</Badge>
                    <p className="font-semibold">{loan.balance.toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <Dialog open={!!selectedLoan} onOpenChange={(o) => !o && setSelectedLoan(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Loan Details</DialogTitle></DialogHeader>
            {selectedLoan && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{selectedLoan.customerName}</span></div>
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">{selectedLoan.totalAmount.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Paid:</span> <span className="font-medium">{selectedLoan.paidAmount.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Balance:</span> <span className="font-bold text-destructive">{selectedLoan.balance.toLocaleString()}</span></div>
                </div>

                {selectedLoan.payments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Payments</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedLoan.payments.map(p => (
                        <div key={p.id} className="flex justify-between text-xs bg-secondary/50 rounded p-2">
                          <span>{new Date(p.date).toLocaleDateString()}</span>
                          <span className="font-medium text-success">{p.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLoan.status !== 'paid' && (
                  <div className="border-t pt-3 space-y-2">
                    <Label>Record Payment</Label>
                    <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={`Max: ${selectedLoan.balance}`} />
                    <Button onClick={handlePayment} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Record Payment</Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
