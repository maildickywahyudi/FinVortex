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

// ============================================================
//  KONFIGURASI
// ============================================================

var API_KEY = 'mySecretKey123'; // Ganti sesuai .env NEXT_PUBLIC_API_KEY
var SHEET_NASABAH = 'Nasabah';
var SHEET_CONFIG = 'Config';
var SHEET_ADMIN = 'Admin';
var SHEET_COUNTER = 'Counter';
var SHEET_LOGS = 'Activity Logs';
var DRIVE_FOLDER_NAME = 'LMS_Uploads';

// ============================================================
//  CORS HEADERS
// ============================================================

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

// ============================================================
//  HANDLER UTAMA
// ============================================================

function doGet(e) {
  var headers = getCorsHeaders();
  var action = (e.parameter.action || '').toLowerCase();
  var apiKey = e.parameter.apiKey || '';

  if (apiKey !== API_KEY) {
    return jsonOutput({ success: false, message: 'Unauthorized: Invalid API Key' });
  }

  try {
    switch (action) {
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
        return jsonOutput({ success: false, message: 'Unknown action: ' + action });
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

// OPTIONS preflight untuk CORS
function doOptions() {
  var headers = getCorsHeaders();
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
//  SETUP SHEETS — Jalankan SEKALI
// ============================================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Sheet Nasabah
  var nasabahSheet = ss.getSheetByName(SHEET_NASABAH);
  if (!nasabahSheet) {
    nasabahSheet = ss.insertSheet(SHEET_NASABAH);
  }
  if (nasabahSheet.getLastRow() === 0) {
    nasabahSheet.appendRow([
      'ID', 'Nama', 'TanggalLahir', 'WhatsApp', 'Lokasi',
      'JumlahPinjaman', 'Tenor', 'Bunga', 'Status', 'AlasanReject',
      'TanggalPengajuan', 'TanggalJatuhTempo', 'TotalDanaDisalurkan',
      'KtpUrl', 'SelfieUrl', 'SocmedUrl', 'AdminNote'
    ]);
    nasabahSheet.getRange('A1:Q1').setFontWeight('bold');
  }

  // Sheet Config
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

  // Sheet Admin
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

  // Sheet Counter
  var counterSheet = ss.getSheetByName(SHEET_COUNTER);
  if (!counterSheet) {
    counterSheet = ss.insertSheet(SHEET_COUNTER);
  }
  if (counterSheet.getLastRow() === 0) {
    counterSheet.appendRow(['Tanggal', 'Counter']);
    counterSheet.getRange('A1:B1').setFontWeight('bold');
  }

  // Sheet Activity Logs
  var logsSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(SHEET_LOGS);
  }
  if (logsSheet.getLastRow() === 0) {
    logsSheet.appendRow(['ID', 'Timestamp', 'AdminEmail', 'AdminName', 'ActionType', 'Description', 'TargetId', 'Details']);
    logsSheet.getRange('A1:H1').setFontWeight('bold');
  }

  // Buat folder Drive untuk upload
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (!folders.hasNext()) {
    DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Setup selesai! Semua sheet telah dibuat.', 'Sukses');
}

// ============================================================
//  GENERATE ID PENGAJUAN
//  Format: LN-YYYYMMDD-XXXX (counter harian, reset tiap hari)
// ============================================================

function generateIdPengajuan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var counterSheet = ss.getSheetByName(SHEET_COUNTER);
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  var lastRow = counterSheet.getLastRow();

  if (lastRow > 1) {
    var lastDate = counterSheet.getRange(lastRow, 1).getValue();
    var lastDateStr = Utilities.formatDate(new Date(lastDate), Session.getScriptTimeZone(), 'yyyyMMdd');
    if (lastDateStr === today) {
      var currentCounter = counterSheet.getRange(lastRow, 2).getValue();
      var newCounter = currentCounter + 1;
      counterSheet.getRange(lastRow, 2).setValue(newCounter);
      return 'LN-' + today + '-' + String(newCounter).padStart(4, '0');
    }
  }

  // Tanggal baru atau counter pertama
  counterSheet.appendRow([new Date(), 1]);
  return 'LN-' + today + '-0001';
}

// ============================================================
//  UPLOAD FILE KE DRIVE
//  Nama file: [ID]_KTP, [ID]_SELFIE, [ID]_SOCMED
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
//  CRUD FUNCTIONS
// ============================================================

function getNasabahData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NASABAH);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      var headerName = headers[j];
      var val = data[i][j];
      row[headerName] = val;
      
      var camelKey = headerName.charAt(0).toLowerCase() + headerName.slice(1);
      row[camelKey] = val;
    }
    
    var nasabah = {
      id: String(row.id || row.ID || ''),
      nama: String(row.nama || row.Nama || ''),
      nik: String(row.nik || row.NIK || ''),
      tanggalLahir: String(row.tanggalLahir || row.TanggalLahir || ''),
      whatsapp: String(row.whatsapp || row.WhatsApp || ''),
      lokasi: String(row.lokasi || row.Lokasi || ''),
      jumlahPinjaman: Number(row.jumlahPinjaman || row.JumlahPinjaman || 0),
      tenor: Number(row.tenor || row.Tenor || 0),
      bunga: Number(row.bunga || row.Bunga || 0),
      status: String(row.status || row.Status || 'Pending'),
      alasanReject: String(row.alasanReject || row.AlasanReject || ''),
      isAutoRejected: row.isAutoRejected === true || row.IsAutoRejected === 'YA' || row.IsAutoRejected === true,
      autoRejectReason: String(row.autoRejectReason || row.AutoRejectReason || ''),
      tanggalPengajuan: row.tanggalPengajuan || row.TanggalPengajuan ? new Date(row.tanggalPengajuan || row.TanggalPengajuan).toISOString() : new Date().toISOString(),
      tanggalJatuhTempo: row.tanggalJatuhTempo || row.TanggalJatuhTempo ? new Date(row.tanggalJatuhTempo || row.TanggalJatuhTempo).toISOString() : '',
      totalDanaDisalurkan: Number(row.totalDanaDisalurkan || row.TotalDanaDisalurkan || 0),
      ktpUrl: String(row.ktpUrl || row.KtpUrl || ''),
      selfieUrl: String(row.selfieUrl || row.SelfieUrl || ''),
      socmedUrl: String(row.socmedUrl || row.SocmedUrl || ''),
      namaKontakDarurat: String(row.namaKontakDarurat || row.NamaKontakDarurat || ''),
      hubunganKontakDarurat: String(row.hubunganKontakDarurat || row.HubunganKontakDarurat || ''),
      noKontakDarurat: String(row.noKontakDarurat || row.NoKontakDarurat || ''),
      bankOrEwallet: String(row.bankOrEwallet || row.BankOrEwallet || ''),
      nomorRekening: String(row.nomorRekening || row.NomorRekening || ''),
      namaPemilikRekening: String(row.namaPemilikRekening || row.NamaPemilikRekening || ''),
      adminNote: String(row.adminNote || row.AdminNote || ''),
      statusHistory: row.statusHistory || row.StatusHistory || []
    };
    result.push(nasabah);
  }
  return result;
}

function getNasabahByIdData(id) {
  var allData = getNasabahData();
  for (var i = 0; i < allData.length; i++) {
    if (allData[i].id === id || allData[i].ID === id) return allData[i];
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
        password: '' // jangan kembalikan password
      };
    }
  }
  return null;
}

function submitPengajuanData(data) {
  if (!data) return { id: '' };
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NASABAH);
  var id = data.id || generateIdPengajuan();

  // Upload file jika ada (base64)
  var ktpSrc = data.ktpUrl || data.ktpBase64 || '';
  var selfieSrc = data.selfieUrl || data.selfieBase64 || '';
  var socmedSrc = data.socmedUrl || data.socmedBase64 || '';

  var ktpUrl = (ktpSrc && ktpSrc.indexOf('data:') === 0) ? uploadFileToDrive(ktpSrc, id + '_KTP', 'image/jpeg') : ktpSrc;
  var selfieUrl = (selfieSrc && selfieSrc.indexOf('data:') === 0) ? uploadFileToDrive(selfieSrc, id + '_SELFIE', 'image/jpeg') : selfieSrc;
  var socmedUrl = (socmedSrc && socmedSrc.indexOf('data:') === 0) ? uploadFileToDrive(socmedSrc, id + '_SOCMED', 'image/jpeg') : socmedSrc;

  var now = data.tanggalPengajuan ? new Date(data.tanggalPengajuan) : new Date();

  sheet.appendRow([
    id,
    data.nama || '',
    data.nik || '',
    data.tanggalLahir || '',
    data.whatsapp || '',
    data.lokasi || '',
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
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.getRange(i + 1, 9).setValue(status); // Status

      if (status === 'Rejected' && alasan) {
        sheet.getRange(i + 1, 10).setValue(alasan); // AlasanReject
      } else {
        sheet.getRange(i + 1, 10).clearContent();
      }

      if (status === 'Approved') {
        var tanggalPengajuan = new Date(data[i][10]);
        var tenor = data[i][6];
        var jatuhTempo = new Date(tanggalPengajuan.getTime() + tenor * 24 * 60 * 60 * 1000);
        sheet.getRange(i + 1, 12).setValue(jatuhTempo); // TanggalJatuhTempo
        sheet.getRange(i + 1, 13).setValue(data[i][5]); // TotalDanaDisalurkan
      } else {
        sheet.getRange(i + 1, 12).clearContent();
        sheet.getRange(i + 1, 13).clearContent();
      }

      // Return updated row
      var updatedRow = sheet.getRange(i + 1, 1, 1, 17).getValues()[0];
      var headers = data[0];
      var result = {};
      for (var j = 0; j < headers.length; j++) {
        result[headers[j]] = updatedRow[j];
      }
      if (result.TanggalPengajuan) {
        result.TanggalPengajuan = new Date(result.TanggalPengajuan).toISOString();
      }
      if (result.TanggalJatuhTempo) {
        result.TanggalJatuhTempo = new Date(result.TanggalJatuhTempo).toISOString();
      }
      return result;
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
        password: '', // disembunyikan untuk keamanan
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
        sheet.getRange(i + 1, 1).setValue(String(updates.newEmail).trim().toLowerCase()); // Email (col A)
      }
      if (updates.password) {
        sheet.getRange(i + 1, 2).setValue(updates.password); // Password (col B)
      }
      if (updates.nama !== undefined && String(updates.nama).trim() !== '') {
        sheet.getRange(i + 1, 3).setValue(String(updates.nama).trim()); // Nama (col C)
      }
      if (updates.role) {
        sheet.getRange(i + 1, 4).setValue(updates.role); // Role (col D)
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
        timestamp: data[i][1] ? new Date(data[i][1]).toISOString() : new Date().toISOString(),
        adminEmail: String(data[i][2] || ''),
        adminName: String(data[i][3] || ''),
        actionType: String(data[i][4] || ''),
        description: String(data[i][5] || ''),
        targetId: String(data[i][6] || ''),
        details: String(data[i][7] || '')
      });
    }
  }
  return result.reverse(); // Urutan terbaru di atas
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

