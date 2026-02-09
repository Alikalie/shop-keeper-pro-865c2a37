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
import { Plus, UserCircle, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

interface Sale {
  sold_by: string;
  total: number;
}

export default function StaffManagement() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get all profiles (only owner can access this page)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at');

      // Filter to only show profiles from same account/shop
      // For now, we show the current user's profile
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setProfiles(currentProfile ? [currentProfile] : []);

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

    fetchData();
  }, [user]);

  const handleAdd = async () => {
    if (!form.name || !form.email || !form.password) { 
      toast.error('Fill all fields'); 
      return; 
    }

    setSaving(true);
    
    // For now, show info that staff management requires inviting users via email
    toast.info('Staff accounts require email verification. Send an invite email to your staff.');
    
    setDialogOpen(false);
    setForm({ name: '', email: '', password: '', role: 'staff' });
    setSaving(false);
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
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus size={16} className="mr-1" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Staff</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
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
                  Note: Staff will receive an email to confirm their account.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {profiles.map(p => {
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
                    <p className="text-xs text-muted-foreground">Today: Le {staffTotal.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {profiles.length === 0 && (
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
