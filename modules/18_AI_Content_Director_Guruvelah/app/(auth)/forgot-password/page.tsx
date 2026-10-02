'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/db/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
      } else {
        setSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (err: any) {
      toast.error('Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full bg-zinc-900 border-zinc-800 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-100">Reset Password</CardTitle>
          <CardDescription className="text-zinc-400">
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-zinc-300">
                Check <span className="font-semibold text-zinc-100">{email}</span> for instructions to reset your password.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full border-zinc-800">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
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

              <Button type="submit" disabled={loading} className="w-full btn-primary-gradient py-2.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>

              <div className="text-center">
                <Link href="/login" className="text-xs text-zinc-400 hover:text-zinc-200">
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
