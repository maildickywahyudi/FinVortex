'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader as Loader2,
  Send,
  User,
  MapPin,
  DollarSign,
  Calendar,
  Phone,
  Info,
  ShieldCheck,
  Calculator,
  Crosshair,
  CircleCheck as CheckCircle2,
  Users,
  CreditCard,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  FileText,
  Building,
  Check,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  alamatLengkap: string;
  shareLokasi: string;
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
  alamatLengkap?: string;
  shareLokasi?: string;
  namaKontakDarurat?: string;
  hubunganKontakDarurat?: string;
  noKontakDarurat?: string;
  bankOrEwallet?: string;
  nomorRekening?: string;
  namaPemilikRekening?: string;
  jumlahPinjaman?: string;
  tenor?: string;
  ktp?: string;
  selfie?: string;
  socmed?: string;
  agreement?: string;
}

const initialState: FormState = {
  nama: '',
  nik: '',
  tanggalLahir: '',
  whatsapp: '',
  alamatLengkap: '',
  shareLokasi: '',
  namaKontakDarurat: '',
  hubunganKontakDarurat: '',
  noKontakDarurat: '',
  bankOrEwallet: '',
  nomorRekening: '',
  namaPemilikRekening: '',
  jumlahPinjaman: '',
  tenor: '',
};

const STEP_TITLES = [
  { id: 1, title: 'KTP & Data Diri', icon: CreditCard, subtitle: 'Verifikasi KTP & Data Pribadi' },
  { id: 2, title: 'Alamat & Lokasi', icon: MapPin, subtitle: 'Alamat Domisili & Share GPS' },
  { id: 3, title: 'Kontak & Rekening', icon: Building, subtitle: 'Kontak Darurat & Rekening Transfer' },
  { id: 4, title: 'Pinjaman & Dokumen', icon: DollarSign, subtitle: 'Simulasi & Upload Verifikasi' },
  { id: 5, title: 'Konfirmasi', icon: CheckCircle2, subtitle: 'Tinjau & Kirim Pengajuan' },
];

const stepVariants = {
  initial: (dir: number) => ({
    x: dir > 0 ? 28 : -28,
    opacity: 0,
    scale: 0.98,
  }),
  animate: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 28 : -28,
    opacity: 0,
    scale: 0.98,
  }),
};

export function FormPengajuan() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [draftRestored, setDraftRestored] = useState(false);
  const [agreed, setAgreed] = useState(false);

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

    const dmyMatch = str.match(/\b(\d{1,2})[-/.\s]+(\d{1,2})[-/.\s]+(\d{4})\b/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

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
    setTouched((prev) => ({ ...prev, ktp: true }));

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

        try {
          const { recognize } = await import('tesseract.js');
          const result = await recognize(dataUrl, 'eng').catch(() => null);
          if (result?.data?.text) {
            const text = result.data.text;
            const nikMatch = text.match(/\b[1-9][0-9]{15}\b/);
            const extractedNik = nikMatch ? nikMatch[0] : '';

            const namaMatch = text.match(/Nama\s*[:\s]*([A-Za-z\s]{3,40})/i);
            const extractedNama = namaMatch ? namaMatch[1].trim().toUpperCase() : '';

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

    try {
      const saved = localStorage.getItem('lms_form_pengajuan_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const hasContent = Object.values(parsed).some((v) => Boolean(v && String(v).trim()));
          if (hasContent) {
            setForm((prev) => ({ ...prev, ...parsed }));
            if (parsed.shareLokasi) setLocationShared(true);
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
    setLocationShared(false);
    setLiveCoords(null);
    setCurrentStep(1);
    toast.success('Draft formulir berhasil dibersihkan.');
  };

  const activeTenor = config?.tenor.filter((t) => t.active) || [];
  const activeJumlah = config?.jumlahPinjaman.filter((j) => j.active) || [];
  const activeBunga = config?.bunga.find((b) => b.value === parseInt(form.jumlahPinjaman))?.value ?? config?.bunga[0]?.value ?? 0;

  const usia = useMemo(() => calculateUsia(form.tanggalLahir), [form.tanggalLahir]);

  const errors = useMemo(() => {
    const errs: FormErrors = {};

    // Step 1 Errors
    if (currentStep >= 1) {
      if (!files.ktp) errs.ktp = 'Foto KTP wajib diupload';

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
    }

    // Step 2 Errors
    if (currentStep >= 2) {
      const alamatTrim = form.alamatLengkap.trim();
      if (!alamatTrim) errs.alamatLengkap = 'Alamat lengkap domisili wajib diisi';
      else if (alamatTrim.length < 10) errs.alamatLengkap = 'Alamat terlalu singkat. Masukkan jalan, RT/RW, kelurahan/kecamatan';
    }

    // Step 3 Errors
    if (currentStep >= 3) {
      const namaKdTrim = form.namaKontakDarurat.trim();
      if (!namaKdTrim) errs.namaKontakDarurat = 'Nama kontak darurat wajib diisi';
      else if (namaKdTrim.length < 3) errs.namaKontakDarurat = 'Nama kontak darurat minimal 3 karakter';

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
    }

    // Step 4 Errors
    if (currentStep >= 4) {
      if (!form.jumlahPinjaman) errs.jumlahPinjaman = 'Pilih jumlah pinjaman';
      if (!form.tenor) errs.tenor = 'Pilih tenor';
      if (!files.selfie) errs.selfie = 'Upload selfie dengan KTP wajib diisi';
      if (!files.socmed) errs.socmed = 'Upload akun social media wajib diisi';
    }

    // Step 5 Agreement
    if (currentStep === 5 && !agreed) {
      errs.agreement = 'Anda harus menyetujui syarat & ketentuan pengajuan';
    }

    return errs;
  }, [form, files, usia, currentStep, agreed]);

  const validateStep = (stepNumber: number): boolean => {
    const newTouched: Record<string, boolean> = { ...touched };

    if (stepNumber === 1) {
      newTouched.ktp = true;
      newTouched.nama = true;
      newTouched.nik = true;
      newTouched.tanggalLahir = true;
      newTouched.whatsapp = true;
      setTouched(newTouched);

      if (!files.ktp) {
        toast.error('Mohon upload Foto KTP Anda terlebih dahulu');
        return false;
      }
      if (!form.nama.trim() || form.nama.trim().length < 3) {
        toast.error('Mohon isi Nama Lengkap sesuai KTP');
        return false;
      }
      if (!form.nik.trim() || !/^\d{16}$/.test(form.nik.trim())) {
        toast.error('Mohon isi 16 digit NIK KTP Anda');
        return false;
      }
      if (!form.tanggalLahir || (usia !== null && (usia < 17 || usia > 75))) {
        toast.error('Mohon periksa Tanggal Lahir (usia 17-75 tahun)');
        return false;
      }
      if (!form.whatsapp || !isValidPhone(form.whatsapp)) {
        toast.error('Mohon isi Nomor WhatsApp aktif yang valid');
        return false;
      }
      return true;
    }

    if (stepNumber === 2) {
      newTouched.alamatLengkap = true;
      setTouched(newTouched);

      if (!form.alamatLengkap.trim() || form.alamatLengkap.trim().length < 10) {
        toast.error('Mohon isi Alamat Lengkap Domisili tempat tinggal Anda');
        return false;
      }
      return true;
    }

    if (stepNumber === 3) {
      newTouched.namaKontakDarurat = true;
      newTouched.hubunganKontakDarurat = true;
      newTouched.noKontakDarurat = true;
      newTouched.bankOrEwallet = true;
      newTouched.nomorRekening = true;
      newTouched.namaPemilikRekening = true;
      setTouched(newTouched);

      if (!form.namaKontakDarurat.trim() || !form.hubunganKontakDarurat || !form.noKontakDarurat || !isValidPhone(form.noKontakDarurat)) {
        toast.error('Mohon lengkapi informasi Kontak Darurat');
        return false;
      }
      if (formatPhone(form.whatsapp) === formatPhone(form.noKontakDarurat)) {
        toast.error('Nomor Kontak Darurat tidak boleh sama dengan Nomor WhatsApp Anda');
        return false;
      }
      if (!form.bankOrEwallet || !form.nomorRekening.trim() || !/^\d{8,25}$/.test(form.nomorRekening.trim()) || !form.namaPemilikRekening.trim()) {
        toast.error('Mohon isi data Bank / E-Wallet Pencairan secara lengkap');
        return false;
      }
      return true;
    }

    if (stepNumber === 4) {
      newTouched.jumlahPinjaman = true;
      newTouched.tenor = true;
      newTouched.selfie = true;
      newTouched.socmed = true;
      setTouched(newTouched);

      if (!form.jumlahPinjaman || !form.tenor) {
        toast.error('Mohon pilih Jumlah Pinjaman dan Tenor');
        return false;
      }
      if (!files.selfie) {
        toast.error('Mohon upload Foto Selfie dengan KTP');
        return false;
      }
      if (!files.socmed) {
        toast.error('Mohon upload Tangkapan Layar Profil Social Media');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const selectedJumlah = parseInt(form.jumlahPinjaman) || 0;
  const selectedTenor = parseInt(form.tenor) || 0;
  const totalBayar = selectedJumlah + activeBunga;
  const cicilanPerBulan = selectedTenor > 0 ? Math.ceil(totalBayar / (selectedTenor / 30)) : 0;

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Browser Anda tidak mendukung lokasi GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLiveCoords({ lat: latitude, lng: longitude });
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        const locString = `GPS (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) - ${mapsUrl}`;
        
        updateField('shareLokasi', locString);
        setLocationShared(true);
        toast.success('📍 Koordinat GPS Rumah Anda Berhasil Dideteksi!');
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        console.warn('Geolocation error:', err);
        toast.error('Izin lokasi ditolak. Buka pengaturan browser untuk mengizinkan akses lokasi.');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Centang persetujuan syarat & ketentuan terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const [ktpUrl, selfieUrl, socmedUrl] = await Promise.all([
        fileToDataUrl(files.ktp),
        fileToDataUrl(files.selfie),
        fileToDataUrl(files.socmed),
      ]);

      const lokasiCombined = form.shareLokasi
        ? `${form.alamatLengkap.trim()} | Share Lokasi: ${form.shareLokasi.trim()}`
        : form.alamatLengkap.trim();

      const result = await submitPengajuan({
        nama: form.nama.trim(),
        nik: form.nik.trim(),
        tanggalLahir: form.tanggalLahir,
        whatsapp: formatPhone(form.whatsapp),
        lokasi: lokasiCombined,
        alamatLengkap: form.alamatLengkap.trim(),
        shareLokasi: form.shareLokasi.trim(),
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
        console.warn('Gagal menghapus draft', e);
      }
      setForm(initialState);
      setFiles({ ktp: null, selfie: null, socmed: null });
      setTouched({});
      setDraftRestored(false);
      setLocationShared(false);
      setLiveCoords(null);
      setAgreed(false);
      setCurrentStep(1);
    } catch {
      toast.error('Terjadi kesalahan saat mengirim data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const showError = (field: keyof FormErrors) => touched[field] && errors[field];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {draftRestored && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-600 animate-ping shrink-0" />
            <span>
              <strong>💾 Draft Otomatis Tersimpan:</strong> Data yang Anda ketik sebelumnya berhasil dimuat.
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

      {/* Multi-Step Stepper Navigation Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
        {/* Mobile Compact Progress Bar (Visible on mobile screens) */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px]">
                {currentStep}
              </span>
              <span>Langkah {currentStep} dari 5</span>
            </span>
            <span className="text-slate-500 font-normal">
              {STEP_TITLES[currentStep - 1].title}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop Stepper Bar (Hidden on small mobile screens) */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-2 relative">
          {STEP_TITLES.map((step) => {
            const IconComponent = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep) {
                    setCurrentStep(step.id);
                  } else if (step.id > currentStep && validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
                className={cn(
                  'flex flex-col items-center text-center p-2 rounded-xl transition-all relative border',
                  isActive
                    ? 'border-blue-500 bg-blue-50/70 text-blue-700 font-bold shadow-2xs'
                    : isCompleted
                      ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800 hover:bg-emerald-50'
                      : 'border-slate-100 text-slate-400 bg-slate-50/50 hover:bg-slate-100'
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl font-bold text-xs transition-colors mb-1.5',
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-500'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <IconComponent className="h-4 w-4" />}
                </div>
                <span className="text-xs line-clamp-1">{step.title}</span>
                <span className="text-[10px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                  Langkah {step.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm space-y-6 overflow-hidden">
        
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* STEP 1: VERIFIKASI KTP & DATA DIRI */}
            {currentStep === 1 && (
              <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" /> 1. Upload KTP & Data Pribadi
                </h2>
                <p className="text-xs text-slate-500">Ambil foto KTP horizontal yang jelas untuk pemindaian otomatis dengan AI</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Langkah 1/5
              </span>
            </div>

            {/* KTP File Upload & AI OCR Banner */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/60 to-slate-50/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">Foto KTP Asli</h3>
                    <p className="text-xs text-slate-500">Deteksi otomatis Nama, NIK, & Tanggal Lahir</p>
                  </div>
                </div>
              </div>

              <FileUpload
                label="Unggah Foto KTP Asli"
                required
                hint={ocrLoading ? "⏳ Menganalisis KTP dengan AI..." : "Foto KTP horizontal, terang, dan tidak buram"}
                icon="ktp"
                onFileSelect={handleKtpSelectAndOcr}
              />
              {showError('ktp') && <p className="text-xs text-rose-500 font-medium">Foto KTP wajib diupload</p>}

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

              {/* Panel Hasil Ekstraksi KTP */}
              {ocrData && !ocrLoading && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Data KTP Terdeteksi Secara Otomatis</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">NAMA LENGKAP</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {ocrData.nama || <span className="text-amber-600 italic">Perlu diisi manual</span>}
                      </span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">NIK KTP</span>
                      <span className="font-bold text-slate-800 truncate block font-mono">
                        {ocrData.nik || <span className="text-amber-600 italic">Perlu diisi manual</span>}
                      </span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-lg border border-emerald-100 shadow-2xs">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">TANGGAL LAHIR</span>
                      <span className="font-bold text-slate-800 truncate block">
                        {ocrData.tanggalLahir || <span className="text-amber-600 italic">Perlu diisi manual</span>}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatingInput
                label="Nama Lengkap"
                required
                value={form.nama}
                onChange={(e) => updateField('nama', e.target.value)}
                onBlur={() => handleBlur('nama')}
                error={showError('nama') ? errors.nama : undefined}
                hint={form.nama && ocrData?.nama ? "✨ Terisi otomatis dari KTP" : undefined}
              />

              <FloatingInput
                label="NIK KTP (16 Digit)"
                required
                value={form.nik}
                onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                onBlur={() => handleBlur('nik')}
                error={showError('nik') ? errors.nik : undefined}
                maxLength={16}
                inputMode="numeric"
              />

              <FloatingInput
                type="date"
                label="Tanggal Lahir"
                required
                value={form.tanggalLahir}
                onChange={(e) => updateField('tanggalLahir', e.target.value)}
                onBlur={() => handleBlur('tanggalLahir')}
                error={showError('tanggalLahir') ? errors.tanggalLahir : undefined}
              />

              <div className="space-y-1 w-full">
                <div className="relative group w-full h-13 flex flex-col justify-center px-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Usia Peminjam</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {usia !== null ? `${usia} Tahun` : '— (Otomatis Terhitung)'}
                  </span>
                </div>
              </div>

              <FloatingInput
                label="Nomor WhatsApp (HP)"
                required
                icon={Phone}
                value={form.whatsapp}
                onChange={(e) => updateField('whatsapp', e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                onBlur={() => handleBlur('whatsapp')}
                error={showError('whatsapp') ? errors.whatsapp : undefined}
                hint="Aktif verifikasi"
                inputMode="tel"
              />
            </div>
          </div>
        )}

        {/* STEP 2: ALAMAT LENGKAP & SHARE LOKASI GPS */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" /> 2. Alamat Domisili & Share GPS
                </h2>
                <p className="text-xs text-slate-500">
                  Tentukan alamat tempat tinggal saat ini dan bagikan titik lokasi GPS Anda
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Langkah 2/5
              </span>
            </div>

            {/* Field 1: Alamat Lengkap Teks */}
            <FloatingTextarea
              label="Alamat Lengkap Domisili Tempat Tinggal"
              required
              rows={3}
              value={form.alamatLengkap}
              onChange={(e) => updateField('alamatLengkap', e.target.value)}
              onBlur={() => handleBlur('alamatLengkap')}
              error={showError('alamatLengkap') ? errors.alamatLengkap : undefined}
            />

            {/* Field 2: Share Lokasi GPS */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                    <Compass className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base">Bagikan Lokasi GPS Rumah (Optional)</h3>
                    <p className="text-xs text-slate-500">Membantu mempercepat proses verifikasi tim survei</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  type="button"
                  onClick={handleShareLocation}
                  disabled={locating}
                  variant={locationShared ? 'outline' : 'default'}
                  className={cn(
                    'h-11 px-5 font-semibold text-xs transition-all shadow-xs shrink-0',
                    locationShared
                      ? 'border-emerald-500 text-emerald-700 bg-emerald-100/80 hover:bg-emerald-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                >
                  {locating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mendeteksi GPS Browser...
                    </>
                  ) : locationShared ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Lokasi GPS Berhasil Diperbarui
                    </>
                  ) : (
                    <>
                      <Crosshair className="mr-2 h-4 w-4" /> Deteksi Titik Lokasi GPS Saya
                    </>
                  )}
                </Button>

                {form.shareLokasi ? (
                  <div className="flex-1 bg-white p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 overflow-hidden text-ellipsis">
                    <span className="font-bold block text-[10px] text-emerald-700 uppercase">KOORDINAT TERVERIFIKASI</span>
                    <span className="font-mono text-slate-700 break-all">{form.shareLokasi}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Tekan tombol di atas saat berada di rumah.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: KONTAK DARURAT & REKENING */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> 3. Kontak Darurat & Bank / E-Wallet
                </h2>
                <p className="text-xs text-slate-500">Kerabat yang dapat dihubungi & rekening pencairan dana pinjaman</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Langkah 3/5
              </span>
            </div>

            {/* Kontak Darurat */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 border-l-4 border-blue-600 pl-2">Informasi Kontak Darurat</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FloatingInput
                  label="Nama Kontak Darurat"
                  required
                  value={form.namaKontakDarurat}
                  onChange={(e) => updateField('namaKontakDarurat', e.target.value)}
                  onBlur={() => handleBlur('namaKontakDarurat')}
                  error={showError('namaKontakDarurat') ? errors.namaKontakDarurat : undefined}
                />

                <FloatingSelect
                  label="Hubungan Kontak"
                  required
                  value={form.hubunganKontakDarurat}
                  onValueChange={(val) => {
                    updateField('hubunganKontakDarurat', val);
                    handleBlur('hubunganKontakDarurat');
                  }}
                  error={showError('hubunganKontakDarurat') ? errors.hubunganKontakDarurat : undefined}
                >
                  <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                  <SelectItem value="Pasangan">Pasangan (Suami/Istri)</SelectItem>
                  <SelectItem value="Saudara Kandung">Saudara Kandung</SelectItem>
                  <SelectItem value="Kerabat / Teman">Kerabat / Teman</SelectItem>
                  <SelectItem value="Atasan / Rekan Kerja">Atasan / Rekan Kerja</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </FloatingSelect>

                <FloatingInput
                  label="Nomor Kontak Darurat"
                  required
                  icon={Phone}
                  value={form.noKontakDarurat}
                  onChange={(e) => updateField('noKontakDarurat', e.target.value.replace(/[^\d+]/g, '').slice(0, 15))}
                  onBlur={() => handleBlur('noKontakDarurat')}
                  error={showError('noKontakDarurat') ? errors.noKontakDarurat : undefined}
                  inputMode="tel"
                />
              </div>
            </div>

            {/* Rekening Transfer / E-Wallet */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-700 border-l-4 border-emerald-600 pl-2">Rekening Bank / E-Wallet Pencairan</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FloatingSelect
                  label="Pilih Bank / E-Wallet"
                  required
                  value={form.bankOrEwallet}
                  onValueChange={(val) => {
                    updateField('bankOrEwallet', val);
                    handleBlur('bankOrEwallet');
                  }}
                  error={showError('bankOrEwallet') ? errors.bankOrEwallet : undefined}
                >
                  <SelectGroup>
                    <SelectLabel className="font-bold text-xs text-blue-600 px-2 py-1">Bank Utama</SelectLabel>
                    <SelectItem value="Bank BCA">Bank BCA</SelectItem>
                    <SelectItem value="Bank Mandiri">Bank Mandiri</SelectItem>
                    <SelectItem value="Bank BRI">Bank BRI</SelectItem>
                    <SelectItem value="Bank BNI">Bank BNI</SelectItem>
                    <SelectItem value="Bank CIMB Niaga">Bank CIMB Niaga</SelectItem>
                    <SelectItem value="Bank Permata">Bank Permata</SelectItem>
                    <SelectItem value="Bank BSI (Syariah)">Bank BSI (Syariah)</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-xs text-emerald-600 px-2 py-1">E-Wallet</SelectLabel>
                    <SelectItem value="DANA">DANA</SelectItem>
                    <SelectItem value="OVO">OVO</SelectItem>
                    <SelectItem value="GoPay">GoPay</SelectItem>
                    <SelectItem value="ShopeePay">ShopeePay</SelectItem>
                    <SelectItem value="LinkAja">LinkAja</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className="font-bold text-xs text-purple-600 px-2 py-1">Bank Digital</SelectLabel>
                    <SelectItem value="Bank Jago">Bank Jago</SelectItem>
                    <SelectItem value="SeaBank">SeaBank</SelectItem>
                    <SelectItem value="Blu by BCA">Blu by BCA</SelectItem>
                    <SelectItem value="Bank Neo Commerce">Bank Neo Commerce (BNC)</SelectItem>
                    <SelectItem value="Lainnya">Bank Lain / Lainnya</SelectItem>
                  </SelectGroup>
                </FloatingSelect>

                <FloatingInput
                  label="Nomor Rekening / No. HP E-Wallet"
                  required
                  value={form.nomorRekening}
                  onChange={(e) => updateField('nomorRekening', e.target.value.replace(/\D/g, '').slice(0, 25))}
                  onBlur={() => handleBlur('nomorRekening')}
                  error={showError('nomorRekening') ? errors.nomorRekening : undefined}
                  inputMode="numeric"
                />

                <FloatingInput
                  label="Nama Pemilik Rekening"
                  required
                  value={form.namaPemilikRekening}
                  onChange={(e) => updateField('namaPemilikRekening', e.target.value)}
                  onBlur={() => handleBlur('namaPemilikRekening')}
                  error={showError('namaPemilikRekening') ? errors.namaPemilikRekening : undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: SIMULASI PINJAMAN & UPLOAD DOKUMEN */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" /> 4. Nominal Pinjaman & Verifikasi Foto
                </h2>
                <p className="text-xs text-slate-500">Pilih plafon, tenor, dan unggah foto verifikasi pendukung</p>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Langkah 4/5
              </span>
            </div>

            {/* Plafon & Tenor Selection with Interactive Grid Chips */}
            <div className="space-y-4">
              <Field
                label="Jumlah Pinjaman (Plafon)"
                required
                error={showError('jumlahPinjaman') ? errors.jumlahPinjaman : undefined}
                hint="Pilih salah satu plafon di bawah ini"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {activeJumlah.map((j) => {
                    const isSelected = form.jumlahPinjaman === String(j.value);
                    return (
                      <button
                        key={j.value}
                        type="button"
                        onClick={() => updateField('jumlahPinjaman', String(j.value))}
                        className={cn(
                          'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all',
                          isSelected
                            ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                        )}
                      >
                        <span className="text-xs sm:text-sm font-bold">{formatRupiah(j.value)}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field
                label="Tenor Pembayaran"
                required
                error={showError('tenor') ? errors.tenor : undefined}
                hint="Jangka waktu pelunasan"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {activeTenor.map((t) => {
                    const isSelected = form.tenor === String(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateField('tenor', String(t.value))}
                        className={cn(
                          'flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all',
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-md ring-2 ring-emerald-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                        )}
                      >
                        <span className="text-xs sm:text-sm font-bold">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {/* Ringkasan Simulasi Pinjaman */}
            {selectedJumlah > 0 && selectedTenor > 0 ? (
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-blue-100 pb-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <h4 className="text-sm font-bold text-slate-800">Rincian Ringkasan Pinjaman</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Jumlah Pinjaman</span>
                    <span className="font-bold text-slate-800 text-sm">{formatRupiah(selectedJumlah)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estimasi Bunga</span>
                    <span className="font-bold text-slate-800 text-sm">{formatRupiah(activeBunga)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tenor</span>
                    <span className="font-bold text-slate-800 text-sm">{selectedTenor} Hari</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Pengembalian</span>
                    <span className="font-bold text-blue-700 text-sm">{formatRupiah(totalBayar)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* File Uploads: Selfie & Sosmed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <FileUpload
                  label="Upload Foto Selfie Pegang KTP"
                  required
                  hint="Foto wajah dengan KTP terlihat jelas"
                  icon="selfie"
                  onFileSelect={(file) => {
                    setFiles((prev) => ({ ...prev, selfie: file }));
                    setTouched((prev) => ({ ...prev, selfie: true }));
                  }}
                />
                {showError('selfie') && <p className="text-xs text-rose-500 font-medium mt-1">Foto Selfie KTP wajib diupload</p>}
              </div>

              <div>
                <FileUpload
                  label="Upload Profil Social Media"
                  required
                  hint="Tangkapan layar profil FB / IG / TikTok"
                  icon="socmed"
                  onFileSelect={(file) => {
                    setFiles((prev) => ({ ...prev, socmed: file }));
                    setTouched((prev) => ({ ...prev, socmed: true }));
                  }}
                />
                {showError('socmed') && <p className="text-xs text-rose-500 font-medium mt-1">Foto Profil Social Media wajib diupload</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: KONFIRMASI & RINGKASAN FINAL */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" /> 5. Konfirmasi Akhir Data Pengajuan
                </h2>
                <p className="text-xs text-slate-500">Periksa kembali ringkasan data Anda sebelum menekan tombol kirim</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Langkah 5/5
              </span>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Card 1: Data Diri */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-blue-600" /> Data Peminjam
                  </span>
                  <button type="button" onClick={() => setCurrentStep(1)} className="text-blue-600 font-semibold hover:underline">
                    Edit
                  </button>
                </div>
                <p><strong>Nama:</strong> {form.nama || '-'}</p>
                <p><strong>NIK KTP:</strong> <span className="font-mono">{form.nik || '-'}</span></p>
                <p><strong>Tanggal Lahir:</strong> {form.tanggalLahir || '-'} ({usia !== null ? `${usia} thn` : '-'})</p>
                <p><strong>WhatsApp:</strong> {form.whatsapp || '-'}</p>
              </div>

              {/* Card 2: Alamat & Lokasi */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" /> Alamat & GPS
                  </span>
                  <button type="button" onClick={() => setCurrentStep(2)} className="text-blue-600 font-semibold hover:underline">
                    Edit
                  </button>
                </div>
                <p><strong>Alamat Domisili:</strong> {form.alamatLengkap || '-'}</p>
                <p><strong>Koordinat GPS:</strong> {form.shareLokasi || 'Tidak dibagikan'}</p>
              </div>

              {/* Card 3: Kontak & Bank */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-purple-600" /> Kontak & Bank
                  </span>
                  <button type="button" onClick={() => setCurrentStep(3)} className="text-blue-600 font-semibold hover:underline">
                    Edit
                  </button>
                </div>
                <p><strong>Kontak Darurat:</strong> {form.namaKontakDarurat} ({form.hubunganKontakDarurat}) - {form.noKontakDarurat}</p>
                <p><strong>Pencairan Ke:</strong> {form.bankOrEwallet} - <span className="font-mono">{form.nomorRekening}</span> ({form.namaPemilikRekening})</p>
              </div>

              {/* Card 4: Pinjaman */}
              <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200 space-y-2 text-blue-950">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-blue-600" /> Ringkasan Pinjaman
                  </span>
                  <button type="button" onClick={() => setCurrentStep(4)} className="text-blue-700 font-semibold hover:underline">
                    Edit
                  </button>
                </div>
                <p><strong>Plafon Pinjaman:</strong> {formatRupiah(selectedJumlah)}</p>
                <p><strong>Tenor:</strong> {selectedTenor} Hari</p>
                <p><strong>Total Pengembalian:</strong> <strong className="text-blue-700 text-sm">{formatRupiah(totalBayar)}</strong></p>
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <span className="text-xs text-amber-950 leading-relaxed">
                  Saya menyatakan bahwa data yang saya masukkan adalah benar dan valid. Saya menyetujui data saya diproses untuk keperluan verifikasi pengajuan pinjaman sesuai dengan kebijakan privasi.
                </span>
              </label>
              {errors.agreement && <p className="text-xs text-rose-600 font-medium pl-7">{errors.agreement}</p>}
            </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>

        {/* STEPPER CONTROL BUTTONS (Next & Prev) */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="w-full sm:w-auto h-11 px-6 font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 shrink-0"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Sebelumnya
            </Button>
          ) : (
            <div className="hidden sm:block" />
          )}

          {currentStep < 5 ? (
            <Button
              type="button"
              onClick={handleNextStep}
              className="w-full sm:w-auto h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all shrink-0"
            >
              Selanjutnya <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || !agreed}
              className="w-full sm:w-auto h-11 px-10 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold shadow-lg transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Mengirim pengajuan...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" /> Kirim Pengajuan Sekarang
                </>
              )}
            </Button>
          )}
        </div>
      </form>

      {successId && (
        <SuccessModal
          open={!!successId}
          onClose={() => setSuccessId(null)}
          idPengajuan={successId}
        />
      )}
    </div>
  );
}

/* Floating Label Input Component */
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

function FloatingInput({
  label,
  required,
  error,
  hint,
  icon: Icon,
  value,
  className,
  onFocus,
  onBlur,
  type = 'text',
  ...props
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const isFilled = value !== undefined && value !== null && String(value).trim() !== '';
  const isFloating = focused || isFilled || type === 'date';

  return (
    <div className="space-y-1 w-full">
      <div className="relative group w-full">
        {Icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none z-10">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <Input
          type={type}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'h-13 pt-5 pb-1.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white border rounded-xl transition-all shadow-2xs',
            Icon ? 'pl-10 pr-3.5' : 'px-3.5',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10',
            className
          )}
          {...props}
        />
        <label
          className={cn(
            'absolute pointer-events-none select-none transition-all duration-200 ease-out z-10',
            Icon ? 'left-10' : 'left-3.5',
            isFloating
              ? 'top-1.5 text-[10px] sm:text-[11px] font-bold text-blue-600'
              : 'top-3.5 text-xs font-normal text-slate-400',
            error && isFloating && 'text-rose-500'
          )}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && !error && (
          <span className="absolute right-3 top-1.5 text-[10px] font-medium text-slate-400 pointer-events-none">
            {hint}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 pl-1 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Info className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/* Floating Label Textarea Component */
interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

function FloatingTextarea({
  label,
  required,
  error,
  hint,
  value,
  className,
  onFocus,
  onBlur,
  ...props
}: FloatingTextareaProps) {
  const [focused, setFocused] = useState(false);
  const isFilled = value !== undefined && value !== null && String(value).trim() !== '';
  const isFloating = focused || isFilled;

  return (
    <div className="space-y-1 w-full">
      <div className="relative group w-full">
        <Textarea
          value={value}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          className={cn(
            'pt-6 pb-2 px-3.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white border rounded-xl transition-all shadow-2xs resize-none',
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
              : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10',
            className
          )}
          {...props}
        />
        <label
          className={cn(
            'absolute left-3.5 pointer-events-none select-none transition-all duration-200 ease-out z-10',
            isFloating
              ? 'top-1.5 text-[10px] sm:text-[11px] font-bold text-blue-600'
              : 'top-3.5 text-xs font-normal text-slate-400',
            error && isFloating && 'text-rose-500'
          )}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && !error && isFloating && (
          <span className="absolute right-3 top-1.5 text-[10px] font-medium text-slate-400 pointer-events-none">
            {hint}
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 pl-1 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Info className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/* Floating Label Select Component */
interface FloatingSelectProps {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  placeholder?: string;
}

function FloatingSelect({
  label,
  required,
  error,
  value,
  onValueChange,
  children,
  placeholder = 'Pilih...',
}: FloatingSelectProps) {
  const [open, setOpen] = useState(false);
  const isFilled = Boolean(value);
  const isFloating = open || isFilled;

  return (
    <div className="space-y-1 w-full">
      <div className="relative group w-full">
        <Select
          value={value}
          onValueChange={onValueChange}
          onOpenChange={setOpen}
        >
          <SelectTrigger
            className={cn(
              'h-13 pt-5 pb-1.5 px-3.5 text-xs sm:text-sm font-semibold text-slate-900 bg-white border rounded-xl transition-all shadow-2xs',
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-rose-50/20'
                : 'border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
            )}
          >
            <SelectValue placeholder={isFloating ? '' : placeholder} />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl border-slate-200 z-50">
            {children}
          </SelectContent>
        </Select>

        <label
          className={cn(
            'absolute left-3.5 pointer-events-none select-none transition-all duration-200 ease-out z-10',
            isFloating
              ? 'top-1.5 text-[10px] sm:text-[11px] font-bold text-blue-600'
              : 'top-3.5 text-xs font-normal text-slate-400',
            error && isFloating && 'text-rose-500'
          )}
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500 pl-1 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <Info className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/* Helper Field Component */
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hint && !error && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
          <Info className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function errorInputClass(hasError: boolean | string | undefined): string {
  return hasError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20' : '';
}
