import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

import {
  LayoutDashboard, Package, PlusCircle, ShoppingCart, Users,
  CreditCard, BarChart3, Settings, LogOut, Menu, X, UserCircle, Loader2, Shield, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps { children: ReactNode; }

interface Profile {
  id: string;
  name: string;
  role: 'owner' | 'staff';
}

interface ShopSettings {
  name: string;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, ownerOnly: false, adminOnly: false },
  { path: '/products', label: 'Products', icon: Package, ownerOnly: false, adminOnly: false },
  { path: '/add-stock', label: 'Add Stock', icon: PlusCircle, ownerOnly: true, adminOnly: false },
  { path: '/pos', label: 'Sell (POS)', icon: ShoppingCart, ownerOnly: false, adminOnly: false },
  { path: '/sales-history', label: 'Sales History', icon: Receipt, ownerOnly: false, adminOnly: false },
  { path: '/customers', label: 'Customers', icon: Users, ownerOnly: false, adminOnly: false },
  { path: '/loans', label: 'Loans / Credit', icon: CreditCard, ownerOnly: false, adminOnly: false },
  { path: '/reports', label: 'Daily Reports', icon: BarChart3, ownerOnly: true, adminOnly: false },
  { path: '/staff', label: 'Staff', icon: UserCircle, ownerOnly: true, adminOnly: false },
  { path: '/settings', label: 'Shop Settings', icon: Settings, ownerOnly: true, adminOnly: false },
  { path: '/admin-cms', label: 'Admin CMS', icon: Shield, ownerOnly: false, adminOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shop, setShop] = useState<ShopSettings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: shopData } = await supabase
        .from('shop_settings')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (shopData) {
        setShop(shopData);
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();
      setIsSuperAdmin(!!roleData);

      setLoading(false);
    };

    fetchData();
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const filtered = navItems.filter(item => {
    if (item.adminOnly) return isSuperAdmin;
    if (item.ownerOnly) return profile?.role === 'owner';
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            {shop?.name?.charAt(0) || 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate text-sidebar-accent-foreground">{shop?.name || 'My Shop'}</h2>
            <p className="text-xs text-sidebar-muted truncate">{profile.role === 'owner' ? 'Owner' : 'Sales Staff'}</p>
          </div>
          <button className="md:hidden text-sidebar-muted hover:text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {filtered.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-destructive transition-colors"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b px-4 py-3 md:px-6 bg-card no-print">
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-xs">
              {profile.name.charAt(0)}
            </div>
            <span className="hidden sm:inline font-medium">{profile.name}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
