import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerId } from '@/hooks/useOwnerId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';

interface LoanPayment {
  id: string;
  amount: number;
  created_at: string;
}

interface Loan {
  id: string;
  customer_id: string;
  customer_name: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
  created_at: string;
}

export default function Loans() {
  const { user } = useAuth();
  const { ownerId, loading: ownerLoading } = useOwnerId();
  const [profile, setProfile] = useState<{ id: string; name: string } | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLoans = async () => {
    if (!ownerId) return;
    const { data } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: false });
    setLoans(data || []);
    setLoading(false);
  };

  const fetchPayments = async (loanId: string) => {
    const { data } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });
    setPayments(data || []);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !ownerId) return;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileData) setProfile(profileData);
      await fetchLoans();
    };
    fetchData();
  }, [user, ownerId]);

  const handleSelectLoan = async (loan: Loan) => {
    setSelectedLoan(loan);
    setPaymentAmount('');
    await fetchPayments(loan.id);
  };

  const handlePayment = async () => {
    if (!selectedLoan || !paymentAmount || Number(paymentAmount) <= 0 || !profile) return;
    
    const amount = Math.min(Number(paymentAmount), Number(selectedLoan.balance));
    
    setSaving(true);
    try {
      await supabase.from('loan_payments').insert({
        loan_id: selectedLoan.id,
        amount,
        received_by: profile.id,
      });

      const newPaidAmount = Number(selectedLoan.paid_amount) + amount;
      const newBalance = Number(selectedLoan.total_amount) - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'paid' : 'part-paid';

      await supabase
        .from('loans')
        .update({ paid_amount: newPaidAmount, balance: newBalance, status: newStatus })
        .eq('id', selectedLoan.id);

      if (selectedLoan.customer_id) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('total_debt')
          .eq('id', selectedLoan.customer_id)
          .single();
        
        if (customerData) {
          await supabase
            .from('customers')
            .update({ total_debt: Math.max(0, Number(customerData.total_debt) - amount) })
            .eq('id', selectedLoan.customer_id);
        }
      }

      await fetchLoans();
      setSelectedLoan(null);
      setPaymentAmount('');
      toast.success(`Payment of Le ${amount.toLocaleString()} recorded`);
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === 'paid') return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
    if (status === 'part-paid') return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  if (loading || ownerLoading) {
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
              <button key={loan.id} onClick={() => handleSelectLoan(loan)}
                className="w-full text-left rounded-xl border bg-card p-3 hover:border-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loan.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(loan.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <Badge variant="outline" className={statusColor(loan.status)}>{loan.status}</Badge>
                    <p className="font-semibold">Le {Number(loan.balance).toLocaleString()}</p>
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
                  <div><span className="text-muted-foreground">Customer:</span> <span className="font-medium">{selectedLoan.customer_name}</span></div>
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-medium">Le {Number(selectedLoan.total_amount).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Paid:</span> <span className="font-medium">Le {Number(selectedLoan.paid_amount).toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Balance:</span> <span className="font-bold text-destructive">Le {Number(selectedLoan.balance).toLocaleString()}</span></div>
                </div>

                {payments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1">Payments</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {payments.map(p => (
                        <div key={p.id} className="flex justify-between text-xs bg-secondary/50 rounded p-2">
                          <span>{new Date(p.created_at).toLocaleDateString()}</span>
                          <span className="font-medium text-emerald-600">Le {Number(p.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLoan.status !== 'paid' && (
                  <div className="border-t pt-3 space-y-2">
                    <Label>Record Payment</Label>
                    <Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={`Max: ${Number(selectedLoan.balance).toLocaleString()}`} />
                    <Button onClick={handlePayment} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Record Payment
                    </Button>
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
