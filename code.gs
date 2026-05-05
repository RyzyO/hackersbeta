// ============================================================
// HACKERS CUP — Google Apps Script Backend
// Spreadsheet: https://docs.google.com/spreadsheets/d/1jMtL6JsfOuL9C3ZjBlhJFnZ01DkAxBrBpYP604S7ua4/edit?gid=1849833306#gid=1849833306
// Deploy as: Web App -> Execute as: Me -> Who has access: Anyone
// ============================================================

const SPREADSHEET_ID = '1jMtL6JsfOuL9C3ZjBlhJFnZ01DkAxBrBpYP604S7ua4';
const SCORE_COLUMN = 9; // Column I (1-indexed) = SCORE
const POINTS_COLUMN = 13; // Column M (1-indexed) = Stableford points

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action) : '';

    if (action === 'getSheetNames') {
      const sheets = ss.getSheets().map(sheet => sheet.getName());
      output.setContent(JSON.stringify({ success: true, sheets }));
      return output;
    }

    if (action === 'getHoles') {
      const sheetName = e.parameter.sheet;
      if (!sheetName) throw new Error('Missing sheet param');

      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error('Sheet not found: ' + sheetName);

      const data = sheet.getDataRange().getValues();
      const headerRow = findHeaderRow(data);

      if (headerRow === -1) {
        throw new Error('Could not find header row containing HOLE');
      }

      const holes = [];
      let frontPoints = 0;
      let backPoints = 0;

      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row[4] && row[4] !== 0) continue;

        const holeNumber = row[4];
        const pointsValue = row[12];
        const pointsNumber = pointsValue === '' || pointsValue === null || pointsValue === undefined
          ? null
          : Number(pointsValue);

        if (!isNaN(pointsNumber)) {
          if (String(row[3]).toUpperCase() === 'FRONT') frontPoints += pointsNumber;
          else backPoints += pointsNumber;
        }

        holes.push({
          rowIndex: i, // 0-based index into the sheet data array
          hole: holeNumber, // Column E
          par: row[5], // Column F
          front: String(row[3]).toUpperCase() === 'FRONT', // Column D
          currentScore: row[8], // Column I
          points: pointsValue, // Column M
          sheetPoints: pointsValue, // alias for the frontend
          currentPoints: pointsValue, // alias for the frontend
          pointsFromSheet: pointsValue, // alias for the frontend
          frontPoints,
          backPoints,
          totalPoints: frontPoints + backPoints
        });
      }

      output.setContent(JSON.stringify({ success: true, holes }));
      return output;
    }

    output.setContent(JSON.stringify({ success: false, error: 'Unknown action' }));
    return output;
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
    return output;
  }
}

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing POST body');
    }

    const payload = JSON.parse(e.postData.contents);
    const sheetName = payload.sheetName;
    const scores = payload.scores;

    if (!sheetName || !Array.isArray(scores)) {
      throw new Error('Missing sheetName or scores');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);

    let written = 0;

    scores.forEach(({ rowIndex, score }) => {
      if (score === null || score === undefined || score === '') return;

      const cellRow = Number(rowIndex) + 1; // convert 0-based data index to 1-based sheet row
      if (isNaN(cellRow) || cellRow < 1) return;

      sheet.getRange(cellRow, SCORE_COLUMN).setValue(Number(score));
      written++;
    });

    logWrite(payload);

    output.setContent(JSON.stringify({ success: true, written }));
    return output;
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message }));
    return output;
  }
}

function findHeaderRow(data) {
  for (let i = 0; i < data.length; i++) {
    const value = data[i][4];
    if (String(value).toUpperCase() === 'HOLE') {
      return i;
    }
  }
  return -1;
}

// Optional audit log to a hidden sheet
function logWrite(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = ss.getSheetByName('_ScoreLog');

    if (!logSheet) {
      logSheet = ss.insertSheet('_ScoreLog');
      logSheet.appendRow(['Timestamp', 'UID', 'DisplayName', 'Sheet', 'Scores']);
      logSheet.hideSheet();
    }

    logSheet.appendRow([
      new Date().toISOString(),
      payload.firebaseUid || '',
      payload.displayName || '',
      payload.sheetName || '',
      JSON.stringify(payload.scores || [])
    ]);
  } catch (e) {
    // Non-fatal: logging should never break score writes
  }
}
