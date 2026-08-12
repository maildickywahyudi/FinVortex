'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Send, X, CreditCard, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getNasabah, updateStatus } from '@/lib/api';
import { formatDate, formatRupiah, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Nasabah } from '@/types';

interface NotificationBellProps {
  data?: Nasabah[];
  onDataChange?: () => void;
}

export function NotificationBell({ data: externalData, onDataChange }: NotificationBellProps) {
  const [internalData, setInternalData] = useState<Nasabah[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'disburse' | 'due'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const listData = externalData || internalData;

  const loadData = () => {
    getNasabah().then((res) => {
      setInternalData(res);
    });
  };

  useEffect(() => {
    if (!externalData) {
      loadData();
    }
    const handleUpdate = () => {
      if (onDataChange) onDataChange();
      loadData();
    };

    window.addEventListener('lms_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('lms_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [externalData, onDataChange]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Categorize notifications
  const pendingItems = useMemo(() => {
    return listData.filter((n) => n.status === 'Pending');
  }, [listData]);

  const disburseItems = useMemo(() => {
    // Approved nasabah needing/recently transferred dana
    return listData.filter((n) => n.status === 'Approved');
  }, [listData]);

  const dueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return listData
      .filter((n) => {
        if (n.status !== 'Approved' || !n.tanggalJatuhTempo) return false;
        const dueDate = new Date(n.tanggalJatuhTempo);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 2;
      })
      .map((n) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(n.tanggalJatuhTempo!);
        dueDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let statusText = `H-${diffDays} Jatuh Tempo`;
        let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';

        if (diffDays < 0) {
          statusText = `Terlambat ${Math.abs(diffDays)} Hari!`;
          badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-bold';
        } else if (diffDays === 0) {
          statusText = 'Jatuh Tempo Hari Ini!';
          badgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 font-bold animate-pulse';
        } else if (diffDays === 1) {
          statusText = 'Jatuh Tempo Besok';
          badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
        }

        return { nasabah: n, diffDays, statusText, badgeStyle };
      });
  }, [listData]);

  const totalUnreadCount = pendingItems.length + dueItems.length;

  const handleQuickApprove = async (id: string, nama: string) => {
    setActionLoadingId(id);
    try {
      await updateStatus(id, 'Approved');
      toast.success(`Pengajuan ${nama} (${id}) disetujui!`);
      if (onDataChange) onDataChange();
      loadData();
    } catch {
      toast.error('Gagal menyetujui pengajuan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const openWhatsApp = (n: Nasabah, type: 'approval' | 'disburse' | 'due', statusText?: string) => {
    const wa = (n.whatsapp || '').replace(/[^0-9]/g, '');
    let cleanWa = wa;
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);

    const rek = n.bankOrEwallet
      ? `${n.bankOrEwallet} (${n.nomorRekening || '-'}) a/n ${n.namaPemilikRekening || n.nama}`
      : 'Rekening Terdaftar';

    let msg = '';
    if (type === 'approval') {
      msg = `Halo *${n.nama}*,\n\nPengajuan pinjaman Anda ID *${n.id}* sebesar *${formatRupiah(n.jumlahPinjaman)}* sedang diproses oleh verifikator LMS.\n\nTerima kasih!`;
    } else if (type === 'disburse') {
      msg = `Halo *${n.nama}*,\n\nSelamat! Pengajuan pinjaman Anda dengan ID *${n.id}* telah *DISETUJUI (APPROVED)* 🎉\n\n*Informasi Pencairan Dana:*\nDana akan ditransfer otomatis melalui rekening / E-Wallet terdaftar:\n• Bank/E-Wallet: *${n.bankOrEwallet || '-'}*\n• No. Rekening: *${n.nomorRekening || '-'}*\n• Nama Pemilik: *${n.namaPemilikRekening || n.nama}*\n\nMohon cek saldo Anda secara berkala. Terima kasih!`;
    } else {
      msg = `Halo *${n.nama}*,\n\nPengingat tagihan pinjaman ID *${n.id}* status *${statusText || 'Aktif'}* (Jatuh Tempo: ${formatDate(n.tanggalJatuhTempo || '')}).\nTotal Wajib Bayar: *${formatRupiah(n.jumlahPinjaman)}*.\n\nMohon lakukan konfirmasi pembayaran. Terima kasih!`;
    }

    window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Pemberitahuan Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-black/5 animate-in fade-in-50 zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-900 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold tracking-tight">Notifikasi LMS</span>
              {totalUnreadCount > 0 && (
                <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold">
                  {totalUnreadCount} Perlu Action
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex items-center border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition-colors',
                activeTab === 'all' ? 'bg-white dark:bg-slate-700 font-bold text-blue-600 dark:text-blue-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              Semua ({pendingItems.length + dueItems.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition-colors',
                activeTab === 'pending' ? 'bg-white dark:bg-slate-700 font-bold text-amber-600 dark:text-amber-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              onClick={() => setActiveTab('disburse')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition-colors',
                activeTab === 'disburse' ? 'bg-white dark:bg-slate-700 font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              Transfer ({disburseItems.length})
            </button>
            <button
              onClick={() => setActiveTab('due')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-center transition-colors',
                activeTab === 'due' ? 'bg-white dark:bg-slate-700 font-bold text-rose-600 dark:text-rose-400 shadow-2xs' : 'hover:text-slate-900 dark:hover:text-slate-200',
              )}
            >
              Tempo ({dueItems.length})
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1 scrollbar-thin">
            {/* PENDING NOTIFICATIONS */}
            {(activeTab === 'all' || activeTab === 'pending') && pendingItems.length > 0 && (
              <div className="space-y-1">
                <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pengajuan Pending Approval
                </p>
                {pendingItems.map((n) => (
                  <div
                    key={`p-${n.id}`}
                    className="flex items-center justify-between rounded-xl bg-amber-50/50 dark:bg-amber-950/30 p-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors border border-amber-100 dark:border-amber-900/50"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.nama}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Rp {Number(n.jumlahPinjaman).toLocaleString('id-ID')} • {n.tenor} Hari
                      </p>
                      <p className="text-[10px] text-slate-400">ID: {n.id} • {formatDate(n.tanggalPengajuan)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        disabled={actionLoadingId === n.id}
                        onClick={() => handleQuickApprove(n.id, n.nama)}
                        className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        Setujui
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openWhatsApp(n, 'approval')}
                        title="Chat WA Pembukaan"
                        className="h-6 w-6 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DISBURSEMENT / TRANSFER NOTIFICATIONS */}
            {(activeTab === 'all' || activeTab === 'disburse') && disburseItems.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Dana Disetujui & Siap Transfer
                </p>
                {disburseItems.slice(0, 5).map((n) => (
                  <div
                    key={`d-${n.id}`}
                    className="flex items-center justify-between rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors border border-emerald-100 dark:border-emerald-900/50"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.nama}</p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Cair: {formatRupiah(n.jumlahPinjaman)}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate">
                        {n.bankOrEwallet || 'Rekening'} • {n.nomorRekening || '-'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openWhatsApp(n, 'disburse')}
                      className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <Send className="h-3 w-3" />
                      WA Transfer
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* DUE DATE NOTIFICATIONS */}
            {(activeTab === 'all' || activeTab === 'due') && dueItems.length > 0 && (
              <div className="space-y-1 pt-1">
                <p className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Pengingat Tagihan & Jatuh Tempo
                </p>
                {dueItems.map(({ nasabah: n, statusText, badgeStyle }) => (
                  <div
                    key={`t-${n.id}`}
                    className="flex items-center justify-between rounded-xl bg-rose-50/50 dark:bg-rose-950/30 p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors border border-rose-100 dark:border-rose-900/50"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{n.nama}</p>
                        <span className={cn('text-[9px] px-1 py-0.2 rounded border', badgeStyle)}>
                          {statusText}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Tagihan: {formatRupiah(n.jumlahPinjaman)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openWhatsApp(n, 'due', statusText)}
                      className="h-6 px-2 text-[10px] bg-rose-600 hover:bg-rose-700 text-white gap-1"
                    >
                      <MessageCircle className="h-3 w-3" />
                      WA Tagihan
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY STATE */}
            {((activeTab === 'pending' && pendingItems.length === 0) ||
              (activeTab === 'disburse' && disburseItems.length === 0) ||
              (activeTab === 'due' && dueItems.length === 0) ||
              (activeTab === 'all' && pendingItems.length === 0 && dueItems.length === 0 && disburseItems.length === 0)) && (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-500 dark:text-emerald-400 mb-2 opacity-80" />
                Semua notifikasi operasional sudah bersih.
              </div>
            )}
          </div>

          {/* Footer Link */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-2 text-center text-[11px]">
            <a
              href="/admin/table"
              onClick={() => setOpen(false)}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
            >
              Buka Semua Data Nasabah <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
