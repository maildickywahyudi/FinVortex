'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  Users,
  Calendar,
  Layers,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  BadgeCheck,
  ChevronRight,
  Receipt,
  Download,
  FileText,
  Filter,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import type { Nasabah, PeriodSummary } from '@/types';
import { computePeriodReport, calculateNasabahDanaMasuk, calculateNasabahProfit } from '@/lib/api';
import { formatRupiah, formatDate, cn } from '@/lib/utils';
import { DetailModal } from './DetailModal';

import {
  exportFinancialReportToExcel,
  exportFinancialReportToPDF,
  exportNasabahToExcel,
  exportNasabahToPDF,
} from '@/lib/export-csv';

interface FinancialReportsProps {
  data: Nasabah[];
}

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

const cardAnimationVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      delay: i * 0.05,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  }),
};

export function FinancialReports({ data }: FinancialReportsProps) {
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'overall'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or '0'..'11'
  const [selectedNasabahModal, setSelectedNasabahModal] = useState<Nasabah | null>(null);
  const [filterMonthModal, setFilterMonthModal] = useState<{ label: string; list: Nasabah[] } | null>(null);

  const { overall, availableYears, yearlyList, getMonthlyReport } = computePeriodReport(data);
  const monthlyList = getMonthlyReport(selectedYear);

  // Active (Approved) loans calculations for Total Outstanding Debt
  const approvedLoans = useMemo(() => {
    return (data || []).filter((n) => n.status === 'Approved');
  }, [data]);

  const totalOutstandingDebt = useMemo(() => {
    return approvedLoans.reduce((sum, n) => {
      const principal = Number(n.jumlahPinjaman) || 0;
      const profit = calculateNasabahProfit(n);
      return sum + principal + profit;
    }, 0);
  }, [approvedLoans]);

  const totalOutstandingPrincipal = useMemo(() => {
    return approvedLoans.reduce((sum, n) => sum + (Number(n.jumlahPinjaman) || 0), 0);
  }, [approvedLoans]);

  const totalOutstandingProfit = useMemo(() => {
    return approvedLoans.reduce((sum, n) => sum + calculateNasabahProfit(n), 0);
  }, [approvedLoans]);

  // Filtered monthly report based on selected month dropdown
  const filteredMonthlyList = useMemo(() => {
    if (selectedMonth === 'all') return monthlyList;
    const mIdx = Number(selectedMonth);
    return monthlyList.filter((m) => m.month === mIdx);
  }, [monthlyList, selectedMonth]);

  const exportMonthlyExcel = () => {
    const monthLabel = selectedMonth === 'all' ? 'Semua Bulan' : MONTH_NAMES[Number(selectedMonth)];
    exportFinancialReportToExcel(filteredMonthlyList, `Laporan Keuangan ${monthLabel} ${selectedYear}`);
  };

  const exportMonthlyPDF = () => {
    const monthLabel = selectedMonth === 'all' ? 'Semua Bulan' : MONTH_NAMES[Number(selectedMonth)];
    exportFinancialReportToPDF(filteredMonthlyList, `LAPORAN KEUANGAN ${monthLabel.toUpperCase()} ${selectedYear}`);
  };

  const exportYearlyExcel = () => {
    exportFinancialReportToExcel(yearlyList, 'Laporan Keuangan Per Tahun LMS');
  };

  const exportYearlyPDF = () => {
    exportFinancialReportToPDF(yearlyList, 'LAPORAN KEUANGAN TAHUNAN LMS');
  };

  const exportNasabahListExcel = (list: Nasabah[], titleLabel: string) => {
    exportNasabahToExcel(list, `Laporan Nasabah (${titleLabel})`);
  };

  const exportNasabahListPDF = (list: Nasabah[], titleLabel: string) => {
    exportNasabahToPDF(list, `LAPORAN DATA NASABAH (${titleLabel})`);
  };

  // Filter list of nasabah for selected month/year if inspecting
  const handleOpenMonthNasabah = (period: PeriodSummary) => {
    let filtered: Nasabah[] = [];
    if (period.month !== undefined) {
      filtered = data.filter((n) => {
        if (!n.tanggalPengajuan) return false;
        const d = new Date(n.tanggalPengajuan);
        return d.getFullYear() === period.year && d.getMonth() === period.month;
      });
    } else if (period.year > 0) {
      filtered = data.filter((n) => {
        if (!n.tanggalPengajuan) return false;
        return new Date(n.tanggalPengajuan).getFullYear() === period.year;
      });
    } else {
      filtered = data;
    }
    setFilterMonthModal({ label: period.label, list: filtered });
  };

  return (
    <Card className="glass rounded-2xl border border-border/50 dark:bg-slate-900/90 dark:border-slate-800 p-5 sm:p-6 soft-shadow space-y-6">
      {/* Header & Mode Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-blue-100 dark:bg-blue-950 p-2 text-blue-600 dark:text-blue-400 shrink-0">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">Laporan Keuangan & Statistik Periode</h2>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Data rekapitulasi sisa piutang, dana keluar, dana masuk, statistik nasabah, dan keuntungan per bulan & per tahun.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={cn(
              'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none text-center',
              activeTab === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
          >
            Data Per Bulan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('yearly')}
            className={cn(
              'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none text-center',
              activeTab === 'yearly'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
          >
            Data Per Tahun
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overall')}
            className={cn(
              'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-none text-center',
              activeTab === 'overall'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200',
            )}
          >
            Keseluruhan
          </button>
        </div>
      </div>

      {/* Top Quick Metric Highlights with Framer Motion entry animations */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Outstanding Debt (Piutang Aktif) */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardAnimationVariants}
          onClick={() => {
            if (approvedLoans.length > 0) {
              setFilterMonthModal({ label: 'Pinjaman Aktif (Approved)', list: approvedLoans });
            }
          }}
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/40 dark:via-orange-950/20 dark:to-slate-900 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700',
            approvedLoans.length > 0 ? 'cursor-pointer' : '',
          )}
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <Receipt className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Clock className="h-3 w-3" />
              {approvedLoans.length} Pinjaman Aktif
            </span>
          </div>

          <div className="mt-3.5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/80 dark:text-amber-300/80">
              Total Outstanding Debt
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-amber-900 dark:text-amber-200 tracking-tight">
              {formatRupiah(totalOutstandingDebt)}
            </p>
            <div className="pt-1.5 flex items-center justify-between text-[11px] text-amber-700/80 dark:text-amber-400/80 border-t border-amber-200/50 dark:border-amber-800/50 mt-2">
              <span>Pokok: {formatRupiah(totalOutstandingPrincipal)}</span>
              <span>Bunga: {formatRupiah(totalOutstandingProfit)}</span>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Total Dana Keluar */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardAnimationVariants}
          className="rounded-2xl border border-rose-200/80 dark:border-rose-800/60 bg-gradient-to-br from-rose-50/80 via-rose-50/20 to-white dark:from-rose-950/40 dark:via-rose-950/20 dark:to-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-rose-500/15 p-2.5 text-rose-700 dark:text-rose-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Disalurkan
            </span>
          </div>
          <div className="mt-3.5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-800/80 dark:text-rose-300/80">
              Total Dana Keluar
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-rose-900 dark:text-rose-200 tracking-tight">
              {formatRupiah(overall.danaKeluar)}
            </p>
            <p className="pt-1.5 text-[11px] text-rose-700/80 dark:text-rose-400/80 border-t border-rose-200/50 dark:border-rose-800/50 mt-2">
              Pokok pinjaman disalurkan ke nasabah
            </p>
          </div>
        </motion.div>

        {/* Card 3: Total Dana Masuk */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardAnimationVariants}
          className="rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 via-emerald-50/20 to-white dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-700 dark:text-emerald-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {overall.lunasCount} Lunas
            </span>
          </div>
          <div className="mt-3.5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80">
              Total Dana Masuk
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 tracking-tight">
              {formatRupiah(overall.danaMasuk)}
            </p>
            <p className="pt-1.5 text-[11px] text-emerald-700/80 dark:text-emerald-400/80 border-t border-emerald-200/50 dark:border-emerald-800/50 mt-2">
              Pokok + bunga yang sudah lunas
            </p>
          </div>
        </motion.div>

        {/* Card 4: Total Keuntungan */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardAnimationVariants}
          className="rounded-2xl border border-blue-200/80 dark:border-blue-800/60 bg-gradient-to-br from-blue-50/80 via-indigo-50/20 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-blue-500/15 p-2.5 text-blue-700 dark:text-blue-400">
              <Coins className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Profit Murni
            </span>
          </div>
          <div className="mt-3.5 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-800/80 dark:text-blue-300/80">
              Total Keuntungan
            </p>
            <p className="text-xl sm:text-2xl font-extrabold text-blue-900 dark:text-blue-200 tracking-tight">
              {formatRupiah(overall.keuntungan)}
            </p>
            <p className="pt-1.5 text-[11px] text-blue-700/80 dark:text-blue-400/80 border-t border-blue-200/50 dark:border-blue-800/50 mt-2">
              Akumulasi pendapatan bunga pelunasan
            </p>
          </div>
        </motion.div>
      </div>

      {/* TAB 1: DATA PER BULAN */}
      {activeTab === 'monthly' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          {/* Controls with Year & Month Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Tahun:</span>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(Number(val))}>
                  <SelectTrigger className="w-[110px] h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                    {availableYears.map((yr) => (
                      <SelectItem key={yr} value={yr.toString()}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Bulan:</span>
                <Select value={selectedMonth} onValueChange={(val) => setSelectedMonth(val)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100">
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                    <SelectItem value="all">Semua Bulan (Jan-Des)</SelectItem>
                    {MONTH_NAMES.map((mn, idx) => (
                      <SelectItem key={mn} value={idx.toString()}>
                        {mn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={exportMonthlyExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-medium shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel (.xls)
              </Button>
              <Button
                size="sm"
                onClick={exportMonthlyPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 gap-1.5 font-medium shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Export PDF (Final)
              </Button>
            </div>
          </div>

          {/* Table Breakdown per Month */}
          <div className="overflow-x-auto rounded-xl border border-border/60 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-semibold border-b border-border/60 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Bulan</th>
                  <th className="px-4 py-3 text-right">Dana Keluar (Pinjaman)</th>
                  <th className="px-4 py-3 text-right">Dana Masuk (Lunas)</th>
                  <th className="px-4 py-3 text-right">Total Keuntungan</th>
                  <th className="px-4 py-3 text-center">Data Nasabah</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 dark:divide-slate-800">
                {filteredMonthlyList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 dark:text-slate-500">
                      Tidak ada data keuangan untuk filter bulan ini.
                    </td>
                  </tr>
                ) : (
                  filteredMonthlyList.map((m) => (
                    <tr
                      key={m.periodKey}
                      className={cn(
                        'hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors',
                        m.totalNasabah > 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/20 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500',
                      )}
                    >
                      <td className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          {m.label}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-rose-600 dark:text-rose-400">
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpRight className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                          {formatRupiah(m.danaKeluar)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        <div className="flex items-center justify-end gap-1">
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                          {formatRupiah(m.danaMasuk)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-blue-700 dark:text-blue-400">
                        {formatRupiah(m.keuntungan)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{m.totalNasabah} Total</span>
                          {m.approvedCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-medium">
                              {m.approvedCount} Appr
                            </span>
                          )}
                          {m.lunasCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-medium">
                              {m.lunasCount} Lunas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-950/60 px-2.5 gap-1"
                          onClick={() => handleOpenMonthNasabah(m)}
                          disabled={m.totalNasabah === 0}
                        >
                          Lihat ({m.totalNasabah})
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 2: DATA PER TAHUN */}
      {activeTab === 'yearly' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rekapitulasi keuangan tahunan untuk memantau akumulasi pertumbuhan dana keluar, dana masuk, dan profit tahunan.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={exportYearlyExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-medium shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel (.xls)
              </Button>
              <Button
                size="sm"
                onClick={exportYearlyPDF}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-8 gap-1.5 font-medium shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                Export PDF (Final)
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {yearlyList.map((y, idx) => (
              <motion.div
                key={y.periodKey}
                custom={idx}
                initial="hidden"
                animate="visible"
                variants={cardAnimationVariants}
              >
                <Card className="glass rounded-2xl border border-border/60 dark:border-slate-800 dark:bg-slate-900/90 p-5 space-y-4 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between border-b border-border/50 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-slate-800 dark:text-white text-lg">{y.label}</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {y.totalNasabah} Pengajuan
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" /> Dana Keluar (Disalurkan):
                      </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{formatRupiah(y.danaKeluar)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" /> Dana Masuk (Lunas):
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(y.danaMasuk)}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 dark:border-slate-800 pt-2">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                        <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Total Keuntungan (Bunga):
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-base">{formatRupiah(y.keuntungan)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-border/30 dark:border-slate-800">
                    <span>Approved: {y.approvedCount} | Lunas: {y.lunasCount}</span>
                    <Button
                      size="sm"
                      variant="link"
                      className="h-auto p-0 text-blue-600 dark:text-blue-400 text-xs font-semibold"
                      onClick={() => handleOpenMonthNasabah(y)}
                    >
                      Detail Nasabah &rarr;
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB 3: DATA KESELURUHAN */}
      {activeTab === 'overall' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900 p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Data Keseluruhan (All-Time Lifetime)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Akumulasi seluruh transaksi pinjaman, sisa piutang aktif, pengembalian, dan total keuntungan bersih.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => exportNasabahListExcel(data, 'Keseluruhan_Lifetime')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 gap-1.5 font-medium shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export Excel Transaksi
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <motion.div
                custom={0}
                initial="hidden"
                animate="visible"
                variants={cardAnimationVariants}
                onClick={() => {
                  if (approvedLoans.length > 0) {
                    setFilterMonthModal({ label: 'Pinjaman Aktif (Approved)', list: approvedLoans });
                  }
                }}
                className={cn(
                  'bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-amber-300/80 dark:border-amber-800/60 shadow-xs space-y-1 transition-all hover:shadow-md',
                  approvedLoans.length > 0 ? 'cursor-pointer' : '',
                )}
              >
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Outstanding Debt
                </p>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-200">{formatRupiah(totalOutstandingDebt)}</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  {approvedLoans.length} nasabah aktif (Approved)
                </p>
              </motion.div>

              <motion.div
                custom={1}
                initial="hidden"
                animate="visible"
                variants={cardAnimationVariants}
                className="bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-border/60 dark:border-slate-700 shadow-xs space-y-1"
              >
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" /> Total Dana Keluar
                </p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatRupiah(overall.danaKeluar)}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Pokok disalurkan (Approved & Lunas)</p>
              </motion.div>

              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={cardAnimationVariants}
                className="bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-border/60 dark:border-slate-700 shadow-xs space-y-1"
              >
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" /> Total Dana Masuk
                </p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(overall.danaMasuk)}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Pokok + bunga nasabah Lunas</p>
              </motion.div>

              <motion.div
                custom={3}
                initial="hidden"
                animate="visible"
                variants={cardAnimationVariants}
                className="bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-blue-200 dark:border-blue-800 shadow-xs space-y-1"
              >
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Keuntungan (Profit)
                </p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{formatRupiah(overall.keuntungan)}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Bunga murni dari pelunasan</p>
              </motion.div>

              <motion.div
                custom={4}
                initial="hidden"
                animate="visible"
                variants={cardAnimationVariants}
                className="bg-white dark:bg-slate-800/90 rounded-xl p-4 border border-border/60 dark:border-slate-700 shadow-xs space-y-1"
              >
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" /> Total Nasabah
                </p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{overall.totalNasabah} Nasabah</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {overall.lunasCount} Lunas, {overall.approvedCount} Approved
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* FILTER MODAL / LIST OF NASABAH IN SELECTED PERIOD */}
      {filterMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl border border-border dark:border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-border dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Data Nasabah: {filterMonthModal.label}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar {filterMonthModal.list.length} nasabah yang terdaftar pada kategori ini.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                onClick={() => setFilterMonthModal(null)}
              >
                &times;
              </Button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {filterMonthModal.list.length === 0 ? (
                <p className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">Tidak ada data nasabah pada periode ini.</p>
              ) : (
                <div className="divide-y divide-border/60 dark:divide-slate-800">
                  {filterMonthModal.list.map((n) => (
                    <div
                      key={n.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => setSelectedNasabahModal(n)}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{n.nama}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">({n.id})</span>
                          <span
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded-full font-semibold',
                              n.status === 'Approved' && 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
                              n.status === 'Lunas' && 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300',
                              n.status === 'Pending' && 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
                              n.status === 'Rejected' && 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300',
                            )}
                          >
                            {n.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Tgl Pengajuan: {formatDate(n.tanggalPengajuan)} | Tenor: {n.tenor} Hari
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{formatRupiah(n.jumlahPinjaman)}</p>
                        {n.status === 'Approved' && (
                          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Tagihan: {formatRupiah(Number(n.jumlahPinjaman) + calculateNasabahProfit(n))}
                          </p>
                        )}
                        {n.status === 'Lunas' && (
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            Profit: +{formatRupiah(calculateNasabahProfit(n))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => exportNasabahListExcel(filterMonthModal.list, filterMonthModal.label)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-medium shadow-sm"
                  disabled={filterMonthModal.list.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel ({filterMonthModal.list.length})
                </Button>

                <Button
                  size="sm"
                  onClick={() => exportNasabahListPDF(filterMonthModal.list, filterMonthModal.label)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 font-medium shadow-sm"
                  disabled={filterMonthModal.list.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" />
                  PDF Final ({filterMonthModal.list.length})
                </Button>
              </div>

              <Button size="sm" variant="outline" onClick={() => setFilterMonthModal(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Nasabah Modal */}
      {selectedNasabahModal && (
        <DetailModal
          nasabah={selectedNasabahModal}
          open={!!selectedNasabahModal}
          onClose={() => setSelectedNasabahModal(null)}
          onStatusChange={(updated) => {
            setSelectedNasabahModal(updated);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('lms_data_updated'));
            }
          }}
        />
      )}
    </Card>
  );
}
