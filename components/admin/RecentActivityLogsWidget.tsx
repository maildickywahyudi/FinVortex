'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, Clock, Activity, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAdminLogs } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { AdminActivityLog } from '@/types';
import Link from 'next/link';

export function RecentActivityLogsWidget() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);

  const loadLogs = () => {
    const data = getAdminLogs();
    setLogs(data.slice(0, 5));
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener('lms_logs_updated', handleUpdate);
    return () => window.removeEventListener('lms_logs_updated', handleUpdate);
  }, []);

  const getBadge = (type: AdminActivityLog['actionType']) => {
    switch (type) {
      case 'STATUS_UPDATE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0">
            Status
          </Badge>
        );
      case 'CONFIG_UPDATE':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 text-[10px] px-1.5 py-0">
            Konfigurasi
          </Badge>
        );
      case 'ADMIN_USER_CHANGE':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 text-[10px] px-1.5 py-0">
            Admin
          </Badge>
        );
      case 'NASABAH_DELETE':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800 text-[10px] px-1.5 py-0">
            Hapus
          </Badge>
        );
      case 'RESTORE_AUTO_REJECT':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 text-[10px] px-1.5 py-0">
            Restore
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
    }
  };

  return (
    <Card className="p-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Log Aktivitas Terbaru</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">5 tindakan administratif terakhir</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          asChild
          className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 gap-1 px-2"
        >
          <Link href="/admin/activity-logs">
            Lihat Semua
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            <Activity className="mx-auto h-6 w-6 mb-1 opacity-50" />
            Belum ada aktivitas admin tercatat.
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50 p-2.5 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{log.adminName}</span>
                  {getBadge(log.actionType)}
                  {log.targetId && (
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      #{log.targetId}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                  {log.description}
                </p>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap text-right shrink-0">
                {formatDate(log.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
