export type StatusPengajuan = 'Pending' | 'Approved' | 'Rejected' | 'Lunas';

export interface AdminUser {
  email: string;
  password: string;
  nama: string;
  role: 'Admin' | 'Super Admin';
}

export interface ConfigItem {
  label: string;
  value: number;
  active: boolean;
}

export interface AppConfig {
  tenor: ConfigItem[];
  jumlahPinjaman: ConfigItem[];
  bunga: ConfigItem[];
  prefix: string;
  enableCicilan?: boolean;
  enableShareLokasi?: boolean;
}

export interface StatusHistoryItem {
  status: StatusPengajuan;
  updatedAt: string;
  updatedBy: string;
  note?: string;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  adminName: string;
  actionType:
    | 'STATUS_UPDATE'
    | 'CONFIG_UPDATE'
    | 'ADMIN_USER_CHANGE'
    | 'NASABAH_DELETE'
    | 'RESTORE_AUTO_REJECT'
    | 'EXPORT_DATA';
  description: string;
  targetId?: string;
  details?: string;
}

export interface Nasabah {
  id: string;
  nama: string;
  nik?: string;
  tanggalLahir: string;
  whatsapp: string;
  lokasi: string;
  jumlahPinjaman: number;
  tenor: number;
  bunga: number;
  status: StatusPengajuan;
  alasanReject?: string;
  isAutoRejected?: boolean;
  autoRejectReason?: string;
  tanggalPengajuan: string;
  tanggalJatuhTempo?: string;
  totalDanaDisalurkan?: number;
  ktpUrl: string;
  selfieUrl: string;
  socmedUrl: string;
  namaKontakDarurat?: string;
  hubunganKontakDarurat?: string;
  noKontakDarurat?: string;
  jumlahPinjamanSebelumnya?: string; // e.g. "Belum Pernah", "1-2 Kali", "3-5 Kali", "Lebih dari 5 Kali"
  riwayatPembayaran?: string; // e.g. "Bagus / Lancar", "Pernah Terlambat", "Belum Ada Riwayat"
  bankOrEwallet?: string;
  nomorRekening?: string;
  namaPemilikRekening?: string;
  adminNote?: string;
  statusHistory?: StatusHistoryItem[];
}

export interface DashboardStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  lunas: number;
  totalDanaDisalurkan: number;
  totalKeuntungan: number;
}

export interface ChartData {
  bulan: string;
  pengajuan: number;
  approved: number;
  rejected: number;
}

export interface StatusComposition {
  name: string;
  value: number;
  color: string;
}

export interface PeriodSummary {
  periodKey: string;
  label: string;
  year: number;
  month?: number;
  totalNasabah: number;
  approvedCount: number;
  lunasCount: number;
  pendingCount: number;
  rejectedCount: number;
  danaKeluar: number;
  danaMasuk: number;
  keuntungan: number;
}
