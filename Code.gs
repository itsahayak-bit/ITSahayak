/**
 * FieldTrack – Google Apps Script Backend v3
 * ============================================
 * Tata Power Odisha – Field Engineer Attendance System
 *
 * Changes in v3:
 * – doGet handles ?action=getStatus to check today's punch state
 * – doPost parses JSON body (base64 selfie, all fields)
 * – empEmail now stored in column F
 */

// ─── CONFIGURATION ──────────────────────────────────────────────
const SHEET_ID        = '1FVuAJYa02M8OzIfG8qSEU60c9Y4i6iuUMiueZuqIbuE';
const DRIVE_FOLDER_ID = '1psGde21FhVLq4TsNXKPgyu0TskQmZ7QW';
const SHEET_NAME      = 'Attendance';
// ────────────────────────────────────────────────────────────────

/**
 * doGet — health check OR status query
 *
 * GET ?action=getStatus&empId=TPO-0042&date=23/05/2026
 * Returns: { punchedIn: true, lastPunchTime: "09:14:32", punchCount: 1, history: [...] }
 */
function doGet(e) {
  const params = e.parameter || {};

  if (params.action === 'getStatus') {
    return handleGetStatus(params);
  }

  // Default: health check
  return jsonResponse({ status: 'FieldTrack API running', version: '3.0' });
}

/**
 * Check if an employee has already punched IN (without a matching OUT) today
 */
function handleGetStatus(params) {
  try {
    const empId = params.empId;
    const date  = params.date;  // DD/MM/YYYY

    if (!empId || !date) {
      return jsonResponse({ error: 'Missing empId or date' });
    }

    const sheet = getOrCreateSheet();
    const data  = sheet.getDataRange().getValues();  // all rows including header

    // Filter rows for this employee on this date (column B = date, column E = empId)
    const todayRows = data.slice(1).filter(row => {
      return String(row[1]).trim() === String(date).trim() &&
             String(row[4]).trim().toLowerCase() === String(empId).trim().toLowerCase();
    });

    // Build history array for the client
    const history = todayRows.map(row => ({
      type: row[3],        // IN or OUT
      time: row[2],        // timeStr
      date: row[1],        // dateStr
      lat:  String(row[7]).substring(0, 8),
      lng:  String(row[8]).substring(0, 8)
    }));

    // Determine punch state: find the LAST punch type for today
    let punchedIn   = false;
    let lastPunchTime = '';
    let punchCount  = todayRows.length;

    if (todayRows.length > 0) {
      const lastRow  = todayRows[todayRows.length - 1];
      const lastType = String(lastRow[3]).trim().toUpperCase();
      punchedIn     = (lastType === 'IN');
      lastPunchTime = lastRow[2]; // timeStr
    }

    return jsonResponse({
      punchedIn,
      lastPunchTime,
      punchCount,
      history
    });

  } catch (err) {
    Logger.log('getStatus error: ' + err.toString());
    return jsonResponse({ error: err.toString(), punchedIn: false });
  }
}

/**
 * doPost — main attendance submission
 * Expects JSON body: { action, type, empId, empName, empEmail, zone, lat, lng, accuracy,
 *                      timestamp, dateStr, timeStr, selfie (base64 dataURL) }
 */
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

    // ── 1. Upload selfie to Drive ──
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

    // ── 2. Maps link ──
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

    // ── 3. Write row ──
    const sheet   = getOrCreateSheet();
    const rowData = [
      new Date(),   // A: Server timestamp
      dateStr,      // B: Date
      timeStr,      // C: Time
      type,         // D: IN / OUT
      empId,        // E: Employee ID
      empName,      // F: Name
      empEmail,     // G: Google Email (NEW)
      zone,         // H: Zone
      lat,          // I: Latitude
      lng,          // J: Longitude
      accuracy,     // K: GPS Accuracy
      mapsLink,     // L: Maps link
      driveLink,    // M: Selfie Drive link
      timestamp     // N: ISO timestamp
    ];

    sheet.appendRow(rowData);
    colorRow(sheet, sheet.getLastRow(), type);

    return jsonResponse({
      success:   true,
      driveLink: driveLink,
      rowId:     sheet.getLastRow()
    });

  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function uploadPhoto(bytes, empId, type, timestamp) {
  const folder   = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const fileName = `${empId}_${type}_${timestamp.replace(/[:.]/g, '-')}.jpg`;
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
      'Server Timestamp', 'Date', 'Time', 'Punch Type',
      'Employee ID', 'Employee Name', 'Google Email', 'Zone / Location',
      'Latitude', 'Longitude', 'GPS Accuracy (m)',
      'Google Maps Link', 'Selfie (Drive Link)', 'ISO Timestamp'
    ];
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0f172a').setFontColor('#00d4ff').setFontWeight('bold').setFontSize(11);
    sheet.setFrozenRows(1);

    const widths = [180,100,100,90,110,160,200,160,120,120,120,200,200,200];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
  }

  return sheet;
}

function colorRow(sheet, rowNum, type) {
  const range = sheet.getRange(rowNum, 1, 1, 14);
  if (type === 'IN') {
    range.setBackground('#f0fdf4');
    sheet.getRange(rowNum, 4).setFontColor('#15803d').setFontWeight('bold');
  } else {
    range.setBackground('#fff1f2');
    sheet.getRange(rowNum, 4).setFontColor('#b91c1c').setFontWeight('bold');
  }
}

/** Run this manually in Apps Script editor to verify config */
function testSetup() {
  try {
    const ss     = SpreadsheetApp.openById(SHEET_ID);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    Logger.log('✅ Sheet: '  + ss.getName());
    Logger.log('✅ Folder: ' + folder.getName());
    Logger.log('✅ Ready to deploy!');
  } catch(e) {
    Logger.log('❌ ' + e.toString());
  }
}

/** Test getStatus manually: change empId and date */
function testGetStatus() {
  const result = handleGetStatus({ empId: 'TPO-0042', date: '23/05/2026' });
  Logger.log(result.getContent());
}
