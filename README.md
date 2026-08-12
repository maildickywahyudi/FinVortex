# 🚀 LMS — Loan Management System (Sistem Manajemen Pinjaman)

Aplikasi **Sistem Manajemen Pengajuan Pinjaman (LMS)** modern, aman, dan ringan yang dibangun menggunakan **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Google Gemini AI (OCR KTP)**, dan **Google Sheets / Apps Script Database Integration**.

---
git 
## 📑 Daftar Isi
1. [Fitur Unggulan](#-fitur-unggulan)
2. [Panduan Instalasi & Jalankan di Lokal](#-panduan-instalasi--jalankan-di-lokal)
3. [Panduan Deployment ke Vercel via Antigravity & GitHub](#-panduan-deployment-ke-vercel-via-antigravity--github)
4. [Panduan Integrasi Database Google Sheets (Google Apps Script)](#-panduan-integrasi-database-google-sheets-google-apps-script)
5. [Cara Konfigurasi Gemini API Key untuk OCR KTP](#-cara-konfigurasi-gemini-api-key-untuk-ocr-ktp)
6. [Daftar Environment Variables](#-daftar-environment-variables)
7. [Fitur PWA (Progressive Web App)](#-fitur-pwa-progressive-web-app)

---

## ✨ Fitur Unggulan

- **OCR AI Pemindai KTP Otomatis**: Mengekstrak NIK, Nama Lengkap, dan Tanggal Lahir secara otomatis dari foto KTP menggunakan model Google Gemini AI.
- **Auto Reject System**: Mendeteksi secara otomatis usia peminjam di bawah 21 tahun atau wilayah di luar cakupan operasional.
- **Dual Storage (Database Hybrid)**: Sinkronisasi real-time ke **Google Sheets & Google Drive** via Apps Script, dengan fallback ke LocalStorage saat offline.
- **Notifikasi WhatsApp Web Direct**: Mengirim pesan persetujuan, pencairan, dan pengingat tagihan (H-2/H-1/Terlambat) dalam 1-klik.
- **Laporan & Dokumen Resmi**: Export PDF profil nasabah, pencetakan Surat Perjanjian Kredit (SPK), Kwitansi Pencairan/Pelunasan, dan Export Excel (.xls).
- **Multi-Role Management**: Role **Admin** & **Super Admin** dengan fitur pembatalan auto-reject dan hapus data permanen.
- **Antarmuka Premium Dark & Light Mode**: Desain modern yang nyaman di mata dengan mode terang (*Soft Light Mode*) dan mode gelap (*Dark Mode*).

---

## 💻 Panduan Instalasi & Jalankan di Lokal

### 1. Prasyarat Sistem
Pastikan perangkat Anda telah terinstall:
- **Node.js**: Version 18.17.0 atau lebih baru ([Download Node.js](https://nodejs.org/))
- **Git**: ([Download Git](https://git-scm.com/))
- **npm** (Bawaan Node.js) atau **bun** / **pnpm**

### 2. Clone Repository & Install Dependencies
Buka Terminal atau Command Prompt, lalu jalankan:

```bash
# 1. Clone repository dari GitHub
git clone https://github.com/maildickywahyudi/LMS-V1.0.1.git

# 2. Masuk ke direktori proyek
cd LMS-V1.0.1

# 3. Install seluruh paket dependensi
npm install
```

### 3. Konfigurasi Environment Variables (.env.local)
Buat file `.env.local` di folder akar proyek (root directory):

```bash
cp .env.example .env.local
```

Isikan konfigurasi berikut di dalam `.env.local`:

```env
# Google Gemini API Key (Untuk ekstraksi data KTP via AI)
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxx

# Google Apps Script Web App URL (Integration Google Sheets)
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx.../exec

# API Key Pengaman Akses Apps Script
NEXT_PUBLIC_API_KEY=mySecretKey123
```

### 4. Jalankan Server Development & Preview Lokal
Jalankan perintah berikut di terminal:

```bash
npm run dev
```

Buka browser Anda dan akses:
👉 **[http://localhost:3000](http://localhost:3000)**

Untuk login ke Dashboard Admin lokal:
- **Email**: `super@lms.id`
- **Password**: `super123`

---

## 🚀 Panduan Deployment ke Vercel via Antigravity & GitHub

Proyek ini telah dikonfigurasi penuh untuk deployment langsung ke **Vercel** menggunakan **Antigravity AI Agent** maupun Vercel CLI.

### Opsi A: Deployment Otomatis Menggunakan Antigravity Agent
1. Di dalam sesi Antigravity AI, pastikan semua perubahan kode telah disortir dan di-commit ke GitHub repository:
   `https://github.com/maildickywahyudi/LMS-V1.0.1.git`
2. Jalankan Vercel CLI langsung melalui perintah Antigravity agent:
   ```bash
   npx vercel --prod
   ```
3. Ikuti prompt konfirmasi Vercel CLI (Pilih akun, hubungkan ke proyek LMS-V1.0.1, dan set environment variables).

### Opsi B: Deployment Manual via Vercel Web Dashboard
1. **Push Perubahan ke GitHub**:
   ```bash
   git add .
   git commit -m "Update LMS features, light mode UI fix, and Vercel deployment setup"
   git push origin main
   ```
2. **Import Repository di Vercel**:
   - Buka **[Vercel Dashboard](https://vercel.com/dashboard)**.
   - Klik **"Add New..."** > **"Project"**.
   - Pilih repository **`maildickywahyudi/LMS-V1.0.1`**.
3. **Konfigurasi Environment Variables di Vercel**:
   Sebelum mengeklik tombol Deploy, tambahkan variabel berikut di menu **Environment Variables**:
   
   | Key | Value | Deskripsi |
   | :--- | :--- | :--- |
   | `GEMINI_API_KEY` | `AIzaSy...` | API Key Google Gemini AI |
   | `NEXT_PUBLIC_APPS_SCRIPT_URL` | `https://script.google.com/macros/s/.../exec` | Deployment URL Apps Script |
   | `NEXT_PUBLIC_API_KEY` | `mySecretKey123` | Secret Auth Key Apps Script |

4. **Deploy**:
   - Klik **"Deploy"** dan tunggu proses build Vercel selesai (~1-2 menit).
   - Setelah sukses, Vercel akan memberikan URL live (contoh: `https://lms-v1-0-1.vercel.app`).

---

## 📊 Panduan Integrasi Database Google Sheets (Google Apps Script)

Jika Anda ingin data nasabah tersimpan secara permanen di **Google Sheets & Google Drive** tanpa biaya database server, ikuti langkah berikut:

### Langkah 1: Buat Google Sheet Baru
1. Buka [Google Sheets](https://sheets.google.com) dan buat **Spreadsheet Kosong Baru**.
2. Berikan nama spreadsheet, contoh: `Database LMS Pinjaman`.

### Langkah 2: Buka Editor Google Apps Script
1. Pada menu atas Google Sheets, klik **Extensions** > **Apps Script**.
2. Hapus seluruh kode bawaan yang ada di editor.

### Langkah 3: Salin Kode Apps Script Backend
1. Buka file `google-apps-script/Code.gs` yang ada di dalam repositori proyek ini.
2. Salin seluruh isi kodenya dan **paste** ke editor Apps Script.
3. Ubah variabel `API_KEY` pada baris awal jika ingin menggunakan key rahasia sendiri:
   ```javascript
   var API_KEY = 'mySecretKey123';
   ```

### Langkah 4: Inisialisasi Sheet & Struktur Data
1. Pada bagian atas editor Apps Script, pilih fungsi **`setupSheets`** dari dropdown fungsi.
2. Klik tombol **Run** (Jalankan).
3. Berikan izin otorisasi (*Review Permissions* > Pilih Akun Google > *Advanced* > *Allow*).
4. Otomatis Apps Script akan membuatkan sheet: `Nasabah`, `Config`, `Admin`, `Counter`, serta folder Google Drive `LMS_Uploads`.

### Langkah 5: Deploy sebagai Web App
1. Klik tombol **Deploy** di sudut kanan atas > pilih **New deployment**.
2. Klik ikon Roda Gigi (Select type) > pilih **Web app**.
3. Isi konfigurasi deployment:
   - **Description**: `LMS Backend Web App v1`
   - **Execute as**: `Me (email-anda@gmail.com)`
   - **Who has access**: `Anyone` *(PENTING: Harus "Anyone" agar aplikasi Next.js dapat mengirim data)*.
4. Klik **Deploy**.
5. Salin **Web App URL** yang dihasilkan (format: `https://script.google.com/macros/s/AKfycbx.../exec`).

### Langkah 6: Hubungkan URL ke Aplikasi LMS
Masukkan URL tersebut pada variabel `NEXT_PUBLIC_APPS_SCRIPT_URL` di file `.env.local` atau menu Environment Variables di Vercel.

---

## 🤖 Cara Konfigurasi Gemini API Key untuk OCR KTP

Fitur pembacaan otomatis foto KTP (Nama, NIK, dan Tanggal Lahir) didukung oleh teknologi **Google Gemini AI**.

### Cara Mendapatkan API Key Gratis (100% Free Tier):
1. Buka laman **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Login menggunakan akun Google / Gmail Anda.
3. Klik tombol **"Create API key"**.
4. Salin (copy) string API Key yang berhasil dibuat.
5. Tempelkan key tersebut ke file `.env.local` pada baris:
   ```env
   GEMINI_API_KEY=AIzaSyYourGeneratedGeminiKeyHere
   ```

---

## ⚙️ Daftar Environment Variables

| Variable Name | Required | Purpose |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Disarankan** | API Key Google Gemini untuk ekstraksi teks/OCR KTP. |
| `NEXT_PUBLIC_APPS_SCRIPT_URL` | **Opsional** | URL Apps Script Web App untuk integrasi Google Sheets. |
| `NEXT_PUBLIC_API_KEY` | **Opsional** | Token verifikasi permintaan ke Apps Script (Default: `mySecretKey123`). |
| `NEXT_PUBLIC_OPENROUTER_API_KEY` | **Opsional** | Key OpenRouter untuk fitur Chatbot Asisten Admin. |

---

## 📱 Fitur PWA (Progressive Web App)

Aplikasi ini dapat di-install langsung di smartphone maupun komputer desktop layaknya aplikasi native:

- **Android (Chrome)**: Buka web > Ketuk menu Titik Tiga (⋮) > **Tambahkan ke Layar Utama** / **Install Aplikasi**.
- **iPhone / iOS (Safari)**: Buka web > Ketuk tombol Share (Ikon Panah Atas) > **Tambahkan ke Layar Utama**.
- **Desktop (Chrome/Edge)**: Klik ikon **Install** di ujung kanan Address Bar browser.

---

## 📜 Lisensi & Catatan
Sistem ini dikembangkan secara profesional dan siap digunakan penuh untuk operasional pengelolaan pinjaman, pencatatan otomatis, serta pengiriman notifikasi pengingat secara efisien.
