'use client';

import { useState, useMemo } from 'react';
import { Bell, CircleCheck as CheckCircle, MessageCircle, ChevronDown, ChevronUp, X, Calendar, Clock, UserCheck, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate, formatRupiah, cn } from '@/lib/utils';
import { updateStatus } from '@/lib/api';
import { toast } from 'sonner';
import type { Nasabah } from '@/types';

interface DashboardRemindersProps {
  data: Nasabah[];
  onDataChange?: () => void;
}

export function JatuhTempoReminderBanner({ data, onDataChange }: DashboardRemindersProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'due'>('pending');
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Pending Applications needing Approval
  const pendingApprovals = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return data.filter((n) => n.status === 'Pending');
  }, [data]);

  // 2. Approved nasabah due within 2 days (or overdue)
  const dueReminders = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data
      .filter((n) => {
        if (n.status !== 'Approved' || !n.tanggalJatuhTempo) return false;
        const dueDate = new Date(n.tanggalJatuhTempo);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
      })
      .map((n) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(n.tanggalJatuhTempo!);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let statusText = `H-${diffDays} Jatuh Tempo`;
        let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';

        if (diffDays < 0) {
          statusText = `Terlambat ${Math.abs(diffDays)} Hari!`;
          badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-bold';
        } else if (diffDays === 0) {
          statusText = 'Jatuh Tempo Hari Ini!';
          badgeColor = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-bold animate-pulse';
        } else if (diffDays === 1) {
          statusText = 'Jatuh Tempo Besok (H-1)';
          badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
        } else if (diffDays === 2) {
          statusText = 'H-2 Jatuh Tempo';
          badgeColor = 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
        }

        return {
          nasabah: n,
          diffDays,
          statusText,
          badgeColor,
        };
      });
  }, [data]);

  const totalRemindersCount = pendingApprovals.length + dueReminders.length;

  if (dismissed || totalRemindersCount === 0) {
    return null;
  }

  const handleQuickApprove = async (id: string, nama: string) => {
    setActionLoadingId(id);
    try {
      await updateStatus(id, 'Approved');
      toast.success(`Pengajuan ${nama} (${id}) berhasil disetujui!`);
      if (onDataChange) onDataChange();
    } catch {
      toast.error('Gagal menyetujui pengajuan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleWhatsAppFollowUp = (n: Nasabah, type: 'approval' | 'due', statusText?: string) => {
    const wa = (n.whatsapp || '').replace(/[^0-9]/g, '');
    let cleanWa = wa;
    if (cleanWa.startsWith('0')) {
      cleanWa = '62' + cleanWa.slice(1);
    }

    let msg = '';
    if (type === 'approval') {
      msg = `Halo Sdr/i *${n.nama}*,\n\nPengajuan pinjaman Anda sebesar *${formatRupiah(Number(n.jumlahPinjaman) || 0)}* di LMS saat ini sedang ditinjau oleh tim analis kami.\n\nMohon siapkan kelengkapan dokumen pendukung. Terima kasih!`;
    } else {
      msg = `Halo Sdr/i *${n.nama}*,\n\nSalam dari Manajemen Pinjaman LMS.\nKami ingatkan kembali pengajuan pinjaman Anda sebesar *${formatRupiah(Number(n.jumlahPinjaman) || 0)}* dengan status *${statusText || 'Aktif'}* (Jatuh Tempo: ${formatDate(n.tanggalJatuhTempo || '')}).\n\nMohon untuk dapat melakukan konfirmasi pembayaran. Terima kasih!`;
    }

    window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="rounded-2xl border border-blue-200/90 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-amber-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 p-4 shadow-sm transition-all text-slate-800 dark:text-slate-100">
      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 dark:bg-blue-500 p-2.5 text-white shadow-sm shrink-0">
            <Bell className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Pemberitahuan & Pengingat Operasional LMS
              </h4>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {totalRemindersCount} Perlunya Tindakan
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Monitoring persetujuan (approval) pengajuan pending & jatuh tempo pembayaran H-2.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2">
          {/* Tab buttons */}
          <div className="flex items-center bg-white/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('pending');
                setCollapsed(false);
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex-1 sm:flex-none whitespace-nowrap',
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Approval Pending ({pendingApprovals.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('due');
                setCollapsed(false);
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex-1 sm:flex-none whitespace-nowrap',
                activeTab === 'due'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              Jatuh Tempo ({dueReminders.length})
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 px-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              title="Tutup pengingat"
              className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {!collapsed && (
        <div className="mt-3.5 space-y-2 border-t border-slate-200/80 dark:border-slate-700/80 pt-3">
          {/* TAB 1: PENDING APPROVAL REMINDER */}
          {activeTab === 'pending' && (
            <div>
              {pendingApprovals.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                  Tidak ada pengajuan pending yang memerlukan approval saat ini.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingApprovals.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-800 p-3 shadow-2xs hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.nama}</p>
                          <span className="rounded bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 px-1.5 py-0.2 text-[10px] font-semibold">
                            Pending Approval
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pinjaman:{' '}
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatRupiah(Number(n.jumlahPinjaman) || 0)}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Pengajuan: {formatDate(n.tanggalPengajuan)} ({n.lokasi || 'N/A'})
                        </p>
                      </div>

                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          size="sm"
                          disabled={actionLoadingId === n.id}
                          onClick={() => handleQuickApprove(n.id, n.nama)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-6 px-2 gap-1 font-semibold shadow-xs"
                        >
                          <UserCheck className="h-3 w-3" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsAppFollowUp(n, 'approval')}
                          className="text-[10px] h-6 px-2 gap-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          Chat WA
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DUE DATE REMINDER (H-2 & OVERDUE) */}
          {activeTab === 'due' && (
            <div>
              {dueReminders.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic py-2">
                  Tidak ada nasabah aktif yang mendekati jatuh tempo (H-2) saat ini.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dueReminders.map(({ nasabah: n, statusText, badgeColor }) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between rounded-xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-slate-800 p-3 shadow-2xs hover:shadow-sm transition-shadow"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.nama}</p>
                          <span className={cn('rounded px-1.5 py-0.2 text-[10px] border', badgeColor)}>
                            {statusText}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pinjaman:{' '}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatRupiah(Number(n.jumlahPinjaman) || 0)}
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          Tempo: {formatDate(n.tanggalJatuhTempo || '')}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleWhatsAppFollowUp(n, 'due', statusText)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 gap-1 shrink-0 shadow-xs"
                      >
                        <MessageCircle className="h-3 w-3" />
                        WA
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
