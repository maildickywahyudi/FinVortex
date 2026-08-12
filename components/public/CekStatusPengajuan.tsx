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
  Upload,
  Receipt,
  Download,
  Image as ImageIcon,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { getNasabah, submitRepayment, calculateNasabahProfit } from '@/lib/api';
import { formatRupiah, cn } from '@/lib/utils';
import type { Nasabah, RepaymentItem } from '@/types';
import { PrintableDocumentModal } from '@/components/admin/PrintableDocumentModal';
import { toast } from 'sonner';

export function CekStatusPengajuan() {
  const [lnInput, setLnInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Nasabah | null>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Repayment form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [jumlahBayarInput, setJumlahBayarInput] = useState('');
  const [catatanInput, setCatatanInput] = useState('');
  const [buktiImage, setBuktiImage] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

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
      const allData = await getNasabah({ forceRefresh: true });
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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBuktiImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const calculateAutoNominal = (n: Nasabah): number => {
    const profit = calculateNasabahProfit(n);
    const totalWajib = parseAmount(n.jumlahPinjaman) + profit;
    const verifiedPaid = (n.repaymentHistory || [])
      .filter((r) => r.status === 'VERIFIED')
      .reduce((sum, r) => sum + r.jumlahBayar, 0);

    if (n.modeCicilan === 'BUNGA_SAJA') {
      return profit > 0 ? profit : 30000;
    }

    if (n.sisaPinjaman !== undefined && n.sisaPinjaman > 0) {
      return n.sisaPinjaman;
    }

    return Math.max(0, totalWajib - verifiedPaid);
  };

  const openWhatsAppDocument = (docType: 'SPK' | 'KWITANSI') => {
    if (!result) return;
    const wa = (result.whatsapp || '').replace(/[^0-9]/g, '');
    let cleanWa = wa;
    if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);

    const profit = calculateNasabahProfit(result);
    const totalWajib = parseAmount(result.jumlahPinjaman) + profit;

    let msg = '';
    if (docType === 'SPK') {
      msg = `Halo *${result.nama}*,\n\nBerikut kami sampaikan konfirmasi *Surat Perjanjian Kerja (SPK)* resmi pinjaman Anda.\n\n*Rincian Akad SPK:*\n• ID Pengajuan: *${result.id}*\n• Nama Pemohon: *${result.nama}*\n• Pokok Pinjaman: *${formatRupiah(result.jumlahPinjaman)}*\n• Tenor: *${result.tenor} Hari*\n• Total Pengembalian: *${formatRupiah(totalWajib)}*\n• Tanggal Jatuh Tempo: *${result.tanggalJatuhTempo || '-'}*\n\nHarap simpan bukti SPK ini sebagai acuan transaksi resmi. Terima kasih!`;
    } else {
      msg = `Halo *${result.nama}*,\n\nBerikut adalah *Kwitansi Pencairan Dana* resmi dari LMS Finance:\n\n*Detail Kwitansi Pencairan:*\n• ID Transaksi: *${result.id}*\n• Penerima: *${result.nama}*\n• Rekening Tujuan: *${result.bankOrEwallet || '-'} (${result.nomorRekening || '-'})*\n• Nominal Dicairkan: *${formatRupiah(result.jumlahPinjaman)}*\n• Status: *BERHASIL DITRANSFER / DICAIRKAN*\n\nTerima kasih telah bertransaksi bersama kami!`;
    }

    window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSubmitRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;

    const nominalAuto = calculateAutoNominal(result);
    if (!nominalAuto || nominalAuto <= 0) {
      toast.error('Tagihan pinjaman Anda telah lunas');
      return;
    }
    if (!buktiImage) {
      toast.error('Silakan unggah foto / tangkapan layar bukti transfer');
      return;
    }

    setSubmittingPayment(true);
    try {
      const newItem = await submitRepayment(result.id, nominalAuto, buktiImage, catatanInput);
      toast.success('Bukti pembayaran berhasil diunggah! Menunggu konfirmasi admin.');

      // Update local view
      const updatedHistory = [newItem, ...(result.repaymentHistory || [])];
      setResult({
        ...result,
        repaymentHistory: updatedHistory,
      });

      setShowUploadModal(false);
      setCatatanInput('');
      setBuktiImage('');
    } catch (err) {
      toast.error('Gagal mengunggah bukti pembayaran. Silakan coba lagi.');
    } finally {
      setSubmittingPayment(false);
    }
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
            <>
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

                {/* E-Contract PDF & WhatsApp Buttons */}
                {(result.status === 'Approved' || result.status === 'Lunas') && (
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPrintModal(true)}
                      className="flex-1 bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200 font-semibold text-xs gap-2 py-2.5 rounded-xl shadow-xs"
                    >
                      <Download className="h-4 w-4 text-blue-600" />
                      Cetak / PDF SPK
                    </Button>
                    <Button
                      type="button"
                      onClick={() => openWhatsAppDocument('SPK')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 py-2.5 px-3 rounded-xl shadow-xs shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Kirim SPK via WA
                    </Button>
                    <Button
                      type="button"
                      onClick={() => openWhatsAppDocument('KWITANSI')}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 py-2.5 px-3 rounded-xl shadow-xs shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Kirim Kwitansi via WA
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Repayment Tracker Module (Active Loan or Lunas) */}
            {(result.status === 'Approved' || result.status === 'Lunas') && (
              <Card className="p-5 rounded-2xl border border-slate-200 shadow-md bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-emerald-600" />
                      Modul Pembayaran Angsuran & Pelunasan
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pantau tagihan dan unggah bukti transfer pembayaran Anda secara aman.
                    </p>
                  </div>

                  {result.status !== 'Lunas' && (
                    <Button
                      type="button"
                      onClick={() => setShowUploadModal(!showUploadModal)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 px-4 h-9 rounded-xl shadow-xs shrink-0"
                    >
                      <Upload className="h-4 w-4" />
                      {showUploadModal ? 'Tutup Form Upload' : 'Upload Bukti Bayar'}
                    </Button>
                  )}
                </div>

                {/* Calculation Overview */}
                {(() => {
                  const profit = calculateNasabahProfit(result);
                  const totalWajib = parseAmount(result.jumlahPinjaman) + profit;
                  const verifiedPaid = (result.repaymentHistory || [])
                    .filter((r) => r.status === 'VERIFIED')
                    .reduce((sum, r) => sum + r.jumlahBayar, 0);
                  const sisaTagihan = result.sisaPinjaman !== undefined ? result.sisaPinjaman : Math.max(0, totalWajib - verifiedPaid);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-slate-400 block mb-1 font-medium">Total Pokok & Bunga</span>
                        <span className="font-bold text-slate-800 text-base">{formatRupiah(totalWajib)}</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                        <span className="text-emerald-700 block mb-1 font-medium">Total Terverifikasi Bayar</span>
                        <span className="font-bold text-emerald-700 text-base">{formatRupiah(verifiedPaid)}</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
                        <span className="text-amber-800 block mb-1 font-medium">Sisa Tagihan Saat Ini</span>
                        <span className="font-bold text-amber-900 text-base">{formatRupiah(sisaTagihan)}</span>
                        {result.modeCicilan === 'BUNGA_SAJA' && (
                          <span className="text-[10px] font-bold text-amber-700 block mt-1">
                            • Mode: Bayar Bunga Saja (Rollover)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Form Upload Bukti Bayar */}
                {showUploadModal && result.status !== 'Lunas' && (
                  <form onSubmit={handleSubmitRepayment} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5 animate-fade-in">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Upload className="h-4 w-4 text-emerald-600" />
                      Formulir Setor Bukti Bayar
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 font-medium flex items-center justify-between">
                          <span>Nominal Yang Wajib Dibayar</span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded">Otomatis System</span>
                        </Label>
                        <div className="h-10 px-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-sm">
                            {formatRupiah(calculateAutoNominal(result))}
                          </span>
                          <span className="text-[10px] text-slate-500 italic">Dikunci System</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-600 font-medium">Catatan / Keterangan (Opsional)</Label>
                        <Input
                          type="text"
                          value={catatanInput}
                          onChange={(e) => setCatatanInput(e.target.value)}
                          placeholder="Contoh: Transfer via BCA a.n Andi"
                          className="h-10 text-xs bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600 font-medium">Upload Struk / Foto Bukti Transfer</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="h-10 text-xs bg-white border-slate-200 cursor-pointer"
                      />
                      {buktiImage && (
                        <div className="mt-2 p-2 rounded-lg bg-white border border-slate-200 flex items-center gap-3">
                          <img src={buktiImage} alt="Preview Bukti Transfer" className="h-14 w-14 object-cover rounded-md border" />
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Foto Siap Diunggah
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={submittingPayment}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-sm gap-2"
                    >
                      {submittingPayment ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Mengirim Bukti...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" /> Kirim Bukti Pembayaran Ke Admin
                        </>
                      )}
                    </Button>
                  </form>
                )}

                {/* History Table */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Riwayat Pembayaran Angsuran:
                  </span>

                  {!result.repaymentHistory || result.repaymentHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl text-center">
                      Belum ada riwayat pembayaran angsuran yang diunggah.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {result.repaymentHistory.map((rpt: RepaymentItem) => (
                        <div
                          key={rpt.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-3">
                            {rpt.buktiUrl && (
                              <a href={rpt.buktiUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                <img
                                  src={rpt.buktiUrl}
                                  alt="Struk"
                                  className="h-12 w-12 object-cover rounded-lg border border-slate-200 hover:scale-105 transition-transform"
                                />
                              </a>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{formatRupiah(rpt.jumlahBayar)}</span>
                                <Badge
                                  className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 border uppercase',
                                    rpt.status === 'VERIFIED' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
                                    rpt.status === 'PENDING_VERIFICATION' && 'bg-amber-100 text-amber-800 border-amber-300',
                                    rpt.status === 'REJECTED' && 'bg-rose-100 text-rose-800 border-rose-300',
                                  )}
                                >
                                  {rpt.status === 'PENDING_VERIFICATION' ? 'Menunggu Verifikasi' : rpt.status === 'VERIFIED' ? 'Disetujui' : 'Ditolak'}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Tanggal: {rpt.tanggalBayar || rpt.submittedAt?.split('T')[0]} {rpt.adminNote ? `• Catatan: ${rpt.adminNote}` : ''}
                              </p>
                              {rpt.denda ? (
                                <span className="text-[11px] text-rose-600 font-semibold block mt-0.5">
                                  Denda Keterlambatan: {formatRupiah(rpt.denda)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {rpt.verifiedBy && (
                            <span className="text-[10px] text-slate-400 italic shrink-0">
                              Diverifikasi oleh: {rpt.verifiedBy}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Modal Print Akad Kontrak */}
            <PrintableDocumentModal
              nasabah={result}
              open={showPrintModal}
              onClose={() => setShowPrintModal(false)}
              defaultDocType="SPK"
            />
          </>
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
