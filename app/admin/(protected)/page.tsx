'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { StatCards } from '@/components/admin/StatCards';
import { DashboardTable } from '@/components/admin/DashboardTable';
import { getNasabah, computeStats, computeMonthlyTrend, computeStatusComposition } from '@/lib/api';
import type { Nasabah, DashboardStats, ChartData, StatusComposition } from '@/types';
import { Home, ChevronRight } from 'lucide-react';

// Dynamic lazy loading for heavy chart, calendar, and banner components
const Charts = dynamic(() => import('@/components/admin/Charts').then((mod) => mod.Charts), {
  ssr: false,
  loading: () => <div className="h-[320px] rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-border/50" />,
});

const CalendarReminder = dynamic(() => import('@/components/admin/CalendarReminder').then((mod) => mod.CalendarReminder), {
  ssr: false,
  loading: () => <div className="h-[320px] rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-border/50" />,
});

const JatuhTempoReminderBanner = dynamic(
  () => import('@/components/admin/JatuhTempoReminderBanner').then((mod) => mod.JatuhTempoReminderBanner),
  { ssr: false }
);

const SpreadsheetConnectionBanner = dynamic(
  () => import('@/components/admin/SpreadsheetConnectionBanner').then((mod) => mod.SpreadsheetConnectionBanner),
  { ssr: false }
);

const RecentActivityLogsWidget = dynamic(
  () => import('@/components/admin/RecentActivityLogsWidget').then((mod) => mod.RecentActivityLogsWidget),
  { ssr: false }
);

export default function AdminDashboard() {
  const [data, setData] = useState<Nasabah[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    lunas: 0,
    totalDanaDisalurkan: 0,
    totalKeuntungan: 0,
  });
  const [monthly, setMonthly] = useState<ChartData[]>([]);
  const [composition, setComposition] = useState<StatusComposition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      getNasabah().then((result) => {
        setData(result);
        setStats(computeStats(result));
        setMonthly(computeMonthlyTrend(result));
        setComposition(computeStatusComposition(result));
        setLoading(false);
      });
    };

    fetchData();

    window.addEventListener('lms_data_updated', fetchData);
    window.addEventListener('storage', fetchData);
    return () => {
      window.removeEventListener('lms_data_updated', fetchData);
      window.removeEventListener('storage', fetchData);
    };
  }, []);

  return (
    <div className="space-y-6 pb-16">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Home className="h-4 w-4" />
        <span>Home</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-700 dark:text-slate-200">Dashboard</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ringkasan dan pengelolaan pengajuan pinjaman nasabah</p>
      </div>

      {/* Spreadsheet Connection Health Warning Banner */}
      <SpreadsheetConnectionBanner />

      {/* Non-intrusive Reminders Banner (Approval & Payment Due Dates) */}
      {!loading && (
        <JatuhTempoReminderBanner
          data={data}
          onDataChange={() => {
            getNasabah().then((result) => {
              setData(result);
              setStats(computeStats(result));
              setMonthly(computeMonthlyTrend(result));
              setComposition(computeStatusComposition(result));
            });
          }}
        />
      )}

      {/* Stats with Monthly & All-time Filtering */}
      <StatCards stats={stats} data={data} />

      {/* Charts + Calendar & Recent Activity Logs */}
      {!loading && (
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Charts monthlyData={monthly} statusData={composition} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <CalendarReminder data={data} />
            <RecentActivityLogsWidget />
          </div>
        </div>
      )}

      {/* Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-white">Data Pengajuan</h2>
        <DashboardTable />
      </div>
    </div>
  );
}
