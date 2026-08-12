'use client';

import { useState, useEffect } from 'react';
import { getNasabah } from '@/lib/api';
import type { Nasabah } from '@/types';
import { FinancialReports } from '@/components/admin/FinancialReports';
import { Home, ChevronRight, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const [data, setData] = useState<Nasabah[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const nasabahList = await getNasabah();
      setData(nasabahList);
    } catch (e) {
      console.error('Error loading reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('lms_data_updated', handleUpdate);
      return () => window.removeEventListener('lms_data_updated', handleUpdate);
    }
  }, []);

  return (
    <div className="space-y-6 pb-20">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/admin" className="flex items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200">
          <Home className="h-4 w-4" /> Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-1">
          <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Laporan Keuangan & Statistik
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Laporan Keuangan & Statistik Periode</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analisis laporan dana keluar, dana masuk, keuntungan profit, serta rekapan nasabah per bulan, per tahun, dan keseluruhan.
          </p>
        </div>
      </div>

      {/* Financial Reports Component */}
      {loading ? (
        <div className="glass rounded-2xl border border-border/50 p-12 text-center text-slate-400 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-400">
          <p className="animate-pulse">Memuat data laporan keuangan...</p>
        </div>
      ) : (
        <FinancialReports data={data} />
      )}
    </div>
  );
}
