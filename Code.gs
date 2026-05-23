/**
 * FieldTrack – Google Apps Script Backend v5
 * ============================================
 * Tata Power Odisha – Field Engineer Attendance System
 *
 * v5 changes:
 * – Reads columns by HEADER NAME (immune to column reordering in sheet)
 * – getStatus matches by email + empId with correct dynamic column lookup
 * – doPost writes by header name map (no hardcoded index)
 */

// ─── CONFIGURATION ──────────────────────────────────────────────
const SHEET_ID        = '1FVuAJYa02M8OzIfG8qSEU60c9Y4i6iuUMiueZuqIbuE';
const DRIVE_FOLDER_ID = '1psGde21FhVLq4TsNXKPgyu0TskQmZ7QW';
const SHEET_NAME      = 'Attendance';
// ────────────────────────────────────────────────────────────────

// ── doGet ────────────────────────────────────────────────────────
function doGet(e) {
  const params = e.parameter || {};
  if (params.action === 'getStatus') return handleGetStatus(params);
  return jsonResponse({ status: 'FieldTrack API running', version: '5.0' });
}

/**
 * Build a map of { headerName: columnIndex } from row 1
 * This makes all reads immune to column reordering
 */
function buildHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    if (h) map[String(h).trim()] = i;
  });
  return map;
}

/**
 * GET ?action=getStatus&empId=TPO-0042&empEmail=user@gmail.com&date=23/05/2026
 */
function handleGetStatus(params) {
  try {
    const empId    = (params.empId    || '').trim().toLowerCase();
    const empEmail = (params.empEmail || '').trim().toLowerCase();
    const date     = (params.date     || '').trim();

    if (!empId || !date) {
      return jsonResponse({ found: false, error: 'Missing empId or date' });
    }

    const sheet   = getOrCreateSheet();
    const hMap    = buildHeaderMap(sheet);
    const allData = sheet.getDataRange().getValues();
    const dataRows = allData.slice(1); // skip header

    // Column indices from header map — works regardless of column order
    const iDate     = hMap['Date'];
    const iTime     = hMap['Time'];
    const iPunchType = hMap['Punch Type'];
    const iEmpId    = hMap['Employee ID'];
    const iEmail    = hMap['Google Email'];
    const iLat      = hMap['Latitude'];
    const iLng      = hMap['Longitude'];

    // Filter for this employee on this date
    const todayRows = dataRows.filter(row => {
      const rowDate  = String(row[iDate]  || '').trim();
      const rowId    = String(row[iEmpId] || '').trim().toLowerCase();
      const rowEmail = String(row[iEmail] || '').trim().toLowerCase();

      const dateOk  = rowDate === date;
      const idOk    = rowId   === empId;
      // If email column exists and empEmail provided, both must match
      const emailOk = (iEmail !== undefined && empEmail)
                      ? rowEmail === empEmail
                      : true;
      return dateOk && idOk && emailOk;
    });

    if (todayRows.length === 0) {
      return jsonResponse({ found: false, lastPunchType: null, punchCount: 0, history: [] });
    }

    const lastRow       = todayRows[todayRows.length - 1];
    const lastPunchType = String(lastRow[iPunchType] || '').trim().toUpperCase();
    const lastPunchTime = String(lastRow[iTime]      || '').trim();

    // Build history newest-first
    const history = todayRows.map(row => ({
      type: String(row[iPunchType] || '').trim(),
      time: String(row[iTime]      || '').trim(),
      date: String(row[iDate]      || '').trim(),
      lat:  iLat !== undefined ? parseFloat(row[iLat] || 0).toFixed(5) : '–',
      lng:  iLng !== undefined ? parseFloat(row[iLng] || 0).toFixed(5) : '–'
    })).reverse();

    return jsonResponse({
      found:         true,
      lastPunchType,
      lastPunchTime,
      punchCount:    todayRows.length,
      history
    });

  } catch (err) {
    Logger.log('getStatus error: ' + err.toString());
    return jsonResponse({ found: false, error: err.toString() });
  }
}

// ── doPost ───────────────────────────────────────────────────────
function doPost(e) {
  try {
    const payload   = JSON.parse(e.postData.contents);
    const type      = payload.type;
    const empId     = payload.empId;
    const empName   = payload.empName;
    const empEmail  = payload.empEmail  || '';
    const zone      = payload.zone;
    const lat       = parseFloat(payload.lat);
    const lng       = parseFloat(payload.lng);
    const accuracy  = parseFloat(payload.accuracy);
    const timestamp = payload.timestamp;
    const dateStr   = payload.dateStr;
    const timeStr   = payload.timeStr;
    const selfieB64 = payload.selfie || '';

    // 1. Upload selfie
    let driveLink = '';
    try {
      if (selfieB64 && selfieB64.length > 100) {
        const base64Data = selfieB64.includes(',') ? selfieB64.split(',')[1] : selfieB64;
        const bytes      = Utilities.base64Decode(base64Data);
        driveLink        = uploadPhoto(bytes, empId, type, timestamp);
      } else {
        driveLink = 'No selfie received';
      }
    } catch (photoErr) {
      Logger.log('Photo upload error: ' + photoErr.toString());
      driveLink = 'Upload failed – ' + photoErr.message;
    }

    const mapsLink = 'https://www.google.com/maps?q=' + lat + ',' + lng;

    // 2. Write row using header map — matches whatever columns exist in sheet
    const sheet = getOrCreateSheet();
    const hMap  = buildHeaderMap(sheet);

    // Build a row array sized to existing columns
    const totalCols = sheet.getLastColumn();
    const rowArr    = new Array(totalCols).fill('');

    function set(headerName, value) {
      if (hMap[headerName] !== undefined) rowArr[hMap[headerName]] = value;
    }

    set('Server Timestamp', new Date());
    set('Date',             dateStr);
    set('Time',             timeStr);
    set('Punch Type',       type);
    set('Employee ID',      empId);
    set('Employee Name',    empName);
    set('Google Email',     empEmail);
    set('Zone / Location',  zone);
    set('Latitude',         lat);
    set('Longitude',        lng);
    set('GPS Accuracy (m)', accuracy);
    set('Google Maps Link', mapsLink);
    set('Selfie (Drive Link)', driveLink);
    set('ISO Timestamp',    timestamp);

    sheet.appendRow(rowArr);
    colorRow(sheet, sheet.getLastRow(), type, totalCols);

    return jsonResponse({ success: true, driveLink: driveLink, rowId: sheet.getLastRow() });

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function uploadPhoto(bytes, empId, type, timestamp) {
  const folder   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const fileName = empId + '_' + type + '_' + timestamp.replace(/[:.]/g,'-') + '.jpg';
  const blob     = Utilities.newBlob(bytes, 'image/jpeg', fileName);
  const file     = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const headers = [
      'Server Timestamp','Date','Time','Punch Type',
      'Employee ID','Employee Name','Google Email','Zone / Location',
      'Latitude','Longitude','GPS Accuracy (m)',
      'Google Maps Link','Selfie (Drive Link)','ISO Timestamp'
    ];
    sheet.appendRow(headers);
    const hr = sheet.getRange(1,1,1,headers.length);
    hr.setBackground('#0f172a').setFontColor('#00d4ff').setFontWeight('bold').setFontSize(11);
    sheet.setFrozenRows(1);
    [180,100,100,90,110,160,200,160,120,120,120,200,200,200]
      .forEach((w,i) => sheet.setColumnWidth(i+1, w));
  }
  return sheet;
}

function colorRow(sheet, rowNum, type, totalCols) {
  const cols = totalCols || 14;
  const range = sheet.getRange(rowNum, 1, 1, cols);
  const hMap  = buildHeaderMap(sheet);
  if (type === 'IN') {
    range.setBackground('#f0fdf4');
    if (hMap['Punch Type'] !== undefined)
      sheet.getRange(rowNum, hMap['Punch Type']+1).setFontColor('#15803d').setFontWeight('bold');
  } else {
    range.setBackground('#fff1f2');
    if (hMap['Punch Type'] !== undefined)
      sheet.getRange(rowNum, hMap['Punch Type']+1).setFontColor('#b91c1c').setFontWeight('bold');
  }
}

/** Verify config — run manually in Apps Script editor */
function testSetup() {
  try {
    const ss     = SpreadsheetApp.openById(SHEET_ID);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const sheet  = getOrCreateSheet();
    const hMap   = buildHeaderMap(sheet);
    Logger.log('✅ Sheet: '   + ss.getName());
    Logger.log('✅ Folder: '  + folder.getName());
    Logger.log('✅ Headers: ' + JSON.stringify(hMap));
  } catch(e) { Logger.log('❌ ' + e.toString()); }
}

function testGetStatus() {
  const r = handleGetStatus({ empId:'TPO-0042', empEmail:'test@gmail.com', date:'23/05/2026' });
  Logger.log(r.getContent());
}
