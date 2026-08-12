'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/admin/Sidebar';
import { AIChatAssistant } from '@/components/admin/AIChatAssistant';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { DarkModeToggle } from '@/components/admin/DarkModeToggle';
import { NewApplicationToastNotifier } from '@/components/admin/NewApplicationToastNotifier';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/admin/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 grid-pattern">
      <NewApplicationToastNotifier />
      <Sidebar />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Top Header Bar for Desktop */}
        <header className="hidden lg:flex items-center justify-between border-b border-slate-200/80 bg-white/90 dark:bg-slate-900 dark:border-slate-800 px-8 py-3.5 text-slate-800 dark:text-white shadow-2xs backdrop-blur sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-600/30 dark:text-blue-400 dark:border-blue-500/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">LMS System Management Portal</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Monitoring & Notifikasi Pengajuan Pinjaman</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <NotificationBell />

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{user.nama}</p>
                <p className="text-[10px] text-blue-600 dark:text-amber-400 font-semibold">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="animate-fade-in p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <AIChatAssistant />
    </div>
  );
}

