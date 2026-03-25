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
    <div className="min-h-screen bg-gradient-to-br from-[#2E3192] to-[#0099DD] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl">
        <div className="text-center mb-8">
          <div className="mb-6 px-12">
            <MetalinkLogo className="w-full h-auto" />
          </div>
          <h1 className="text-3xl mb-2">RFID Monitoring System</h1>
          <p className="text-gray-600">Employee Attendance & Tracking</p>
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

          <Button type="submit" className="w-full bg-[#0099DD] hover:bg-[#0088CC]">
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