'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, FileText, CircleCheck as CheckCircle, ShieldCheck, Building, Sparkles } from 'lucide-react';
import type { Nasabah } from '@/types';
import { formatRupiah, formatDate, calculateNasabahProfit } from '@/lib/utils';

interface PrintableDocumentModalProps {
  nasabah: Nasabah | null;
  open: boolean;
  onClose: () => void;
  defaultDocType?: 'SPK' | 'KWITANSI_DISBURSE' | 'KWITANSI_LUNAS';
}

export function PrintableDocumentModal({
  nasabah,
  open,
  onClose,
  defaultDocType = 'SPK',
}: PrintableDocumentModalProps) {
  const [docType, setDocType] = useState<'SPK' | 'KWITANSI_DISBURSE' | 'KWITANSI_LUNAS'>(defaultDocType);

  if (!nasabah) return null;

  const profit = calculateNasabahProfit(nasabah);
  const totalWajib = nasabah.jumlahPinjaman + profit;
  const todayStr = formatDate(new Date().toISOString());

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-full print:max-h-full print:shadow-none print:border-none">
        {/* Screen Controls (Hidden when printing) */}
        <div className="print:hidden space-y-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Cetak Dokumen Resmi Pinjaman
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  ID Nasabah: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{nasabah.id}</span> — {nasabah.nama}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                  <Printer className="h-4 w-4" />
                  Cetak / PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Doc Type Selector */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDocType('SPK')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                docType === 'SPK'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
              }`}
            >
              Surat Perjanjian Pinjaman (SPK)
            </button>
            <button
              type="button"
              onClick={() => setDocType('KWITANSI_DISBURSE')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                docType === 'KWITANSI_DISBURSE'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
              }`}
            >
              Kwitansi Pencairan Dana
            </button>
            <button
              type="button"
              onClick={() => setDocType('KWITANSI_LUNAS')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                docType === 'KWITANSI_LUNAS'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
              }`}
            >
              Surat Keterangan Lunas
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas Area */}
        <div className="my-2 bg-white p-6 sm:p-10 border border-slate-300 rounded-xl shadow-xs print:border-none print:shadow-none print:p-0 text-slate-900 font-serif leading-relaxed text-sm">
          {/* Official Letterhead Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-sans font-bold text-xl">
                LMS
              </div>
              <div>
                <h2 className="font-sans text-lg font-extrabold uppercase tracking-wide text-slate-900">
                  LMS KOPERASI LOAN MANAGEMENT SYSTEM
                </h2>
                <p className="font-sans text-xs text-slate-600">
                  Layanan Keuangan Terpercaya & Terverifikasi • Telp: (021) 500-1234
                </p>
                <p className="font-sans text-[11px] text-slate-500">
                  Gedung Keuangan lt. 8, Jl. Jendral Sudirman No. 45, Jakarta Pusat
                </p>
              </div>
            </div>
            <div className="text-right font-sans text-xs">
              <p className="font-bold text-slate-800">NO. DOKUMEN:</p>
              <p className="font-mono font-bold text-blue-700 text-sm">
                {docType === 'SPK' ? `SPK-${nasabah.id}` : docType === 'KWITANSI_DISBURSE' ? `KWT-DISB-${nasabah.id}` : `SKL-${nasabah.id}`}
              </p>
              <p className="text-slate-500 mt-1">Tanggal: {todayStr}</p>
            </div>
          </div>

          {/* DOCUMENT CONTENT SWITCHER */}
          {docType === 'SPK' && (
            <div className="space-y-5">
              <div className="text-center font-sans space-y-1">
                <h3 className="text-base font-bold uppercase underline tracking-wider text-slate-900">
                  SURAT PERJANJIAN PINJAMAN KREDIT
                </h3>
                <p className="text-xs font-mono text-slate-600">Nomor: SPK/{nasabah.id}/{new Date().getFullYear()}</p>
              </div>

              <p className="text-justify leading-relaxed">
                Pada hari ini, <strong className="font-sans">{todayStr}</strong>, kami yang bertanda tangan di bawah ini menyepakati Perjanjian Pinjaman Kredit sebagai berikut:
              </p>

              {/* Parties Details */}
              <div className="space-y-3 font-sans text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">PIHAK PERTAMA (Pemberi Pinjaman):</p>
                  <p className="pl-4">Nama Instansi: <strong>LMS Koperasi Loan Management System</strong></p>
                  <p className="pl-4">Alamat: Gedung Keuangan lt. 8, Jl. Jendral Sudirman No. 45, Jakarta Pusat</p>
                </div>
                <div className="space-y-1 pt-2 border-t border-slate-200">
                  <p className="font-bold text-slate-800">PIHAK KEDUA (Peminjam / Nasabah):</p>
                  <p className="pl-4">Nama Lengkap: <strong>{nasabah.nama}</strong></p>
                  <p className="pl-4">NIK KTP: <strong>{nasabah.nik || '—'}</strong></p>
                  <p className="pl-4">No. WhatsApp / HP: <strong>{nasabah.whatsapp}</strong></p>
                  <p className="pl-4">Alamat Domisili: <strong>{nasabah.lokasi}</strong></p>
                  <p className="pl-4">Rekening Pencairan: <strong>{nasabah.bankOrEwallet ? `${nasabah.bankOrEwallet} (${nasabah.nomorRekening}) a.n ${nasabah.namaPemilikRekening || nasabah.nama}` : '—'}</strong></p>
                </div>
              </div>

              {/* Loan Specifications Table */}
              <div className="space-y-2">
                <p className="font-bold font-sans text-xs uppercase text-slate-800">PASAL 1: RINCIAN PINJAMAN</p>
                <div className="border border-slate-300 rounded-lg overflow-hidden font-sans text-xs">
                  <table className="w-full text-left divide-y divide-slate-200">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-semibold w-2/5">Pokok Pinjaman Disetujui</td>
                        <td className="p-2.5 font-bold text-slate-900">{formatRupiah(nasabah.jumlahPinjaman)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-semibold">Jangka Waktu (Tenor)</td>
                        <td className="p-2.5 font-bold text-slate-900">{nasabah.tenor} Hari ({nasabah.tanggalJatuhTempo ? `Jatuh Tempo: ${formatDate(nasabah.tanggalJatuhTempo)}` : 'Sesuai Ketentuan'})</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-semibold">Estimasi Bunga & Administrasi</td>
                        <td className="p-2.5 font-bold text-amber-700">{formatRupiah(profit)}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-semibold">Total Kewajiban Pembayaran</td>
                        <td className="p-2.5 font-bold text-blue-700 text-sm">{formatRupiah(totalWajib)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Clauses */}
              <div className="space-y-2 font-sans text-xs text-slate-700 text-justify">
                <p className="font-bold uppercase text-slate-800">PASAL 2: HAK & KEWAJIBAN</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Pihak Kedua berkewajiban melunasi seluruh kewajiban pinjaman paling lambat pada tanggal jatuh tempo yang telah disepakati.</li>
                  <li>Pencairan dana pinjaman ditransfer langsung ke rekening/dompet digital yang didaftarkan oleh Pihak Kedua.</li>
                  <li>Keterlambatan pembayaran setelah jatuh tempo dapat dikenakan sanksi denda administratif sesuai peraturan Koperasi.</li>
                </ol>
              </div>

              {/* Signatures */}
              <div className="pt-8 font-sans text-xs grid grid-cols-2 gap-8 text-center">
                <div>
                  <p className="font-semibold text-slate-600">PIHAK PERTAMA (Persetujuan LMS)</p>
                  <div className="h-20 flex items-center justify-center my-2 italic text-slate-400">
                    [ Tanda Tangan & Stempel Resmi ]
                  </div>
                  <p className="font-bold underline text-slate-900">Petugas / Tim Verifikasi LMS</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-600">PIHAK KEDUA (Peminjam)</p>
                  <div className="h-20 flex items-center justify-center my-2 italic text-slate-400">
                    [ Tanda Tangan Nasabah ]
                  </div>
                  <p className="font-bold underline text-slate-900">{nasabah.nama}</p>
                </div>
              </div>
            </div>
          )}

          {docType === 'KWITANSI_DISBURSE' && (
            <div className="space-y-6">
              <div className="text-center font-sans space-y-1">
                <h3 className="text-base font-bold uppercase underline tracking-wider text-slate-900">
                  KWITANSI PENCAIRAN DANA PINJAMAN
                </h3>
                <p className="text-xs font-mono text-slate-600">No: KWT/{nasabah.id}/{new Date().getFullYear()}</p>
              </div>

              <div className="border-2 border-slate-300 rounded-xl p-5 font-sans space-y-4 text-xs">
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-slate-600 font-semibold">Telah Diterima Dari:</span>
                  <span className="font-bold text-slate-900 text-sm">LMS KOPERASI LOAN SYSTEM</span>
                </div>
                <div className="flex justify-between items-center border-b pb-3">
                  <span className="text-slate-600 font-semibold">Uang Sejumlah:</span>
                  <span className="font-extrabold text-blue-700 text-base">{formatRupiah(nasabah.jumlahPinjaman)}</span>
                </div>
                <div className="flex justify-between items-start border-b pb-3">
                  <span className="text-slate-600 font-semibold">Kepada Nasabah:</span>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{nasabah.nama}</p>
                    <p className="text-slate-500">NIK: {nasabah.nik || '—'}</p>
                    <p className="text-slate-500">WA: {nasabah.whatsapp}</p>
                  </div>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-600 font-semibold">Keterangan:</span>
                  <span className="font-medium text-slate-800 text-right max-w-sm">
                    Pencairan Dana Pinjaman ID {nasabah.id} sebesar {formatRupiah(nasabah.jumlahPinjaman)} Tenor {nasabah.tenor} Hari.
                  </span>
                </div>
              </div>

              {/* Signature */}
              <div className="pt-6 font-sans text-xs flex justify-between items-center">
                <div className="text-slate-500">
                  <p>Status: <span className="text-emerald-700 font-bold uppercase">DISALURKAN / LUNAS CAIR</span></p>
                  <p>Tanggal Pengajuan: {formatDate(nasabah.tanggalPengajuan)}</p>
                </div>
                <div className="text-center w-48">
                  <p className="text-slate-600">Penerima Dana,</p>
                  <div className="h-16 flex items-center justify-center font-bold italic text-slate-400">
                    [ TTD Nasabah ]
                  </div>
                  <p className="font-bold underline text-slate-900">{nasabah.nama}</p>
                </div>
              </div>
            </div>
          )}

          {docType === 'KWITANSI_LUNAS' && (
            <div className="space-y-6">
              <div className="text-center font-sans space-y-1">
                <h3 className="text-base font-bold uppercase underline tracking-wider text-emerald-800">
                  SURAT KETERANGAN LUNAS & BUKTI PELUNASAN
                </h3>
                <p className="text-xs font-mono text-slate-600">No: SKL/{nasabah.id}/{new Date().getFullYear()}</p>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-5 font-sans space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  MENYATAKAN BAHWA PINJAMAN BERIKUT TELAH LUNAS SEPENUHNYA
                </div>
                <p className="text-slate-700 leading-relaxed">
                  Dengan ini LMS Koperasi menyatakan bahwa Nasabah <strong className="text-slate-900">{nasabah.nama}</strong> (ID: {nasabah.id}) telah menyelesaikan seluruh kewajiban pembayaran pinjaman dengan rincian:
                </p>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1.5 font-sans text-xs">
                  <div className="flex justify-between"><span>Pokok Pinjaman:</span><span className="font-bold">{formatRupiah(nasabah.jumlahPinjaman)}</span></div>
                  <div className="flex justify-between"><span>Bunga & Profit Koperasi:</span><span className="font-bold text-amber-700">{formatRupiah(profit)}</span></div>
                  <div className="flex justify-between border-t pt-1 font-bold text-slate-900"><span>Total Pembayaran Diterima:</span><span className="text-emerald-700">{formatRupiah(totalWajib)}</span></div>
                </div>
              </div>

              <p className="font-sans text-xs text-slate-600 text-justify">
                Surat keterangan ini diterbitkan sebagai bukti sah bahwa Pihak Nasabah tidak lagi memiliki sisa tunggakan pinjaman atas ID {nasabah.id}.
              </p>

              {/* Signature */}
              <div className="pt-6 font-sans text-xs flex justify-between items-center">
                <div className="text-slate-500">
                  <p className="font-bold text-emerald-700">TERVERIFIKASI LUNAS</p>
                  <p>Tanggal Cetak: {todayStr}</p>
                </div>
                <div className="text-center w-48">
                  <p className="text-slate-600">Pengelola Keuangan LMS,</p>
                  <div className="h-16 flex items-center justify-center font-bold italic text-slate-400">
                    [ Stempel Lunas ]
                  </div>
                  <p className="font-bold underline text-slate-900">Tim Admin LMS</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
