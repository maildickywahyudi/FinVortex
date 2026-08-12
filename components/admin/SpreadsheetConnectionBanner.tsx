'use client';

import { useState, useEffect } from 'react';
import { Database, AlertTriangle, CheckCircle, RefreshCw, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEffectiveAppsScriptUrl, testConnection } from '@/lib/api';
import Link from 'next/link';

export function SpreadsheetConnectionBanner() {
  const [url, setUrl] = useState<string>('');
  const [status, setStatus] = useState<'testing' | 'connected' | 'disconnected' | 'not_configured'>('testing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    const scriptUrl = getEffectiveAppsScriptUrl();
    setUrl(scriptUrl);

    if (!scriptUrl) {
      setStatus('not_configured');
      setChecking(false);
      return;
    }

    try {
      const res = await testConnection(scriptUrl);
      if (res.ok) {
        setStatus('connected');
        setErrorMessage('');
      } else {
        setStatus('disconnected');
        setErrorMessage(res.message || 'Respons dari Google Apps Script tidak valid');
      }
    } catch (err) {
      setStatus('disconnected');
      setErrorMessage(err instanceof Error ? err.message : 'Koneksi gagal atau di-block CORS');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const handleConfigChange = () => checkHealth();
    window.addEventListener('lms_config_updated', handleConfigChange);
    return () => window.removeEventListener('lms_config_updated', handleConfigChange);
  }, []);

  if (status === 'connected') {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-emerald-950 dark:text-emerald-200">
              Terhubung ke Google Spreadsheet
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
              Sinkronisasi data pengajuan secara terpusat aktif ({url.slice(0, 45)}...)
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkHealth}
          disabled={checking}
          className="h-7 text-[11px] text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 gap-1 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
          Tes Ulang
        </Button>
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50/90 p-3.5 text-xs text-rose-950 shadow-xs dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 mt-0.5">
            <AlertTriangle className="h-5 w-5 animate-bounce" />
          </div>
          <div>
            <p className="font-bold text-rose-950 dark:text-rose-100 flex items-center gap-1.5">
              <span>Gagal Terhubung ke Google Spreadsheet!</span>
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold text-white">
                PERINGATAN SINKRONISASI
              </span>
            </p>
            <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5 leading-relaxed">
              Koneksi ke Web App URL mengalami kendala ({errorMessage}). Data pengajuan saat ini dialihkan ke penyimpanan sementara browser (Offline Storage).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            disabled={checking}
            className="h-8 text-xs border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-700 dark:text-rose-200 dark:hover:bg-rose-900"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${checking ? 'animate-spin' : ''}`} />
            Tes Ulang
          </Button>
          <Button
            size="sm"
            asChild
            className="h-8 text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold gap-1"
          >
            <Link href="/admin/settings">
              Perbaiki URL
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Not configured / local storage mode notice
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 mt-0.5">
          <Database className="h-4 w-4" />
        </div>
        <div>
          <p className="font-bold text-amber-950 dark:text-amber-100">
            Mode Penyimpanan Lokal (Offline Storage)
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
            Aplikasi belum terhubung dengan Google Spreadsheet terpusat. Untuk menyimpan data secara otomatis di Google Drive/Sheets Anda, hubungkan Web App URL di Pengaturan.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        asChild
        variant="outline"
        className="h-8 text-xs border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/60 font-medium shrink-0 gap-1 self-end sm:self-auto"
      >
        <Link href="/admin/settings">
          Hubungkan Spreadsheet
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
