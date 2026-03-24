import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Lock, Loader2, Eye, EyeOff, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const isLockedOut = () => {
    if (!lockoutUntil) return false;
    if (Date.now() < lockoutUntil) return true;
    setLockoutUntil(null);
    setAttempts(0);
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut()) {
      const seconds = Math.ceil((lockoutUntil! - Date.now()) / 1000);
      toast.error(`Too many attempts. Try again in ${seconds}s.`);
      return;
    }
    if (!email.trim() || !password) {
      toast.error('Enter your email and password');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase().replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    setLoading(false);

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockoutUntil(Date.now() + 60000);
        toast.error('Too many failed attempts. Locked for 60 seconds.');
        return;
      }
      toast.error(`Invalid credentials. ${5 - newAttempts} attempts remaining.`);
      return;
    }

    // Verify this user is actually staff (has org_id and role=staff)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!profile?.org_id || profile.role === 'owner') {
      // Not a staff member - redirect to regular dashboard
      toast.success('Welcome back!');
      navigate('/dashboard');
      return;
    }

    setAttempts(0);
    toast.success('Welcome! You are logged in as staff.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Staff Login</h1>
              <p className="text-sm text-muted-foreground">
                Use the credentials your shop owner gave you
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  autoFocus
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Sign In as Staff
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Are you a shop owner?{' '}
              <button onClick={() => navigate('/auth')} className="text-primary font-medium hover:underline">
                Owner Login
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-secondary to-secondary/80 items-center justify-center p-8">
        <div className="max-w-md text-secondary-foreground">
          <h2 className="text-3xl font-bold mb-4">Staff Access</h2>
          <p className="text-secondary-foreground/80 text-lg mb-8">
            Your shop owner created your account. Use the email and password they provided to access the shop system.
          </p>
          <div className="space-y-4">
            {['Sell products at the POS', 'View shop inventory', 'Record customer transactions'].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary-foreground/20 flex items-center justify-center">
                  <span className="text-xs font-bold">{idx + 1}</span>
                </div>
                <span className="text-lg">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
