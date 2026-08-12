'use client';

import { useState } from 'react';
import {
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  User,
  Sparkles,
  Copy,
  Check,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { getNasabah } from '@/lib/api';
import { formatRupiah, cn } from '@/lib/utils';
import type { Nasabah } from '@/types';
import { toast } from 'sonner';

export function CekStatusPengajuan() {
  const [lnInput, setLnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Nasabah | null>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = lnInput.trim().toUpperCase();
    if (!cleanInput) {
      toast.error('Masukkan LN Number / ID Pengajuan terlebih dahulu');
      return;
    }

    setLoading(true);
    setSearched(true);
    setResult(null);

    try {
      const allData = await getNasabah();
      const match = (allData || []).find((item) => {
        const itemClean = item.id ? item.id.trim().toUpperCase() : '';
        return itemClean === cleanInput || itemClean.replace(/[^A-Z0-9]/g, '') === cleanInput.replace(/[^A-Z0-9]/g, '');
      });

      if (match) {
        setResult(match);
        toast.success(`Data pengajuan ${match.id} ditemukan!`);
      } else {
        setResult(null);
        toast.error(`LN Number "${cleanInput}" tidak ditemukan di sistem`);
      }
    } catch (err) {
      toast.error('Gagal mengambil data pengajuan. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('ID Pengajuan berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  const parseAmount = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
          <Search className="h-3.5 w-3.5" /> Pengecekan Real-time
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Cek Status Pengajuan Pinjaman</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Masukkan nomor ID Pengajuan (LN Number) yang Anda dapatkan saat mengirimkan formulir pinjaman.
        </p>
      </div>

      {/* Search Input Box */}
      <Card className="p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-md bg-white">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={lnInput}
              onChange={(e) => setLnInput(e.target.value)}
              placeholder="Contoh: LN-2026-0001"
              className="pl-10 h-11 text-sm font-mono uppercase bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !lnInput.trim()}
            className="h-11 bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white font-medium px-6 gap-2 rounded-xl shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Memeriksa...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Cari Status
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* Search Result Display */}
      {searched && !loading && (
        <div className="animate-fade-in space-y-4">
          {result ? (
            <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl bg-white">
              {/* Top Banner based on Status */}
              <div
                className={cn(
                  'p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                  result.status === 'Approved' && 'bg-emerald-500/10 border-emerald-200 text-emerald-900',
                  result.status === 'Pending' && 'bg-amber-500/10 border-amber-200 text-amber-900',
                  result.status === 'Rejected' && 'bg-rose-500/10 border-rose-200 text-rose-900',
                  result.status === 'Lunas' && 'bg-blue-500/10 border-blue-200 text-blue-900',
                )}
              >
                <div className="flex items-start sm:items-center gap-3">
                  {result.status === 'Approved' && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  )}
                  {result.status === 'Pending' && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
                      <Clock className="h-6 w-6 animate-pulse" />
                    </div>
                  )}
                  {result.status === 'Rejected' && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md">
                      <XCircle className="h-6 w-6" />
                    </div>
                  )}
                  {result.status === 'Lunas' && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status Pengajuan:</span>
                      <span
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide',
                          result.status === 'Approved' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                          result.status === 'Pending' && 'bg-amber-100 text-amber-800 border-amber-300',
                          result.status === 'Rejected' && 'bg-rose-100 text-rose-800 border-rose-300',
                          result.status === 'Lunas' && 'bg-blue-100 text-blue-800 border-blue-300',
                        )}
                      >
                        {result.status === 'Pending' ? 'Dalam Pemrosesan' : result.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mt-1">
                      {result.status === 'Approved' && 'Pengajuan Disetujui! 🎉'}
                      {result.status === 'Pending' && 'Pengajuan Sedang Diverifikasi ⏳'}
                      {result.status === 'Rejected' && 'Pengajuan Belum Disetujui ❌'}
                      {result.status === 'Lunas' && 'Pinjaman Telah Lunas ✨'}
                    </h3>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(result.id)}
                  className="shrink-0 gap-1.5 border-slate-300 hover:bg-white text-xs font-mono"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
                  {result.id}
                </Button>
              </div>

              {/* Status Message Explanation */}
              <div className="p-5 space-y-4">
                {result.status === 'Pending' && (
                  <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-950">Tim Analis Sedang Memeriksa Data Anda</p>
                      <p className="mt-0.5 text-amber-800">
                        Pengajuan Anda dalam antrean verifikasi. Proses pengecekan kelayakan membutuhkan waktu 1x24 jam. Hasil resminya akan dikonfirmasi juga melalui WhatsApp.
                      </p>
                    </div>
                  </div>
                )}

                {result.status === 'Approved' && (
                  <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-emerald-950">Selamat! Pinjaman Disetujui</p>
                      <p className="mt-0.5 text-emerald-800">
                        Persetujuan kelayakan kredit telah terverifikasi. Tim keuangan kami sedang memproses pencairan dana pinjaman ke rekening/e-wallet Anda.
                      </p>
                    </div>
                  </div>
                )}

                {result.status === 'Rejected' && (
                  <div className="p-4 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-950 text-xs sm:text-sm leading-relaxed space-y-2">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-rose-950">Mohon Maaf, Pengajuan Tidak Dapat Dilanjutkan</p>
                        <p className="mt-0.5 text-rose-800">
                          Berdasarkan hasil analisa risiko dan kelayakan berkas, pengajuan ini saat ini belum dapat disetujui.
                        </p>
                      </div>
                    </div>

                    {/* Alasan Reject */}
                    <div className="mt-3 p-3 rounded-lg bg-white border border-rose-200">
                      <p className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">
                        Alasan Penolakan:
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-slate-800">
                        {result.alasanReject && result.alasanReject.trim() !== ''
                          ? result.alasanReject
                          : 'Kualifikasi dokumen/verifikasi data kontak belum memenuhi batas standar persetujuan kredit.'}
                      </p>
                    </div>
                  </div>
                )}

                {result.status === 'Lunas' && (
                  <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs sm:text-sm leading-relaxed flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-950">Status: Lunas Terbayar</p>
                      <p className="mt-0.5 text-blue-800">
                        Terima kasih telah menyelesaikan pembayaran tepat waktu. Anda dapat mengajukan pinjaman kembali kapan saja!
                      </p>
                    </div>
                  </div>
                )}

                {/* Details Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Nama Pemohon</span>
                    <span className="font-semibold text-slate-800 text-sm">{result.nama}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Jumlah Pinjaman</span>
                    <span className="font-bold text-blue-700 text-sm">
                      {formatRupiah(parseAmount(result.jumlahPinjaman))}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Tenor</span>
                    <span className="font-semibold text-slate-800 text-sm">{result.tenor || '-'} Hari</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Tanggal Pengajuan</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">{result.tanggalPengajuan || '-'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">WhatsApp</span>
                    <span className="font-mono font-medium text-slate-800 text-xs sm:text-sm">{result.whatsapp}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5 font-medium">Domisili</span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate block">{result.lokasi || '-'}</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 rounded-2xl border border-slate-200 text-center space-y-3 bg-white">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">LN Number Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Pastikan nomor ID yang Anda masukkan sudah benar (misal: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">LN-2026-0001</code>). Jika baru melakukan pengajuan, mohon tunggu beberapa saat.
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
