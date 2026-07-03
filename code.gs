// ============================================================
// HACKERS CUP — Google Apps Script Backend
// Spreadsheet: https://docs.google.com/spreadsheets/d/1jMtL6JsfOuL9C3ZjBlhJFnZ01DkAxBrBpYP604S7ua4/edit?gid=1849833306#gid=1849833306
// Deploy as: Web App -> Execute as: Me -> Who has access: Anyone
// ============================================================

const SPREADSHEET_ID = '1jMtL6JsfOuL9C3ZjBlhJFnZ01DkAxBrBpYP604S7ua4';
const SCORE_COLUMN = 9; // Column I (1-indexed) = SCORE
const POINTS_COLUMN = 13; // Column M (1-indexed) = Stableford points
const TOTAL_CELL_ROW = 2, TOTAL_CELL_COL = 17; // Q2 = SUM(M:M) running total
// Leaderboard tabs, identified by GID (not name) to match what the frontend already used —
// GIDs survive sheet renames, so this stays correct even if someone relabels the tab.
const LB_GID = 1551828927;      // "Sat Leaderboard" tab
const LB_HCAP_GID = 1849833306; // "Players" tab (name + handicap)

function getSheetByGid(ss, gid) {
  return ss.getSheets().find(function (s) { return s.getSheetId() === gid; }) || null;
}

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
      output.setContent(JSON.stringify(getHolesForSheet(ss, sheetName)));
      return output;
    }

    // Batched read for a whole group (up to 4 players) in one Apps Script round trip, instead
    // of one getHoles call per player serialized through the client's request queue. Sheet
    // names are joined with '|' (client encodeURIComponent's the whole joined string).
    if (action === 'getHolesBatch') {
      const sheetsParam = e.parameter.sheets;
      if (!sheetsParam) throw new Error('Missing sheets param');
      const sheetNames = sheetsParam.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
      const results = {};
      sheetNames.forEach(function (sheetName) {
        try {
          results[sheetName] = getHolesForSheet(ss, sheetName);
        } catch (err) {
          results[sheetName] = { success: false, error: err.message };
        }
      });
      output.setContent(JSON.stringify({ success: true, results }));
      return output;
    }

    if (action === 'getLeaderboard') {
      const lbSheet = getSheetByGid(ss, LB_GID);
      if (!lbSheet) throw new Error('Leaderboard sheet not found (gid ' + LB_GID + ')');
      const lbData = lbSheet.getDataRange().getValues();

      const hcapMap = {};
      const hcapSheet = getSheetByGid(ss, LB_HCAP_GID);
      if (hcapSheet) {
        hcapSheet.getDataRange().getValues().forEach(function (row) {
          const name = row[0];
          if (name) hcapMap[name] = row[1];
        });
      }

      // Columns match what the frontend previously parsed from gviz: B=Rank C=Name D=Points
      // E=Front F=Back G=Through (0-indexed: 1,2,3,4,5,6).
      const rows = [];
      lbData.forEach(function (row) {
        const rank = row[1];
        if (rank === '' || rank === null || rank === undefined) return;
        const rankNum = parseInt(rank, 10);
        if (!rankNum) return;
        const name = row[2] || '';
        rows.push({
          rank: rankNum,
          name,
          pts: row[3] ?? '',
          front: row[4] ?? '',
          back: row[5] ?? '',
          through: row[6] ?? '',
          handicap: hcapMap[name] ?? null
        });
      });
      rows.sort(function (a, b) { return a.rank - b.rank; });

      output.setContent(JSON.stringify({ success: true, rows }));
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

      // LockService.getScriptLock() is script-wide (not per-sheet), so it briefly serializes
      // ALL saveScore calls project-wide, not just ones touching the same row. Writes are
      // single-cell and sub-second, so this is cheap insurance against two devices racing on
      // the same player's sheet (e.g. a shared device, or a duplicate login), not a bottleneck.
      const lock = LockService.getScriptLock();
      let gotLock = false;
      let points, q2Total, savedScore, handicap;
      try {
        gotLock = lock.tryLock(10000);
        if (!gotLock) throw new Error('Server busy — please retry');

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
        points = (pointsRaw === '' || pointsRaw === null || pointsRaw === undefined) ? null : Number(pointsRaw);
        const totalRaw = sheet.getRange(TOTAL_CELL_ROW, TOTAL_CELL_COL).getValue();
        q2Total = (totalRaw === '' || totalRaw === null || totalRaw === undefined) ? null : Number(totalRaw);
        const savedScoreRaw = sheet.getRange(cellRow, SCORE_COLUMN).getValue();
        savedScore = (savedScoreRaw === '' || savedScoreRaw === null || savedScoreRaw === undefined) ? null : Number(savedScoreRaw);
        handicap = lookupHandicap(ss, sheet);
      } finally {
        if (gotLock) lock.releaseLock();
      }

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

// Shared by getHoles (single sheet) and getHolesBatch (multiple sheets in one call).
function getHolesForSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);

  const data = sheet.getDataRange().getValues();
  const headerRow = findHeaderRow(data);
  if (headerRow === -1) throw new Error('Could not find header row containing HOLE');

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

  return { success: true, holes, q2Total, handicap, playerHandicap: handicap };
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

// ── KEEP-ALIVE ────────────────────────────────────────────────
// A Web App executed as "Me" can take 1-3s to cold-start after the runtime has been idle,
// which shows up as the first request of the day (or after a lull) feeling slow. keepWarm()
// is a trivial call that keeps the runtime warm; installKeepWarmTrigger() wires it to run on
// a timer automatically.
//
// ONE-TIME SETUP (do this once from the Apps Script editor, not from doGet):
//   1. Select "installKeepWarmTrigger" in the function dropdown at the top of the editor.
//   2. Click Run. Grant permissions if prompted.
// That's it — the trigger persists across future deployments of this script. Re-running
// installKeepWarmTrigger() is safe; it clears any existing keepWarm trigger before creating
// a new one, so it won't pile up duplicates.
function keepWarm() {
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheets();
}
function installKeepWarmTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'keepWarm') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(10).create();
}
