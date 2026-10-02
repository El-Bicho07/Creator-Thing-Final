import React, { useState } from 'react';
import { Sparkles, Lock, Mail, User, ArrowRight, CheckCircle2, Shield, AtSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, demoLogin } = useAuth();
  const { notify } = useNotification();

  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('@arjun_codes');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        notify('Logged in successfully!', 'success');
      } else {
        await register(name, email, password);
        notify('Account created successfully!', 'success');
      }
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    try {
      await demoLogin();
      notify('Signed in as Demo Creator (@arjun_codes)', 'success');
      onClose();
    } catch (err) {
      notify(err.message || 'Demo login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-charcoal-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-lime-muted border border-lime-500/30 text-lime-bright shadow-glow-subtle mb-1">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Creator Sign In' : 'Create Creator Account'}
          </h2>
          <p className="text-xs text-slate-400">
            Access your Instagram analytics baseline and recycling engine
          </p>
        </div>

        {/* 1-Click SIH Demo Access Button */}
        <button
          type="button"
          onClick={handleDemoSignIn}
          disabled={loading}
          className="w-full mb-5 py-3 px-4 rounded-xl bg-lime-accent hover:bg-lime-bright text-charcoal-950 font-bold text-sm flex items-center justify-center gap-2 shadow-glow-lime transition-all duration-200"
        >
          <Shield className="w-4 h-4" />
          <span>1-Click Hackathon Demo Access</span>
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-charcoal-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
            Or continue with email
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-800 border border-slate-700 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-lime-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-charcoal-800 hover:bg-charcoal-700 border border-slate-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Register Account'}
            <ArrowRight className="w-4 h-4 text-lime-accent" />
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-slate-400 hover:text-lime-bright transition-colors"
          >
            {mode === 'login' 
              ? "Don't have an account? Sign up here" 
              : 'Already have an account? Sign in'}
          </button>
        </div>

      </div>
    </div>
  );
}
