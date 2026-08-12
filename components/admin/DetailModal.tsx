/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  BadgeCheck,
  MessageCircle,
  Calendar,
  MapPin,
  DollarSign,
  Loader2,
  Users,
  Phone,
  History,
  Coins,
  ShieldAlert,
  RotateCcw,
  CreditCard,
  Printer,
  Send,
  FileText,
  NotebookPen,
  Save,
  FileImage,
  Download,
  Bell,
} from 'lucide-react';
import type { Nasabah, StatusPengajuan } from '@/types';
import { formatRupiah, formatDate, cn } from '@/lib/utils';
import { updateStatus, calculateNasabahProfit, restoreAutoReject } from '@/lib/api';
import { PrintableDocumentModal } from './PrintableDocumentModal';
import { WaNotificationModal, type TemplateType } from './WaNotificationModal';
import { StatusTimeline } from './StatusTimeline';
import { exportSingleNasabahPDF } from '@/lib/export-csv';

interface DetailModalProps {
  nasabah: Nasabah | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (updated: Nasabah) => void;
}

const statusConfig: Record<StatusPengajuan, { variant: 'default' | 'secondary' | 'destructive'; className: string }> = {
  Approved: { variant: 'default', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  Lunas: { variant: 'default', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  Pending: { variant: 'secondary', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  Rejected: { variant: 'destructive', className: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export function DetailModal({ nasabah, open, onClose, onStatusChange }: DetailModalProps) {
  const [alasan, setAlasan] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waTemplate, setWaTemplate] = useState<TemplateType | undefined>(undefined);
  const [printDocType, setPrintDocType] = useState<'SPK' | 'KWITANSI_DISBURSE' | 'KWITANSI_LUNAS'>('SPK');

  // Internal Notes State
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [notesList, setNotesList] = useState<string[]>(() => {
    if (!nasabah?.id) return [];
    try {
      const saved = localStorage.getItem(`lms_notes_${nasabah.id}`);
      return saved ? JSON.parse(saved) : (nasabah.adminNote ? [nasabah.adminNote] : []);
    } catch {
      return nasabah.adminNote ? [nasabah.adminNote] : [];
    }
  });

  if (!nasabah) return null;

  const handleAddNote = () => {
    if (!internalNoteInput.trim()) return;
    const dateStr = formatDate(new Date().toISOString());
    const newNoteItem = `[${dateStr}] ${internalNoteInput.trim()}`;
    const updated = [newNoteItem, ...notesList];
    setNotesList(updated);
    try {
      localStorage.setItem(`lms_notes_${nasabah.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save note:', e);
    }
    setInternalNoteInput('');
    toast.success('Catatan internal berhasil ditambahkan');
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const updated = await updateStatus(nasabah.id, 'Approved');
      if (updated) {
        onStatusChange(updated);
        toast.success(`Pengajuan ${nasabah.id} telah disetujui! Membuka notifikasi WhatsApp pencairan...`);
        setWaTemplate('approved');
        setShowWaModal(true);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleLunas = async () => {
    setActionLoading(true);
    try {
      const updated = await updateStatus(nasabah.id, 'Lunas');
      if (updated) {
        onStatusChange(updated);
        toast.success(`Pengajuan ${nasabah.id} telah ditandai LUNAS`);
        onClose();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestore = async () => {
    setActionLoading(true);
    try {
      const restored = await restoreAutoReject(nasabah.id);
      if (restored) {
        onStatusChange(restored);
        toast.success(`Pengajuan ${nasabah.id} berhasil dipulihkan ke status Pending!`);
        onClose();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!alasan.trim()) {
      toast.error('Mohon isi alasan penolakan');
      return;
    }
    setActionLoading(true);
    try {
      const updated = await updateStatus(nasabah.id, 'Rejected', alasan);
      if (updated) {
        onStatusChange(updated);
        toast.success(`Pengajuan ${nasabah.id} telah ditolak`);
        setAlasan('');
        onClose();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const stCfg = statusConfig[nasabah.status] || statusConfig.Pending;
  const waLink = `https://wa.me/${nasabah.whatsapp}`;
  const profit = calculateNasabahProfit(nasabah);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">
                Detail Pengajuan
              </DialogTitle>
              <DialogDescription className="font-mono text-sm text-slate-500 dark:text-slate-400">
                {nasabah.id}
              </DialogDescription>
            </div>
            <Badge className={cn('border', stCfg.className)} variant={stCfg.variant}>
              {nasabah.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="data" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="data">Data Nasabah</TabsTrigger>
            <TabsTrigger value="dokumen">Dokumen</TabsTrigger>
            <TabsTrigger value="timeline">Timeline Status</TabsTrigger>
            <TabsTrigger value="catatan">Catatan Admin</TabsTrigger>
          </TabsList>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap gap-2 mt-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportSingleNasabahPDF(nasabah)}
              className="text-xs font-semibold gap-1.5 border-rose-200 text-rose-700 bg-rose-50/50 hover:bg-rose-100 dark:border-rose-900/60 dark:text-rose-300 dark:bg-rose-950/40 dark:hover:bg-rose-900/60"
              title="Unduh Profil & Detail Pengajuan Nasabah dalam format PDF"
            >
              <Download className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              Unduh PDF Profil
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPrintDocType('SPK');
                setShowPrintModal(true);
              }}
              className="text-xs font-semibold gap-1.5 border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 dark:border-blue-900/60 dark:text-blue-300 dark:bg-blue-950/40 dark:hover:bg-blue-900/60"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak SPK / Perjanjian
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPrintDocType(nasabah.status === 'Lunas' ? 'KWITANSI_LUNAS' : 'KWITANSI_DISBURSE');
                setShowPrintModal(true);
              }}
              className="text-xs font-semibold gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-900/60 dark:text-indigo-300 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60"
            >
              <FileText className="h-3.5 w-3.5" />
              Cetak Kwitansi
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWaTemplate('approved');
                setShowWaModal(true);
              }}
              className="text-xs font-semibold gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:border-emerald-900/60 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60"
              title="Kirim Chat WA Persetujuan & Pencairan"
            >
              <Send className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              WA Persetujuan
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWaTemplate('reminder');
                setShowWaModal(true);
              }}
              className="text-xs font-semibold gap-1.5 border-amber-200 text-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:border-amber-900/60 dark:text-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-900/60"
              title="Kirim Chat WA Tagihan / Jatuh Tempo"
            >
              <Bell className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              WA Jatuh Tempo
            </Button>
          </div>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Nama" value={nasabah.nama} />
              <InfoRow icon={<CreditCard className="h-4 w-4" />} label="NIK KTP" value={nasabah.nik || '—'} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Tanggal Lahir" value={formatDate(nasabah.tanggalLahir)} />
              <InfoRow
                icon={<MessageCircle className="h-4 w-4" />}
                label="WhatsApp"
                value={
                  <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                    {nasabah.whatsapp}
                  </a>
                }
              />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Lokasi" value={nasabah.lokasi} />
              <InfoRow icon={<DollarSign className="h-4 w-4" />} label="Jumlah Pinjaman" value={formatRupiah(nasabah.jumlahPinjaman)} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Tenor" value={`${nasabah.tenor} hari`} />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Tanggal Pengajuan" value={formatDate(nasabah.tanggalPengajuan)} />
              {nasabah.tanggalJatuhTempo && (
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Jatuh Tempo" value={formatDate(nasabah.tanggalJatuhTempo)} />
              )}
            </div>

            {/* Kontak Darurat Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Kontak Darurat
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Nama</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{nasabah.namaKontakDarurat || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Hubungan</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{nasabah.hubunganKontakDarurat || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Nomor Kontak</p>
                  {nasabah.noKontakDarurat ? (
                    <a
                      href={`https://wa.me/${nasabah.noKontakDarurat}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3" />
                      {nasabah.noKontakDarurat}
                    </a>
                  ) : (
                    <p className="font-medium text-slate-800 dark:text-slate-200">—</p>
                  )}
                </div>
              </div>
            </div>

            {/* Rekening Bank & E-Wallet Section */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/40 p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Rekening Bank / E-Wallet Pencairan
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Bank / E-Wallet</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{nasabah.bankOrEwallet || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nomor Rekening / HP</p>
                  <p className="font-mono font-bold text-blue-700 dark:text-blue-400">{nasabah.nomorRekening || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Nama Pemilik Rekening</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{nasabah.namaPemilikRekening || nasabah.nama}</p>
                </div>
              </div>
            </div>

            {/* Riwayat Pinjaman Sebelumnya Section */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <History className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  Riwayat Pinjaman & Track Record
                </div>
                <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40">
                  Deteksi Otomatis
                </Badge>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Frekuensi Meminjam</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {nasabah.jumlahPinjamanSebelumnya || 'Belum Pernah (Nasabah Baru)'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Track Record Pembayaran</p>
                  {nasabah.riwayatPembayaran ? (
                    <div className="mt-0.5">
                      {nasabah.riwayatPembayaran.toLowerCase().includes('lancar') ||
                      nasabah.riwayatPembayaran.toLowerCase().includes('bagus') ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                          {nasabah.riwayatPembayaran}
                        </Badge>
                      ) : nasabah.riwayatPembayaran.toLowerCase().includes('terlambat') ||
                        nasabah.riwayatPembayaran.toLowerCase().includes('kendala') ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                          {nasabah.riwayatPembayaran}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{nasabah.riwayatPembayaran}</Badge>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-slate-800 dark:text-slate-200">Nasabah Baru (Belum Meminjam)</p>
                  )}
                </div>
              </div>
            </div>

            {nasabah.status === 'Rejected' && nasabah.alasanReject && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-rose-800 flex items-center gap-2">
                      Alasan Penolakan
                      {(nasabah.isAutoRejected || nasabah.alasanReject.includes('[Auto Reject]')) && (
                        <Badge variant="destructive" className="bg-rose-600 text-white text-[10px]">
                          Auto-Reject System
                        </Badge>
                      )}
                    </p>
                    <p className="text-sm text-rose-700">{nasabah.alasanReject}</p>
                  </div>
                </div>

                {(nasabah.isAutoRejected || nasabah.alasanReject.includes('[Auto Reject]')) && (
                  <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between">
                    <span className="text-xs text-rose-600">
                      Terjadi kesalahan dalam auto-reject? Anda dapat memulihkan pengajuan ini ke status Pending.
                    </span>
                    <Button
                      onClick={handleRestore}
                      disabled={actionLoading}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Pulihkan Data
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Lunas Banner */}
            {nasabah.status === 'Lunas' && (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <BadgeCheck className="h-5 w-5 text-blue-600" />
                  Pinjaman Telah Lunas (Selesai)
                </div>
                <p className="mt-1 text-xs text-blue-600">
                  Seluruh kewajiban pembayaran pinjaman untuk nasabah ini telah selesai.
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-blue-200/60 pt-2 text-xs">
                  <span className="text-slate-600 font-medium">Estimasi Keuntungan Bunga:</span>
                  <span className="font-bold text-blue-700 text-sm">{formatRupiah(profit)}</span>
                </div>
              </div>
            )}

            {/* Approved status action (mark Lunas) */}
            {nasabah.status === 'Approved' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Status Pinjaman: Disetujui (Approved)</p>
                    <p className="text-xs text-emerald-600">
                      Nasabah telah menerima pencairan. Tandai Lunas jika pinjaman sudah terbayar penuh.
                    </p>
                  </div>
                  <Button
                    onClick={handleLunas}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                    Tandai Lunas
                  </Button>
                </div>
              </div>
            )}

            {/* Pending Actions */}
            {nasabah.status === 'Pending' && (
              <div className="space-y-3 border-t border-border pt-4">
                <div>
                  <Label htmlFor="alasan">Alasan Reject (wajib jika menolak)</Label>
                  <Textarea
                    id="alasan"
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder="Tulis alasan penolakan..."
                    className="mt-1.5"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 sm:gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {actionLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                    Approve
                  </Button>
                  <Button
                    onClick={handleLunas}
                    disabled={actionLoading}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {actionLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <BadgeCheck className="mr-1.5 h-4 w-4" />}
                    Tandai Lunas
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={actionLoading}
                    variant="destructive"
                    className="flex-1"
                  >
                    {actionLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="dokumen" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <DocPreview label="KTP" src={nasabah.ktpUrl} />
              <DocPreview label="Selfie" src={nasabah.selfieUrl} />
              <DocPreview label="Social Media" src={nasabah.socmedUrl} />
            </div>
          </TabsContent>

          {/* Timeline Status Tab */}
          <TabsContent value="timeline" className="space-y-4 pt-1">
            <StatusTimeline
              history={nasabah.statusHistory}
              currentStatus={nasabah.status}
              tanggalPengajuan={nasabah.tanggalPengajuan}
            />
          </TabsContent>

          {/* Catatan & Log Tab */}
          <TabsContent value="catatan" className="space-y-4 pt-1">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <NotebookPen className="h-4 w-4 text-blue-600" />
                Tambah Catatan Internal Admin (Hanya Terlihat oleh Tim):
              </Label>
              <div className="flex gap-2">
                <Textarea
                  value={internalNoteInput}
                  onChange={(e) => setInternalNoteInput(e.target.value)}
                  placeholder="Contoh: Sudah dikonfirmasi via telepon, janji bayar tanggal 15..."
                  rows={2}
                  className="bg-white text-xs border-slate-200"
                />
                <Button
                  onClick={handleAddNote}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0 self-end py-5 gap-1"
                >
                  <Save className="h-3.5 w-3.5" /> Simpan
                </Button>
              </div>
            </div>

            {/* Existing Notes History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Riwayat Catatan ({notesList.length})</h4>
              {notesList.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50/50">
                  Belum ada catatan khusus untuk nasabah ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {notesList.map((note, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-2xs">
                      {note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Printable Document Modal */}
        <PrintableDocumentModal
          nasabah={nasabah}
          open={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          defaultDocType={printDocType}
        />

        {/* WhatsApp Notification Modal */}
        <WaNotificationModal
          nasabah={nasabah}
          open={showWaModal}
          onClose={() => setShowWaModal(false)}
          initialTemplate={waTemplate}
        />
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-100">{value}</p>
    </div>
  );
}

function DocPreview({ label, src }: { label: string; src: string }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-slate-50 dark:bg-slate-800">
      <div className="border-b border-border px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300">{label}</div>
      <div className="relative aspect-[4/3]">
        {src && !hasError ? (
          <img
            src={src}
            alt={label}
            className="h-full w-full object-cover"
            onError={() => setHasError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-4 text-slate-400 dark:text-slate-500">
            <FileImage className="h-8 w-8 mb-1" />
            <span className="text-xs font-medium">Gambar tidak tersedia</span>
          </div>
        )}
      </div>
    </div>
  );
}
