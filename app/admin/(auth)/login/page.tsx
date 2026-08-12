'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Loader2,
  Lock,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Building2,
  TrendingUp,
  KeyRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/admin');
    }
  }, [user, authLoading, router]);

  const handleLogin = async (inputEmail: string, inputPass: string) => {
    setLoading(true);
    try {
      const u = await login(inputEmail, inputPass);
      if (u) {
        toast.success(`Selamat datang kembali, ${u.nama}!`);
        router.push('/admin');
      } else {
        toast.error('Email/Username atau password salah. Silakan periksa kembali.');
      }
    } catch {
      toast.error('Terjadi kesalahan koneksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 overflow-hidden font-sans">
      {/* Dynamic Ambient Background Elements */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-4">
        {/* Back Button */}
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-2 rounded-xl bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-300 border border-slate-800 transition-all hover:bg-slate-800 hover:text-white hover:border-slate-700 shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Kembali ke Beranda Utama
        </Link>

        {/* Main Card */}
        <div className="relative rounded-3xl border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/10">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Portal Keuangan & LMS
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Login Administrator</h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Kelola data pengajuan, laporan keuangan & nasabah secara terkontrol
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email / Username Admin
              </Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lms.id"
                  className="h-11 rounded-xl bg-slate-950/80 border-slate-800 pl-10 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                Password
              </Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl bg-slate-950/80 border-slate-800 pl-10 pr-10 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-blue-500/20 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-medium hover:opacity-95 shadow-lg shadow-blue-600/25 transition-all text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memverifikasi...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" /> Masuk ke Portal
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} LMS System &bull; Enkripsi Tingkat Tinggi Keamanan Data
        </p>
      </div>
    </div>
  );
}
