import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerId } from '@/hooks/useOwnerId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings, Loader2, AlertTriangle, Trash2, Upload, X } from 'lucide-react';

interface ShopSettingsData {
  id: string;
  name: string;
  address: string;
  phone: string;
  footer_message: string;
  logo_url: string;
}

export default function ShopSettings() {
  const { user } = useAuth();
  const { ownerId, loading: ownerLoading } = useOwnerId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ShopSettingsData | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!ownerId || !user) return;
      
      setIsOwner(ownerId === user.id);

      try {
        const { data } = await supabase
          .from('shop_settings')
          .select('*')
          .eq('user_id', ownerId)
          .maybeSingle();
        
        setForm({
          id: data?.id || '',
          name: data?.name || 'My Shop',
          address: data?.address || '',
          phone: data?.phone || '',
          footer_message: data?.footer_message || 'Thank you for your patronage!',
          logo_url: data?.logo_url || '',
        });
      } catch {
        setForm({
          id: '',
          name: 'My Shop',
          address: '',
          phone: '',
          footer_message: 'Thank you for your patronage!',
          logo_url: '',
        });
      }
      setLoading(false);
    };
    if (ownerId && user) fetchSettings();
  }, [ownerId, user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${ownerId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('shop-logos')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload logo');
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('shop-logos')
      .getPublicUrl(path);

    setForm(prev => prev ? { ...prev, logo_url: publicUrl } : prev);
    setUploading(false);
    toast.success('Logo uploaded');
  };

  const removeLogo = () => {
    setForm(prev => prev ? { ...prev, logo_url: '' } : prev);
  };

  const handleSave = async () => {
    if (!form?.name) { toast.error('Shop name is required'); return; }
    if (!ownerId) return;
    
    setSaving(true);
    const payload = {
      name: form.name,
      address: form.address,
      phone: form.phone,
      footer_message: form.footer_message,
      logo_url: form.logo_url || null,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from('shop_settings').update(payload).eq('id', form.id));
    } else {
      const res = await supabase.from('shop_settings').insert({ ...payload, user_id: ownerId }).select().single();
      error = res.error;
      if (res.data) setForm({ ...form, id: res.data.id });
    }

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved');
    }
    setSaving(false);
  };

  const handleResetInventory = async () => {
    if (resetConfirm !== 'DELETE ALL') {
      toast.error('Type "DELETE ALL" to confirm');
      return;
    }
    if (!ownerId) return;

    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-admin', {
        body: { action: 'reset_shop_data' },
      });

      if (error || data?.error) {
        toast.error(data?.error || 'Failed to reset data');
      } else {
        toast.success('All shop data has been deleted. Start fresh!');
        setShowResetDialog(false);
        setResetConfirm('');
      }
    } catch {
      toast.error('Failed to reset data');
    }
    setResetting(false);
  };

  if (loading || ownerLoading || !form) {
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
          {/* Logo Upload */}
          <div>
            <Label>Shop Logo (optional)</Label>
            <div className="mt-2 flex items-center gap-4">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} alt="Shop logo" className="w-20 h-20 rounded-lg object-contain border bg-background" />
                  <button
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground">
                  <Upload size={24} />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
                  {form.logo_url ? 'Change' : 'Upload'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Max 2MB, PNG/JPG</p>
              </div>
            </div>
          </div>

          <div><Label>Shop Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div><Label>Receipt Footer Message</Label><Textarea value={form.footer_message} onChange={e => setForm({...form, footer_message: e.target.value})} rows={2} /></div>
          <Button onClick={handleSave} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Settings
          </Button>
        </div>

        {isOwner && (
          <div className="mt-6 bg-card rounded-xl border border-destructive/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={18} />
              <h2 className="font-semibold">Danger Zone</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Delete all products, sales, loans, customers and stock entries to start a new inventory from scratch.
            </p>
            <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
              <Trash2 size={14} className="mr-1" /> Reset All Shop Data
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle size={18} /> Reset All Shop Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong>all products, sales history, loans, customers, and stock entries</strong>. This action cannot be undone.
            </p>
            <div>
              <Label>Type "DELETE ALL" to confirm</Label>
              <Input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="DELETE ALL" />
            </div>
            <Button variant="destructive" onClick={handleResetInventory} disabled={resetting || resetConfirm !== 'DELETE ALL'} className="w-full">
              {resetting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Permanently Delete Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
