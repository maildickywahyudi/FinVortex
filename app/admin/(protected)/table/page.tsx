'use client';

import { DashboardTable } from '@/components/admin/DashboardTable';
import { Home, ChevronRight, Table as TableIcon } from 'lucide-react';

export default function TablePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span>Home</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-700 dark:text-slate-200">Data Nasabah</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Data Nasabah</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Kelola semua pengajuan pinjaman nasabah</p>
      </div>
      <DashboardTable />
    </div>
  );
}
