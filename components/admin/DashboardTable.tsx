'use client';

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  BadgeCheck,
  MessageCircle,
  Eye,
  Loader2,
  Trash2,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Calendar,
  X,
  Bell,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DetailModal } from './DetailModal';
import { WaNotificationModal, type TemplateType } from './WaNotificationModal';
import { getNasabah, updateStatus, deleteNasabah, restoreAutoReject } from '@/lib/api';
import { exportNasabahToExcel, exportNasabahToPDF, exportSingleNasabahPDF } from '@/lib/export-csv';
import { formatRupiah, formatDateShort, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import type { Nasabah, StatusPengajuan } from '@/types';

const statusConfig: Record<StatusPengajuan, { className: string }> = {
  Approved: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 font-semibold dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800' },
  Lunas: { className: 'bg-blue-50 text-blue-700 border-blue-200/90 font-semibold dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800' },
  Pending: { className: 'bg-amber-50 text-amber-800 border-amber-200/90 font-semibold dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800' },
  Rejected: { className: 'bg-rose-50 text-rose-700 border-rose-200/90 font-semibold dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800' },
};

type SortField = 'tanggalPengajuan' | 'nama' | 'jumlahPinjaman' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export function DashboardTable() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';

  const [data, setData] = useState<Nasabah[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('tanggalPengajuan');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Nasabah | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [waTarget, setWaTarget] = useState<Nasabah | null>(null);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waInitialTemplate, setWaInitialTemplate] = useState<TemplateType | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Nasabah | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);

  // Auto-refresh timer every 60 seconds
  useEffect(() => {
    if (!autoRefresh) {
      setSecondsLeft(60);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;

    if (secondsLeft <= 0) {
      setSecondsLeft(60);
      getNasabah()
        .then((result) => {
          setData(result);
        })
        .catch((err) => {
          console.error('Auto-refresh error:', err);
        });
    }
  }, [secondsLeft, autoRefresh]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getNasabah();
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await getNasabah();
      setData(result);
      toast.success('Data berhasil dimuat ulang');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportExcel = () => {
    exportNasabahToExcel(filtered, 'Data_Nasabah_LMS');
    toast.success('Data nasabah berhasil diexport ke Excel (.xls) profesional');
  };

  const handleExportPDF = () => {
    exportNasabahToPDF(filtered, 'LAPORAN DATA NASABAH LMS');
    toast.success('Menyiapkan laporan PDF resmi...');
  };

  const handleQuickApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await updateStatus(id, 'Approved');
      if (updated) {
        setData((prev) => prev.map((n) => (n.id === id ? updated : n)));
        toast.success(`Pengajuan ${id} disetujui! Membuka notifikasi WhatsApp pencairan...`);
        setWaTarget(updated);
        setWaInitialTemplate('approved');
        setWaModalOpen(true);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickReject = async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await updateStatus(id, 'Rejected', 'Tidak memenuhi syarat');
      if (updated) {
        setData((prev) => prev.map((n) => (n.id === id ? updated : n)));
        toast.success(`Pengajuan ${id} ditolak`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickLunas = async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await updateStatus(id, 'Lunas');
      if (updated) {
        setData((prev) => prev.map((n) => (n.id === id ? updated : n)));
        toast.success(`Pengajuan ${id} ditandai LUNAS`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreItem = async (id: string) => {
    setActionLoadingId(id);
    try {
      const restored = await restoreAutoReject(id);
      if (restored) {
        setData((prev) => prev.map((n) => (n.id === id ? restored : n)));
        toast.success(`Pengajuan ${id} berhasil dipulihkan ke status Pending!`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteNasabah(deleteTarget.id);
      setData((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      toast.success(`Data peminjam ${deleteTarget.nama} (${deleteTarget.id}) berhasil dihapus`);
      setDeleteTarget(null);
    } catch {
      toast.error('Gagal menghapus data peminjam');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = (updated: Nasabah) => {
    setData((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
  };

  const openDetail = (n: Nasabah) => {
    setSelected(n);
    setModalOpen(true);
  };

  const autoRejectCount = useMemo(() => {
    return data.filter((n) => n.isAutoRejected || n.alasanReject?.includes('[Auto Reject]')).length;
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.nama.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.whatsapp.includes(q) ||
          (n.nik && n.nik.includes(q)) ||
          n.lokasi.toLowerCase().includes(q),
      );
    }

    if (statusFilter === 'AutoReject') {
      result = result.filter((n) => n.isAutoRejected || n.alasanReject?.includes('[Auto Reject]'));
    } else if (statusFilter !== 'all') {
      result = result.filter((n) => n.status === statusFilter && !n.isAutoRejected);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((n) => {
        if (!n.tanggalPengajuan) return false;
        return new Date(n.tanggalPengajuan) >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((n) => {
        if (!n.tanggalPengajuan) return false;
        return new Date(n.tanggalPengajuan) <= end;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'nama') cmp = a.nama.localeCompare(b.nama);
      else if (sortField === 'jumlahPinjaman') cmp = a.jumlahPinjaman - b.jumlahPinjaman;
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = new Date(a.tanggalPengajuan).getTime() - new Date(b.tanggalPengajuan).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [data, search, statusFilter, startDate, endDate, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Initial load & sync
  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('lms_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('lms_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 soft-shadow overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3.5 border-b border-slate-200/80 dark:border-slate-800 p-3.5 sm:p-4 bg-white dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap lg:flex-nowrap flex-1">
            <div className="relative w-full sm:w-64 flex items-center shrink-0">
              <Search className="absolute left-3 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, ID, WhatsApp..."
                className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500 w-full"
              />
            </div>

            <div className="w-full sm:w-44 shrink-0">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-medium">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Lunas">Lunas</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="AutoReject" className="text-rose-600 dark:text-rose-400 font-semibold">
                    🛡️ Auto Reject ({autoRejectCount})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filters */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 min-h-[36px] w-full sm:w-auto">
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-medium px-1 shrink-0">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Rentang:</span>
              </div>
              <div className="flex items-center gap-1 flex-1 sm:flex-initial">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full sm:w-28 border-slate-200 dark:border-slate-700 px-1"
                  title="Tanggal Awal Pengajuan"
                />
                <span className="text-xs text-slate-400 px-0.5">-</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-7 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-full sm:w-28 border-slate-200 dark:border-slate-700 px-1"
                  title="Tanggal Akhir Pengajuan"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 shrink-0 ml-auto sm:ml-0"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  title="Reset Filter Tanggal"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 pt-1 lg:pt-0">
            {/* Auto-refresh Toggle */}
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg h-9 shadow-2xs">
              <Switch
                id="auto-refresh-toggle"
                checked={autoRefresh}
                onCheckedChange={(checked) => {
                  setAutoRefresh(checked);
                  if (checked) {
                    toast.info('Auto-refresh diaktifkan (memuat data Google Spreadsheet setiap 60 detik)');
                  } else {
                    toast.info('Auto-refresh dinonaktifkan');
                  }
                }}
              />
              <label
                htmlFor="auto-refresh-toggle"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5 select-none"
              >
                <span>Auto-refresh</span>
                {autoRefresh ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {secondsLeft}s
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">(60s)</span>
                )}
              </label>
            </div>

            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-9 text-[11px] sm:text-xs border-slate-200 dark:border-slate-800 dark:hover:bg-slate-800 px-2 sm:px-3 justify-center">
              {refreshing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              <span>Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-9 text-[11px] sm:text-xs border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900 font-medium px-2 sm:px-3 justify-center">
              <Download className="mr-1 h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="h-9 text-[11px] sm:text-xs border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900 font-medium px-2 sm:px-3 justify-center">
              <FileText className="mr-1 h-3.5 w-3.5 text-rose-700 dark:text-rose-400" />
              <span>PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur">
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('nama')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                  Nama <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </button>
              </th>
              <th className="hidden px-4 py-3 md:table-cell">WhatsApp</th>
              <th className="hidden px-4 py-3 lg:table-cell">
                <button onClick={() => toggleSort('jumlahPinjaman')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                  Jumlah <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </button>
              </th>
              <th className="hidden px-4 py-3 lg:table-cell">Tenor</th>
              <th className="px-4 py-3">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                  Status <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </button>
              </th>
              <th className="hidden px-4 py-3 xl:table-cell">
                <button onClick={() => toggleSort('tanggalPengajuan')} className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-200">
                  Tanggal <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-200/60 dark:border-slate-800/60">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                  Tidak ada data ditemukan
                </td>
              </tr>
            ) : (
              paginated.map((n, idx) => (
                <tr
                  key={n.id}
                  className={cn(
                    'border-b border-slate-200/60 dark:border-slate-800/60 transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/60',
                    idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900',
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(n)}
                      className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {n.id}
                    </button>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{n.nama}</p>
                    
                    {/* Mobile inline details visible on mobile/tablet */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 lg:hidden">
                      <span className="font-bold text-blue-700 dark:text-blue-400">{formatRupiah(n.jumlahPinjaman)}</span>
                      <span>•</span>
                      <span>{n.tenor} Hari</span>
                      {n.whatsapp && (
                        <>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWaTarget(n);
                              setWaModalOpen(true);
                            }}
                            className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
                          >
                            <MessageCircle className="h-3 w-3 text-emerald-600" />
                            {n.whatsapp}
                          </button>
                        </>
                      )}
                    </div>

                    {n.bankOrEwallet && (
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {n.bankOrEwallet} • {n.nomorRekening || '-'}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <button
                      onClick={() => {
                        setWaTarget(n);
                        setWaModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900 transition-colors"
                      title="Kirim Auto Text WhatsApp Web"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {n.whatsapp}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatRupiah(n.jumlahPinjaman)}
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell text-sm font-medium text-slate-700 dark:text-slate-300">
                    {n.tenor} hari
                  </td>
                  <td className="px-4 py-3">
                    {n.isAutoRejected || n.alasanReject?.includes('[Auto Reject]') ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 gap-1 font-bold" variant="outline">
                        <ShieldAlert className="h-3 w-3 text-rose-600 dark:text-rose-400" /> Auto-Reject
                      </Badge>
                    ) : (
                      <Badge
                        className={cn('border', statusConfig[n.status].className)}
                        variant="secondary"
                      >
                        {n.status}
                      </Badge>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 xl:table-cell text-xs font-medium text-slate-600 dark:text-slate-400">
                    {formatDateShort(n.tanggalPengajuan)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 dark:hover:bg-slate-800"
                        onClick={() => openDetail(n)}
                        title="Lihat Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                        onClick={() => exportSingleNasabahPDF(n)}
                        title="Unduh PDF Profil & Detail Pengajuan"
                      >
                        <FileText className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                      </Button>

                      {(n.isAutoRejected || n.alasanReject?.includes('[Auto Reject]')) && (
                        <Button
                          size="sm"
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 px-2.5"
                          onClick={() => handleRestoreItem(n.id)}
                          disabled={actionLoadingId === n.id}
                          title="Pulihkan Data Nasabah"
                        >
                          {actionLoadingId === n.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Pulihkan
                        </Button>
                      )}

                      {n.status === 'Pending' && !n.isAutoRejected && (
                        <>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleQuickApprove(n.id)}
                            disabled={actionLoadingId === n.id}
                            title="Approve"
                          >
                            {actionLoadingId === n.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8"
                            onClick={() => handleQuickReject(n.id)}
                            disabled={actionLoadingId === n.id}
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {n.status === 'Approved' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:hover:bg-amber-900 text-xs gap-1 px-2"
                            onClick={() => {
                              setWaTarget(n);
                              setWaInitialTemplate('reminder');
                              setWaModalOpen(true);
                            }}
                            title="Kirim Chat WA Tagihan / Jatuh Tempo"
                          >
                            <Bell className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            WA Tagihan
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1 px-2.5"
                            onClick={() => handleQuickLunas(n.id)}
                            disabled={actionLoadingId === n.id}
                            title="Tandai Lunas"
                          >
                            {actionLoadingId === n.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <BadgeCheck className="h-3.5 w-3.5" />
                            )}
                            Lunas
                          </Button>
                        </>
                      )}

                      {isSuperAdmin && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400"
                          onClick={() => setDeleteTarget(n)}
                          title="Hapus Data Nasabah (Super Admin)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Menampilkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-200"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <DetailModal
        nasabah={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStatusChange={handleStatusChange}
      />

      {/* Delete Confirmation Modal (Super Admin) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800">
                  Konfirmasi Hapus Data Nasabah
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Aksi ini membutuhkan hak akses Super Admin.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-sm text-slate-600">
            Apakah kamu ingin menghapus data peminjam{' '}
            <span className="font-semibold text-slate-900">{deleteTarget?.nama}</span> (ID:{' '}
            <span className="font-mono text-slate-800">{deleteTarget?.id}</span>)?
            <p className="mt-2 text-xs text-rose-600/90 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">
              ⚠️ Data akan terhapus permanen dari spreadsheet dan database sistem.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="gap-2 bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Ya, Hapus Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Auto Text Modal */}
      <WaNotificationModal
        nasabah={waTarget}
        open={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        initialTemplate={waInitialTemplate}
      />
    </Card>
  );
}
