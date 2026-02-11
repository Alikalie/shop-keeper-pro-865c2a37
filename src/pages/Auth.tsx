import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart, ArrowLeft, Mail, Lock, User, Loader2, Building2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password';
type AccountType = 'personal' | 'organization';

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

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/dashboard');
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate('/dashboard');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) newErrors.email = e.errors[0].message;
    }

    if (mode !== 'forgot-password') {
      try { passwordSchema.parse(password); } catch (e) {
        if (e instanceof z.ZodError) newErrors.password = e.errors[0].message;
      }
    }

    if (mode === 'signup') {
      try { nameSchema.parse(name); } catch (e) {
        if (e instanceof z.ZodError) newErrors.name = e.errors[0].message;
      }
      if (!businessName.trim()) newErrors.businessName = 'Business/Shop name is required';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.includes('Invalid login')) toast.error('Invalid email or password');
      else if (error.message.includes('Email not confirmed')) toast.error('Please confirm your email before logging in');
      else toast.error(error.message);
      return;
    }

    toast.success('Welcome back!');
    navigate('/dashboard');
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    setLoading(true);
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name, account_type: accountType, business_name: businessName }
      }
    });
    
    if (error) {
      setLoading(false);
      if (error.message.includes('already registered')) toast.error('An account with this email already exists');
      else toast.error(error.message);
      return;
    }

    // Create organization record after signup
    if (signUpData.user) {
      const maxStaff = accountType === 'personal' ? 3 : 999;
      
      const { data: org } = await supabase.from('organizations').insert({
        name: businessName,
        account_type: accountType,
        owner_id: signUpData.user.id,
        max_staff: maxStaff,
      }).select('id').single();

      if (org) {
        // Add owner as org member
        await supabase.from('org_members').insert({
          org_id: org.id,
          user_id: signUpData.user.id,
          role: 'owner',
        });

        // Update profile with org_id and account_type
        await supabase.from('profiles')
          .update({ org_id: org.id, account_type: accountType })
          .eq('user_id', signUpData.user.id);
        
        // Update shop name
        await supabase.from('shop_settings')
          .update({ name: businessName })
          .eq('user_id', signUpData.user.id);
      }
    }

    setLoading(false);
    toast.success('Check your email to confirm your account!');
    setMode('login');
  };

  const handleForgotPassword = async () => {
    try { emailSchema.parse(email); } catch (e) {
      if (e instanceof z.ZodError) { setErrors({ email: e.errors[0].message }); return; }
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Password reset link sent to your email!');
    setMode('login');
  };

  const handleResetPassword = async () => {
    try {
      passwordSchema.parse(password);
      if (password !== confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match' }); return; }
    } catch (e) {
      if (e instanceof z.ZodError) { setErrors({ password: e.errors[0].message }); return; }
    }
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
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
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
                {/* Account Type Selection */}
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

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} className="pl-10" autoFocus />
                  </div>
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessName">{accountType === 'organization' ? 'Organization Name' : 'Shop Name'}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="businessName" placeholder={accountType === 'organization' ? 'Acme Corp' : 'My Shop'} value={businessName} onChange={e => setBusinessName(e.target.value)} className="pl-10" />
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
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" autoFocus={mode !== 'signup'} />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
            )}

            {mode !== 'forgot-password' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
            )}

            {(mode === 'signup' || mode === 'reset-password') && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" />
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

      {/* Right side - Decorative */}
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
