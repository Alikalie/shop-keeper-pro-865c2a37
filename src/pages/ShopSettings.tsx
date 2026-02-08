import { useState } from 'react';
import Layout from '@/components/Layout';
import { getShop, saveShop } from '@/lib/store';
import { ShopSettings as ShopSettingsType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

export default function ShopSettings() {
  const [form, setForm] = useState<ShopSettingsType>(getShop());

  const handleSave = () => {
    if (!form.name) { toast.error('Shop name is required'); return; }
    saveShop(form);
    toast.success('Settings saved');
  };

  return (
    <Layout>
      <div className="animate-fade-in max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={22} className="text-accent" />
          <h1 className="text-2xl font-bold">Shop Settings</h1>
        </div>
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div><Label>Shop Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><Label>Receipt Footer Message</Label><Textarea value={form.footerMessage} onChange={e => setForm({...form, footerMessage: e.target.value})} rows={2} /></div>
          <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Save Settings</Button>
        </div>
      </div>
    </Layout>
  );
}
