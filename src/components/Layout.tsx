import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logout, getShop } from '@/lib/store';
import { User } from '@/lib/types';
import {
  LayoutDashboard, Package, PlusCircle, ShoppingCart, Users,
  CreditCard, BarChart3, Settings, LogOut, Menu, X, UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps { children: ReactNode; }

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, ownerOnly: false },
  { path: '/products', label: 'Products', icon: Package, ownerOnly: false },
  { path: '/add-stock', label: 'Add Stock', icon: PlusCircle, ownerOnly: true },
  { path: '/pos', label: 'Sell (POS)', icon: ShoppingCart, ownerOnly: false },
  { path: '/customers', label: 'Customers', icon: Users, ownerOnly: false },
  { path: '/loans', label: 'Loans / Credit', icon: CreditCard, ownerOnly: false },
  { path: '/reports', label: 'Daily Reports', icon: BarChart3, ownerOnly: true },
  { path: '/staff', label: 'Staff', icon: UserCircle, ownerOnly: true },
  { path: '/settings', label: 'Shop Settings', icon: Settings, ownerOnly: true },
];

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const shop = getShop();

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { navigate('/login'); return; }
    setUser(u);
  }, [navigate]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const filtered = navItems.filter(item => !item.ownerOnly || user?.role === 'owner');

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            {shop.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate text-sidebar-accent-foreground">{shop.name}</h2>
            <p className="text-xs text-sidebar-muted truncate">{user.role === 'owner' ? 'Owner' : 'Sales Staff'}</p>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b px-4 py-3 md:px-6 bg-card no-print">
          <button className="md:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm">
            <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-xs">
              {user.name.charAt(0)}
            </div>
            <span className="hidden sm:inline font-medium">{user.name}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
