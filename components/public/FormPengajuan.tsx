'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Loader as Loader2, Send, User, MapPin, DollarSign, Calendar, Phone, Info, ShieldCheck, Calculator, Crosshair, CircleCheck as CheckCircle2, Users, History, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from './FileUpload';
import { SuccessModal } from './SuccessModal';
import { getConfig, submitPengajuan } from '@/lib/api';
import { formatRupiah, isValidPhone, formatPhone, calculateUsia, cn } from '@/lib/utils';
import type { AppConfig } from '@/types';

interface FormState {
  nama: string;
  nik: string;
  tanggalLahir: string;
  whatsapp: string;
  lokasi: string;
  namaKontakDarurat: string;
  hubunganKontakDarurat: string;
  noKontakDarurat: string;
  bankOrEwallet: string;
  nomorRekening: string;
  namaPemilikRekening: string;
  jumlahPinjaman: string;
  tenor: string;
}

interface FormErrors {
  nama?: string;
  nik?: string;
  tanggalLahir?: string;
  whatsapp?: string;
  lokasi?: string;
  namaKontakDarurat?: string;
  hubunganKontakDarurat?: string;
  noKontakDarurat?: string;
  bankOrEwallet?: string;
  nomorRekening?: string;
  namaPemilikRekening?: string;
  jumlahPinjaman?: string;
  tenor?: string;
  files?: string;
}

const initialState: FormState = {
  nama: '',
  nik: '',
  tanggalLahir: '',
  whatsapp: '',
  lokasi: '',
  namaKontakDarurat: '',
  hubunganKontakDarurat: '',
  noKontakDarurat: '',
  bankOrEwallet: '',
  nomorRekening: '',
  namaPemilikRekening: '',
  jumlahPinjaman: '',
  tenor: '',
};

export function FormPengajuan() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState(false);

  const [form, setForm] = useState<FormState>(initialState);
  const [files, setFiles] = useState<{ ktp: File | null; selfie: File | null; socmed: File | null }>({
    ktp: null,
    selfie: null,
    socmed: null,
  });
  const [locating, setLocating] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrData, setOcrData] = useState<{
    nik?: string;
    nama?: string;
    tanggalLahir?: string;
  } | null>(null);

  const normalizeDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    let str = dateStr.trim();

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const monthMap: Record<string, string> = {
      januari: '01', jan: '01', january: '01',
      februari: '02', feb: '02', february: '02',
      maret: '03', mar: '03', march: '03',
      april: '04', apr: '04',
      mei: '05', may: '05',
      juni: '06', jun: '06', june: '06',
      juli: '07', jul: '07', july: '07',
      agustus: '08', agu: '08', ags: '08', august: '08',
      september: '09', sep: '09', sept: '09',
      oktober: '10', okt: '10', oct: '10', october: '10',
      november: '11', nov: '11',
      desember: '12', des: '12', dec: '12', december: '12',
    };

    for (const [mName, mNum] of Object.entries(monthMap)) {
      const regex = new RegExp(`\\b${mName}\\b`, 'gi');
      if (regex.test(str)) {
        str = str.replace(regex, `-${mNum}-`);
        break;
      }
    }

    // Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/\b(\d{1,2})[-/.\s]+(\d{1,2})[-/.\s]+(\d{4})\b/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Match YYYY-MM-DD
    const ymdMatch = str.match(/\b(\d{4})[-/.\s]+(\d{1,2})[-/.\s]+(\d{1,2})\b/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return '';
  };

  const handleKtpSelectAndOcr = async (file: File | null) => {
    setFiles((prev) => ({ ...prev, ktp: file }));
    setTouched((prev) => ({ ...prev, files: true }));

    if (!file) {
      setOcrData(null);
      return;
    }

    setOcrLoading(true);
    setOcrData(null);
    toast.info('🔍 Memproses Pemindaian KTP dengan AI...', { duration: 3000 });

    try {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl) {
        try {
          const res = await fetch('/api/ocr-ktp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: dataUrl,
              mimeType: file.type || 'image/jpeg',
            }),
          });
          const resData = await res.json();

          if (res.ok && resData.data) {
            const { nik, nama, tanggalLahir } = resData.data;
            const formattedDate = tanggalLahir ? normalizeDateString(tanggalLahir) : '';

            if (nik || nama || formattedDate) {
              setForm((prev) => ({
                ...prev,
                ...(nama ? { nama } : {}),
                ...(nik ? { nik } : {}),
                ...(formattedDate ? { tanggalLahir: formattedDate } : {}),
              }));
              setOcrData({ nik, nama, tanggalLahir: formattedDate });
              toast.success('✨ KTP berhasil dipindai! Nama, NIK & Tanggal Lahir otomatis terisi.');
              setOcrLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          console.warn('API OCR Error, falling back to local OCR:', apiErr);
        }

        // Local OCR fallback using tesseract (dynamically imported to reduce initial bundle)
        try {
          const { recognize } = await import('tesseract.js');
          const result = await recognize(dataUrl, 'eng').catch(() => null);
          if (result?.data?.text) {
            const text = result.data.text;
            
            // Extract NIK
            const nikMatch = text.match(/\b[1-9][0-9]{15}\b/);
            const extractedNik = nikMatch ? nikMatch[0] : '';

            // Extract Nama
            const namaMatch = text.match(/Nama\s*[:\s]*([A-Za-z\s]{3,40})/i);
            const extractedNama = namaMatch ? namaMatch[1].trim().toUpperCase() : '';

            // Extract Tanggal Lahir
            const dateMatch = text.match(/\b(\d{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})\b/) ||
                              text.match(/(?:Lahir|Tgl|Tanggal)\s*[:\s]*[A-Za-z\s,]*([^\n\r]+)/i);
            const extractedDate = dateMatch ? normalizeDateString(dateMatch[1] || dateMatch[0]) : '';

            if (extractedNik || extractedNama || extractedDate) {
              setForm((prev) => ({
                ...prev,
                ...(extractedNama ? { nama: extractedNama } : {}),
                ...(extractedNik ? { nik: extractedNik } : {}),
                ...(extractedDate ? { tanggalLahir: extractedDate } : {}),
              }));
              setOcrData({ nik: extractedNik, nama: extractedNama, tanggalLahir: extractedDate });
              toast.success('✨ KTP dipindai! Data otomatis terisi. Silakan periksa kembali.');
            } else {
              toast.info('Foto KTP tersimpan. Silakan isi data secara manual.');
            }
          } else {
            toast.info('Foto KTP tersimpan. Silakan isi data secara manual.');
          }
        } catch {
          toast.info('Foto KTP tersimpan. Silakan isi data secara manual.');
        }
      }
    } catch (err) {
      console.warn('OCR error:', err);
      toast.info('Foto KTP tersimpan. Silakan isi data secara manual.');
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    const loadConf = () => getConfig().then(setConfig);
    loadConf();
    window.addEventListener('lms_config_updated', loadConf);

    // Restore draft from LocalStorage on mount
    try {
      const saved = localStorage.getItem('lms_form_pengajuan_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const hasContent = Object.values(parsed).some((v) => Boolean(v && String(v).trim()));
          if (hasContent) {
            setForm((prev) => ({ ...prev, ...parsed }));
            setDraftRestored(true);
            toast.info('💾 Draft formulir yang Anda ketik sebelumnya berhasil dipulihkan!');
          }
        }
      }
    } catch (e) {
      console.warn('Gagal memuat draft formulir dari localStorage', e);
    }

    return () => window.removeEventListener('lms_config_updated', loadConf);
  }, []);

  // Autosave form to LocalStorage
  useEffect(() => {
    const isModified = Object.keys(form).some(
      (key) => form[key as keyof FormState] !== initialState[key as keyof FormState],
    );
    if (isModified) {
      try {
        localStorage.setItem('lms_form_pengajuan_draft', JSON.stringify(form));
      } catch (e) {
        console.warn('Gagal menyimpan draft formulir ke localStorage', e);
      }
    }
  }, [form]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem('lms_form_pengajuan_draft');
    } catch (e) {
      console.warn('Gagal menghapus draft', e);
    }
    setForm(initialState);
    setFiles({ ktp: null, selfie: null, socmed: null });
    setTouched({});
    setDraftRestored(false);
    toast.success('Draft formulir berhasil dibersihkan.');
  };

  const activeTenor = config?.tenor.filter((t) => t.active) || [];
  const activeJumlah = config?.jumlahPinjaman.filter((j) => j.active) || [];
  const activeBunga = config?.bunga.find((b) => b.value === parseInt(form.jumlahPinjaman))?.value ?? config?.bunga[0]?.value ?? 0;

  const usia = useMemo(() => calculateUsia(form.tanggalLahir), [form.tanggalLahir]);

  const errors = useMemo(() => {
    const errs: FormErrors = {};

    const namaTrim = form.nama.trim();
    if (!namaTrim) errs.nama = 'Nama lengkap wajib diisi';
    else if (namaTrim.length < 3) errs.nama = 'Nama minimal 3 karakter';
    else if (!/^[a-zA-Z\s'.]+$/.test(namaTrim)) errs.nama = 'Nama hanya boleh berisi huruf dan tanda baca umum';

    const nikClean = form.nik.trim();
    if (!nikClean) errs.nik = 'NIK KTP wajib diisi (16 digit angka)';
    else if (!/^\d{16}$/.test(nikClean)) errs.nik = 'NIK KTP harus berupa 16 digit angka';

    if (!form.tanggalLahir) errs.tanggalLahir = 'Tanggal lahir wajib diisi';
    else if (usia !== null && usia < 17) errs.tanggalLahir = 'Usia peminjam minimal 17 tahun';
    else if (usia !== null && usia > 75) errs.tanggalLahir = 'Usia peminjam maksimal 75 tahun';

    if (!form.whatsapp) errs.whatsapp = 'Nomor WhatsApp wajib diisi';
    else if (!isValidPhone(form.whatsapp)) errs.whatsapp = 'Format HP tidak valid (gunakan 08xxx atau 628xxx)';

    if (!form.lokasi.trim()) errs.lokasi = 'Alamat lengkap wajib diisi';

    const namaKdTrim = form.namaKontakDarurat.trim();
    if (!namaKdTrim) errs.namaKontakDarurat = 'Nama kontak darurat wajib diisi';
    else if (namaKdTrim.length < 3) errs.namaKontakDarurat = 'Nama kontak darurat minimal 3 karakter';
    else if (!/^[a-zA-Z\s'.]+$/.test(namaKdTrim)) errs.namaKontakDarurat = 'Nama kontak darurat hanya boleh berisi huruf';

    if (!form.hubunganKontakDarurat) errs.hubunganKontakDarurat = 'Pilih hubungan kontak darurat';

    if (!form.noKontakDarurat) errs.noKontakDarurat = 'Nomor kontak darurat wajib diisi';
    else if (!isValidPhone(form.noKontakDarurat)) errs.noKontakDarurat = 'Format nomor kontak darurat tidak valid';
    else if (form.whatsapp && formatPhone(form.whatsapp) === formatPhone(form.noKontakDarurat)) {
      errs.noKontakDarurat = 'Nomor kontak darurat tidak boleh sama dengan nomor WhatsApp peminjam';
    }

    if (!form.bankOrEwallet) errs.bankOrEwallet = 'Pilih Bank atau E-Wallet pencairan';

    const norekClean = form.nomorRekening.trim();
    if (!norekClean) errs.nomorRekening = 'Nomor rekening / E-Wallet wajib diisi';
    else if (!/^\d{8,25}$/.test(norekClean)) errs.nomorRekening = 'Nomor rekening / E-Wallet harus 8-25 digit angka';

    const namaPemilikTrim = form.namaPemilikRekening.trim();
    if (!namaPemilikTrim) errs.namaPemilikRekening = 'Nama pemilik rekening wajib diisi';
    else if (namaPemilikTrim.length < 3) errs.namaPemilikRekening = 'Nama pemilik rekening minimal 3 karakter';

    if (!form.jumlahPinjaman) errs.jumlahPinjaman = 'Pilih jumlah pinjaman';
    if (!form.tenor) errs.tenor = 'Pilih tenor';

    if (!files.ktp || !files.selfie || !files.socmed) {
      errs.files = 'Semua dokumen wajib diupload';
    }
    return errs;
  }, [form, files, usia]);

  const isValid = Object.keys(errors).length === 0;

  const fileToDataUrl = (file: File | null): Promise<string> => {
    if (!file) return Promise.resolve('');
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = (e.target?.result as string) || '';
        if (file.type.startsWith('image/')) {
          try {
            const img = new Image();
            img.onload = () => {
              try {
                const maxWidth = 800;
                const maxHeight = 800;
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                  if (width / height > maxWidth / maxHeight) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                  } else {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                  }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.7));
                } else {
                  resolve(rawResult);
                }
              } catch {
                resolve(rawResult);
              }
            };
            img.onerror = () => resolve(rawResult);
            img.src = rawResult;
          } catch {
            resolve(rawResult);
          }
        } else {
          resolve(rawResult);
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm({ ...form, [field]: value });
    setTouched({ ...touched, [field]: true });
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched({ ...touched, [field]: true });
  };

  const selectedJumlah = parseInt(form.jumlahPinjaman) || 0;
  const selectedTenor = parseInt(form.tenor) || 0;
  const totalBayar = selectedJumlah + activeBunga;
  const cicilanPerBulan = selectedTenor > 0 ? Math.ceil(totalBayar / (selectedTenor / 30)) : 0;

  const completedSteps = useMemo(() => {
    let count = 0;
    if (form.nama.trim().length >= 3) count++;
    if (form.tanggalLahir && usia !== null && usia >= 17 && usia <= 80) count++;
    if (form.whatsapp && isValidPhone(form.whatsapp)) count++;
    if (form.lokasi.trim()) count++;
    if (
      form.namaKontakDarurat.trim() &&
      form.hubunganKontakDarurat &&
      form.noKontakDarurat &&
      isValidPhone(form.noKontakDarurat)
    )
      count++;
    if (
      form.bankOrEwallet &&
      form.nomorRekening.trim() &&
      /^\d{8,25}$/.test(form.nomorRekening.trim()) &&
      form.namaPemilikRekening.trim().length >= 3
    )
      count++;
    if (form.jumlahPinjaman) count++;
    if (form.tenor) count++;
    if (files.ktp && files.selfie && files.socmed) count++;
    return count;
  }, [form, files, usia]);

  const progressPercent = Math.round((completedSteps / 9) * 100);

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung fitur lokasi');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLiveCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&accept-language=id`,
          );
          const data = await res.json();
          const addr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const shortAddr = addr.split(',').slice(-3).join(',').trim();
          updateField('lokasi', shortAddr);
          setLocationShared(true);
          toast.success('Lokasi rumah berhasil dideteksi');
        } catch {
          updateField('lokasi', `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setLocationShared(true);
          toast.success('Koordinat lokasi rumah tersimpan');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error('Izin lokasi ditolak. Masukkan lokasi secara manual.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      nama: true,
      nik: true,
      tanggalLahir: true,
      whatsapp: true,
      lokasi: true,
      namaKontakDarurat: true,
      hubunganKontakDarurat: true,
      noKontakDarurat: true,
      bankOrEwallet: true,
      nomorRekening: true,
      namaPemilikRekening: true,
      jumlahPinjaman: true,
      tenor: true,
      files: true,
    });
    if (!isValid) {
      toast.error('Mohon lengkapi semua field dengan benar');
      return;
    }
    setLoading(true);
    try {
      const [ktpUrl, selfieUrl, socmedUrl] = await Promise.all([
        fileToDataUrl(files.ktp),
        fileToDataUrl(files.selfie),
        fileToDataUrl(files.socmed),
      ]);

      const result = await submitPengajuan({
        nama: form.nama.trim(),
        nik: form.nik.trim(),
        tanggalLahir: form.tanggalLahir,
        whatsapp: formatPhone(form.whatsapp),
        lokasi: form.lokasi.trim(),
        namaKontakDarurat: form.namaKontakDarurat.trim(),
        hubunganKontakDarurat: form.hubunganKontakDarurat,
        noKontakDarurat: formatPhone(form.noKontakDarurat),
        bankOrEwallet: form.bankOrEwallet,
        nomorRekening: form.nomorRekening.trim(),
        namaPemilikRekening: form.namaPemilikRekening.trim(),
        jumlahPinjaman: selectedJumlah,
        tenor: selectedTenor,
        bunga: activeBunga,
        ktpUrl,
        selfieUrl,
        socmedUrl,
      });
      setSuccessId(result.id);
      toast.success('Pengajuan berhasil dikirim!');
      try {
        localStorage.removeItem('lms_form_pengajuan_draft');
      } catch (e) {
        console.warn('Gagal menghapus draft dari localStorage', e);
      }
      setForm(initialState);
      setFiles({ ktp: null, selfie: null, socmed: null });
      setTouched({});
      setDraftRestored(false);
      setLocationShared(false);
      setLiveCoords(null);
    } catch {
      toast.error('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const showError = (field: keyof FormErrors) => touched[field] && errors[field];

  return (
    <>
      {draftRestored && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping" />
            <span>
              <strong>💾 Draft Otomatis Tersimpan & Dipulihkan:</strong> Data formulir yang Anda ketik sebelumnya telah dimuat kembali secara otomatis.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="font-semibold text-rose-600 hover:text-rose-800 underline transition-colors shrink-0"
          >
            Hapus Draft & Reset
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600">Progress pengisian</span>
          <span className="font-semibold text-blue-600">{completedSteps}/8</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-x-10 gap-y-2 lg:grid-cols-2">
        {/* Kolom Kiri — Upload KTP & Data Pribadi */}
        <div className="space-y-6">
          {/* Langkah 1: Upload & Verifikasi KTP */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/70 to-slate-50/50 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">1. Upload Foto KTP Anda</h3>
                  <p className="text-xs text-slate-500">Ambil foto KTP yang jelas untuk pengisian data otomatis</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/90 px-2.5 py-1 rounded-full border border-blue-200">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Deteksi AI
              </span>
            </div>

            <FileUpload
              label="Foto KTP Asli"
              required
              hint={ocrLoading ? "⏳ Menganalisis KTP dengan AI..." : "Foto KTP horizontal, terang, dan tidak buram"}
              icon="ktp"
              onFileSelect={handleKtpSelectAndOcr}
            />

            {/* Banner Loading Pemindaian */}
            {ocrLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/90 p-4 text-xs text-blue-800 animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-blue-900">Menganalisis Foto KTP dengan AI...</p>
                  <p className="text-[11px] text-blue-700">Membaca Nama Lengkap, NIK, dan Tanggal Lahir secara otomatis.</p>
                </div>
              </div>
            )}

            {/* Panel Hasil Ekstraksi KTP untuk Diperiksa Nasabah */}
            {ocrData && !ocrLoading && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Hasil Ekstraksi Data KTP (Cek & Konfirmasi)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-medium">
                    Telah Otomatis Terisi
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">NAMA LENGKAP</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {ocrData.nama || <span className="text-amber-600 italic">Perlu diisi manual</span>}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">NIK KTP (16 DIGIT)</span>
                    <span className="font-bold text-slate-800 truncate block font-mono">
                      {ocrData.nik || <span className="text-amber-600 italic">Perlu diisi manual</span>}
                    </span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">TANGGAL LAHIR</span>
                    <span className="font-bold text-slate-800 truncate block">
                      {ocrData.tanggalLahir || <span className="text-amber-600 italic">Perlu diisi manual</span>}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-white/70 p-2 rounded-lg border border-emerald-100">
                  <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>
                    Silakan periksa formulir di bawah ini dan edit kembali jika terdapat huruf atau angka yang kurang sesuai.
                  </span>
                </div>
              </div>
            )}
          </div>

          <SectionHeader icon={User} title="2. Periksa & Lengkapi Data Pribadi" subtitle="Verifikasi data diri Anda" />

          <FieldGroup>
            <Field
              label="Nama Lengkap"
              required
              error={showError('nama') ? errors.nama : undefined}
              hint={form.nama && ocrData?.nama ? "✨ Terisi otomatis dari KTP" : "Sesuai KTP"}
            >
              <Input
                value={form.nama}
                onChange={(e) => updateField('nama', e.target.value)}
                onBlur={() => handleBlur('nama')}
                placeholder="Contoh: Budi Santoso"
                className={errorInputClass(showError('nama'))}
              />
            </Field>

            <Field
              label="NIK KTP (16 Digit)"
              required
              error={showError('nik') ? errors.nik : undefined}
              hint={
                ocrLoading
                  ? '🔍 Menganalisis KTP dengan AI...'
                  : form.nik && ocrData?.nik
                    ? '✨ Terisi otomatis dari KTP'
                    : '16 digit angka sesuai KTP'
              }
            >
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.nik}
                  onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                  onBlur={() => handleBlur('nik')}
                  placeholder="Contoh: 3201234506980001"
                  className={cn('pl-10 pr-24', errorInputClass(showError('nik')))}
                  maxLength={16}
                  inputMode="numeric"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  <Sparkles className="h-3 w-3 text-blue-500" /> Verifikasi AI
                </span>
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Tanggal Lahir"
                required
                error={showError('tanggalLahir') ? errors.tanggalLahir : undefined}
                hint={form.tanggalLahir && ocrData?.tanggalLahir ? "✨ Terisi dari KTP" : undefined}
              >
                <Input
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(e) => updateField('tanggalLahir', e.target.value)}
                  onBlur={() => handleBlur('tanggalLahir')}
                  className={errorInputClass(showError('tanggalLahir'))}
                />
              </Field>
              <Field label="Usia" hint={usia !== null ? `${usia} tahun` : undefined}>
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
                  {usia !== null ? `${usia} tahun` : '—'}
                </div>
              </Field>
            </div>

            <Field
              label="Nomor WhatsApp"
              required
              error={showError('whatsapp') ? errors.whatsapp : undefined}
              hint="Aktif untuk verifikasi"
            >
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.whatsapp}
                  onChange={(e) => updateField('whatsapp', e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                  onBlur={() => handleBlur('whatsapp')}
                  placeholder="628123456789 atau 08123456789"
                  className={cn('pl-10', errorInputClass(showError('whatsapp')))}
                  inputMode="tel"
                />
              </div>
            </Field>

            <Field
              label="Alamat Lengkap"
              required
              error={showError('lokasi') ? errors.lokasi : undefined}
              hint={locationShared ? 'Lokasi rumah live terbagikan' : 'Alamat domisili tempat tinggal saat ini'}
            >
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.lokasi}
                  onChange={(e) => {
                    updateField('lokasi', e.target.value);
                    setLocationShared(false);
                  }}
                  onBlur={() => handleBlur('lokasi')}
                  placeholder="Contoh: Jl. Sudirman No. 12, RT 01/RW 02, Jakarta Selatan"
                  className={cn(
                    config?.enableShareLokasi !== false ? 'pl-10 pr-48' : 'pl-10',
                    errorInputClass(showError('lokasi'))
                  )}
                />
                {config?.enableShareLokasi !== false && (
                  <button
                    type="button"
                    onClick={handleShareLocation}
                    disabled={locating}
                    className={cn(
                      'absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all',
                      locating
                        ? 'bg-slate-100 text-slate-400'
                        : locationShared
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                    )}
                  >
                    {locating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mencari...
                      </>
                    ) : locationShared ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Rumah Live
                      </>
                    ) : (
                      <>
                        <Crosshair className="h-3.5 w-3.5" /> Share Lokasi di Rumah
                      </>
                    )}
                  </button>
                )}
              </div>
              {locationShared && liveCoords && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600">
                  <Crosshair className="h-3 w-3" />
                  Koordinat Rumah: {liveCoords.lat.toFixed(4)}, {liveCoords.lng.toFixed(4)}
                </p>
              )}
            </Field>
          </FieldGroup>

          {/* Kontak Darurat */}
          <SectionHeader
            icon={Users}
            title="3. Kontak Darurat"
            subtitle="Informasi kerabat / orang terdekat yang dapat dihubungi"
          />

          <FieldGroup>
            <Field
              label="Nama Kontak Darurat"
              required
              error={showError('namaKontakDarurat') ? errors.namaKontakDarurat : undefined}
            >
              <Input
                value={form.namaKontakDarurat}
                onChange={(e) => updateField('namaKontakDarurat', e.target.value)}
                onBlur={() => handleBlur('namaKontakDarurat')}
                placeholder="Contoh: Ibu Siti / Budi Santoso"
                className={errorInputClass(showError('namaKontakDarurat'))}
              />
            </Field>

            <Field
              label="Hubungan Kontak"
              required
              error={showError('hubunganKontakDarurat') ? errors.hubunganKontakDarurat : undefined}
            >
              <Select
                value={form.hubunganKontakDarurat}
                onValueChange={(val) => {
                  updateField('hubunganKontakDarurat', val);
                  handleBlur('hubunganKontakDarurat');
                }}
              >
                <SelectTrigger className={errorInputClass(showError('hubunganKontakDarurat'))}>
                  <SelectValue placeholder="Pilih hubungan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                  <SelectItem value="Pasangan">Pasangan (Suami/Istri)</SelectItem>
                  <SelectItem value="Saudara Kandung">Saudara Kandung</SelectItem>
                  <SelectItem value="Kerabat / Teman">Kerabat / Teman</SelectItem>
                  <SelectItem value="Atasan / Rekan Kerja">Atasan / Rekan Kerja</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Nomor Kontak Darurat"
              required
              error={showError('noKontakDarurat') ? errors.noKontakDarurat : undefined}
              hint="Nomor HP / WhatsApp yang dapat dihubungi"
            >
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.noKontakDarurat}
                  onChange={(e) => updateField('noKontakDarurat', e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                  onBlur={() => handleBlur('noKontakDarurat')}
                  placeholder="628123456789 atau 08123456789"
                  className={cn('pl-10', errorInputClass(showError('noKontakDarurat')))}
                  inputMode="tel"
                />
              </div>
            </Field>
          </FieldGroup>

          {/* Rekening Bank & E-Wallet Section */}
          <SectionHeader
            icon={CreditCard}
            title="4. Rekening Bank / E-Wallet Pencairan"
            subtitle="Pencairan dana pinjaman akan ditransfer langsung ke rekening/e-wallet ini"
          />

          <FieldGroup>
            <Field
              label="Pilih Bank / E-Wallet"
              required
              error={showError('bankOrEwallet') ? errors.bankOrEwallet : undefined}
            >
              <Select
                value={form.bankOrEwallet}
                onValueChange={(val) => {
                  updateField('bankOrEwallet', val);
                  handleBlur('bankOrEwallet');
                }}
              >
                <SelectTrigger className={errorInputClass(showError('bankOrEwallet'))}>
                  <SelectValue placeholder="Pilih Bank atau E-Wallet..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectGroup>
                    <SelectLabel className="font-bold text-xs text-blue-600 px-2 py-1">Bank Transfer Utama</SelectLabel>
                    <SelectItem value="Bank BCA">Bank BCA</SelectItem>
                    <SelectItem value="Bank Mandiri">Bank Mandiri</SelectItem>
                    <SelectItem value="Bank BRI">Bank BRI</SelectItem>
                    <SelectItem value="Bank BNI">Bank BNI</SelectItem>
                    <SelectItem value="Bank CIMB Niaga">Bank CIMB Niaga</SelectItem>
                    <SelectItem value="Bank Permata">Bank Permata</SelectItem>
                    <SelectItem value="Bank Danamon">Bank Danamon</SelectItem>
                    <SelectItem value="Bank BSI (Syariah)">Bank BSI (Syariah)</SelectItem>
                    <SelectItem value="Bank BTN">Bank BTN</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-xs text-emerald-600 px-2 py-1">E-Wallet / Dompet Digital</SelectLabel>
                    <SelectItem value="DANA">DANA</SelectItem>
                    <SelectItem value="OVO">OVO</SelectItem>
                    <SelectItem value="GoPay">GoPay</SelectItem>
                    <SelectItem value="ShopeePay">ShopeePay</SelectItem>
                    <SelectItem value="LinkAja">LinkAja</SelectItem>
                    <SelectItem value="iSaku">iSaku</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-xs text-purple-600 px-2 py-1">Bank Digital & Daerah</SelectLabel>
                    <SelectItem value="Bank Jago">Bank Jago</SelectItem>
                    <SelectItem value="SeaBank">SeaBank</SelectItem>
                    <SelectItem value="Blu by BCA Digital">Blu by BCA Digital</SelectItem>
                    <SelectItem value="Bank Neo Commerce">Bank Neo Commerce (BNC)</SelectItem>
                    <SelectItem value="Bank Jenius / BTPN">Bank Jenius / BTPN</SelectItem>
                    <SelectItem value="Bank Maybank">Bank Maybank</SelectItem>
                    <SelectItem value="Bank Mega">Bank Mega</SelectItem>
                    <SelectItem value="Bank OCBC NISP">Bank OCBC NISP</SelectItem>
                    <SelectItem value="Bank Panin">Bank Panin</SelectItem>
                    <SelectItem value="Bank Sinarmas">Bank Sinarmas</SelectItem>
                    <SelectItem value="Bank BPD / Bank Daerah">Bank BPD (Bank Daerah)</SelectItem>
                    <SelectItem value="Lainnya">Lainnya / Bank Lain</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Nomor Rekening / No. E-Wallet"
              required
              error={showError('nomorRekening') ? errors.nomorRekening : undefined}
              hint="Masukkan 8-25 digit nomor rekening bank atau nomor HP e-wallet"
            >
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={form.nomorRekening}
                  onChange={(e) => updateField('nomorRekening', e.target.value.replace(/\D/g, '').slice(0, 25))}
                  onBlur={() => handleBlur('nomorRekening')}
                  placeholder="Contoh: 1234567890 (No. Rekening/E-Wallet)"
                  className={cn('pl-10', errorInputClass(showError('nomorRekening')))}
                  inputMode="numeric"
                />
              </div>
            </Field>

            <Field
              label="Nama Pemilik Rekening / Akun E-Wallet"
              required
              error={showError('namaPemilikRekening') ? errors.namaPemilikRekening : undefined}
              hint="Pastikan nama sesuai dengan yang terdaftar di rekening bank / e-wallet"
            >
              <Input
                value={form.namaPemilikRekening}
                onChange={(e) => updateField('namaPemilikRekening', e.target.value)}
                onBlur={() => handleBlur('namaPemilikRekening')}
                placeholder="Contoh: BUDI SANTOSO"
                className={errorInputClass(showError('namaPemilikRekening'))}
              />
            </Field>
          </FieldGroup>

          {/* Dokumen Selfie */}
          <SectionHeader
            icon={ShieldCheck}
            title="5. Verification Selfie"
            subtitle="Dokumen verifikasi foto selfie"
          />

          <div className="space-y-4">
            <FileUpload
              label="Upload Selfie dengan KTP"
              required
              hint="Selfie sambil memegang KTP secara jelas"
              icon="selfie"
              onFileSelect={(file) => {
                setFiles({ ...files, selfie: file });
                setTouched({ ...touched, files: true });
              }}
            />
          </div>
        </div>

        {/* Kolom Kanan — Data Pinjaman & Submit */}
        <div className="space-y-5">
          <SectionHeader
            icon={DollarSign}
            title="Data Pinjaman"
            subtitle="Pilih sesuai kebutuhan Anda"
          />

          <FieldGroup>
            <Field
              label="Jumlah Pinjaman"
              required
              error={showError('jumlahPinjaman') ? errors.jumlahPinjaman : undefined}
            >
              <Select
                value={form.jumlahPinjaman}
                onValueChange={(v) => updateField('jumlahPinjaman', v)}
              >
                <SelectTrigger className={errorInputClass(showError('jumlahPinjaman'))}>
                  <SelectValue placeholder="Pilih jumlah pinjaman" />
                </SelectTrigger>
                <SelectContent>
                  {activeJumlah.map((j) => (
                    <SelectItem key={j.value} value={String(j.value)}>
                      {formatRupiah(j.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Tenor"
              required
              error={showError('tenor') ? errors.tenor : undefined}
            >
              <Select
                value={form.tenor}
                onValueChange={(v) => updateField('tenor', v)}
              >
                <SelectTrigger className={errorInputClass(showError('tenor'))}>
                  <SelectValue placeholder="Pilih tenor pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  {activeTenor.map((t) => (
                    <SelectItem key={t.value} value={String(t.value)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <FileUpload
            label="Upload Social Media"
            required
            hint="Screenshot profil social media Anda"
            icon="socmed"
            onFileSelect={(file) => {
              setFiles({ ...files, socmed: file });
              setTouched({ ...touched, files: true });
            }}
          />

          {/* Loan Summary Card */}
          {selectedJumlah > 0 && selectedTenor > 0 ? (
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-blue-100 pb-3">
                <Calculator className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-semibold text-slate-700">Ringkasan Pinjaman</h4>
              </div>
              <div className="space-y-3">
                <SummaryRow label="Jumlah Pinjaman" value={formatRupiah(selectedJumlah)} />
                <SummaryRow label="Bunga" value={formatRupiah(activeBunga)} />
                <SummaryRow label="Tenor" value={`${selectedTenor} hari`} />
                {config?.enableCicilan && (
                  <SummaryRow
                    label="Estimasi Cicilan / Bulan"
                    value={formatRupiah(cicilanPerBulan)}
                    highlight
                  />
                )}
                <div className="mt-3 flex items-center justify-between border-t border-blue-100 pt-3">
                  <span className="text-sm font-semibold text-slate-700">Total Pengembalian</span>
                  <span className="text-lg font-bold text-blue-700">
                    {formatRupiah(totalBayar)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <p className="text-sm text-slate-500">
                Pilih jumlah pinjaman dan tenor untuk melihat ringkasan detail pinjaman Anda.
              </p>
            </div>
          )}

          {/* Info notice */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <p className="text-sm text-slate-600">
              Pastikan data yang Anda masukkan benar. Pengajuan akan diproses dalam 1x24 jam
              dan hasilnya dikirim via WhatsApp.
            </p>
          </div>

          {/* File error */}
          {showError('files') && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              <Info className="h-4 w-4" />
              {errors.files}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-lg transition-all hover:scale-[1.01] hover:shadow-xl disabled:scale-100 disabled:opacity-60"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim pengajuan...
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" /> Ajukan Pinjaman Sekarang
              </>
            )}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Data Anda terenkripsi dan aman
          </p>
        </div>
      </form>

      {successId && (
        <SuccessModal
          open={!!successId}
          onClose={() => setSuccessId(null)}
          idPengajuan={successId}
        />
      )}
    </>
  );
}

/* --- Helper components --- */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
          <Info className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span
        className={
          highlight
            ? 'text-sm font-semibold text-blue-700'
            : 'text-sm font-medium text-slate-700'
        }
      >
        {value}
      </span>
    </div>
  );
}

function errorInputClass(hasError: boolean | string | undefined): string {
  return hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
    : '';
}
