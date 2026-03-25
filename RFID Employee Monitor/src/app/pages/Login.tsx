import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card } from '@/app/components/ui/card';
import { MetalinkLogo } from '@/app/components/MetalinkLogo';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple mock authentication
    if (username && password) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#2E3192] via-[#2834A0] to-[#0099DD] p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.2) 0%, transparent 42%), radial-gradient(circle at 85% 70%, rgba(0,153,221,0.35) 0%, transparent 45%)',
        }}
      />
      <Card className="relative w-full max-w-md border border-white/60 bg-white/95 p-8 shadow-2xl shadow-[#2E3192]/25 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="mb-6 rounded-2xl border border-[#2E3192]/8 bg-gradient-to-b from-white to-[#F7F9FC] px-10 py-6 shadow-inner">
            <MetalinkLogo className="w-full h-auto" />
          </div>
          <h1 className="mb-2 bg-gradient-to-r from-[#2E3192] to-[#0099DD] bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
            RFID Monitoring System
          </h1>
          <p className="text-muted-foreground">Employee attendance & tracking</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#0099DD] font-semibold shadow-md shadow-[#0099DD]/30 transition-all hover:bg-[#0088CC] hover:shadow-lg hover:shadow-[#0099DD]/35"
          >
            Login
          </Button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Authorized personnel only
        </p>
      </Card>
    </div>
  );
}