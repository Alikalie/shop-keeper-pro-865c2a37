import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { UserCircle, Loader2, Mail, Shield } from 'lucide-react';

interface ProfileData {
  id: string;
  name: string;
  role: string;
  account_type: string;
  created_at: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role, account_type, created_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setProfile(data);
        setName(data.name);
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (org) setOrgName(org.name);

      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      setProfile(prev => prev ? { ...prev, name: name.trim() } : prev);
    }
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
      <div className="animate-fade-in max-w-lg space-y-6">
        <div className="flex items-center gap-2">
          <UserCircle size={22} className="text-accent" />
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-2xl font-bold">
              {profile?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile?.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield size={14} />
                <span className="capitalize">{profile?.role}</span>
                <span>•</span>
                <span className="capitalize">{profile?.account_type}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label>Email</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-sm">
                <Mail size={14} className="text-muted-foreground" />
                <span>{user?.email}</span>
              </div>
            </div>
            {orgName && (
              <div>
                <Label>Organization</Label>
                <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm">{orgName}</div>
              </div>
            )}
            <div>
              <Label>Member Since</Label>
              <div className="px-3 py-2 rounded-md border bg-muted/50 text-sm">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
