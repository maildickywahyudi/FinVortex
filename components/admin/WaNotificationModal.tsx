'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MessageCircle, Copy, Send, Check, Bell, ShieldAlert, BadgeCheck, Clock, Circle as XCircle, CreditCard, CircleAlert as AlertCircle } from 'lucide-react';
import type { Nasabah } from '@/types';
import { formatRupiah, formatDate, calculateNasabahProfit } from '@/lib/utils';

export type TemplateType =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'reminder'
  | 'warning'
  | 'lunas';

interface WaNotificationModalProps {
  nasabah: Nasabah | null;
  open: boolean;
  onClose: () => void;
  initialTemplate?: TemplateType;
}

export function WaNotificationModal({
  nasabah,
  open,
  onClose,
  initialTemplate,
}: WaNotificationModalProps) {
  const [templateType, setTemplateType] = useState<TemplateType>('pending');
  const [copied, setCopied] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');

  const profit = nasabah ? calculateNasabahProfit(nasabah) : 0;
  const totalWajib = nasabah ? nasabah.jumlahPinjaman + profit : 0;
  const dueDateStr = nasabah?.tanggalJatuhTempo ? formatDate(nasabah.tanggalJatuhTempo) : '—';

  // Bank & E-Wallet detail formatting
  const rekeningInfo = nasabah?.bankOrEwallet
    ? `${nasabah.bankOrEwallet} • ${nasabah.nomorRekening || '-'} a.n ${nasabah.namaPemilikRekening || nasabah.nama}`
    : '—';

  // Synchronize initial template based on status or prop
  useEffect(() => {
    if (!nasabah) return;
    if (initialTemplate) {
      setTemplateType(initialTemplate);
    } else {
      if (nasabah.status === 'Approved') {
        setTemplateType('approved');
      } else if (nasabah.status === 'Rejected') {
        setTemplateType('rejected');
      } else if (nasabah.status === 'Lunas') {
        setTemplateType('lunas');
      } else {
        setTemplateType('pending');
      }
    }

    if (nasabah.alasanReject || nasabah.autoRejectReason) {
      setCustomRejectReason(nasabah.alasanReject || nasabah.autoRejectReason || '');
    }
  }, [nasabah, initialTemplate, open]);

  // Update message template
  useEffect(() => {
    if (!nasabah) return;

    if (templateType === 'pending') {
      setMessageText(
        `Halo Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Pengajuan pinjaman Anda dengan ID *${nasabah.id}* sebesar *${formatRupiah(nasabah.jumlahPinjaman)}* saat ini sedang dalam *PROSES VERIFIKASI / PENDING* ⏳\n\n` +
          `*Rincian Pengajuan:*\n` +
          `• ID Pengajuan: *${nasabah.id}*\n` +
          `• Nominal: *${formatRupiah(nasabah.jumlahPinjaman)}*\n` +
          `• Tenor: *${nasabah.tenor} Hari*\n` +
          `• Rekening Tujuan: *${rekeningInfo}*\n\n` +
          `Tim analis kami sedang memeriksa kelengkapan data dokumen Anda. Mohon bersiap jika ada konfirmasi lebih lanjut. Terima kasih!\n\n` +
          `_Salam hangat,_\n` +
          `*Tim LMS Loan Management System*`
      );
    } else if (templateType === 'approved') {
      setMessageText(
        `Halo Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Selamat! Pengajuan pinjaman Anda dengan ID *${nasabah.id}* sebesar *${formatRupiah(nasabah.jumlahPinjaman)}* telah *DISETUJUI (APPROVED)* 🎉\n\n` +
          `*Informasi Pencairan Dana:*\n` +
          `Dana pinjaman Anda akan segera ditransfer secara otomatis melalui rekening / E-Wallet yang terdaftar:\n` +
          `• Bank / E-Wallet: *${nasabah.bankOrEwallet || '—'}*\n` +
          `• No. Rekening / HP: *${nasabah.nomorRekening || '—'}*\n` +
          `• Nama Pemilik: *${nasabah.namaPemilikRekening || nasabah.nama}*\n\n` +
          `*Rincian Pinjaman & Tagihan:*\n` +
          `• Jumlah Pinjaman: *${formatRupiah(nasabah.jumlahPinjaman)}*\n` +
          `• Tenor: *${nasabah.tenor} Hari*\n` +
          `• Tanggal Jatuh Tempo: *${dueDateStr}*\n` +
          `• Total Pengembalian: *${formatRupiah(totalWajib)}*\n\n` +
          `Mohon periksa saldo pada rekening / E-Wallet Anda secara berkala. Terima kasih telah mempercayai layanan LMS Loan Management System!\n\n` +
          `_Salam hangat,_\n` +
          `*Tim LMS Loan Management System*`
      );
    } else if (templateType === 'rejected') {
      const reasonText = customRejectReason.trim()
        ? customRejectReason.trim()
        : 'Dokumen / Kriteria data belum memenuhi persyaratan kualifikasi sistem verifikasi.';

      setMessageText(
        `Halo Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Mohon maaf, pengajuan pinjaman Anda dengan ID *${nasabah.id}* sebesar *${formatRupiah(nasabah.jumlahPinjaman)}* *DITOLAK (REJECTED)* ❌\n\n` +
          `*Alasan Penolakan:*\n` +
          `_${reasonText}_\n\n` +
          `Anda dapat melakukan pengajuan ulang di kemudian hari setelah melengkapi atau memperbarui data dokumen Anda. Terima kasih atas pengertiannya.\n\n` +
          `_Hormat kami,_\n` +
          `*Tim LMS Loan Management System*`
      );
    } else if (templateType === 'disbursed') {
      setMessageText(
        `Halo Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Kabar gembira! Dana pinjaman Anda sebesar *${formatRupiah(nasabah.jumlahPinjaman)}* telah *BERHASIL DIKIRIM / DICAIRKAN* 💸\n\n` +
          `*Rincian Transfer & Pencairan:*\n` +
          `• ID Pengajuan: *${nasabah.id}*\n` +
          `• Rekening Tujuan: *${rekeningInfo}*\n` +
          `• Nominal Diterima: *${formatRupiah(nasabah.jumlahPinjaman)}*\n` +
          `• Tanggal Jatuh Tempo: *${dueDateStr}*\n` +
          `• Total Pembayaran: *${formatRupiah(totalWajib)}*\n\n` +
          `Silakan periksa saldo pada rekening bank / e-wallet Anda. Terima kasih telah memercayai layanan kami!\n\n` +
          `_Salam hangat,_\n` +
          `*Tim LMS Loan Management System*`
      );
    } else if (templateType === 'reminder') {
      setMessageText(
        `Halo Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Mengingatkan bahwa pinjaman Anda dengan ID *${nasabah.id}* sebesar *${formatRupiah(totalWajib)}* akan jatuh tempo pada *${dueDateStr}*.\n\n` +
          `*Rincian Tagihan:*\n` +
          `• ID Pengajuan: *${nasabah.id}*\n` +
          `• Tanggal Jatuh Tempo: *${dueDateStr}*\n` +
          `• Total Pembayaran Wajib: *${formatRupiah(totalWajib)}*\n\n` +
          `Mohon melakukan pelunasan sebelum tanggal jatuh tempo untuk menjaga track record baik Anda. Terima kasih!\n\n` +
          `_Salam hangat,_\n` +
          `*Tim LMS Loan Management System*`
      );
    } else if (templateType === 'warning') {
      setMessageText(
        `PEMBERITAHUAN KETERLAMBATAN PINJAMAN ⚠️\n\n` +
          `Kepada Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Pinjaman Anda dengan ID *${nasabah.id}* sebesar *${formatRupiah(totalWajib)}* yang jatuh tempo pada *${dueDateStr}* tercatat *BELUM DIBAYAR / OVERDUE*.\n\n` +
          `Mohon segera melakukan konfirmasi dan pelunasan pembayaran tagihan Anda hari ini untuk menghindari penalti tambahan.\n\n` +
          `_Hormat kami,_\n` +
          `*Tim LMS Loan Management System*`
      );
    } else if (templateType === 'lunas') {
      setMessageText(
        `Halo Bpk/Ibu *${nasabah.nama}*,\n\n` +
          `Terima kasih! Pembayaran pelunasan pinjaman Anda dengan ID *${nasabah.id}* sebesar *${formatRupiah(totalWajib)}* telah kami terima dan dinyatakan *LUNAS* ✅\n\n` +
          `Track record kredit Anda tercatat sangat baik dan Anda berhak mengajukan pinjaman kembali kapan saja.\n\n` +
          `_Salam hangat,_\n` +
          `*Tim LMS Loan Management System*`
      );
    }
  }, [nasabah, templateType, dueDateStr, totalWajib, rekeningInfo, customRejectReason]);

  if (!nasabah) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success('Teks pesan WhatsApp berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWA = () => {
    const encodedText = encodeURIComponent(messageText);
    const cleanPhone = nasabah.whatsapp.replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800 dark:text-white">
                Auto Text WhatsApp Web (Status & Pengingat)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Nasabah: <strong className="text-slate-800 dark:text-slate-200">{nasabah.nama}</strong> ({nasabah.whatsapp})
                {nasabah.bankOrEwallet && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400 font-medium">
                    • {nasabah.bankOrEwallet} ({nasabah.nomorRekening})
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Preset Template Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Pilih Auto Text Template Message:
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setTemplateType('pending')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> Pending
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('approved')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'approved'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <BadgeCheck className="h-3.5 w-3.5" /> Approved
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('rejected')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'rejected'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" /> Rejected
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('disbursed')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'disbursed'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" /> Dana Terkirim
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('reminder')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'reminder'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <Bell className="h-3.5 w-3.5" /> Tagihan
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('warning')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'warning'
                    ? 'bg-red-700 text-white border-red-700 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" /> Keterlambatan
              </button>

              <button
                type="button"
                onClick={() => setTemplateType('lunas')}
                className={`text-[11px] font-bold py-2 px-2.5 rounded-lg border flex items-center justify-center gap-1 transition-all ${
                  templateType === 'lunas'
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700'
                }`}
              >
                <Check className="h-3.5 w-3.5" /> Lunas
              </button>
            </div>
          </div>

          {/* Custom Rejection Reason Input if Rejected */}
          {templateType === 'rejected' && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 p-3 space-y-1.5">
              <Label htmlFor="custom-reject" className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                Alasan Penolakan (Otomatis Masuk ke Teks WhatsApp):
              </Label>
              <Input
                id="custom-reject"
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                placeholder="Contoh: Dokumen KTP buram / Kontak darurat tidak dapat dihubungi"
                className="text-xs bg-white dark:bg-slate-800 dark:text-slate-100 border-rose-300 dark:border-rose-800"
              />
            </div>
          )}

          {/* Editable Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="wa-text" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Teks Pesan WhatsApp (Dapat Disesuaikan / Diedit):
            </Label>
            <Textarea
              id="wa-text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={9}
              className="text-xs font-mono bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="w-full sm:flex-1 gap-1.5 text-xs font-semibold h-10"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Tersalin!' : 'Salin Teks Pesan'}
            </Button>

            <Button
              type="button"
              onClick={handleSendWA}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 text-xs shadow-sm h-10"
            >
              <Send className="h-4 w-4" />
              Buka WhatsApp Web & Kirim
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
