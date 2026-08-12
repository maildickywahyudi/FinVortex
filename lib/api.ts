import type {
  AdminUser,
  AppConfig,
  Nasabah,
  StatusPengajuan,
  DashboardStats,
  ChartData,
  StatusComposition,
  StatusHistoryItem,
  AdminActivityLog,
} from '@/types';
import { addDays, toISODate } from '@/lib/utils';

/**
 * ============================================================
 *  LMS API LAYER
 * ============================================================
 * Jika NEXT_PUBLIC_APPS_SCRIPT_URL diatur di .env / Vercel,
 * semua pemanggilan API akan diarahkan ke Google Apps Script.
 *
 * Jika NEXT_PUBLIC_APPS_SCRIPT_URL tidak diatur:
 * - Data nasabah dimulai dengan KOSONG [] (tanpa data dummy).
 * - Pengajuan baru disimpan di localStorage.
 * - Login admin dapat menggunakan akun default / offline.
 * ============================================================
 */

export function getEffectiveAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('lms_apps_script_url');
      if (stored && stored.trim() !== '') {
        return stored.trim();
      }
    } catch (e) {
      console.warn('Gagal membaca custom Apps Script URL:', e);
    }
  }
  return process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
}

export function saveEffectiveAppsScriptUrl(url: string): void {
  if (typeof window !== 'undefined') {
    try {
      if (!url || url.trim() === '') {
        localStorage.removeItem('lms_apps_script_url');
      } else {
        localStorage.setItem('lms_apps_script_url', url.trim());
      }
      window.dispatchEvent(new Event('lms_config_updated'));
    } catch (e) {
      console.error('Gagal menyimpan custom Apps Script URL:', e);
    }
  }
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'mySecretKey123';

// ============================================================
//  DEFAULT CONFIG
// ============================================================

export const DEFAULT_CONFIG: AppConfig = {
  prefix: 'LN',
  enableCicilan: false,
  enableShareLokasi: true,
  tenor: [
    { label: '7 Hari', value: 7, active: true },
    { label: '14 Hari', value: 14, active: true },
    { label: '30 Hari', value: 30, active: true },
    { label: '90 Hari', value: 90, active: true },
    { label: '180 Hari', value: 180, active: false },
  ],
  jumlahPinjaman: [
    { label: 'Rp 100.000', value: 100000, active: true },
    { label: 'Rp 200.000', value: 200000, active: true },
    { label: 'Rp 500.000', value: 500000, active: true },
    { label: 'Rp 1.000.000', value: 1000000, active: true },
    { label: 'Rp 2.000.000', value: 2000000, active: true },
    { label: 'Rp 5.000.000', value: 5000000, active: false },
  ],
  bunga: [
    { label: 'Rp 30.000', value: 30000, active: true },
    { label: 'Rp 50.000', value: 50000, active: true },
    { label: '5%', value: 5, active: true },
    { label: '10%', value: 10, active: false },
  ],
};

// ============================================================
//  ADMIN USERS (Default / Local)
// ============================================================

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  { email: 'admin@lms.id', password: 'admin123', nama: 'Budi Santoso', role: 'Admin' },
  { email: 'super@lms.id', password: 'super123', nama: 'Andi Wijaya', role: 'Super Admin' },
];

export const ADMIN_USERS: AdminUser[] = DEFAULT_ADMIN_USERS;

const ADMIN_USERS_STORAGE_KEY = 'lms_admin_users';

export function getAdminUsers(): AdminUser[] {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(ADMIN_USERS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca localStorage admin users:', e);
    }
  }
  return DEFAULT_ADMIN_USERS;
}

export function saveAdminUsers(users: AdminUser[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ADMIN_USERS_STORAGE_KEY, JSON.stringify(users));
      window.dispatchEvent(new Event('lms_admins_updated'));
    } catch (e) {
      console.error('Gagal menyimpan admin users:', e);
    }
  }
}

export async function updateAdminUser(
  email: string,
  updates: { nama?: string; password?: string; role?: 'Admin' | 'Super Admin'; newEmail?: string },
): Promise<AdminUser[]> {
  const users = getAdminUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx !== -1) {
    if (updates.nama !== undefined && updates.nama.trim() !== '') {
      users[idx].nama = updates.nama.trim();
    }
    if (updates.password && updates.password.trim() !== '') {
      users[idx].password = updates.password.trim();
    }
    if (updates.role) {
      users[idx].role = updates.role;
    }
    if (updates.newEmail && updates.newEmail.trim() !== '') {
      const cleanNewEmail = updates.newEmail.trim().toLowerCase();
      if (cleanNewEmail !== email.toLowerCase()) {
        const dup = users.find((u, i) => i !== idx && u.email.toLowerCase() === cleanNewEmail);
        if (dup) {
          throw new Error('Email baru sudah digunakan oleh akun admin lain');
        }
        users[idx].email = cleanNewEmail;
      }
    }
    saveAdminUsers(users);

    if (getEffectiveAppsScriptUrl()) {
      try {
        await realApi.updateAdminUser(email, updates);
      } catch (err) {
        console.warn('Update admin user ke Apps Script gagal, disimpan secara lokal:', err);
      }
    }
  }
  return users;
}

export async function updateAdminName(email: string, newNama: string): Promise<AdminUser[]> {
  return updateAdminUser(email, { nama: newNama });
}

export async function updateAdminPassword(email: string, newPassword: string): Promise<boolean> {
  await updateAdminUser(email, { password: newPassword });
  return true;
}

export async function addAdminUser(user: AdminUser): Promise<AdminUser[]> {
  const users = getAdminUsers();
  const exists = users.some((u) => u.email.toLowerCase() === user.email.toLowerCase());
  if (exists) {
    throw new Error('Email admin sudah terdaftar');
  }
  const updated = [...users, user];
  saveAdminUsers(updated);

  if (getEffectiveAppsScriptUrl()) {
    try {
      await realApi.addAdminUser(user);
    } catch (err) {
      console.warn('Tambah admin user ke Apps Script gagal, disimpan secara lokal:', err);
    }
  }

  return updated;
}

export async function deleteAdminUser(email: string): Promise<AdminUser[]> {
  const users = getAdminUsers();
  const updated = users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
  saveAdminUsers(updated);

  if (getEffectiveAppsScriptUrl()) {
    try {
      await realApi.deleteAdminUser(email);
    } catch (err) {
      console.warn('Hapus admin user dari Apps Script gagal, dihapus secara lokal:', err);
    }
  }

  return updated;
}

// ============================================================
//  ADMIN ACTIVITY LOGS
// ============================================================

const ADMIN_LOGS_STORAGE_KEY = 'lms_admin_activity_logs';

export function getAdminLogs(): AdminActivityLog[] {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(ADMIN_LOGS_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Gagal membaca log aktivitas admin:', e);
    }
  }
  return [];
}

export function addAdminLog(log: Omit<AdminActivityLog, 'id' | 'timestamp'>): AdminActivityLog {
  const newLog: AdminActivityLog = {
    ...log,
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  const currentLogs = getAdminLogs();
  const updatedLogs = [newLog, ...currentLogs].slice(0, 500);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ADMIN_LOGS_STORAGE_KEY, JSON.stringify(updatedLogs));
      window.dispatchEvent(new Event('lms_logs_updated'));
    } catch (e) {
      console.error('Gagal menyimpan log aktivitas admin:', e);
    }
  }

  if (getEffectiveAppsScriptUrl()) {
    realApi.addAdminLog(newLog).catch((err) => {
      console.warn('Simpan admin log ke Apps Script gagal:', err);
    });
  }

  return newLog;
}

export function clearAdminLogs(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(ADMIN_LOGS_STORAGE_KEY);
      window.dispatchEvent(new Event('lms_logs_updated'));
    } catch (e) {
      console.error('Gagal menghapus log aktivitas admin:', e);
    }
  }

  if (getEffectiveAppsScriptUrl()) {
    realApi.clearAdminLogs().catch((err) => {
      console.warn('Hapus admin log di Apps Script gagal:', err);
    });
  }
}

// ============================================================
//  NO DUMMY NASABAH DATA (Kosong secara default)
// ============================================================

export const DUMMY_NASABAH: Nasabah[] = [];

// ============================================================
//  LOCAL BROWSER STORAGE STORE
// ============================================================

const NASABAH_STORAGE_KEY = 'lms_nasabah_data';
const CONFIG_STORAGE_KEY = 'lms_app_config';

let inMemoryNasabahStore: Nasabah[] = [];
let inMemoryConfigStore: AppConfig = { ...DEFAULT_CONFIG };

function getStoredNasabah(): Nasabah[] {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(NASABAH_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca localStorage nasabah:', e);
    }
  }
  return inMemoryNasabahStore;
}

function setStoredNasabah(data: Nasabah[]) {
  inMemoryNasabahStore = data;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(NASABAH_STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event('lms_data_updated'));
    } catch (e) {
      console.warn('Gagal menyimpan localStorage nasabah, mencoba optimasi gambar:', e);
      try {
        const optimized = data.map((item) => ({
          ...item,
          ktpUrl: item.ktpUrl && item.ktpUrl.length > 50000 ? item.ktpUrl.substring(0, 500) + '...' : item.ktpUrl,
          selfieUrl: item.selfieUrl && item.selfieUrl.length > 50000 ? item.selfieUrl.substring(0, 500) + '...' : item.selfieUrl,
          socmedUrl: item.socmedUrl && item.socmedUrl.length > 50000 ? item.socmedUrl.substring(0, 500) + '...' : item.socmedUrl,
        }));
        localStorage.setItem(NASABAH_STORAGE_KEY, JSON.stringify(optimized));
        window.dispatchEvent(new Event('lms_data_updated'));
      } catch (err2) {
        console.error('LocalStorage quota terlampaui:', err2);
      }
    }
  }
}

function getStoredConfig(): AppConfig {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          enableCicilan: parsed.enableCicilan !== undefined ? parsed.enableCicilan : false,
          enableShareLokasi: parsed.enableShareLokasi !== undefined ? parsed.enableShareLokasi : true,
        };
      }
    } catch (e) {
      console.warn('Gagal membaca localStorage config:', e);
    }
  }
  return { ...DEFAULT_CONFIG, ...inMemoryConfigStore };
}

function setStoredConfig(config: AppConfig) {
  inMemoryConfigStore = config;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      window.dispatchEvent(new Event('lms_config_updated'));
    } catch (e) {
      console.warn('Gagal menyimpan localStorage config:', e);
    }
  }
}

// ============================================================
//  REAL API FETCH WRAPPERS FOR GOOGLE APPS SCRIPT
// ============================================================

export function normalizeNasabah(raw: any): Nasabah {
  if (!raw || typeof raw !== 'object') return raw;
  
  let history: StatusHistoryItem[] | undefined = undefined;
  if (Array.isArray(raw.statusHistory)) {
    history = raw.statusHistory;
  } else if (Array.isArray(raw.StatusHistory)) {
    history = raw.StatusHistory;
  } else if (typeof raw.StatusHistory === 'string' && raw.StatusHistory.startsWith('[')) {
    try { history = JSON.parse(raw.StatusHistory); } catch (_) {}
  } else if (typeof raw.statusHistory === 'string' && raw.statusHistory.startsWith('[')) {
    try { history = JSON.parse(raw.statusHistory); } catch (_) {}
  }

  const lokasiRaw = String(raw.lokasi || raw.Lokasi || '');
  let alamatLengkap = String(raw.alamatLengkap || raw.AlamatLengkap || '').trim();
  let shareLokasi = String(raw.shareLokasi || raw.ShareLokasi || '').trim();

  if (!alamatLengkap && !shareLokasi) {
    if (lokasiRaw.includes(' | Share Lokasi: ')) {
      const parts = lokasiRaw.split(' | Share Lokasi: ');
      alamatLengkap = parts[0].trim();
      shareLokasi = parts[1].trim();
    } else {
      alamatLengkap = lokasiRaw;
    }
  }

  return {
    id: String(raw.id || raw.ID || raw.Id || ''),
    nama: String(raw.nama || raw.Nama || ''),
    nik: raw.nik || raw.NIK || raw.Nik || '',
    tanggalLahir: raw.tanggalLahir || raw.TanggalLahir || '',
    whatsapp: String(raw.whatsapp || raw.WhatsApp || raw.Whatsapp || ''),
    lokasi: lokasiRaw,
    alamatLengkap: alamatLengkap || lokasiRaw,
    shareLokasi: shareLokasi || undefined,
    jumlahPinjaman: Number(raw.jumlahPinjaman || raw.JumlahPinjaman || 0),
    tenor: Number(raw.tenor || raw.Tenor || 0),
    bunga: Number(raw.bunga || raw.Bunga || 0),
    status: (raw.status || raw.Status || 'Pending') as StatusPengajuan,
    alasanReject: raw.alasanReject || raw.AlasanReject || undefined,
    isAutoRejected: raw.isAutoRejected !== undefined ? Boolean(raw.isAutoRejected) : (raw.IsAutoRejected === 'YA' || raw.IsAutoRejected === true ? true : false),
    autoRejectReason: raw.autoRejectReason || raw.AutoRejectReason || undefined,
    tanggalPengajuan: raw.tanggalPengajuan || raw.TanggalPengajuan || new Date().toISOString(),
    tanggalJatuhTempo: raw.tanggalJatuhTempo || raw.TanggalJatuhTempo || undefined,
    totalDanaDisalurkan: raw.totalDanaDisalurkan || raw.TotalDanaDisalurkan || undefined,
    ktpUrl: raw.ktpUrl || raw.KtpUrl || '',
    selfieUrl: raw.selfieUrl || raw.SelfieUrl || '',
    socmedUrl: raw.socmedUrl || raw.SocmedUrl || '',
    namaKontakDarurat: raw.namaKontakDarurat || raw.NamaKontakDarurat || '',
    hubunganKontakDarurat: raw.hubunganKontakDarurat || raw.HubunganKontakDarurat || '',
    noKontakDarurat: raw.noKontakDarurat || raw.NoKontakDarurat || '',
    bankOrEwallet: raw.bankOrEwallet || raw.BankOrEwallet || '',
    nomorRekening: raw.nomorRekening || raw.NomorRekening || '',
    namaPemilikRekening: raw.namaPemilikRekening || raw.NamaPemilikRekening || '',
    adminNote: raw.adminNote || raw.AdminNote || '',
    statusHistory: history,
    sisaPinjaman: raw.sisaPinjaman !== undefined ? Number(raw.sisaPinjaman) : undefined,
    repaymentHistory: Array.isArray(raw.repaymentHistory) ? raw.repaymentHistory : undefined,
    modeCicilan: raw.modeCicilan || raw.ModeCicilan || 'PENUH',
    keteranganModeCicilan: raw.keteranganModeCicilan || raw.KeteranganModeCicilan || undefined,
    driveFolderUrl: raw.driveFolderUrl || raw.DriveFolderUrl || undefined,
  };
}

async function apiGet<T>(endpoint: string): Promise<T> {
  const urlBase = getEffectiveAppsScriptUrl();
  if (!urlBase) throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL tidak dikonfigurasi');
  const url = `${urlBase}?action=${endpoint}&apiKey=${encodeURIComponent(API_KEY)}`;
  
  // Timeout controller to prevent hanging if Google Apps Script is slow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`API error HTTP ${res.status}`);
    const json = await res.json();
    if (json && typeof json === 'object' && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const urlBase = getEffectiveAppsScriptUrl();
  if (!urlBase) throw new Error('NEXT_PUBLIC_APPS_SCRIPT_URL tidak dikonfigurasi');
  const res = await fetch(urlBase, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: endpoint, apiKey: API_KEY, ...body }),
  });
  if (!res.ok) throw new Error(`API error HTTP ${res.status}`);
  const json = await res.json();
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export const realApi = {
  getNasabah: () => apiGet<Nasabah[]>('getNasabah'),
  getNasabahById: (id: string) => apiGet<Nasabah>(`getNasabahById&id=${encodeURIComponent(id)}`),
  getConfig: () => apiGet<AppConfig>('getConfig'),
  getAdminUsers: () => apiGet<AdminUser[]>('getAdminUsers'),
  login: (email: string, password: string) =>
    apiPost<AdminUser | null>('login', { email, password }),
  updateStatus: (id: string, status: string, alasan?: string) =>
    apiPost<Nasabah>('updateStatus', { id, status, alasan }),
  updateConfig: (config: AppConfig) => apiPost<AppConfig>('updateConfig', { config }),
  submitPengajuan: (data: unknown) => apiPost<{ id: string }>('submitPengajuan', { data }),
  updateAdminUser: (email: string, updates: { nama?: string; password?: string; role?: string; newEmail?: string }) =>
    apiPost<boolean>('updateAdminUser', { email, updates }),
  addAdminUser: (user: AdminUser) => apiPost<boolean>('addAdminUser', { user }),
  deleteAdminUser: (email: string) => apiPost<boolean>('deleteAdminUser', { email }),
  deleteNasabah: (id: string) => apiPost<boolean>('deleteNasabah', { id }),
  getAdminLogs: () => apiGet<AdminActivityLog[]>('getAdminLogs'),
  addAdminLog: (log: AdminActivityLog) => apiPost<{ id: string }>('addAdminLog', { log }),
  clearAdminLogs: () => apiPost<boolean>('clearAdminLogs', {}),
};

// ============================================================
//  TEST CONNECTION
// ============================================================

/**
 * Cek apakah Google Apps Script Web App dapat dijangkau.
 * Mengirim GET request dengan action=getConfig dan apiKey,
 * lalu memvalidasi bahwa response-nya adalah JSON yang valid.
 */
export async function testConnection(url: string): Promise<{ ok: boolean; message?: string }> {
  if (!url || url.trim() === '') {
    return { ok: false, message: 'URL Google Apps Script belum diisi' };
  }
  const cleanUrl = url.trim();
  try {
    const testUrl = `${cleanUrl}?action=testconnection&apiKey=${encodeURIComponent(API_KEY)}`;
    const res = await fetch(testUrl, { method: 'GET' });
    if (!res.ok) {
      if (res.status === 404) {
        return {
          ok: false,
          message: 'HTTP 404 - URL Web App Apps Script salah/belum dideploy dengan versi terbaru'
        };
      }
      return { ok: false, message: `HTTP ${res.status} – ${res.statusText}` };
    }
    const json = await res.json();
    if (json && (json.success === true || json.data !== undefined)) {
      return { ok: true };
    }
    return {
      ok: false,
      message: json?.message || 'Respons tidak valid dari Apps Script',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Koneksi gagal (CORS atau masalah jaringan)',
    };
  }
}

// ============================================================
//  AUTOMATIC HISTORY & TRACK RECORD COMPUTATION
// ============================================================

export function enrichNasabahHistory(data: Nasabah[]): Nasabah[] {
  if (!Array.isArray(data)) return [];

  return data.map((nasabah) => {
    const currentWa = (nasabah.whatsapp || '').trim();
    const currentNama = (nasabah.nama || '').trim().toLowerCase();

    // Find previous applications matching WhatsApp or Nama
    const previousRecords = data.filter((item) => {
      if (item.id === nasabah.id) return false;
      const sameWa = currentWa && (item.whatsapp || '').trim() === currentWa;
      const sameNama = currentNama && (item.nama || '').trim().toLowerCase() === currentNama;
      const isPriorOrSameDate =
        !item.tanggalPengajuan ||
        !nasabah.tanggalPengajuan ||
        new Date(item.tanggalPengajuan).getTime() <= new Date(nasabah.tanggalPengajuan).getTime();
      return (sameWa || sameNama) && isPriorOrSameDate;
    });

    const prevCount = previousRecords.length;

    let computedFrekuensi = 'Belum Pernah (Nasabah Baru)';
    let computedTrackRecord = 'Nasabah Baru (Belum Meminjam)';

    if (prevCount === 1) {
      computedFrekuensi = '1 Kali Meminjam Sebelumnya';
    } else if (prevCount === 2) {
      computedFrekuensi = '2 Kali Meminjam Sebelumnya';
    } else if (prevCount >= 3 && prevCount <= 5) {
      computedFrekuensi = `${prevCount} Kali Meminjam Sebelumnya`;
    } else if (prevCount > 5) {
      computedFrekuensi = 'Lebih dari 5 Kali Meminjam';
    }

    if (prevCount > 0) {
      const hasRejected = previousRecords.some((r) => r.status === 'Rejected');
      if (hasRejected) {
        computedTrackRecord = 'Pernah Terlambat / Ada Kendala';
      } else {
        computedTrackRecord = 'Lancar / Bagus (Selalu Tepat Waktu)';
      }
    }

    return {
      ...nasabah,
      jumlahPinjamanSebelumnya:
        nasabah.jumlahPinjamanSebelumnya &&
        nasabah.jumlahPinjamanSebelumnya !== 'Belum Pernah (Nasabah Baru)'
          ? nasabah.jumlahPinjamanSebelumnya
          : computedFrekuensi,
      riwayatPembayaran:
        nasabah.riwayatPembayaran &&
        nasabah.riwayatPembayaran !== 'Belum Pernah Meminjam'
          ? nasabah.riwayatPembayaran
          : computedTrackRecord,
    };
  });
}

// ============================================================
//  PUBLIC API FUNCTIONS
// ============================================================

// In-memory cache for ultra-fast response times
let cachedNasabahList: Nasabah[] | null = null;
let lastNasabahFetchTimestamp = 0;
const NASABAH_CACHE_TTL_MS = 15000; // 15 seconds cache TTL

export function invalidateNasabahCache(): void {
  cachedNasabahList = null;
  lastNasabahFetchTimestamp = 0;
}

export async function getNasabah(options?: { forceRefresh?: boolean }): Promise<Nasabah[]> {
  const now = Date.now();
  const scriptUrl = getEffectiveAppsScriptUrl();

  // If valid in-memory cache exists and no forceRefresh, return immediately (0ms)
  if (!options?.forceRefresh && cachedNasabahList && (now - lastNasabahFetchTimestamp < NASABAH_CACHE_TTL_MS)) {
    return cachedNasabahList;
  }

  const hasStaleCache = cachedNasabahList && cachedNasabahList.length > 0;

  if (scriptUrl) {
    const fetchPromise = (async () => {
      try {
        const remoteRaw = await realApi.getNasabah();
        if (Array.isArray(remoteRaw)) {
          const remoteData = remoteRaw.map(normalizeNasabah);
          remoteData.sort(
            (a, b) => new Date(b.tanggalPengajuan).getTime() - new Date(a.tanggalPengajuan).getTime(),
          );
          setStoredNasabah(remoteData);
          const enriched = enrichNasabahHistory(remoteData);
          cachedNasabahList = enriched;
          lastNasabahFetchTimestamp = Date.now();
          return enriched;
        }
      } catch (err) {
        console.error('Fetch data nasabah dari Google Spreadsheet gagal:', err);
      }
      return null;
    })();

    // If we have stale cache and not forcing refresh, return stale cache immediately and refresh in background (SWR pattern)
    if (!options?.forceRefresh && hasStaleCache) {
      fetchPromise.then((fresh) => {
        if (fresh && typeof window !== 'undefined') {
          window.dispatchEvent(new Event('lms_data_updated'));
        }
      });
      return cachedNasabahList!;
    }

    const freshData = await fetchPromise;
    if (freshData) return freshData;
  }

  const localStore = getStoredNasabah().map(normalizeNasabah);
  localStore.sort(
    (a, b) => new Date(b.tanggalPengajuan).getTime() - new Date(a.tanggalPengajuan).getTime(),
  );

  const enrichedLocal = enrichNasabahHistory(localStore);
  cachedNasabahList = enrichedLocal;
  lastNasabahFetchTimestamp = Date.now();
  return enrichedLocal;
}

export async function getNasabahById(id: string): Promise<Nasabah | undefined> {
  const allData = await getNasabah();
  return allData.find((n) => n.id === id);
}

export async function getConfig(): Promise<AppConfig> {
  if (getEffectiveAppsScriptUrl()) {
    try {
      const config = await realApi.getConfig();
      if (config && config.prefix) return config;
    } catch (err) {
      console.warn('Fetch getConfig gagal, menggunakan config lokal:', err);
    }
  }
  return getStoredConfig();
}

export async function updateConfig(
  config: AppConfig,
  performer?: { email: string; nama: string },
): Promise<AppConfig> {
  if (getEffectiveAppsScriptUrl()) {
    try {
      const updated = await realApi.updateConfig(config);
      if (updated) {
        setStoredConfig(updated);
        addAdminLog({
          adminEmail: performer?.email || 'admin@lms.id',
          adminName: performer?.nama || 'Admin',
          actionType: 'CONFIG_UPDATE',
          description: 'Memperbarui konfigurasi sistem (Prefix, Tenor, Plafon, atau Bunga)',
        });
        return updated;
      }
    } catch (err) {
      console.warn('Update config ke Apps Script gagal, menyimpan secara lokal:', err);
    }
  }
  setStoredConfig(config);
  addAdminLog({
    adminEmail: performer?.email || 'admin@lms.id',
    adminName: performer?.nama || 'Admin',
    actionType: 'CONFIG_UPDATE',
    description: 'Memperbarui konfigurasi sistem (Prefix, Tenor, Plafon, atau Bunga)',
  });
  return config;
}

export async function login(email: string, password: string): Promise<AdminUser | null> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (getEffectiveAppsScriptUrl()) {
    try {
      const user = await realApi.login(cleanEmail, cleanPassword);
      if (user && typeof user === 'object' && 'email' in user && user.email) {
        return user;
      }
    } catch (err) {
      console.warn('Login via Apps Script gagal, mencoba otentikasi lokal:', err);
    }
  }

  const adminList = getAdminUsers();
  const found = adminList.find(
    (u) =>
      (u.email.trim().toLowerCase() === cleanEmail ||
        (cleanEmail === 'admin' && u.email.toLowerCase().startsWith('admin')) ||
        (cleanEmail === 'super' && u.email.toLowerCase().startsWith('super'))) &&
      u.password.trim() === cleanPassword,
  );

  if (found) return found;

  return null;
}

export async function updateStatus(
  id: string,
  status: StatusPengajuan,
  alasanReject?: string,
  performer?: { email: string; nama: string },
): Promise<Nasabah | null> {
  let remoteUpdated: Nasabah | null = null;
  if (getEffectiveAppsScriptUrl()) {
    try {
      remoteUpdated = await realApi.updateStatus(id, status, alasanReject);
    } catch (err) {
      console.warn('Update status via Apps Script gagal, memperbarui secara lokal:', err);
    }
  }

  const store = getStoredNasabah();
  const idx = store.findIndex((n) => n.id === id);
  if (idx === -1) {
    if (remoteUpdated) return remoteUpdated;
    return null;
  }

  const nasabah = store[idx];
  const nowIso = new Date().toISOString();
  const adminName = performer?.nama || 'Admin LMS';

  const newHistoryItem: StatusHistoryItem = {
    status,
    updatedAt: nowIso,
    updatedBy: adminName,
    note:
      status === 'Rejected'
        ? alasanReject || 'Pengajuan Ditolak oleh Admin'
        : status === 'Approved'
          ? 'Pengajuan Disetujui & Siap Pencairan'
          : status === 'Lunas'
            ? 'Pinjaman Diubah Menjadi Lunas'
            : 'Status Diperbarui',
  };

  const existingHistory: StatusHistoryItem[] =
    nasabah.statusHistory && nasabah.statusHistory.length > 0
      ? nasabah.statusHistory
      : [
          {
            status: 'Pending',
            updatedAt: nasabah.tanggalPengajuan || nowIso,
            updatedBy: 'Nasabah (Pengajuan Awal)',
            note: 'Pengajuan baru masuk',
          },
        ];

  const updatedHistory = [...existingHistory, newHistoryItem];

  const updated: Nasabah = remoteUpdated || {
    ...nasabah,
    status,
    alasanReject: status === 'Rejected' ? alasanReject : undefined,
    tanggalJatuhTempo:
      status === 'Approved' || status === 'Lunas'
        ? nasabah.tanggalJatuhTempo || addDays(new Date(nasabah.tanggalPengajuan), nasabah.tenor).toISOString()
        : undefined,
    totalDanaDisalurkan: status === 'Approved' || status === 'Lunas' ? nasabah.jumlahPinjaman : undefined,
    statusHistory: updatedHistory,
  };

  store[idx] = updated;
  setStoredNasabah([...store]);
  invalidateNasabahCache();

  // Log Activity
  addAdminLog({
    adminEmail: performer?.email || 'admin@lms.id',
    adminName: performer?.nama || 'Admin LMS',
    actionType: 'STATUS_UPDATE',
    description: `Mengubah status pengajuan ${id} (${nasabah.nama}) menjadi "${status}"`,
    targetId: id,
    details: status === 'Rejected' ? `Alasan: ${alasanReject || '-'}` : undefined,
  });

  return updated;
}

export async function updateNasabahAdminCustomDetails(
  id: string,
  updates: {
    modeCicilan?: 'PENUH' | 'BUNGA_SAJA' | 'CICILAN_KHUSUS';
    keteranganModeCicilan?: string;
    tanggalJatuhTempo?: string;
    sisaPinjaman?: number;
    jumlahPinjaman?: number;
    driveFolderUrl?: string;
  },
  performer?: { email: string; nama: string },
): Promise<Nasabah | null> {
  const store = getStoredNasabah();
  const idx = store.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  const current = store[idx];
  const updated: Nasabah = {
    ...current,
    ...updates,
  };

  store[idx] = updated;
  setStoredNasabah([...store]);
  invalidateNasabahCache();

  // Try syncing to Apps Script asynchronously
  if (hasApiConfigured()) {
    try {
      await apiPost('updateNasabahCustom', { id, ...updates });
    } catch (e) {
      console.warn('Sync custom details to Apps Script failed:', e);
    }
  }

  addAdminLog({
    adminEmail: performer?.email || 'admin@lms.id',
    adminName: performer?.nama || 'Admin LMS',
    actionType: 'STATUS_UPDATE',
    description: `Memperbarui detail cicilan/jatuh tempo untuk ${id} (${current.nama})`,
    targetId: id,
  });

  return updated;
}

// ============================================================
//  REPAYMENT TRACKER FUNCTIONS
// ============================================================

export async function submitRepayment(
  nasabahId: string,
  jumlahBayar: number,
  buktiUrl: string,
  catatanNasabah?: string,
): Promise<RepaymentItem> {
  const store = getStoredNasabah();
  const idx = store.findIndex((n) => n.id === nasabahId);
  if (idx === -1) {
    throw new Error('ID Nasabah tidak ditemukan');
  }

  const nowIso = new Date().toISOString();
  const newItem: RepaymentItem = {
    id: 'RPT-' + Math.floor(100000 + Math.random() * 900000),
    nasabahId,
    tanggalBayar: nowIso.split('T')[0],
    jumlahBayar,
    buktiUrl,
    status: 'PENDING_VERIFICATION',
    adminNote: catatanNasabah,
    submittedAt: nowIso,
  };

  const nasabah = store[idx];
  const existingRepayments = nasabah.repaymentHistory || [];
  const updatedRepayments = [newItem, ...existingRepayments];

  const updatedNasabah: Nasabah = {
    ...nasabah,
    repaymentHistory: updatedRepayments,
  };

  store[idx] = updatedNasabah;
  setStoredNasabah([...store]);
  invalidateNasabahCache();

  addAdminLog({
    adminEmail: 'nasabah@online.id',
    adminName: `Nasabah ${nasabah.nama}`,
    actionType: 'REPAYMENT_SUBMITTED',
    description: `Mengunggah bukti pembayaran angsuran Rp ${jumlahBayar.toLocaleString('id-ID')} (${nasabahId})`,
    targetId: nasabahId,
  });

  return newItem;
}

export async function verifyRepayment(
  nasabahId: string,
  repaymentId: string,
  verifiedStatus: 'VERIFIED' | 'REJECTED',
  adminNote?: string,
  denda: number = 0,
  performer?: { email: string; nama: string },
): Promise<Nasabah | null> {
  const store = getStoredNasabah();
  const idx = store.findIndex((n) => n.id === nasabahId);
  if (idx === -1) return null;

  const nasabah = store[idx];
  const repayments = [...(nasabah.repaymentHistory || [])];
  const rIdx = repayments.findIndex((r) => r.id === repaymentId);
  if (rIdx === -1) return null;

  const nowIso = new Date().toISOString();
  const repayment = repayments[rIdx];
  const adminName = performer?.nama || 'Admin LMS';

  const profit = calculateNasabahProfit(nasabah);
  const totalWajib = nasabah.jumlahPinjaman + profit + denda;

  let alreadyPaid = repayments
    .filter((r, index) => index !== rIdx && r.status === 'VERIFIED')
    .reduce((s, r) => s + r.jumlahBayar, 0);

  if (verifiedStatus === 'VERIFIED') {
    alreadyPaid += repayment.jumlahBayar;
  }

  const sisaPokok = Math.max(0, totalWajib - alreadyPaid);

  repayments[rIdx] = {
    ...repayment,
    status: verifiedStatus,
    denda,
    sisaPokokAfter: sisaPokok,
    adminNote,
    verifiedAt: nowIso,
    verifiedBy: adminName,
  };

  const isNowLunas = sisaPokok === 0 && verifiedStatus === 'VERIFIED';

  const updatedNasabah: Nasabah = {
    ...nasabah,
    status: isNowLunas ? 'Lunas' : nasabah.status,
    sisaPinjaman: sisaPokok,
    repaymentHistory: repayments,
  };

  store[idx] = updatedNasabah;
  setStoredNasabah([...store]);
  invalidateNasabahCache();

  addAdminLog({
    adminEmail: performer?.email || 'admin@lms.id',
    adminName,
    actionType: 'REPAYMENT_VERIFIED',
    description: `Verifikasi pembayaran ${repaymentId} (${nasabahId}): ${verifiedStatus}${isNowLunas ? ' [LUNAS]' : ''}`,
    targetId: nasabahId,
  });

  return updatedNasabah;
}

// ============================================================
//  AUTO-REJECT EVALUATION ENGINE
// ============================================================

export interface AutoRejectResult {
  shouldReject: boolean;
  reasons: string[];
}

export function evaluateAutoReject(
  newSub: Partial<Nasabah>,
  existingData: Nasabah[]
): AutoRejectResult {
  const reasons: string[] = [];
  if (!Array.isArray(existingData) || existingData.length === 0) {
    return { shouldReject: false, reasons: [] };
  }

  const cleanNama = (newSub.nama || '').trim().toLowerCase();
  const cleanWa = (newSub.whatsapp || '').replace(/\D/g, '');
  const cleanNik = (newSub.nik || '').trim();
  const cleanTglLahir = (newSub.tanggalLahir || '').trim();
  const cleanKontakDarurat = (newSub.noKontakDarurat || '').replace(/\D/g, '');

  for (const item of existingData) {
    if (item.id === newSub.id) continue;

    const itemNama = (item.nama || '').trim().toLowerCase();
    const itemWa = (item.whatsapp || '').replace(/\D/g, '');
    const itemNik = (item.nik || '').trim();
    const itemTglLahir = (item.tanggalLahir || '').trim();
    const itemKontakDarurat = (item.noKontakDarurat || '').replace(/\D/g, '');

    // Match criteria counter
    let matchCount = 0;
    const matches: string[] = [];

    if (cleanNama && itemNama && cleanNama === itemNama) {
      matchCount++;
      matches.push('Nama Identik');
    }
    if (cleanWa && itemWa && cleanWa === itemWa) {
      matchCount++;
      matches.push('Nomor HP/WA Identik');
    }
    if (cleanTglLahir && itemTglLahir && cleanTglLahir === itemTglLahir) {
      matchCount++;
      matches.push('Tanggal Lahir Identik');
    }
    if (cleanKontakDarurat && itemKontakDarurat && cleanKontakDarurat === itemKontakDarurat) {
      matchCount++;
      matches.push('Nomor Kontak Darurat Identik');
    }
    if (cleanNik && itemNik && cleanNik === itemNik) {
      matchCount++;
      matches.push('NIK KTP Identik');
    }

    // 1. Double Pinjaman Aktif di saat bersamaan (Pending atau Approved)
    const isActiveLoan = item.status === 'Pending' || item.status === 'Approved';
    if (isActiveLoan && (matchCount >= 1 || (cleanWa && cleanWa === itemWa) || (cleanNik && cleanNik === itemNik))) {
      reasons.push(`Double Pinjaman Aktif (${item.id} status ${item.status})`);
    }

    // 2. Pernah Telat Bayar / Catatan Buruk
    const hasBadHistory =
      item.riwayatPembayaran?.toLowerCase().includes('terlambat') ||
      item.riwayatPembayaran?.toLowerCase().includes('buruk') ||
      (item.status === 'Rejected' && item.alasanReject?.toLowerCase().includes('telat'));
    if (hasBadHistory && matchCount >= 1) {
      reasons.push(`Riwayat Pernah Telat Bayar / Catatan Buruk (${item.id})`);
    }

    // 3. Minimal 2 Data Sama (Nama, No HP, Tanggal Lahir, Kontak Darurat)
    if (matchCount >= 2) {
      reasons.push(`Duplikasi minimal 2 data sama (${matches.join(', ')} pada ID ${item.id})`);
    }
  }

  const uniqueReasons = Array.from(new Set(reasons));
  return {
    shouldReject: uniqueReasons.length > 0,
    reasons: uniqueReasons,
  };
}

export async function deleteNasabah(id: string, performer?: { email: string; nama: string }): Promise<boolean> {
  const store = getStoredNasabah();
  const target = store.find((n) => n.id === id);

  if (getEffectiveAppsScriptUrl()) {
    try {
      await realApi.deleteNasabah(id);
    } catch (err) {
      console.warn('Hapus nasabah via Apps Script gagal, menghapus secara lokal:', err);
    }
  }

  const updated = store.filter((n) => n.id !== id);
  setStoredNasabah(updated);
  invalidateNasabahCache();

  addAdminLog({
    adminEmail: performer?.email || 'admin@lms.id',
    adminName: performer?.nama || 'Admin LMS',
    actionType: 'NASABAH_DELETE',
    description: `Menghapus data nasabah ${id} (${target?.nama || 'Unknown'})`,
    targetId: id,
  });

  return true;
}

export async function restoreAutoReject(id: string, performer?: { email: string; nama: string }): Promise<Nasabah | null> {
  const store = getStoredNasabah();
  const idx = store.findIndex((n) => n.id === id);
  if (idx === -1) return null;

  const nowIso = new Date().toISOString();
  const adminName = performer?.nama || 'Admin LMS';

  const newHistoryItem: StatusHistoryItem = {
    status: 'Pending',
    updatedAt: nowIso,
    updatedBy: adminName,
    note: 'Pengajuan dipulihkan dari status Auto-Reject kembali ke Pending',
  };

  const existingHistory = store[idx].statusHistory || [
    {
      status: 'Rejected',
      updatedAt: store[idx].tanggalPengajuan || nowIso,
      updatedBy: 'Sistem Auto-Reject',
      note: store[idx].autoRejectReason || 'Auto Reject oleh sistem',
    },
  ];

  const restored: Nasabah = {
    ...store[idx],
    status: 'Pending',
    isAutoRejected: false,
    alasanReject: undefined,
    autoRejectReason: undefined,
    statusHistory: [...existingHistory, newHistoryItem],
  };

  if (getEffectiveAppsScriptUrl()) {
    try {
      await realApi.updateStatus(id, 'Pending', '');
    } catch (err) {
      console.warn('Pulihkan status via Apps Script gagal, memperbarui secara lokal:', err);
    }
  }

  store[idx] = restored;
  setStoredNasabah([...store]);
  invalidateNasabahCache();

  addAdminLog({
    adminEmail: performer?.email || 'admin@lms.id',
    adminName: performer?.nama || 'Admin LMS',
    actionType: 'RESTORE_AUTO_REJECT',
    description: `Memulihkan pengajuan ${id} (${restored.nama}) dari Auto-Reject ke Pending`,
    targetId: id,
  });

  return restored;
}

export async function submitPengajuan(
  data: Omit<Nasabah, 'id' | 'status' | 'tanggalPengajuan'>,
): Promise<{ id: string }> {
  const now = new Date();
  const store = getStoredNasabah();
  const counter = store.length + 1;
  const config = getStoredConfig();
  const prefix = config.prefix || 'LN';
  const localId = `${prefix}-${toISODate(now).replace(/-/g, '')}-${String(counter).padStart(4, '0')}`;

  // Evaluate Auto Reject Engine
  const autoRejectResult = evaluateAutoReject(data, store);
  const finalStatus: StatusPengajuan = autoRejectResult.shouldReject ? 'Rejected' : 'Pending';

  const initialHistory: StatusHistoryItem[] = [
    {
      status: 'Pending',
      updatedAt: now.toISOString(),
      updatedBy: 'Nasabah (Pengajuan Online)',
      note: 'Nasabah melakukan pengisian formulir pengajuan',
    },
  ];

  if (autoRejectResult.shouldReject) {
    initialHistory.push({
      status: 'Rejected',
      updatedAt: now.toISOString(),
      updatedBy: 'Sistem Auto-Reject',
      note: `Ditolak Otomatis oleh Sistem: ${autoRejectResult.reasons.join(' | ')}`,
    });
  }

  const newNasabah: Nasabah = {
    ...data,
    id: localId,
    status: finalStatus,
    isAutoRejected: autoRejectResult.shouldReject ? true : false,
    alasanReject: autoRejectResult.shouldReject
      ? `[Auto Reject] ${autoRejectResult.reasons.join(' | ')}`
      : undefined,
    autoRejectReason: autoRejectResult.shouldReject
      ? autoRejectResult.reasons.join(' | ')
      : undefined,
    tanggalPengajuan: now.toISOString(),
    statusHistory: initialHistory,
  };

  let assignedId = localId;

  if (getEffectiveAppsScriptUrl()) {
    try {
      const res = await realApi.submitPengajuan(newNasabah);
      if (res && res.id) {
        assignedId = res.id;
        newNasabah.id = assignedId;
      }
    } catch (err) {
      console.warn('Submit pengajuan ke Apps Script gagal, menyimpan secara lokal:', err);
    }
  }

  setStoredNasabah([newNasabah, ...store]);
  invalidateNasabahCache();
  return { id: assignedId };
}

// ============================================================
//  PROFIT & STATS COMPUTATION
// ============================================================

export function calculateNasabahProfit(nasabah: Nasabah): number {
  const principal = Number(nasabah.jumlahPinjaman) || 0;
  const bungaVal = Number(nasabah.bunga) || 0;
  if (bungaVal <= 100 && bungaVal > 0) {
    return Math.round(principal * (bungaVal / 100));
  }
  return bungaVal;
}

export function calculateNasabahDanaMasuk(nasabah: Nasabah): number {
  if (nasabah.status !== 'Lunas') return 0;
  const principal = Number(nasabah.jumlahPinjaman) || 0;
  const profit = calculateNasabahProfit(nasabah);
  return principal + profit;
}

export function computePeriodReport(data: Nasabah[] = []) {
  const safeData = Array.isArray(data) ? data : [];

  // Overall Summary (Data Keseluruhan)
  const approvedList = safeData.filter((d) => d.status === 'Approved');
  const lunasList = safeData.filter((d) => d.status === 'Lunas');

  const overall = {
    periodKey: 'all',
    label: 'Keseluruhan (All-Time)',
    year: 0,
    totalNasabah: safeData.length,
    approvedCount: approvedList.length,
    lunasCount: lunasList.length,
    pendingCount: safeData.filter((d) => d.status === 'Pending').length,
    rejectedCount: safeData.filter((d) => d.status === 'Rejected').length,
    danaKeluar: [...approvedList, ...lunasList].reduce(
      (s, d) => s + (Number(d.jumlahPinjaman) || 0),
      0,
    ),
    danaMasuk: lunasList.reduce((s, d) => s + calculateNasabahDanaMasuk(d), 0),
    keuntungan: lunasList.reduce((s, d) => s + calculateNasabahProfit(d), 0),
  };

  // Extract all available years from nasabah data
  const yearsSet = new Set<number>();
  const currentYear = new Date().getFullYear();
  yearsSet.add(currentYear);

  safeData.forEach((n) => {
    if (n.tanggalPengajuan) {
      const yr = new Date(n.tanggalPengajuan).getFullYear();
      if (!isNaN(yr)) yearsSet.add(yr);
    }
  });

  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

  // Function to get monthly list for a given year
  const getMonthlyReport = (year: number) => {
    const monthNames = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];

    return monthNames.map((mName, mIdx) => {
      const monthData = safeData.filter((n) => {
        if (!n.tanggalPengajuan) return false;
        const d = new Date(n.tanggalPengajuan);
        return d.getFullYear() === year && d.getMonth() === mIdx;
      });

      const appr = monthData.filter((d) => d.status === 'Approved');
      const lun = monthData.filter((d) => d.status === 'Lunas');

      const danaKeluar = [...appr, ...lun].reduce((s, d) => s + (Number(d.jumlahPinjaman) || 0), 0);
      const danaMasuk = lun.reduce((s, d) => s + calculateNasabahDanaMasuk(d), 0);
      const keuntungan = lun.reduce((s, d) => s + calculateNasabahProfit(d), 0);

      return {
        periodKey: `${year}-${String(mIdx + 1).padStart(2, '0')}`,
        label: `${mName} ${year}`,
        year,
        month: mIdx,
        totalNasabah: monthData.length,
        approvedCount: appr.length,
        lunasCount: lun.length,
        pendingCount: monthData.filter((d) => d.status === 'Pending').length,
        rejectedCount: monthData.filter((d) => d.status === 'Rejected').length,
        danaKeluar,
        danaMasuk,
        keuntungan,
      };
    });
  };

  // Yearly Summary List (Data Pertahun)
  const yearlyList = availableYears.map((yr) => {
    const yearData = safeData.filter((n) => {
      if (!n.tanggalPengajuan) return false;
      return new Date(n.tanggalPengajuan).getFullYear() === yr;
    });

    const appr = yearData.filter((d) => d.status === 'Approved');
    const lun = yearData.filter((d) => d.status === 'Lunas');

    const danaKeluar = [...appr, ...lun].reduce((s, d) => s + (Number(d.jumlahPinjaman) || 0), 0);
    const danaMasuk = lun.reduce((s, d) => s + calculateNasabahDanaMasuk(d), 0);
    const keuntungan = lun.reduce((s, d) => s + calculateNasabahProfit(d), 0);

    return {
      periodKey: `year-${yr}`,
      label: `Tahun ${yr}`,
      year: yr,
      totalNasabah: yearData.length,
      approvedCount: appr.length,
      lunasCount: lun.length,
      pendingCount: yearData.filter((d) => d.status === 'Pending').length,
      rejectedCount: yearData.filter((d) => d.status === 'Rejected').length,
      danaKeluar,
      danaMasuk,
      keuntungan,
    };
  });

  return { overall, availableYears, yearlyList, getMonthlyReport };
}

export function computeStats(data: Nasabah[]): DashboardStats {
  if (!data) return { total: 0, approved: 0, rejected: 0, pending: 0, lunas: 0, totalDanaDisalurkan: 0, totalKeuntungan: 0 };
  
  const approvedList = data.filter((d) => d.status === 'Approved');
  const lunasList = data.filter((d) => d.status === 'Lunas');
  const pendingList = data.filter((d) => d.status === 'Pending');
  const rejectedList = data.filter((d) => d.status === 'Rejected');

  // Total Dana Disalurkan (Approved + Lunas)
  const totalDana = [...approvedList, ...lunasList].reduce(
    (sum, d) => sum + (d.totalDanaDisalurkan || d.jumlahPinjaman || 0),
    0
  );

  // Total Keuntungan dari Nasabah yang sudah LUNAS
  const totalKeuntungan = lunasList.reduce(
    (sum, d) => sum + calculateNasabahProfit(d),
    0
  );

  return {
    total: data.length,
    approved: approvedList.length,
    rejected: rejectedList.length,
    pending: pendingList.length,
    lunas: lunasList.length,
    totalDanaDisalurkan: totalDana,
    totalKeuntungan,
  };
}

export function computeMonthlyTrend(data: Nasabah[]): ChartData[] {
  const months: Record<string, ChartData> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    months[key] = { bulan: monthNames[d.getMonth()], pengajuan: 0, approved: 0, rejected: 0 };
  }
  if (Array.isArray(data)) {
    data.forEach((n) => {
      if (!n.tanggalPengajuan) return;
      const d = new Date(n.tanggalPengajuan);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (months[key]) {
        months[key].pengajuan++;
        if (n.status === 'Approved' || n.status === 'Lunas') months[key].approved++;
        if (n.status === 'Rejected') months[key].rejected++;
      }
    });
  }
  return Object.values(months);
}

export function computeStatusComposition(data: Nasabah[]): StatusComposition[] {
  const safeData = Array.isArray(data) ? data : [];
  const approved = safeData.filter((d) => d.status === 'Approved').length;
  const lunas = safeData.filter((d) => d.status === 'Lunas').length;
  const pending = safeData.filter((d) => d.status === 'Pending').length;
  const rejected = safeData.filter((d) => d.status === 'Rejected').length;
  return [
    { name: 'Approved', value: approved, color: '#10B981' },
    { name: 'Lunas', value: lunas, color: '#2563EB' },
    { name: 'Pending', value: pending, color: '#F59E0B' },
    { name: 'Rejected', value: rejected, color: '#E11D48' },
  ];
}

export function getJatuhTempoDates(data: Nasabah[]): string[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((d) => d.status === 'Approved' && d.tanggalJatuhTempo)
    .map((d) => toISODate(new Date(d.tanggalJatuhTempo!)));
}
