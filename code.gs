// ============================================================
// HACKERS CUP — Google Apps Script Backend
// Spreadsheet: https://docs.google.com/spreadsheets/d/1jMtL6JsfOuL9C3ZjBlhJFnZ01DkAxBrBpYP604S7ua4/edit?gid=1849833306#gid=1849833306
// Deploy as: Web App -> Execute as: Me -> Who has access: Anyone
// ============================================================

const SPREADSHEET_ID = '1jMtL6JsfOuL9C3ZjBlhJFnZ01DkAxBrBpYP604S7ua4';
const SCORE_COLUMN = 9; // Column I (1-indexed) = SCORE
const POINTS_COLUMN = 13; // Column M (1-indexed) = Stableford points
const TOTAL_CELL_ROW = 2, TOTAL_CELL_COL = 17; // Q2 = SUM(M:M) running total

// Handicap: primary source is Players!C:D (name -> handicap) via the same VLOOKUP the sheet's
// own K/L/M formulas use ($C2 against Players!$C:$D) — matching that exactly guarantees our
// number always agrees with the sheet's own computed points. Falls back to column R (HANDICAP)
// on the player's own tab, in case Players tab lookup misses (name mismatch, sheet reorganized).
function lookupHandicap(ss, playerSheet) {
  try {
    const name = String(playerSheet.getRange(2, 3).getValue() || playerSheet.getName()).trim().toLowerCase();
    const players = ss.getSheetByName('Players');
    if (players) {
      const rows = players.getRange(1, 3, players.getLastRow(), 2).getValues(); // C:D
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim().toLowerCase() === name && rows[i][1] !== '' && rows[i][1] !== null) {
          return Number(rows[i][1]);
        }
      }
    }
  } catch (err) {}
  try {
    const r2 = playerSheet.getRange(2, 18).getValue(); // Column R, row 2
    if (r2 !== '' && r2 !== null && r2 !== undefined && !isNaN(Number(r2))) return Number(r2);
  } catch (err) {}
  return null;
}

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

      // Q2 = row 2 (data index 1), column Q (index 16) — the player's total points formula
      const q2Raw = data.length > 1 ? data[1][16] : null;
      const q2Total = (q2Raw === '' || q2Raw === null || q2Raw === undefined) ? null : Number(q2Raw);
      const handicap = lookupHandicap(ss, sheet);

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
          index1: row[6], // Column G — stroke index (first allocation)
          index2: row[7], // Column H — stroke index (second allocation)
          front: String(row[3]).toUpperCase() === 'FRONT', // Column D
          currentScore: row[8], // Column I
          points: pointsValue, // Column M
          sheetPoints: pointsValue,
          currentPoints: pointsValue,
          pointsFromSheet: pointsValue,
          frontPoints,
          backPoints,
          totalPoints: frontPoints + backPoints
        });
      }

      output.setContent(JSON.stringify({ success: true, holes, q2Total, handicap, playerHandicap: handicap }));
      return output;
    }

    if (action === 'saveScore') {
      const sheetName = e.parameter.sheet;
      const rowIndex = parseInt(e.parameter.rowIndex, 10);
      const score = e.parameter.score;

      if (!sheetName) throw new Error('Missing sheet param');
      if (isNaN(rowIndex)) throw new Error('Invalid rowIndex');

      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) throw new Error('Sheet not found: ' + sheetName);

      const cellRow = rowIndex + 1; // convert 0-based data index to 1-based sheet row
      if (score === '' || score === null || score === undefined) {
        sheet.getRange(cellRow, SCORE_COLUMN).clearContent();
      } else {
        sheet.getRange(cellRow, SCORE_COLUMN).setValue(Number(score));
      }

      // Force recalculation, then read back the authoritative points for this hole and the
      // running total, so the client can update instantly from this single round trip instead
      // of polling getHoles afterwards.
      SpreadsheetApp.flush();
      const pointsRaw = sheet.getRange(cellRow, POINTS_COLUMN).getValue();
      const points = (pointsRaw === '' || pointsRaw === null || pointsRaw === undefined) ? null : Number(pointsRaw);
      const totalRaw = sheet.getRange(TOTAL_CELL_ROW, TOTAL_CELL_COL).getValue();
      const q2Total = (totalRaw === '' || totalRaw === null || totalRaw === undefined) ? null : Number(totalRaw);
      const savedScoreRaw = sheet.getRange(cellRow, SCORE_COLUMN).getValue();
      const savedScore = (savedScoreRaw === '' || savedScoreRaw === null || savedScoreRaw === undefined) ? null : Number(savedScoreRaw);
      const handicap = lookupHandicap(ss, sheet);

      output.setContent(JSON.stringify({ success: true, rowIndex, points, q2Total, handicap, savedScore }));
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
