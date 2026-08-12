'use client';

import { useState, useEffect } from 'react';
import { CalendarReminder } from '@/components/admin/CalendarReminder';
import { getNasabah } from '@/lib/api';
import type { Nasabah } from '@/types';
import { Home, ChevronRight, CalendarClock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function CalendarPage() {
  const [data, setData] = useState<Nasabah[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNasabah().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  const upcoming = data
    .filter((d) => d.status === 'Approved' && d.tanggalJatuhTempo)
    .sort((a, b) => new Date(a.tanggalJatuhTempo!).getTime() - new Date(b.tanggalJatuhTempo!).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Home className="h-4 w-4" />
        <span>Home</span>
        <ChevronRight className="h-3 w-3" />
        <span className="font-medium text-slate-700 dark:text-slate-200">Kalender</span>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Kalender Jatuh Tempo</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pantau tanggal jatuh tempo pinjaman yang telah disetujui</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {loading ? (
          <div className="flex h-64 items-center justify-center lg:col-span-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : (
          <>
            <CalendarReminder data={data} />
            <div className="glass rounded-2xl border border-border/50 dark:border-slate-800 dark:bg-slate-900/90 p-5 soft-shadow">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <h3 className="font-semibold text-slate-800 dark:text-white">Jatuh Tempo Terdekat</h3>
              </div>
              <div className="space-y-3">
                {upcoming.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between rounded-xl border border-border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/60 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.nama}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{n.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
                        {new Intl.DateTimeFormat('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(n.tanggalJatuhTempo!))}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatRupiahShort(n.jumlahPinjaman)}
                      </p>
                    </div>
                  </div>
                ))}
                {upcoming.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">Tidak ada jatuh tempo mendatang</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatRupiahShort(v: number): string {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
}
