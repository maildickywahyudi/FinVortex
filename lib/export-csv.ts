import { Nasabah, PeriodSummary } from '@/types';
import { formatDate, formatRupiah } from '@/lib/utils';
import { calculateNasabahProfit, calculateNasabahDanaMasuk } from '@/lib/api';

/**
 * Professional Excel (.xls) Exporter for Nasabah Data
 */
export function exportNasabahToExcel(
  nasabahList: Nasabah[],
  reportTitle: string = 'LAPORAN DATA NASABAH LMS',
) {
  const nowStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let totalPinjaman = 0;
  let totalDanaDisalurkan = 0;
  let totalDanaMasuk = 0;
  let totalProfit = 0;

  nasabahList.forEach((n) => {
    const amt = Number(n.jumlahPinjaman) || 0;
    totalPinjaman += amt;
    if (n.status === 'Approved' || n.status === 'Lunas') {
      totalDanaDisalurkan += amt;
    }
    if (n.status === 'Lunas') {
      totalDanaMasuk += calculateNasabahDanaMasuk(n);
      totalProfit += calculateNasabahProfit(n);
    }
  });

  const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; }
    .title-banner { background-color: #0F172A; color: #F59E0B; font-size: 16px; font-weight: bold; text-align: left; padding: 12px; }
    .meta-table { margin-bottom: 15px; font-size: 11px; color: #475569; border-collapse: collapse; }
    .meta-label { font-weight: bold; color: #1E293B; width: 180px; }
    table.data-table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 11px; }
    table.data-table th { background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; text-align: center; padding: 10px 8px; border: 1px solid #1E40AF; }
    table.data-table td { padding: 8px; border: 1px solid #CBD5E1; vertical-align: middle; }
    table.data-table tr:nth-child(even) { background-color: #F8FAFC; }
    .status-approved { background-color: #DCFCE7; color: #15803D; font-weight: bold; text-align: center; }
    .status-lunas { background-color: #DBEAFE; color: #1D4ED8; font-weight: bold; text-align: center; }
    .status-pending { background-color: #FEF3C7; color: #B45309; font-weight: bold; text-align: center; }
    .status-rejected { background-color: #FFE4E6; color: #BE123C; font-weight: bold; text-align: center; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-bold { font-weight: bold; }
    .total-row { background-color: #E2E8F0 !important; font-weight: bold; border-top: 2px solid #0F172A; border-bottom: 3px double #0F172A; }
    .total-row td { font-weight: bold; color: #0F172A; }
  </style>
</head>
<body>

  <table class="meta-table">
    <tr>
      <td colspan="15" class="title-banner">📊 ${reportTitle.toUpperCase()}</td>
    </tr>
    <tr>
      <td class="meta-label">Sistem Operasional:</td>
      <td colspan="14">Learning Management System & Pinjaman (LMS)</td>
    </tr>
    <tr>
      <td class="meta-label">Tanggal Cetak / Export:</td>
      <td colspan="14">${nowStr} WIB</td>
    </tr>
    <tr>
      <td class="meta-label">Total Data Record:</td>
      <td colspan="14">${nasabahList.length} Nasabah</td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th>No</th>
        <th>ID Pengajuan</th>
        <th>Nama Nasabah</th>
        <th>Tanggal Lahir</th>
        <th>No. WhatsApp</th>
        <th>Bank / E-Wallet</th>
        <th>No. Rekening / HP</th>
        <th>Nama Rekening</th>
        <th>Lokasi</th>
        <th>Tanggal Pengajuan</th>
        <th>Jumlah Pinjaman</th>
        <th>Tenor</th>
        <th>Bunga</th>
        <th>Status</th>
        <th>Jatuh Tempo</th>
        <th>Dana Disalurkan</th>
        <th>Dana Masuk (Lunas)</th>
        <th>Keuntungan (Profit)</th>
      </tr>
    </thead>
    <tbody>
      ${nasabahList
        .map((n, idx) => {
          const amt = Number(n.jumlahPinjaman) || 0;
          const isDisalurkan = n.status === 'Approved' || n.status === 'Lunas';
          const danaMasuk = calculateNasabahDanaMasuk(n);
          const profit = calculateNasabahProfit(n);

          let statusClass = 'status-pending';
          if (n.status === 'Approved') statusClass = 'status-approved';
          else if (n.status === 'Lunas') statusClass = 'status-lunas';
          else if (n.status === 'Rejected') statusClass = 'status-rejected';

          return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center text-bold">${n.id}</td>
        <td class="text-bold">${n.nama || '-'}</td>
        <td class="text-center">${n.tanggalLahir || '-'}</td>
        <td class="text-center">${n.whatsapp || '-'}</td>
        <td class="text-center text-bold">${n.bankOrEwallet || '-'}</td>
        <td class="text-center font-mono">${n.nomorRekening || '-'}</td>
        <td>${n.namaPemilikRekening || n.nama || '-'}</td>
        <td>${n.lokasi || '-'}</td>
        <td class="text-center">${formatDate(n.tanggalPengajuan)}</td>
        <td class="text-right">${formatRupiah(amt)}</td>
        <td class="text-center">${n.tenor || 0} Hari</td>
        <td class="text-center">${n.bunga ? n.bunga + '%' : '-'}</td>
        <td class="text-center"><span class="${statusClass}">${n.status}</span></td>
        <td class="text-center">${n.tanggalJatuhTempo ? formatDate(n.tanggalJatuhTempo) : '-'}</td>
        <td class="text-right">${isDisalurkan ? formatRupiah(amt) : 'Rp 0'}</td>
        <td class="text-right">${formatRupiah(danaMasuk)}</td>
        <td class="text-right" style="color: #15803D; font-weight: bold;">${formatRupiah(profit)}</td>
      </tr>`;
        })
        .join('')}
      <tr class="total-row">
        <td colspan="7" class="text-right text-bold">TOTAL AKUMULASI DANA:</td>
        <td class="text-right">${formatRupiah(totalPinjaman)}</td>
        <td colspan="4"></td>
        <td class="text-right">${formatRupiah(totalDanaDisalurkan)}</td>
        <td class="text-right">${formatRupiah(totalDanaMasuk)}</td>
        <td class="text-right" style="color: #15803D;">${formatRupiah(totalProfit)}</td>
      </tr>
    </tbody>
  </table>

</body>
</html>
  `;

  const cleanTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xls`;

  const blob = new Blob(['\uFEFF' + htmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Backward compatibility export function name
export const exportNasabahToCSV = exportNasabahToExcel;

/**
 * Professional PDF Exporter for Nasabah Data (Triggers native Print/PDF dialog)
 */
export function exportNasabahToPDF(
  nasabahList: Nasabah[],
  reportTitle: string = 'LAPORAN DATA NASABAH LMS',
) {
  const nowStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let totalPinjaman = 0;
  let totalDanaDisalurkan = 0;
  let totalDanaMasuk = 0;
  let totalProfit = 0;
  let countApproved = 0;
  let countLunas = 0;
  let countPending = 0;
  let countRejected = 0;

  nasabahList.forEach((n) => {
    const amt = Number(n.jumlahPinjaman) || 0;
    totalPinjaman += amt;
    if (n.status === 'Approved' || n.status === 'Lunas') {
      totalDanaDisalurkan += amt;
    }
    if (n.status === 'Lunas') {
      totalDanaMasuk += calculateNasabahDanaMasuk(n);
      totalProfit += calculateNasabahProfit(n);
      countLunas++;
    } else if (n.status === 'Approved') {
      countApproved++;
    } else if (n.status === 'Pending') {
      countPending++;
    } else if (n.status === 'Rejected') {
      countRejected++;
    }
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mengunduh laporan PDF');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 10px; color: #0f172a; margin: 0; padding: 15px; background: #fff; }
    
    .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
    .brand-title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .brand-sub { font-size: 11px; color: #475569; font-weight: 500; margin-top: 3px; }
    .doc-badge { background: #0f172a; color: #f59e0b; padding: 6px 14px; font-weight: bold; font-size: 11px; border-radius: 4px; text-transform: uppercase; }

    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
    .stat-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; background: #f8fafc; }
    .stat-label { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .stat-val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px; }

    table.report-table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 20px; }
    table.report-table th { background: #1e293b; color: #ffffff; font-weight: 700; text-align: left; padding: 7px 6px; border: 1px solid #1e293b; text-transform: uppercase; font-size: 8.5px; }
    table.report-table td { padding: 6px; border: 1px solid #e2e8f0; vertical-align: middle; }
    table.report-table tr:nth-child(even) { background: #f8fafc; }

    .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 8.5px; font-weight: bold; text-align: center; }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-lunas { background: #dbeafe; color: #1e40af; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-rejected { background: #ffe4e6; color: #9f1239; }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }

    .total-row { background: #e2e8f0 !important; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
    
    .signature-section { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .sig-box { width: 220px; text-align: center; }
    .sig-line { margin-top: 50px; border-bottom: 1px solid #0f172a; font-weight: bold; font-size: 11px; padding-bottom: 2px; }
  </style>
</head>
<body>

  <div class="header-container">
    <div>
      <div class="brand-title">${reportTitle}</div>
      <div class="brand-sub">SISTEM INTEGRASI MANAJEMEN PINJAMAN & NASABAH (LMS)</div>
      <div class="brand-sub">Tanggal Cetak: <strong>${nowStr} WIB</strong> | Total: <strong>${nasabahList.length} Record Nasabah</strong></div>
    </div>
    <div>
      <span class="doc-badge">DOKUMEN RESMI FINAL</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-label">Total Pengajuan Pinjaman</div>
      <div class="stat-val">${formatRupiah(totalPinjaman)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Dana Disalurkan</div>
      <div class="stat-val" style="color: #2563eb;">${formatRupiah(totalDanaDisalurkan)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Pengembalian (Lunas)</div>
      <div class="stat-val" style="color: #16a34a;">${formatRupiah(totalDanaMasuk)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Estimasi Keuntungan Profit</div>
      <div class="stat-val" style="color: #059669;">${formatRupiah(totalProfit)}</div>
    </div>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 25px;">No</th>
        <th>ID</th>
        <th>Nama Nasabah</th>
        <th>WhatsApp</th>
        <th>Lokasi</th>
        <th>Tgl Pengajuan</th>
        <th class="text-right">Jumlah Pinjaman</th>
        <th class="text-center">Tenor</th>
        <th class="text-center">Bunga</th>
        <th class="text-center">Status</th>
        <th class="text-center">Jatuh Tempo</th>
        <th class="text-right">Dana Masuk</th>
        <th class="text-right">Profit Bunga</th>
      </tr>
    </thead>
    <tbody>
      ${nasabahList
        .map((n, idx) => {
          const amt = Number(n.jumlahPinjaman) || 0;
          const danaMasuk = calculateNasabahDanaMasuk(n);
          const profit = calculateNasabahProfit(n);

          let badgeCls = 'badge-pending';
          if (n.status === 'Approved') badgeCls = 'badge-approved';
          else if (n.status === 'Lunas') badgeCls = 'badge-lunas';
          else if (n.status === 'Rejected') badgeCls = 'badge-rejected';

          return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="font-mono text-center"><strong>${n.id}</strong></td>
        <td><strong>${n.nama || '-'}</strong></td>
        <td class="text-center">${n.whatsapp || '-'}</td>
        <td>${n.lokasi || '-'}</td>
        <td class="text-center">${formatDate(n.tanggalPengajuan)}</td>
        <td class="text-right font-mono">${formatRupiah(amt)}</td>
        <td class="text-center">${n.tenor || 0} Hari</td>
        <td class="text-center">${n.bunga ? n.bunga + '%' : '-'}</td>
        <td class="text-center"><span class="badge ${badgeCls}">${n.status}</span></td>
        <td class="text-center">${n.tanggalJatuhTempo ? formatDate(n.tanggalJatuhTempo) : '-'}</td>
        <td class="text-right font-mono">${formatRupiah(danaMasuk)}</td>
        <td class="text-right font-mono" style="color: #16a34a; font-weight: bold;">${formatRupiah(profit)}</td>
      </tr>`;
        })
        .join('')}
      <tr class="total-row">
        <td colspan="6" class="text-right">TOTAL AKUMULASI DANA:</td>
        <td class="text-right font-mono">${formatRupiah(totalPinjaman)}</td>
        <td colspan="4"></td>
        <td class="text-right font-mono">${formatRupiah(totalDanaMasuk)}</td>
        <td class="text-right font-mono" style="color: #16a34a;">${formatRupiah(totalProfit)}</td>
      </tr>
    </tbody>
  </table>

  <div class="signature-section">
    <div class="sig-box">
      <div>Dibuat Oleh,</div>
      <div style="font-size: 9px; color: #64748b;">Staff Administrasi LMS</div>
      <div class="sig-line">Sistem Operasional LMS</div>
    </div>
    <div class="sig-box">
      <div>Disetujui Oleh,</div>
      <div style="font-size: 9px; color: #64748b;">Manajer Keuangan / Super Admin</div>
      <div class="sig-line">Pimpinan Manajemen</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Professional Excel (.xls) Exporter for Financial Reports (Period summaries)
 */
export function exportFinancialReportToExcel(
  periodList: PeriodSummary[],
  reportTitle: string = 'REKAPITULASI LAPORAN KEUANGAN PERIODE LMS',
) {
  const nowStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let totalDanaKeluar = 0;
  let totalDanaMasuk = 0;
  let totalKeuntungan = 0;
  let totalNasabah = 0;

  periodList.forEach((p) => {
    totalDanaKeluar += p.danaKeluar;
    totalDanaMasuk += p.danaMasuk;
    totalKeuntungan += p.keuntungan;
    totalNasabah += p.totalNasabah;
  });

  const htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; }
    .title-banner { background-color: #0F172A; color: #F59E0B; font-size: 16px; font-weight: bold; text-align: left; padding: 12px; }
    .meta-table { margin-bottom: 15px; font-size: 11px; color: #475569; }
    .meta-label { font-weight: bold; color: #1E293B; width: 180px; }
    table.data-table { border-collapse: collapse; width: 100%; margin-top: 10px; font-size: 11px; }
    table.data-table th { background-color: #1E3A8A; color: #FFFFFF; font-weight: bold; text-align: center; padding: 10px 8px; border: 1px solid #1E40AF; }
    table.data-table td { padding: 8px; border: 1px solid #CBD5E1; vertical-align: middle; }
    table.data-table tr:nth-child(even) { background-color: #F8FAFC; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-bold { font-weight: bold; }
    .total-row { background-color: #E2E8F0 !important; font-weight: bold; border-top: 2px solid #0F172A; }
  </style>
</head>
<body>

  <table class="meta-table">
    <tr>
      <td colspan="10" class="title-banner">📈 ${reportTitle.toUpperCase()}</td>
    </tr>
    <tr>
      <td class="meta-label">Sistem Operasional:</td>
      <td colspan="9">Learning Management System & Pinjaman (LMS)</td>
    </tr>
    <tr>
      <td class="meta-label">Tanggal Cetak / Export:</td>
      <td colspan="9">${nowStr} WIB</td>
    </tr>
  </table>

  <table class="data-table">
    <thead>
      <tr>
        <th>No</th>
        <th>Periode</th>
        <th>Dana Keluar (Disalurkan)</th>
        <th>Dana Masuk (Lunas)</th>
        <th>Keuntungan Bunga (Profit)</th>
        <th>Total Nasabah</th>
        <th>Approved</th>
        <th>Lunas</th>
        <th>Pending</th>
        <th>Rejected</th>
      </tr>
    </thead>
    <tbody>
      ${periodList
        .map(
          (p, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-bold">${p.label}</td>
        <td class="text-right">${formatRupiah(p.danaKeluar)}</td>
        <td class="text-right">${formatRupiah(p.danaMasuk)}</td>
        <td class="text-right" style="color: #15803D; font-weight: bold;">${formatRupiah(p.keuntungan)}</td>
        <td class="text-center">${p.totalNasabah} Nasabah</td>
        <td class="text-center">${p.approvedCount}</td>
        <td class="text-center">${p.lunasCount}</td>
        <td class="text-center">${p.pendingCount}</td>
        <td class="text-center">${p.rejectedCount}</td>
      </tr>`,
        )
        .join('')}
      <tr class="total-row">
        <td colspan="2" class="text-right text-bold">TOTAL REKAPITULASI:</td>
        <td class="text-right">${formatRupiah(totalDanaKeluar)}</td>
        <td class="text-right">${formatRupiah(totalDanaMasuk)}</td>
        <td class="text-right" style="color: #15803D;">${formatRupiah(totalKeuntungan)}</td>
        <td class="text-center">${totalNasabah} Nasabah</td>
        <td colspan="4"></td>
      </tr>
    </tbody>
  </table>

</body>
</html>
  `;

  const cleanTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${cleanTitle}_${new Date().toISOString().slice(0, 10)}.xls`;

  const blob = new Blob(['\uFEFF' + htmlContent], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Professional PDF Exporter for Financial Reports
 */
export function exportFinancialReportToPDF(
  periodList: PeriodSummary[],
  reportTitle: string = 'LAPORAN REKAPITULASI KEUANGAN LMS',
) {
  const nowStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let totalDanaKeluar = 0;
  let totalDanaMasuk = 0;
  let totalKeuntungan = 0;
  let totalNasabah = 0;

  periodList.forEach((p) => {
    totalDanaKeluar += p.danaKeluar;
    totalDanaMasuk += p.danaMasuk;
    totalKeuntungan += p.keuntungan;
    totalNasabah += p.totalNasabah;
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mengunduh laporan PDF');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 10px; background: #fff; }
    
    .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .brand-title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .brand-sub { font-size: 11px; color: #475569; font-weight: 500; margin-top: 3px; }
    .doc-badge { background: #0f172a; color: #f59e0b; padding: 6px 14px; font-weight: bold; font-size: 11px; border-radius: 4px; text-transform: uppercase; }

    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; background: #f8fafc; }
    .stat-label { font-size: 9.5px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .stat-val { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 3px; }

    table.report-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 25px; }
    table.report-table th { background: #1e293b; color: #ffffff; font-weight: 700; text-align: left; padding: 8px; border: 1px solid #1e293b; text-transform: uppercase; font-size: 9px; }
    table.report-table td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
    table.report-table tr:nth-child(even) { background: #f8fafc; }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }

    .total-row { background: #e2e8f0 !important; font-weight: bold; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; }
    
    .signature-section { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .sig-box { width: 200px; text-align: center; }
    .sig-line { margin-top: 55px; border-bottom: 1px solid #0f172a; font-weight: bold; font-size: 11px; padding-bottom: 2px; }
  </style>
</head>
<body>

  <div class="header-container">
    <div>
      <div class="brand-title">${reportTitle}</div>
      <div class="brand-sub">REKAPITULASI LAPORAN KEUANGAN & DANA OPERASIONAL LMS</div>
      <div class="brand-sub">Cetak: <strong>${nowStr} WIB</strong></div>
    </div>
    <div>
      <span class="doc-badge">DOKUMEN RESMI</span>
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-label">Total Dana Disalurkan (Keluar)</div>
      <div class="stat-val" style="color: #2563eb;">${formatRupiah(totalDanaKeluar)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Dana Masuk (Lunas)</div>
      <div class="stat-val" style="color: #16a34a;">${formatRupiah(totalDanaMasuk)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Keuntungan Bunga (Profit)</div>
      <div class="stat-val" style="color: #059669;">${formatRupiah(totalKeuntungan)}</div>
    </div>
  </div>

  <table class="report-table">
    <thead>
      <tr>
        <th style="width: 30px;">No</th>
        <th>Periode</th>
        <th class="text-right">Dana Keluar (Pinjaman)</th>
        <th class="text-right">Dana Masuk (Lunas)</th>
        <th class="text-right">Keuntungan (Profit)</th>
        <th class="text-center">Total Nasabah</th>
        <th class="text-center">Lunas</th>
        <th class="text-center">Approved</th>
        <th class="text-center">Pending</th>
      </tr>
    </thead>
    <tbody>
      ${periodList
        .map(
          (p, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${p.label}</strong></td>
        <td class="text-right font-mono">${formatRupiah(p.danaKeluar)}</td>
        <td class="text-right font-mono">${formatRupiah(p.danaMasuk)}</td>
        <td class="text-right font-mono" style="color: #16a34a; font-weight: bold;">${formatRupiah(p.keuntungan)}</td>
        <td class="text-center">${p.totalNasabah} Nasabah</td>
        <td class="text-center" style="color: #2563eb; font-weight: bold;">${p.lunasCount}</td>
        <td class="text-center" style="color: #16a34a; font-weight: bold;">${p.approvedCount}</td>
        <td class="text-center" style="color: #d97706;">${p.pendingCount}</td>
      </tr>`,
        )
        .join('')}
      <tr class="total-row">
        <td colspan="2" class="text-right">TOTAL AKUMULASI:</td>
        <td class="text-right font-mono">${formatRupiah(totalDanaKeluar)}</td>
        <td class="text-right font-mono">${formatRupiah(totalDanaMasuk)}</td>
        <td class="text-right font-mono" style="color: #16a34a;">${formatRupiah(totalKeuntungan)}</td>
        <td class="text-center">${totalNasabah} Nasabah</td>
        <td colspan="3"></td>
      </tr>
    </tbody>
  </table>

  <div class="signature-section">
    <div class="sig-box">
      <div>Dibuat Oleh,</div>
      <div style="font-size: 9px; color: #64748b;">Tim Keuangan LMS</div>
      <div class="sig-line">Staff Finance</div>
    </div>
    <div class="sig-box">
      <div>Disetujui Oleh,</div>
      <div style="font-size: 9px; color: #64748b;">Direktur Utama / Super Admin</div>
      <div class="sig-line">Pimpinan Manajemen</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Professional Single Nasabah Profile PDF Exporter
 */
export function exportSingleNasabahPDF(nasabah: Nasabah) {
  const nowStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const profit = calculateNasabahProfit(nasabah);
  const totalWajib = (Number(nasabah.jumlahPinjaman) || 0) + profit;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Harap izinkan popup browser untuk mencetak PDF nasabah');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>PROFIL NASABAH - ${nasabah.nama} (${nasabah.id})</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 10px; background: #fff; line-height: 1.5; }
    
    .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
    .brand-title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .brand-sub { font-size: 11px; color: #475569; font-weight: 500; margin-top: 3px; }
    .doc-badge { background: #0f172a; color: #f59e0b; padding: 6px 14px; font-weight: bold; font-size: 11px; border-radius: 4px; text-transform: uppercase; }

    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; letter-spacing: 0.5px; }

    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .info-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-label { width: 35%; color: #64748b; font-weight: 600; }
    .info-value { width: 65%; color: #0f172a; font-weight: 700; }

    .status-box { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
    .status-approved { background: #dcfce7; color: #166534; }
    .status-lunas { background: #dbeafe; color: #1e40af; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-rejected { background: #ffe4e6; color: #9f1239; }

    .highlight-card { border: 1px solid #2563eb; background: #eff6ff; border-radius: 6px; padding: 12px; margin-top: 10px; }
    .highlight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .hl-label { font-size: 9.5px; color: #3b82f6; font-weight: bold; text-transform: uppercase; }
    .hl-val { font-size: 14px; font-weight: 800; color: #1e3a8a; margin-top: 2px; }

    .signature-section { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .sig-box { width: 200px; text-align: center; }
    .sig-line { margin-top: 55px; border-bottom: 1px solid #0f172a; font-weight: bold; font-size: 11px; padding-bottom: 2px; }
  </style>
</head>
<body>

  <div class="header-container">
    <div>
      <div class="brand-title">LEMBAR PROFIL & PENGAJUAN NASABAH</div>
      <div class="brand-sub">SISTEM INTEGRASI MANAJEMEN PINJAMAN & NASABAH (LMS)</div>
      <div class="brand-sub">Tanggal Cetak: <strong>${nowStr} WIB</strong> | ID: <strong>${nasabah.id}</strong></div>
    </div>
    <div>
      <span class="doc-badge">DOKUMEN RESMI</span>
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
    <div>Status Pengajuan Saat Ini:</div>
    <div>
      <span class="status-box status-${nasabah.status.toLowerCase()}">${nasabah.status}</span>
    </div>
  </div>

  <div class="section-title">1. DATA IDENTITAS PRIBADI</div>
  <table class="info-table">
    <tr>
      <td class="info-label">ID Nasabah:</td>
      <td class="info-value">${nasabah.id}</td>
    </tr>
    <tr>
      <td class="info-label">Nama Lengkap:</td>
      <td class="info-value">${nasabah.nama}</td>
    </tr>
    <tr>
      <td class="info-label">NIK (KTP):</td>
      <td class="info-value">${nasabah.nik || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Tanggal Lahir:</td>
      <td class="info-value">${nasabah.tanggalLahir || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">No. WhatsApp / Telepon:</td>
      <td class="info-value">${nasabah.whatsapp}</td>
    </tr>
    <tr>
      <td class="info-label">Alamat Domisili / Lokasi:</td>
      <td class="info-value">${nasabah.lokasi}</td>
    </tr>
  </table>

  <div class="section-title">2. KONTAK DARURAT NASABAH</div>
  <table class="info-table">
    <tr>
      <td class="info-label">Nama Kontak Darurat:</td>
      <td class="info-value">${nasabah.namaKontakDarurat || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Hubungan Kekerabatan:</td>
      <td class="info-value">${nasabah.hubunganKontakDarurat || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">No. Telepon / WhatsApp:</td>
      <td class="info-value">${nasabah.noKontakDarurat || '-'}</td>
    </tr>
  </table>

  <div class="section-title">3. REKENING BANK & E-WALLET PENCAIRAN</div>
  <table class="info-table">
    <tr>
      <td class="info-label">Bank / E-Wallet Pencairan:</td>
      <td class="info-value" style="color: #2563eb;">${nasabah.bankOrEwallet || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Nomor Rekening / No. HP E-Wallet:</td>
      <td class="info-value">${nasabah.nomorRekening || '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Nama Pemilik Rekening:</td>
      <td class="info-value">${nasabah.namaPemilikRekening || nasabah.nama}</td>
    </tr>
  </table>

  <div class="section-title">4. RINCIAN PERJANJIAN & PENGAJUAN PINJAMAN</div>
  <div class="highlight-card">
    <div class="highlight-grid">
      <div>
        <div class="hl-label">Jumlah Pinjaman</div>
        <div class="hl-val">${formatRupiah(nasabah.jumlahPinjaman)}</div>
      </div>
      <div>
        <div class="hl-label">Tenor & Bunga</div>
        <div class="hl-val">${nasabah.tenor} Hari (${nasabah.bunga || 0}%)</div>
      </div>
      <div>
        <div class="hl-label">Total Wajib Bayar</div>
        <div class="hl-val" style="color: #16a34a;">${formatRupiah(totalWajib)}</div>
      </div>
    </div>
  </div>

  <table class="info-table" style="margin-top: 10px;">
    <tr>
      <td class="info-label">Tanggal Pengajuan:</td>
      <td class="info-value">${formatDate(nasabah.tanggalPengajuan)}</td>
    </tr>
    <tr>
      <td class="info-label">Tanggal Jatuh Tempo:</td>
      <td class="info-value">${nasabah.tanggalJatuhTempo ? formatDate(nasabah.tanggalJatuhTempo) : '-'}</td>
    </tr>
    <tr>
      <td class="info-label">Estimasi Profit Bunga:</td>
      <td class="info-value" style="color: #16a34a;">${formatRupiah(profit)}</td>
    </tr>
    ${nasabah.alasanReject ? `
    <tr>
      <td class="info-label" style="color: #dc2626;">Alasan Penolakan:</td>
      <td class="info-value" style="color: #dc2626;">${nasabah.alasanReject}</td>
    </tr>
    ` : ''}
  </table>

  <div class="signature-section">
    <div class="sig-box">
      <div>Pemohon / Peminjam,</div>
      <div style="font-size: 9px; color: #64748b;">(Nasabah LMS)</div>
      <div class="sig-line">${nasabah.nama}</div>
    </div>
    <div class="sig-box">
      <div>Petugas Verifikasi / Admin,</div>
      <div style="font-size: 9px; color: #64748b;">(Staff Analis Kredit)</div>
      <div class="sig-line">Analis Tim LMS</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

