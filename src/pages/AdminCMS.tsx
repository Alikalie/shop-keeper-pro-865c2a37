import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Shield, Loader2, Save, Upload, Trash2, Plus, Eye, EyeOff,
  UserPlus, ArrowLeft, Video, Type, Image as ImageIcon
} from 'lucide-react';

interface CMSSection {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  video_url: string | null;
  is_visible: boolean;
  sort_order: number;
}

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
}

export default function AdminCMS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<CMSSection[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) return;

    // Check if user is super_admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (!roleData) {
      // Check if any super admin exists - if not, offer bootstrap
      const { count } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true });

      if (count === 0) {
        // Bootstrap: make current user super admin
        const { data, error } = await supabase.functions.invoke('manage-admin', {
          body: { action: 'bootstrap' },
        });
        if (error) {
          toast.error('Failed to bootstrap admin');
          setLoading(false);
          return;
        }
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
    } else {
      setIsAdmin(true);
    }

    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    const { data: cmsData } = await supabase
      .from('cms_content')
      .select('*')
      .order('sort_order');

    setSections((cmsData as CMSSection[]) || []);

    // Load admins
    const { data: adminData } = await supabase.functions.invoke('manage-admin', {
      body: { action: 'list_admins' },
    });
    if (adminData?.admins) {
      setAdmins(adminData.admins);
    }
  };

  const updateSection = async (id: string, updates: Partial<CMSSection>) => {
    setSaving(id);
    const { error } = await supabase
      .from('cms_content')
      .update({ ...updates, updated_by: user?.id })
      .eq('id', id);

    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('Saved');
      setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
    setSaving(null);
  };

  const handleFileUpload = async (sectionId: string, file: File, type: 'image' | 'video') => {
    setUploading(sectionId);
    const ext = file.name.split('.').pop();
    const path = `${type}s/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('cms-media')
      .upload(path, file);

    if (uploadError) {
      toast.error(`Upload failed: ${uploadError.message}`);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('cms-media').getPublicUrl(path);
    const url = urlData.publicUrl;

    const updateField = type === 'video' ? { video_url: url } : { image_url: url };
    await updateSection(sectionId, updateField);
    setUploading(null);
  };

  const addAdmin = async () => {
    if (!newAdminEmail) return;
    setAddingAdmin(true);

    const { data, error } = await supabase.functions.invoke('manage-admin', {
      body: { action: 'add_admin', email: newAdminEmail },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Failed to add admin');
    } else {
      toast.success('Super admin added');
      setNewAdminEmail('');
      setAdminDialogOpen(false);
      await loadData();
    }
    setAddingAdmin(false);
  };

  const removeAdmin = async (email: string) => {
    const { data, error } = await supabase.functions.invoke('manage-admin', {
      body: { action: 'remove_admin', email },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Failed to remove admin');
    } else {
      toast.success('Admin removed');
      await loadData();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">You need super admin privileges to access this page.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const sectionLabels: Record<string, string> = {
    hero: '🏠 Hero Section',
    metrics: '📊 Live Metrics',
    demo: '🛒 Interactive Demo',
    offline: '📡 Offline Section',
    features: '⭐ Features',
    cta: '🎯 Call to Action',
    footer: '🔻 Footer',
    demo_video: '🎬 Demo Video',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-lg">Admin CMS</h1>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">Super Admin</Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="content">Landing Content</TabsTrigger>
            <TabsTrigger value="admins">Super Admins</TabsTrigger>
          </TabsList>

          {/* CMS Content Tab */}
          <TabsContent value="content" className="space-y-4">
            {sections.map(section => (
              <div key={section.id} className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">
                    {sectionLabels[section.section_key] || section.section_key}
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {section.is_visible ? <Eye className="w-4 h-4 text-accent" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      <Switch
                        checked={section.is_visible}
                        onCheckedChange={v => updateSection(section.id, { is_visible: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  {section.section_key !== 'demo_video' && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Type className="w-3 h-3" /> Title</Label>
                        <Input
                          value={section.title || ''}
                          onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                          onBlur={() => updateSection(section.id, { title: section.title })}
                        />
                      </div>
                      {section.subtitle !== undefined && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Subtitle</Label>
                          <Input
                            value={section.subtitle || ''}
                            onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, subtitle: e.target.value } : s))}
                            onBlur={() => updateSection(section.id, { subtitle: section.subtitle })}
                          />
                        </div>
                      )}
                      {section.body !== undefined && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Body Text</Label>
                          <Textarea
                            value={section.body || ''}
                            onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, body: e.target.value } : s))}
                            onBlur={() => updateSection(section.id, { body: section.body })}
                            rows={3}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Image Upload */}
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Image</Label>
                    {section.image_url && (
                      <div className="mb-2 relative inline-block">
                        <img src={section.image_url} alt="" className="h-24 rounded-lg object-cover" />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => updateSection(section.id, { image_url: null })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(section.id, f, 'image');
                      }}
                      disabled={uploading === section.id}
                    />
                  </div>

                  {/* Video Upload (for demo_video section or any section) */}
                  {(section.section_key === 'demo_video' || section.section_key === 'hero') && (
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Video className="w-3 h-3" /> Video</Label>
                      {section.video_url && (
                        <div className="mb-2">
                          <video src={section.video_url} controls className="h-32 rounded-lg" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="mt-1"
                            onClick={() => updateSection(section.id, { video_url: null })}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Remove Video
                          </Button>
                        </div>
                      )}
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(section.id, f, 'video');
                        }}
                        disabled={uploading === section.id}
                      />
                      {uploading === section.id && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {saving === section.id && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                  </p>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Super Admins Tab */}
          <TabsContent value="admins" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Super Admins</h2>
              <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" /> Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Super Admin</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter the email of a registered user to grant them super admin access.
                    </p>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                      />
                    </div>
                    <Button onClick={addAdmin} disabled={addingAdmin} className="w-full">
                      {addingAdmin && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      Grant Super Admin
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.user_id} className="rounded-xl border bg-card p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Since {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary">Super Admin</Badge>
                    {admin.user_id !== user?.id && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeAdmin(admin.email)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {admins.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">No admins found</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
