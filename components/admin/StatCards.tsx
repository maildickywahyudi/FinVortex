'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  Users,
  CheckCircle,
  Clock,
  XCircle,
  BadgeCheck,
  Coins,
  HandCoins,
  Calendar,
  Filter,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DashboardStats, Nasabah } from '@/types';
import { formatRupiah, cn } from '@/lib/utils';
import { calculateNasabahProfit } from '@/lib/api';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

interface StatCardsProps {
  stats: DashboardStats;
  data?: Nasabah[];
}

export function StatCards({ stats, data = [] }: StatCardsProps) {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  // State filter bulan: 'ALL' or 'YYYY-MM'
  const defaultPeriodKey = `${currentYear}-${currentMonthIdx}`;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriodKey);

  // Generate list of available months from data
  const availablePeriods = useMemo(() => {
    const periodMap = new Map<string, { label: string; year: number; month: number }>();

    // Add current month by default
    const curKey = `${currentYear}-${currentMonthIdx}`;
    periodMap.set(curKey, {
      label: `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`,
      year: currentYear,
      month: currentMonthIdx,
    });

    data.forEach((n) => {
      if (!n.tanggalPengajuan) return;
      const d = new Date(n.tanggalPengajuan);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${m}`;
      if (!periodMap.has(key)) {
        periodMap.set(key, {
          label: `${MONTH_NAMES[m]} ${y}`,
          year: y,
          month: m,
        });
      }
    });

    // Sort descending by date
    const list = Array.from(periodMap.entries()).map(([key, val]) => ({
      key,
      ...val,
    }));
    list.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return list;
  }, [data, currentYear, currentMonthIdx]);

  // Compute stats for selected period
  const periodStats = useMemo(() => {
    if (selectedPeriod === 'ALL') {
      return {
        label: 'Semua Waktu (Lifetime)',
        total: stats.total,
        pending: stats.pending,
        approved: stats.approved,
        lunas: stats.lunas,
        rejected: stats.rejected,
        danaDisalurkan: stats.totalDanaDisalurkan,
        keuntungan: stats.totalKeuntungan,
      };
    }

    const [yStr, mStr] = selectedPeriod.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const periodObj = availablePeriods.find((p) => p.key === selectedPeriod);
    const label = periodObj ? periodObj.label : `Bulan ${month + 1} ${year}`;

    const filtered = data.filter((n) => {
      if (!n.tanggalPengajuan) return false;
      const d = new Date(n.tanggalPengajuan);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    let danaDisalurkan = 0;
    let keuntungan = 0;
    let pending = 0;
    let approved = 0;
    let lunas = 0;
    let rejected = 0;

    filtered.forEach((n) => {
      const amt = Number(n.jumlahPinjaman) || 0;
      if (n.status === 'Pending') pending++;
      else if (n.status === 'Approved') {
        approved++;
        danaDisalurkan += amt;
      } else if (n.status === 'Lunas') {
        lunas++;
        danaDisalurkan += amt;
        keuntungan += calculateNasabahProfit(n);
      } else if (n.status === 'Rejected') rejected++;
    });

    return {
      label,
      total: filtered.length,
      pending,
      approved,
      lunas,
      rejected,
      danaDisalurkan,
      keuntungan,
    };
  }, [selectedPeriod, availablePeriods, data, stats]);

  const cards = [
    {
      label: 'Total Pengajuan',
      value: periodStats.total.toString(),
      icon: Users,
      bg: 'bg-blue-100 dark:bg-blue-950/80',
      text: 'text-blue-600 dark:text-blue-400',
      sub: selectedPeriod === 'ALL' ? 'Semua Waktu' : `Bulan ${periodStats.label}`,
    },
    {
      label: 'Pending',
      value: periodStats.pending.toString(),
      icon: Clock,
      bg: 'bg-amber-100 dark:bg-amber-950/80',
      text: 'text-amber-600 dark:text-amber-400',
      sub: 'Perlu Diproses',
    },
    {
      label: 'Approved',
      value: periodStats.approved.toString(),
      icon: CheckCircle,
      bg: 'bg-emerald-100 dark:bg-emerald-950/80',
      text: 'text-emerald-600 dark:text-emerald-400',
      sub: 'Disetujui / Aktif',
    },
    {
      label: 'Lunas',
      value: periodStats.lunas.toString(),
      icon: BadgeCheck,
      bg: 'bg-blue-100 dark:bg-blue-950/80',
      text: 'text-blue-600 dark:text-blue-400',
      sub: 'Selesai Dibayar',
    },
    {
      label: 'Rejected',
      value: periodStats.rejected.toString(),
      icon: XCircle,
      bg: 'bg-rose-100 dark:bg-rose-950/80',
      text: 'text-rose-600 dark:text-rose-400',
      sub: 'Ditolak',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Month Filter Selector Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-border/60 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-100 dark:bg-blue-950 p-2 text-blue-600 dark:text-blue-400 shrink-0">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 dark:text-white">Filter Periode Statistik Dashboard</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Menampilkan statistik dana disalurkan, profit, dan status nasabah per bulan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 hidden sm:block shrink-0" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[210px] h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs font-semibold">
                🌐 Semua Waktu (Keseluruhan)
              </SelectItem>
              {availablePeriods.map((p) => (
                <SelectItem key={p.key} value={p.key} className="text-xs">
                  📅 {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2 Big Financial Metric Cards (Per Bulan vs All Time) */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Card 1: Dana Disalurkan Per Bulan */}
        <Card className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-emerald-50/60 to-white dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-5 soft-shadow transition-all hover:premium-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 truncate block">
                  Dana Disalurkan ({periodStats.label})
                </span>
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 truncate">
                {formatRupiah(periodStats.danaDisalurkan)}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 border-t border-emerald-200/60 dark:border-emerald-900/50 pt-2 flex-wrap">
                <span>All-Time:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(stats.totalDanaDisalurkan || 0)}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-emerald-600 text-white dark:bg-emerald-950 dark:text-emerald-400 p-2.5 sm:p-3.5 shadow-xs shrink-0">
              <HandCoins className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
          </div>
        </Card>

        {/* Card 2: Keuntungan Profit Per Bulan */}
        <Card className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-500/10 via-blue-50/60 to-white dark:from-blue-950/50 dark:via-indigo-950/30 dark:to-slate-900 p-4 sm:p-5 soft-shadow transition-all hover:premium-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 truncate block">
                  Keuntungan Profit ({periodStats.label})
                </span>
              </div>
              <p className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-700 dark:text-blue-400 truncate">
                {formatRupiah(periodStats.keuntungan)}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 border-t border-blue-200/60 dark:border-blue-900/50 pt-2 flex-wrap">
                <span>All-Time Profit:</span>
                <span className="font-bold text-blue-900 dark:text-blue-300">{formatRupiah(stats.totalKeuntungan || 0)}</span>
              </div>
            </div>
            <div className="rounded-2xl bg-blue-600 text-white dark:bg-blue-950 dark:text-blue-400 p-2.5 sm:p-3.5 shadow-xs shrink-0">
              <Coins className="h-5 w-5 sm:h-7 sm:w-7" />
            </div>
          </div>
        </Card>
      </div>

      {/* 5 Status Cards for selected month */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Card
            key={card.label}
            className="group cursor-default rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 soft-shadow transition-all duration-200 hover:-translate-y-1 hover:premium-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
                <p className="mt-1.5 text-2xl font-extrabold text-slate-900 dark:text-white">{card.value}</p>
              </div>
              <div className={cn('rounded-xl p-2', card.bg)}>
                <card.icon className={cn('h-4 w-4', card.text)} />
              </div>
            </div>
            <p className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.sub}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
