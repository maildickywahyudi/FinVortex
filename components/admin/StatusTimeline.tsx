'use client';

import {
  Clock,
  CheckCircle,
  XCircle,
  BadgeCheck,
  User,
  ShieldCheck,
  Bot,
  Calendar,
  FileText,
} from 'lucide-react';
import type { StatusHistoryItem, StatusPengajuan } from '@/types';
import { formatDate } from '@/lib/utils';

interface StatusTimelineProps {
  history?: StatusHistoryItem[];
  currentStatus: StatusPengajuan;
  tanggalPengajuan: string;
}

export function StatusTimeline({ history, currentStatus, tanggalPengajuan }: StatusTimelineProps) {
  // Ensure there's at least an initial entry if history is empty
  const timelineItems: StatusHistoryItem[] =
    history && history.length > 0
      ? history
      : [
          {
            status: 'Pending',
            updatedAt: tanggalPengajuan || new Date().toISOString(),
            updatedBy: 'Nasabah (Form Pengajuan)',
            note: 'Pengajuan baru diterima oleh sistem',
          },
        ];

  const getStatusBadge = (status: StatusPengajuan) => {
    switch (status) {
      case 'Approved':
        return {
          label: 'DISETUJUI (APPROVED)',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          icon: <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
          dotColor: 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-900/50',
        };
      case 'Rejected':
        return {
          label: 'DITOLAK (REJECTED)',
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
          icon: <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />,
          dotColor: 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-900/50',
        };
      case 'Lunas':
        return {
          label: 'LUNAS (COMPLETED)',
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          icon: <BadgeCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
          dotColor: 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/50',
        };
      default:
        return {
          label: 'MENUNGGU VERIFIKASI (PENDING)',
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
          icon: <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
          dotColor: 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/50',
        };
    };
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Riwayat Status Pinjaman (Timeline)
          </h4>
        </div>
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          {timelineItems.length} Perubahan Status
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {timelineItems.map((item, idx) => {
          const config = getStatusBadge(item.status);
          const isLatest = idx === timelineItems.length - 1;

          let ActorIcon = User;
          if (item.updatedBy.includes('Auto-Reject') || item.updatedBy.includes('Sistem')) {
            ActorIcon = Bot;
          } else if (item.updatedBy.includes('Admin') || item.updatedBy.includes('Super')) {
            ActorIcon = ShieldCheck;
          }

          return (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div
                className={`absolute -left-6 top-1 h-3 w-3 rounded-full transition-all ${config.dotColor}`}
              />

              {/* Item Card */}
              <div
                className={`rounded-xl border p-3.5 transition-all ${
                  isLatest
                    ? 'border-blue-200 bg-blue-50/20 shadow-2xs dark:border-blue-800/60 dark:bg-blue-950/20'
                    : 'border-slate-200/80 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${config.bg}`}
                    >
                      {config.icon}
                      {config.label}
                    </span>
                    {isLatest && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white tracking-wide">
                        Status Saat Ini
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    <span>{formatDate(item.updatedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <ActorIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Oleh: <strong className="text-slate-900 dark:text-white">{item.updatedBy}</strong></span>
                  </div>
                </div>

                {item.note && (
                  <div className="mt-2.5 rounded-lg bg-white/80 p-2.5 text-xs text-slate-600 border border-slate-200/60 dark:bg-slate-850 dark:border-slate-800 dark:text-slate-300 flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item.note}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
