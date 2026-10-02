'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Zap, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        toast.success('Account created successfully!');
        router.push('/onboarding');
      } else {
        setSubmitted(true);
      }
    } catch (err: any) {
      toast.error('Signup failed. Check setup or connection.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 text-center p-8 space-y-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h2 className="text-2xl font-bold text-zinc-100">Check Your Email</h2>
          <p className="text-sm text-zinc-400">
            We sent a verification link to <span className="font-semibold text-zinc-200">{email}</span>. Click the link to complete your sign-up.
          </p>
          <Link href="/login">
            <Button className="w-full btn-primary-gradient mt-4">Return to Login</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-fuchsia-600 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">Create Account</CardTitle>
          <CardDescription className="text-zinc-400">
            Start turning viral trends into personalized creator content
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Full Name</label>
              <Input
                type="text"
                placeholder="Alex Rivers"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

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
              <label className="text-xs font-semibold text-zinc-300">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-zinc-950 border-zinc-800"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full btn-primary-gradient py-2.5">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
