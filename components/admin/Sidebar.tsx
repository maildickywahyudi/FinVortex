'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Sparkles,
  BarChart3,
  Menu,
  X,
  ChevronRight,
  Database,
  Building2,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Badge } from '@/components/ui/badge';

import { NotificationBell } from '@/components/admin/NotificationBell';
import { DarkModeToggle } from '@/components/admin/DarkModeToggle';

interface MenuSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: any;
    superAdminOnly?: boolean;
    badge?: string;
  }[];
}

const menuSections: MenuSection[] = [
  {
    title: 'OPERASIONAL & NASABAH',
    items: [
      { href: '/admin', label: 'Dashboard Utama', icon: LayoutDashboard },
      { href: '/admin/table', label: 'Data Nasabah', icon: Users, badge: 'Aktif' },
    ],
  },
  {
    title: 'LAPORAN & PENJADWALAN',
    items: [
      { href: '/admin/reports', label: 'Laporan Keuangan', icon: BarChart3 },
      { href: '/admin/calendar', label: 'Kalender & Reminder', icon: Calendar },
    ],
  },
  {
    title: 'SISTEM & KONFIGURASI',
    items: [
      { href: '/admin/settings', label: 'Pengaturan & Spreadsheet', icon: Settings },
      { href: '/admin/activity-logs', label: 'Log Aktivitas Admin', icon: ShieldCheck, badge: 'Audit' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-950 text-white font-sans">
      {/* Brand Logo Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base block leading-none">LMS Portal</span>
            <span className="text-[11px] font-medium text-amber-400 mt-1 block">Loan & Financial System</span>
          </div>
        </Link>

        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Menu Navigation Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin">
        {menuSections.map((section, idx) => {
          const visibleItems = section.items.filter(
            (item) => !item.superAdminOnly || user?.role === 'Super Admin',
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1.5">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              {visibleItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150',
                      active
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-semibold shadow-sm'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-blue-500" />
                    )}
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        active ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200',
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>

                    {item.badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {item.badge}
                      </span>
                    )}

                    {item.superAdminOnly && !item.badge && (
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 text-[9px] border-amber-500/30">
                        Super
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* AI & Integration Status */}
      <div className="px-3 pb-3 space-y-2">
        <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800/80 px-3 py-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-[11px] font-medium">Asisten AI Admin</span>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-slate-800/80 p-4 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-sm shrink-0">
            {user ? getInitials(user.nama) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-100">{user?.nama}</p>
            <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge
            className={cn(
              'text-[10px] font-semibold',
              user?.role === 'Super Admin'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/30',
            )}
            variant="secondary"
          >
            {user?.role}
          </Badge>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-slate-400 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
            aria-label="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-slate-950 px-4 py-2.5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            aria-label="Buka menu navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-bold text-white text-sm">LMS Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <DarkModeToggle />
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 text-[10px]">
            {user?.role}
          </Badge>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-30 h-screen w-64 flex-col border-r border-slate-800 shadow-xl">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-72 h-full shadow-2xl">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
