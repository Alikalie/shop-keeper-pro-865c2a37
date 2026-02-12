import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, UserCircle, Loader2, Trash2, Mail, Lock, User } from 'lucide-react';

interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  role: string;
  email?: string;
  created_at: string;
}

interface Sale {
  sold_by: string;
  total: number;
}

export default function StaffManagement() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  const fetchData = async () => {
    if (!user) return;

    // Get staff via edge function
    const { data, error } = await supabase.functions.invoke('manage-admin', {
      body: { action: 'list_staff' },
    });

    if (!error && data?.staff) {
      setStaff(data.staff);
    }

    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: salesData } = await supabase
      .from('sales')
      .select('sold_by, total')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());

    setTodaySales(salesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { 
      toast.error('Fill all required fields'); 
      return; 
    }

    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    
    const { data, error } = await supabase.functions.invoke('manage-admin', {
      body: { 
        action: 'create_staff',
        staffName: form.name,
        staffEmail: form.email,
        staffPassword: form.password,
        staffRole: form.role,
      },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Failed to add staff');
      setSaving(false);
      return;
    }

    toast.success(`Staff "${form.name}" added! They can login with: ${form.email}`);
    setDialogOpen(false);
    setForm({ name: '', email: '', password: '', role: 'staff' });
    setSaving(false);
    await fetchData();
  };

  const handleDelete = async (staffUserId: string, staffName: string) => {
    if (!confirm(`Remove ${staffName} from your team?`)) return;

    const { data, error } = await supabase.functions.invoke('manage-admin', {
      body: { action: 'delete_staff', staffUserId },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Failed to remove staff');
      return;
    }

    toast.success('Staff removed');
    await fetchData();
  };

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
      <div className="animate-fade-in space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Staff Management</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus size={16} className="mr-1" /> Add Staff</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pl-10" placeholder="Staff name" />
                  </div>
                </div>
                <div>
                  <Label>Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="pl-10" placeholder="staff@example.com" />
                  </div>
                </div>
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="pl-10" placeholder="Min 6 characters" />
                  </div>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Sales Staff</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Add Staff
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Staff can log in immediately with the email & password you set here. No email verification needed.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {staff.map(p => {
            const staffTotal = todaySales
              .filter(s => s.sold_by === p.id)
              .reduce((sum, s) => sum + Number(s.total), 0);
            return (
              <div key={p.id} className="rounded-xl border bg-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    <UserCircle size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.name}</p>
                      <Badge variant="outline" className="text-xs">{p.role}</Badge>
                    </div>
                    {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
                    <p className="text-xs text-muted-foreground">Today: Le {staffTotal.toLocaleString()}</p>
                  </div>
                </div>
                {p.user_id !== user?.id && (
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p.user_id, p.name)}>
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            );
          })}
          
          {staff.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle size={40} className="mx-auto mb-2 opacity-50" />
              <p>No staff members yet</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
