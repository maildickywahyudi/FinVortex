import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function generateIdPengajuan(counter: number = 1): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(counter).padStart(4, '0');
  return `LN-${y}${m}${d}-${seq}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, '');
  return /^(\+?62|0)8[1-9]\d{6,11}$/.test(cleaned);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+62')) return cleaned.slice(1);
  if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
  if (cleaned.startsWith('62')) return cleaned;
  return '62' + cleaned;
}

export function calculateUsia(tanggalLahir: string): number | null {
  if (!tanggalLahir) return null;
  const birth = new Date(tanggalLahir);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '');
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function calculateNasabahProfit(nasabah: { jumlahPinjaman: number; bunga: number }): number {
  const principal = Number(nasabah.jumlahPinjaman) || 0;
  const bungaVal = Number(nasabah.bunga) || 0;
  if (bungaVal <= 100 && bungaVal > 0) {
    return Math.round(principal * (bungaVal / 100));
  }
  return bungaVal;
}

