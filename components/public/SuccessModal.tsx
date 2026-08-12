'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  idPengajuan: string;
}

export function SuccessModal({ open, onClose, idPengajuan }: SuccessModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback if canvas-confetti fails in non-browser env
      }
    }
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(idPengajuan);
      setCopied(true);
      toast.success('ID Pengajuan berhasil disalin!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin ID');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <PartyPopper className="h-8 w-8 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-bold text-slate-800">
            Pengajuan Berhasil Terkirim!
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Pengajuan pinjaman Anda telah berhasil dikirim. Tim kami akan segera melakukan verifikasi data. Silakan salin & simpan <strong className="text-slate-900">LN Number</strong> Anda di bawah ini untuk memeriksa status pengajuan secara berkala pada menu <strong className="text-blue-600">Cek Status Pengajuan</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 rounded-xl border-2 border-dashed border-gold/40 bg-gold/5 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            ID Pengajuan
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800">{idPengajuan}</p>
        </div>
        <Button
          onClick={handleCopy}
          className="mt-4 w-full nav-gradient text-white hover:opacity-90"
          size="lg"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-5 w-5" /> Tersalin!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-5 w-5" /> Salin ID Pengajuan
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full text-slate-500">
          Tutup
        </Button>
      </DialogContent>
    </Dialog>
  );
}
