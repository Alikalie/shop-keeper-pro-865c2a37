import { useState } from 'react';
import Layout from '@/components/Layout';
import { getUsers, saveUsers, getCurrentUser } from '@/lib/store';
import { User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, UserCircle, Trash2 } from 'lucide-react';
import { getSales } from '@/lib/store';

export default function StaffManagement() {
  const [users, setUsers] = useState(getUsers());
  const currentUser = getCurrentUser();
  const sales = getSales();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', pin: '', role: 'staff' as 'owner' | 'staff' });

  const handleAdd = () => {
    if (!form.name || !form.username || !form.pin) { toast.error('Fill all fields'); return; }
    if (users.some(u => u.username.toLowerCase() === form.username.toLowerCase())) { toast.error('Username taken'); return; }
    const user: User = { id: crypto.randomUUID(), ...form, createdAt: new Date().toISOString() };
    const updated = [...users, user];
    saveUsers(updated);
    setUsers(updated);
    setDialogOpen(false);
    setForm({ name: '', username: '', pin: '', role: 'staff' });
    toast.success('Staff added');
  };

  const handleRemove = (id: string) => {
    if (id === currentUser?.id) { toast.error("Can't remove yourself"); return; }
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    setUsers(updated);
    toast.success('Staff removed');
  };

  const today = new Date().toISOString().split('T')[0];

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
                <div><Label>Username *</Label><Input value={form.username} onChange={e => setForm({...form, username: e.target.value})} /></div>
                <div><Label>PIN *</Label><Input value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} maxLength={8} /></div>
                <div>
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm({...form, role: v as 'owner' | 'staff'})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Sales Staff</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Add Staff</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {users.map(u => {
            const staffSales = sales.filter(s => s.soldBy === u.id && s.date === today);
            const staffTotal = staffSales.reduce((sum, s) => sum + s.total, 0);
            return (
              <div key={u.id} className="rounded-xl border bg-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center">
                    <UserCircle size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{u.name}</p>
                      <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">@{u.username} · Today: {staffTotal.toLocaleString()}</p>
                  </div>
                </div>
                {u.id !== currentUser?.id && (
                  <button onClick={() => handleRemove(u.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
