'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      toast.success('Successfully logged in!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error('Authentication failed. Check setup or credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">Welcome Back</CardTitle>
          <CardDescription className="text-zinc-400">
            Sign in to access your personalized creator strategy dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Email Address</label>
              <Input
                type="email"
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-zinc-300">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full btn-primary-gradient py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-500">
            Don't have an account?{' '}
            <Link href="/signup" className="text-indigo-400 font-semibold hover:underline">
              Create Account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
