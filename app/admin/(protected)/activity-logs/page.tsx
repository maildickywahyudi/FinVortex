'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, Search, Trash2, Download, Filter, Clock, Activity, FileSpreadsheet, Settings, RefreshCw, UserCheck, TriangleAlert as AlertTriangle, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAdminLogs, clearAdminLogs } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { AdminActivityLog } from '@/types';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AdminActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const loadLogs = () => {
    const data = getAdminLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
    const handleUpdate = () => loadLogs();
    window.addEventListener('lms_logs_updated', handleUpdate);
    return () => window.removeEventListener('lms_logs_updated', handleUpdate);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        (log.adminEmail || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.adminName || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.targetId || '').toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'ALL') return true;
      return log.actionType === filterType;
    });
  }, [logs, search, filterType]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      statusUpdates: logs.filter((l) => l.actionType === 'STATUS_UPDATE').length,
      configUpdates: logs.filter((l) => l.actionType === 'CONFIG_UPDATE').length,
      adminChanges: logs.filter((l) => l.actionType === 'ADMIN_USER_CHANGE').length,
      deletions: logs.filter((l) => l.actionType === 'NASABAH_DELETE').length,
    };
  }, [logs]);

  const handleClear = () => {
    if (confirm('Apakah Anda yakin ingin menghapus seluruh log aktivitas admin? Tindakan ini tidak dapat dibatalkan.')) {
      clearAdminLogs();
      toast.success('Seluruh log aktivitas admin telah dibersihkan');
      loadLogs();
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('Tidak ada log untuk diekspor');
      return;
    }

    const headers = ['ID Log', 'Waktu', 'Email Admin', 'Nama Admin', 'Jenis Aksi', 'Deskripsi', 'Target ID', 'Detail'];
    const rows = filteredLogs.map((l) => [
      l.id,
      formatDate(l.timestamp),
      l.adminEmail,
      l.adminName,
      l.actionType,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.targetId || '-',
      `"${(l.details || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log_Aktivitas_Admin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Log aktivitas berhasil diekspor ke CSV');
  };

  const getActionBadge = (type: AdminActivityLog['actionType']) => {
    switch (type) {
      case 'STATUS_UPDATE':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
            Perubahan Status
          </Badge>
        );
      case 'CONFIG_UPDATE':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            Perubahan Konfigurasi
          </Badge>
        );
      case 'ADMIN_USER_CHANGE':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            Manajemen Admin
          </Badge>
        );
      case 'NASABAH_DELETE':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
            Hapus Nasabah
          </Badge>
        );
      case 'RESTORE_AUTO_REJECT':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
            Pemulihan Auto-Reject
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log Aktivitas Admin</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit trail & histori tindakan administratif untuk keamanan dan verifikasi data
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            className="text-xs gap-1.5 border-slate-300 dark:border-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </Button>
          {logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-xs gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bersihkan Log
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total Log Aktivitas</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perubahan Status Nasabah</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.statusUpdates}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Perubahan Konfigurasi</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.configUpdates}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Settings className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Penghapusan Nasabah</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{stats.deletions}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Trash2 className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-slate-200 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Cari berdasarkan nama admin, email, ID pengajuan, atau kata kunci..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            <Button
              size="sm"
              variant={filterType === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilterType('ALL')}
              className="h-8 text-xs"
            >
              Semua ({stats.total})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'STATUS_UPDATE' ? 'default' : 'outline'}
              onClick={() => setFilterType('STATUS_UPDATE')}
              className="h-8 text-xs"
            >
              Status ({stats.statusUpdates})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'CONFIG_UPDATE' ? 'default' : 'outline'}
              onClick={() => setFilterType('CONFIG_UPDATE')}
              className="h-8 text-xs"
            >
              Konfigurasi ({stats.configUpdates})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'ADMIN_USER_CHANGE' ? 'default' : 'outline'}
              onClick={() => setFilterType('ADMIN_USER_CHANGE')}
              className="h-8 text-xs"
            >
              Akun Admin ({stats.adminChanges})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'NASABAH_DELETE' ? 'default' : 'outline'}
              onClick={() => setFilterType('NASABAH_DELETE')}
              className="h-8 text-xs"
            >
              Penghapusan ({stats.deletions})
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Waktu & Tanggal</th>
                  <th className="p-3">Petugas Admin</th>
                  <th className="p-3">Kategori Aksi</th>
                  <th className="p-3">Keterangan / Deskripsi</th>
                  <th className="p-3 text-right">Target ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      <Clock className="mx-auto h-8 w-8 mb-2 opacity-50 text-slate-400 dark:text-slate-500" />
                      Belum ada catatan log aktivitas admin yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        <div>{log.adminName || 'Admin'}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{log.adminEmail}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap">{getActionBadge(log.actionType)}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        <p className="font-medium">{log.description}</p>
                        {log.details && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{log.details}</p>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                        {log.targetId || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
