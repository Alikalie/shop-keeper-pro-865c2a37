import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, ArrowLeft, Mail, Lock, User, Loader2, Building2, UserCircle, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please enter a valid email').max(255, 'Email too long');
const nameSchema = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long');

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';
type AccountType = 'personal' | 'organization';

const passwordChecks = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = passwordChecks.filter(c => c.test(password)).length;
  const strength = passed <= 2 ? 'Weak' : passed <= 4 ? 'Medium' : 'Strong';
  const color = passed <= 2 ? 'bg-destructive' : passed <= 4 ? 'bg-warning' : 'bg-accent';

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= passed ? color : 'bg-muted'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${passed <= 2 ? 'text-destructive' : passed <= 4 ? 'text-warning' : 'text-accent'}`}>
        {strength} password
      </p>
      <div className="space-y-1">
        {passwordChecks.map(c => (
          <div key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.test(password) ? (
              <CheckCircle2 size={12} className="text-accent" />
            ) : (
              <XCircle size={12} className="text-muted-foreground" />
            )}
            <span className={c.test(password) ? 'text-accent' : 'text-muted-foreground'}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>((searchParams.get('mode') as AuthMode) || 'login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Rate limiting state
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  const redirectByRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'super_admin')
      .maybeSingle();
    if (roleData) {
      navigate('/admin-cms');
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) redirectByRole(session.user.id);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectByRole(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode !== 'reset-password') {
      try { emailSchema.parse(email); } catch (e) {
        if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
      }
    }

    if (mode !== 'forgot-password' && mode !== 'login') {
      if (password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else {
        const passed = passwordChecks.filter(c => c.test(password)).length;
        if (passed < 3) newErrors.password = 'Password is too weak. Add uppercase, numbers, or special characters.';
      }
    }

    if (mode === 'login' && password.length < 1) {
      newErrors.password = 'Password is required';
    }

    if (mode === 'signup') {
      try { nameSchema.parse(name); } catch (e) {
        if (e instanceof z.ZodError) newErrors.name = e.errors[0].message;
      }
      if (!businessName.trim()) newErrors.businessName = 'Business/Shop name is required';
      if (businessName.trim().length > 100) newErrors.businessName = 'Business name too long';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    if (mode === 'reset-password') {
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Sanitize input - strip HTML tags and dangerous characters
  const sanitize = (input: string) => input.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim();

  const isLockedOut = () => {
    if (!lockoutUntil) return false;
    if (Date.now() < lockoutUntil) return true;
    setLockoutUntil(null);
    setLoginAttempts(0);
    return false;
  };

  const handleLogin = async () => {
    if (isLockedOut()) {
      const seconds = Math.ceil((lockoutUntil! - Date.now()) / 1000);
      toast.error(`Too many failed attempts. Try again in ${seconds} seconds.`);
      return;
    }
    if (!validateForm()) return;
    setLoading(true);

    const cleanEmail = sanitize(email);

    // If this is a super admin email, bootstrap the admin account first
    const ADMIN_EMAILS = ['alikaliefofanahh@gmail.com', 'spectacularservice@gmail.com'];
    if (ADMIN_EMAILS.some(ae => ae.toLowerCase() === cleanEmail.toLowerCase())) {
      try {
        await supabase.functions.invoke('manage-admin', {
          body: { action: 'admin_login', username: cleanEmail, password },
        });
      } catch {
        // Ignore bootstrap errors
      }
    }

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);

    if (error) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        setLockoutUntil(Date.now() + 60000);
        toast.error('Too many failed attempts. Account locked for 60 seconds.');
        return;
      }
      if (error.message.includes('Invalid login')) toast.error(`Invalid email or password. ${5 - newAttempts} attempts remaining.`);
      else if (error.message.includes('Email not confirmed')) toast.error('Please verify your email before logging in. Check your inbox.');
      else toast.error('Login failed. Please try again.');
      return;
    }

    setLoginAttempts(0);
    toast.success('Welcome back!');
    if (signInData.user) {
      await redirectByRole(signInData.user.id);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    setLoading(true);
    const redirectUrl = `${window.location.origin}/auth?mode=login`;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: sanitize(email),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name: sanitize(name), account_type: accountType, business_name: sanitize(businessName) }
      }
    });
    
    if (error) {
      setLoading(false);
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        toast.error('An account with this email already exists. Try signing in instead.');
        setErrors({ email: 'This email is already registered' });
      } else if (error.message.includes('password')) {
        toast.error('Password is too weak. Please choose a stronger password.');
      } else {
        toast.error(error.message);
      }
      return;
    }

    // Check if user already existed (Supabase returns a user with identities=[] for existing emails)
    if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
      setLoading(false);
      toast.error('An account with this email already exists. Try signing in instead.');
      setErrors({ email: 'This email is already registered' });
      return;
    }

    // Create organization record after signup
    if (signUpData.user) {
      const maxStaff = accountType === 'personal' ? 3 : 999;
      
      const { data: org } = await supabase.from('organizations').insert({
        name: businessName.trim(),
        account_type: accountType,
        owner_id: signUpData.user.id,
        max_staff: maxStaff,
      }).select('id').single();

      if (org) {
        await supabase.from('org_members').insert({
          org_id: org.id,
          user_id: signUpData.user.id,
          role: 'owner',
        });

        await supabase.from('profiles')
          .update({ org_id: org.id, account_type: accountType })
          .eq('user_id', signUpData.user.id);
        
        await supabase.from('shop_settings')
          .update({ name: businessName.trim() })
          .eq('user_id', signUpData.user.id);
      }
    }

    setLoading(false);
    toast.success('Account created successfully!');
    // Auto-confirm is enabled, so user is already signed in
    if (signUpData.session) {
      await redirectByRole(signUpData.user!.id);
    } else {
      setMode('login');
    }
  };

  const handleForgotPassword = async () => {
    const newErrors: Record<string, string> = {};
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) { newErrors.email = e.errors[0].message; setErrors(newErrors); return; }
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password reset link sent to your email!');
    setMode('login');
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password updated successfully!');
    navigate('/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    switch (mode) {
      case 'login': handleLogin(); break;
      case 'signup': handleSignup(); break;
      case 'forgot-password': handleForgotPassword(); break;
      case 'reset-password': handleResetPassword(); break;
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Your Shop';
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'Set New Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return 'Sign in to manage your shop';
      case 'signup': return 'Start managing your inventory today';
      case 'forgot-password': return "Enter your email and we'll send you a reset link";
      case 'reset-password': return 'Enter your new password below';
    }
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
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{getTitle()}</h1>
              <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccountType('personal')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        accountType === 'personal'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <UserCircle className={`w-8 h-8 ${accountType === 'personal' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className="font-medium text-sm">Personal</p>
                        <p className="text-xs text-muted-foreground">Up to 3 staff</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('organization')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        accountType === 'organization'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Building2 className={`w-8 h-8 ${accountType === 'organization' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center">
                        <p className="font-medium text-sm">Organization</p>
                        <p className="text-xs text-muted-foreground">Unlimited staff</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} className="pl-10" autoFocus maxLength={100} />
                  </div>
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">{accountType === 'organization' ? 'Organization Name' : 'Shop Name'}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="businessName" placeholder={accountType === 'organization' ? 'Acme Corp' : 'My Shop'} value={businessName} onChange={e => setBusinessName(e.target.value)} className="pl-10" maxLength={100} />
                  </div>
                  {errors.businessName && <p className="text-sm text-destructive">{errors.businessName}</p>}
                </div>
              </>
            )}

            {mode !== 'reset-password' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: '' })); }} className="pl-10" autoFocus={mode !== 'signup'} maxLength={255} />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            )}

            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                {(mode === 'signup' || mode === 'reset-password') && <PasswordStrength password={password} />}
              </div>
            )}

            {(mode === 'signup' || mode === 'reset-password') && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
            )}

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot-password' && 'Send Reset Link'}
              {mode === 'reset-password' && 'Update Password'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('forgot-password')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Forgot your password?
                </button>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <button onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">Sign up</button>
                </p>
                <p className="text-sm text-muted-foreground">
                  Are you a staff member?{' '}
                  <button onClick={() => navigate('/staff-login')} className="text-primary font-medium hover:underline">Staff Login</button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Sign in</button>
              </p>
            )}
            {mode === 'forgot-password' && (
              <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline">Back to sign in</button>
            )}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-primary/80 items-center justify-center p-8">
        <div className="max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold mb-4">Your shop, under control.</h2>
          <p className="text-primary-foreground/80 text-lg mb-8">
            Track inventory, manage sales, print receipts, and know exactly who owes you money. All in one simple app.
          </p>
          <div className="space-y-4">
            {['Sell fast. No mistakes.', 'Know who owes you money.', 'Even when internet fails.'].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
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
