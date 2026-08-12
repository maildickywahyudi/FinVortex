/**
 * ============================================================
 *  LMS — Loan Management System
 *  Google Apps Script Backend (Code.gs)
 * ============================================================
 *
 *  Backend REST API untuk Loan Management System.
 *  Database: Google Sheets | Storage: Google Drive
 *
 *  SETUP:
 *  1. Buka Google Sheets baru
 *  2. Extensions > Apps Script
 *  3. Paste kode ini
 *  4. Jalankan setupSheets() sekali untuk inisialisasi
 *  5. Deploy > New deployment > Web app
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  6. Copy URL deployment ke .env (NEXT_PUBLIC_APPS_SCRIPT_URL)
 * ============================================================
 */

var API_KEY = 'mySecretKey123'; // Ganti sesuai .env NEXT_PUBLIC_API_KEY
var SHEET_NASABAH = 'Nasabah';
var SHEET_CONFIG = 'Config';
var SHEET_ADMIN = 'Admin';
var SHEET_COUNTER = 'Counter';
var SHEET_LOGS = 'Activity Logs';
var DRIVE_FOLDER_NAME = 'LMS_Uploads';

var OFFICIAL_NASABAH_HEADERS = [
  'ID', 'Nama', 'NIK', 'TanggalLahir', 'WhatsApp', 'Lokasi',
  'NamaKontakDarurat', 'HubunganKontakDarurat', 'NoKontakDarurat',
  'BankOrEwallet', 'NomorRekening', 'NamaPemilikRekening',
  'JumlahPinjaman', 'Tenor', 'Bunga', 'Status', 'AlasanReject',
  'IsAutoRejected', 'AutoRejectReason', 'TanggalPengajuan',
  'TanggalJatuhTempo', 'TotalDanaDisalurkan', 'KtpUrl', 'SelfieUrl',
  'SocmedUrl', 'AdminNote', 'StatusHistory'
];

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Content-Type': 'application/json',
  };
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function safeIsoDate(val) {
  if (!val) return new Date().toISOString();
  try {
    var d = new Date(val);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}

function autoFixNasabahHeaders(sheet) {
  if (!sheet) return;
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  if (currentHeaders.length < 27 || String(currentHeaders[2]).trim().toLowerCase() === 'tanggallahir') {
    sheet.getRange(1, 1, 1, OFFICIAL_NASABAH_HEADERS.length).setValues([OFFICIAL_NASABAH_HEADERS]);
    sheet.getRange(1, 1, 1, OFFICIAL_NASABAH_HEADERS.length).setFontWeight('bold');
  }
}

// ============================================================
//  HANDLER UTAMA
// ============================================================

function doGet(e) {
  var action = (e.parameter.action || '').toLowerCase();
  var apiKey = e.parameter.apiKey || '';

  if (apiKey !== API_KEY) {
    return jsonOutput({ success: false, message: 'Unauthorized: Invalid API Key' });
  }

  try {
    switch (action) {
      case 'ping':
      case 'testconnection':
        return jsonOutput({ success: true, message: 'Koneksi Google Spreadsheet Aktif' });
      case 'getnasabah':
        return jsonOutput({ success: true, data: getNasabahData() });
      case 'getconfig':
        return jsonOutput({ success: true, data: getConfigData() });
      case 'getadminusers':
        return jsonOutput({ success: true, data: getAdminUsersData() });
      case 'getnasabahbyid':
        var id = e.parameter.id || '';
        return jsonOutput({ success: true, data: getNasabahByIdData(id) });
      case 'getadminlogs':
        return jsonOutput({ success: true, data: getAdminLogsData() });
      case 'login':
        var email = e.parameter.email || '';
        var password = e.parameter.password || '';
        return jsonOutput({ success: true, data: loginAdmin(email, password) });
      default:
        return jsonOutput({ success: true, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonOutput({ success: false, message: 'Error: ' + err.toString() });
  }
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ success: false, message: 'Invalid JSON body' });
  }

  if (body.apiKey !== API_KEY) {
    return jsonOutput({ success: false, message: 'Unauthorized: Invalid API Key' });
  }

  var action = (body.action || '').toLowerCase();

  try {
    switch (action) {
      case 'ping':
      case 'testconnection':
        return jsonOutput({ success: true, message: 'Koneksi Google Spreadsheet Aktif' });
      case 'submitpengajuan':
        return jsonOutput({ success: true, data: submitPengajuanData(body.data) });
      case 'updatestatus':
        return jsonOutput({ success: true, data: updateStatusData(body.id, body.status, body.alasan) });
      case 'updateconfig':
        return jsonOutput({ success: true, data: updateConfigData(body.config) });
      case 'updateadminuser':
        return jsonOutput({ success: true, data: updateAdminUserData(body.email, body.updates) });
      case 'addadminuser':
        return jsonOutput({ success: true, data: addAdminUserData(body.user) });
      case 'deleteadminuser':
        return jsonOutput({ success: true, data: deleteAdminUserData(body.email) });
      case 'addadminlog':
        return jsonOutput({ success: true, data: addAdminLogData(body.log) });
      case 'clearadminlogs':
        return jsonOutput({ success: true, data: clearAdminLogsData() });
      case 'login':
        return jsonOutput({ success: true, data: loginAdmin(body.email, body.password) });
      default:
        return jsonOutput({ success: false, message: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonOutput({ success: false, message: 'Error: ' + err.toString() });
  }
}

function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
//  SETUP SHEETS — Jalankan SEKALI
// ============================================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var nasabahSheet = ss.getSheetByName(SHEET_NASABAH);
  if (!nasabahSheet) {
    nasabahSheet = ss.insertSheet(SHEET_NASABAH);
  }
  nasabahSheet.getRange(1, 1, 1, OFFICIAL_NASABAH_HEADERS.length).setValues([OFFICIAL_NASABAH_HEADERS]);
  nasabahSheet.getRange(1, 1, 1, OFFICIAL_NASABAH_HEADERS.length).setFontWeight('bold');

  var configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) {
    configSheet = ss.insertSheet(SHEET_CONFIG);
  }
  if (configSheet.getLastRow() === 0) {
    var defaultConfig = {
      prefix: 'LN',
      tenor: [
        { label: '7 Hari', value: 7, active: true },
        { label: '14 Hari', value: 14, active: true },
        { label: '30 Hari', value: 30, active: true },
        { label: '90 Hari', value: 90, active: true },
        { label: '180 Hari', value: 180, active: false }
      ],
      jumlahPinjaman: [
        { label: 'Rp 100.000', value: 100000, active: true },
        { label: 'Rp 200.000', value: 200000, active: true },
        { label: 'Rp 500.000', value: 500000, active: true },
        { label: 'Rp 1.000.000', value: 1000000, active: true },
        { label: 'Rp 2.000.000', value: 2000000, active: true },
        { label: 'Rp 5.000.000', value: 5000000, active: false }
      ],
      bunga: [
        { label: 'Rp 30.000', value: 30000, active: true },
        { label: 'Rp 50.000', value: 50000, active: true },
        { label: '5%', value: 5, active: true },
        { label: '10%', value: 10, active: false }
      ]
    };
    configSheet.appendRow(['Config', JSON.stringify(defaultConfig)]);
    configSheet.getRange('A1:B1').setFontWeight('bold');
  }

  var adminSheet = ss.getSheetByName(SHEET_ADMIN);
  if (!adminSheet) {
    adminSheet = ss.insertSheet(SHEET_ADMIN);
  }
  if (adminSheet.getLastRow() === 0) {
    adminSheet.appendRow(['Email', 'Password', 'Nama', 'Role']);
    adminSheet.appendRow(['admin@lms.id', 'admin123', 'Budi Santoso', 'Admin']);
    adminSheet.appendRow(['super@lms.id', 'super123', 'Andi Wijaya', 'Super Admin']);
    adminSheet.getRange('A1:D1').setFontWeight('bold');
  }

  var counterSheet = ss.getSheetByName(SHEET_COUNTER);
  if (!counterSheet) {
    counterSheet = ss.insertSheet(SHEET_COUNTER);
  }
  if (counterSheet.getLastRow() === 0) {
    counterSheet.appendRow(['Tanggal', 'Counter']);
    counterSheet.getRange('A1:B1').setFontWeight('bold');
  }

  var logsSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(SHEET_LOGS);
  }
  if (logsSheet.getLastRow() === 0) {
    logsSheet.appendRow(['ID', 'Timestamp', 'AdminEmail', 'AdminName', 'ActionType', 'Description', 'TargetId', 'Details']);
    logsSheet.getRange('A1:H1').setFontWeight('bold');
  }

  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Setup selesai! Header & sheet telah diperbarui.', 'Sukses');
}

// ============================================================
//  GENERATE ID PENGAJUAN
// ============================================================

function generateIdPengajuan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var counterSheet = ss.getSheetByName(SHEET_COUNTER);
  if (!counterSheet) {
    counterSheet = ss.insertSheet(SHEET_COUNTER);
    counterSheet.appendRow(['Tanggal', 'Counter']);
  }
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var lastRow = counterSheet.getLastRow();

  if (lastRow > 1) {
    var lastDate = counterSheet.getRange(lastRow, 1).getValue();
    var lastDateStr = Utilities.formatDate(new Date(lastDate), Session.getScriptTimeZone(), 'yyyyMMdd');
    if (lastDateStr === today) {
      var currentCounter = counterSheet.getRange(lastRow, 2).getValue();
      var newCounter = Number(currentCounter || 0) + 1;
      counterSheet.getRange(lastRow, 2).setValue(newCounter);
      return 'LN-' + today + '-' + String(newCounter).padStart(4, '0');
    }
  }

  counterSheet.appendRow([new Date(), 1]);
  return 'LN-' + today + '-0001';
}

// ============================================================
//  UPLOAD FILE KE DRIVE
// ============================================================

function uploadFileToDrive(base64Data, fileName, mimeType) {
  if (!base64Data || typeof base64Data !== 'string') return '';
  try {
    var cleanBase64 = base64Data;
    if (cleanBase64.indexOf(',') !== -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
    }

    var decoded = Utilities.base64Decode(cleanBase64);
    var blob = Utilities.newBlob(decoded, mimeType || 'image/jpeg', fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return 'https://drive.google.com/uc?export=view&id=' + file.getId();
  } catch (err) {
    Logger.log('Error upload file: ' + err.toString());
    return '';
  }
}

// ============================================================
//  GET DATA NASABAH
// ============================================================

function getNasabahData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NASABAH);
  if (!sheet) return [];
  autoFixNasabahHeaders(sheet);

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var result = [];

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (!r || !r[0]) continue;

    var rowByHeader = {};
    for (var j = 0; j < headers.length; j++) {
      var h = headers[j];
      rowByHeader[h] = r[j];
      var camel = h.charAt(0).toLowerCase() + h.slice(1);
      rowByHeader[camel] = r[j];
    }

    var is27Col = r.length >= 20;

    var id = String((is27Col ? r[0] : rowByHeader.id || rowByHeader.ID) || '');
    var nama = String((is27Col ? r[1] : rowByHeader.nama || rowByHeader.Nama) || '');
    var nik = String((is27Col ? r[2] : rowByHeader.nik || rowByHeader.NIK) || '');
    var tanggalLahir = String((is27Col ? r[3] : rowByHeader.tanggalLahir || rowByHeader.TanggalLahir) || '');
    var whatsapp = String((is27Col ? r[4] : rowByHeader.whatsapp || rowByHeader.WhatsApp) || '');
    var lokasi = String((is27Col ? r[5] : rowByHeader.lokasi || rowByHeader.Lokasi) || '');
    var namaKontakDarurat = String((is27Col ? r[6] : rowByHeader.namaKontakDarurat || rowByHeader.NamaKontakDarurat) || '');
    var hubunganKontakDarurat = String((is27Col ? r[7] : rowByHeader.hubunganKontakDarurat || rowByHeader.HubunganKontakDarurat) || '');
    var noKontakDarurat = String((is27Col ? r[8] : rowByHeader.noKontakDarurat || rowByHeader.NoKontakDarurat) || '');
    var bankOrEwallet = String((is27Col ? r[9] : rowByHeader.bankOrEwallet || rowByHeader.BankOrEwallet) || '');
    var nomorRekening = String((is27Col ? r[10] : rowByHeader.nomorRekening || rowByHeader.NomorRekening) || '');
    var namaPemilikRekening = String((is27Col ? r[11] : rowByHeader.namaPemilikRekening || rowByHeader.NamaPemilikRekening) || '');
    var jumlahPinjaman = Number((is27Col ? r[12] : rowByHeader.jumlahPinjaman || rowByHeader.JumlahPinjaman) || 0);
    var tenor = Number((is27Col ? r[13] : rowByHeader.tenor || rowByHeader.Tenor) || 0);
    var bunga = Number((is27Col ? r[14] : rowByHeader.bunga || rowByHeader.Bunga) || 0);
    var status = String((is27Col ? r[15] : rowByHeader.status || rowByHeader.Status) || 'Pending');
    var alasanReject = String((is27Col ? r[16] : rowByHeader.alasanReject || rowByHeader.AlasanReject) || '');
    var isAutoRejected = is27Col ? (r[17] === 'YA' || r[17] === true) : (rowByHeader.isAutoRejected === true || rowByHeader.IsAutoRejected === 'YA');
    var autoRejectReason = String((is27Col ? r[18] : rowByHeader.autoRejectReason || rowByHeader.AutoRejectReason) || '');
    
    var rawTglPengajuan = is27Col ? r[19] : (rowByHeader.tanggalPengajuan || rowByHeader.TanggalPengajuan);
    var tanggalPengajuan = safeIsoDate(rawTglPengajuan);

    var rawTglJatuhTempo = is27Col ? r[20] : (rowByHeader.tanggalJatuhTempo || rowByHeader.TanggalJatuhTempo);
    var tanggalJatuhTempo = rawTglJatuhTempo ? safeIsoDate(rawTglJatuhTempo) : '';

    var totalDanaDisalurkan = Number((is27Col ? r[21] : rowByHeader.totalDanaDisalurkan || rowByHeader.TotalDanaDisalurkan) || 0);
    var ktpUrl = String((is27Col ? r[22] : rowByHeader.ktpUrl || rowByHeader.KtpUrl) || '');
    var selfieUrl = String((is27Col ? r[23] : rowByHeader.selfieUrl || rowByHeader.SelfieUrl) || '');
    var socmedUrl = String((is27Col ? r[24] : rowByHeader.socmedUrl || rowByHeader.SocmedUrl) || '');
    var adminNote = String((is27Col ? r[25] : rowByHeader.adminNote || rowByHeader.AdminNote) || '');
    var rawHistory = is27Col ? r[26] : (rowByHeader.statusHistory || rowByHeader.StatusHistory);

    var statusHistory = [];
    if (rawHistory) {
      if (typeof rawHistory === 'string') {
        try { statusHistory = JSON.parse(rawHistory); } catch (_) {}
      } else if (Array.isArray(rawHistory)) {
        statusHistory = rawHistory;
      }
    }

    result.push({
      id: id,
      nama: nama,
      nik: nik,
      tanggalLahir: tanggalLahir,
      whatsapp: whatsapp,
      lokasi: lokasi,
      namaKontakDarurat: namaKontakDarurat,
      hubunganKontakDarurat: hubunganKontakDarurat,
      noKontakDarurat: noKontakDarurat,
      bankOrEwallet: bankOrEwallet,
      nomorRekening: nomorRekening,
      namaPemilikRekening: namaPemilikRekening,
      jumlahPinjaman: isNaN(jumlahPinjaman) ? 0 : jumlahPinjaman,
      tenor: isNaN(tenor) ? 0 : tenor,
      bunga: isNaN(bunga) ? 0 : bunga,
      status: status,
      alasanReject: alasanReject,
      isAutoRejected: isAutoRejected,
      autoRejectReason: autoRejectReason,
      tanggalPengajuan: tanggalPengajuan,
      tanggalJatuhTempo: tanggalJatuhTempo,
      totalDanaDisalurkan: isNaN(totalDanaDisalurkan) ? 0 : totalDanaDisalurkan,
      ktpUrl: ktpUrl,
      selfieUrl: selfieUrl,
      socmedUrl: socmedUrl,
      adminNote: adminNote,
      statusHistory: statusHistory
    });
  }
  return result;
}

function getNasabahByIdData(id) {
  var allData = getNasabahData();
  for (var i = 0; i < allData.length; i++) {
    if (allData[i].id === id) return allData[i];
  }
  return null;
}

function getConfigData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return null;
  var value = sheet.getRange(2, 2).getValue();
  if (value) {
    try { return JSON.parse(value); } catch (_) {}
  }
  return null;
}

function updateConfigData(config) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_CONFIG);
  if (sheet) {
    sheet.getRange(2, 2).setValue(JSON.stringify(config));
  }
  return config;
}

function loginAdmin(email, password) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === String(email).toLowerCase().trim() && String(data[i][1]).trim() === String(password).trim()) {
      return {
        email: data[i][0],
        nama: data[i][2],
        role: data[i][3],
        password: ''
      };
    }
  }
  return null;
}

function submitPengajuanData(data) {
  if (!data) return { id: '' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NASABAH);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NASABAH);
  }
  autoFixNasabahHeaders(sheet);

  var id = data.id || generateIdPengajuan();

  var ktpSrc = data.ktpUrl || data.ktpBase64 || '';
  var selfieSrc = data.selfieUrl || data.selfieBase64 || '';
  var socmedSrc = data.socmedUrl || data.socmedBase64 || '';

  var ktpUrl = (ktpSrc && ktpSrc.indexOf('data:') === 0) ? uploadFileToDrive(ktpSrc, id + '_KTP', 'image/jpeg') : ktpSrc;
  var selfieUrl = (selfieSrc && selfieSrc.indexOf('data:') === 0) ? uploadFileToDrive(selfieSrc, id + '_SELFIE', 'image/jpeg') : selfieSrc;
  var socmedUrl = (socmedSrc && socmedSrc.indexOf('data:') === 0) ? uploadFileToDrive(socmedSrc, id + '_SOCMED', 'image/jpeg') : socmedSrc;

  var now = data.tanggalPengajuan ? new Date(data.tanggalPengajuan) : new Date();

  var lokasiVal = data.lokasi || '';
  if (!lokasiVal && (data.alamatLengkap || data.shareLokasi)) {
    var addr = data.alamatLengkap || '';
    var loc = data.shareLokasi || '';
    if (addr && loc) {
      lokasiVal = addr + ' | Share Lokasi: ' + loc;
    } else {
      lokasiVal = addr || loc;
    }
  }

  sheet.appendRow([
    id,
    data.nama || '',
    data.nik || '',
    data.tanggalLahir || '',
    data.whatsapp || '',
    lokasiVal,
    data.namaKontakDarurat || '',
    data.hubunganKontakDarurat || '',
    data.noKontakDarurat || '',
    data.bankOrEwallet || '',
    data.nomorRekening || '',
    data.namaPemilikRekening || '',
    data.jumlahPinjaman || 0,
    data.tenor || 0,
    data.bunga || 0,
    data.status || 'Pending',
    data.alasanReject || '',
    data.isAutoRejected ? 'YA' : 'TIDAK',
    data.autoRejectReason || '',
    now,
    data.tanggalJatuhTempo || '',
    data.totalDanaDisalurkan || 0,
    ktpUrl,
    selfieUrl,
    socmedUrl,
    data.adminNote || '',
    JSON.stringify(data.statusHistory || [])
  ]);

  return { id: id };
}

function updateStatusData(id, status, alasan) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NASABAH);
  if (!sheet) return null;
  autoFixNasabahHeaders(sheet);

  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (String(r[0]).trim() === String(id).trim()) {
      var rowNum = i + 1;
      
      // Col 16 (P) = Status
      sheet.getRange(rowNum, 16).setValue(status);

      // Col 17 (Q) = AlasanReject
      if (status === 'Rejected' && alasan) {
        sheet.getRange(rowNum, 17).setValue(alasan);
      } else if (status !== 'Rejected') {
        sheet.getRange(rowNum, 17).setValue('');
      }

      if (status === 'Approved') {
        var tglPengajuanVal = r[19] ? new Date(r[19]) : new Date();
        var tenorVal = Number(r[13]) || 14;
        var jatuhTempoVal = new Date(tglPengajuanVal.getTime() + tenorVal * 24 * 60 * 60 * 1000);
        
        // Col 21 (U) = TanggalJatuhTempo
        sheet.getRange(rowNum, 21).setValue(jatuhTempoVal);
        // Col 22 (V) = TotalDanaDisalurkan
        sheet.getRange(rowNum, 22).setValue(Number(r[12]) || 0);
      } else if (status === 'Rejected' || status === 'Pending') {
        sheet.getRange(rowNum, 21).setValue('');
        sheet.getRange(rowNum, 22).setValue(0);
      }

      return getNasabahByIdData(id);
    }
  }
  return null;
}

// ============================================================
//  ADMIN USER FUNCTIONS
// ============================================================

function getAdminUsersData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      result.push({
        email: String(data[i][0]),
        password: '',
        nama: String(data[i][2] || ''),
        role: String(data[i][3] || 'Admin')
      });
    }
  }
  return result;
}

function updateAdminUserData(email, updates) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  var cleanEmail = String(email || '').trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === cleanEmail) {
      if (updates.newEmail && String(updates.newEmail).trim() !== '') {
        sheet.getRange(i + 1, 1).setValue(String(updates.newEmail).trim().toLowerCase());
      }
      if (updates.password) {
        sheet.getRange(i + 1, 2).setValue(updates.password);
      }
      if (updates.nama !== undefined && String(updates.nama).trim() !== '') {
        sheet.getRange(i + 1, 3).setValue(String(updates.nama).trim());
      }
      if (updates.role) {
        sheet.getRange(i + 1, 4).setValue(updates.role);
      }
      return true;
    }
  }
  return false;
}

function addAdminUserData(user) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);
  if (!sheet) return false;
  sheet.appendRow([user.email, user.password, user.nama, user.role]);
  return true;
}

function deleteAdminUserData(email) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ADMIN);
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  var cleanEmail = String(email || '').trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === cleanEmail) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ============================================================
//  ADMIN LOGS FUNCTIONS
// ============================================================

function getAdminLogsData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOGS);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      result.push({
        id: String(data[i][0] || ''),
        timestamp: safeIsoDate(data[i][1]),
        adminEmail: String(data[i][2] || ''),
        adminName: String(data[i][3] || ''),
        actionType: String(data[i][4] || ''),
        description: String(data[i][5] || ''),
        targetId: String(data[i][6] || ''),
        details: String(data[i][7] || '')
      });
    }
  }
  return result.reverse();
}

function addAdminLogData(log) {
  if (!log) return null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOGS);
    sheet.appendRow(['ID', 'Timestamp', 'AdminEmail', 'AdminName', 'ActionType', 'Description', 'TargetId', 'Details']);
  }
  var id = log.id || ('LOG-' + new Date().getTime() + '-' + Math.floor(Math.random() * 1000));
  var timestamp = log.timestamp ? new Date(log.timestamp) : new Date();
  sheet.appendRow([
    id,
    timestamp,
    log.adminEmail || '',
    log.adminName || '',
    log.actionType || '',
    log.description || '',
    log.targetId || '',
    log.details || ''
  ]);
  return { id: id };
}

function clearAdminLogsData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOGS);
  if (sheet) {
    sheet.clear();
    sheet.appendRow(['ID', 'Timestamp', 'AdminEmail', 'AdminName', 'ActionType', 'Description', 'TargetId', 'Details']);
    sheet.getRange('A1:H1').setFontWeight('bold');
  }
  return true;
}
