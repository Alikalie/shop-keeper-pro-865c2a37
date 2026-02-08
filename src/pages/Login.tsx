import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShoppingCart } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !pin.trim()) {
      setError('Please enter username and PIN');
      return;
    }
    const user = login(username.trim(), pin.trim());
    if (user) {
      navigate('/dashboard');
    } else {
      setError('Invalid username or PIN');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
            <ShoppingCart size={28} />
          </div>
          <h1 className="text-2xl font-bold">DESWIFE</h1>
          <p className="text-muted-foreground text-sm mt-1">Inventory & Sales Management</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-card rounded-xl border p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              maxLength={8}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            Log In
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Default: owner / 1234
          </p>
        </form>
      </div>
    </div>
  );
}
