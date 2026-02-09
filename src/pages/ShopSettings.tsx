import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Settings, Loader2 } from 'lucide-react';

interface ShopSettingsData {
  id: string;
  name: string;
  address: string;
  phone: string;
  footer_message: string;
}

export default function ShopSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShopSettingsData | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setForm({
          id: data.id,
          name: data.name || 'My Shop',
          address: data.address || '',
          phone: data.phone || '',
          footer_message: data.footer_message || 'Thank you for your patronage!',
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!form?.name) { toast.error('Shop name is required'); return; }
    
    setSaving(true);
    const { error } = await supabase
      .from('shop_settings')
      .update({
        name: form.name,
        address: form.address,
        phone: form.phone,
        footer_message: form.footer_message,
      })
      .eq('id', form.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  };

  if (loading || !form) {
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
      <div className="animate-fade-in max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <Settings size={22} className="text-accent" />
          <h1 className="text-2xl font-bold">Shop Settings</h1>
        </div>
        <div className="bg-card rounded-xl border p-5 space-y-4">
          <div><Label>Shop Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><Label>Receipt Footer Message</Label><Textarea value={form.footer_message} onChange={e => setForm({...form, footer_message: e.target.value})} rows={2} /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
}
