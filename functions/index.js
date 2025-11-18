/* eslint-disable */
const { onDocumentWritten } = require("firebase-functions/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const COMP_ID = "hackersCup26";

// Utility
function calculateStableford(par, strokes) {
  const diff = par - strokes;
  if (diff >= 2) return 4;
  if (diff === 1) return 3;
  if (diff === 0) return 2;
  if (diff === -1) return 1;
  return 0;
}

/** =======================
 *   FRIDAY LEADERBOARD
 *  ======================= */
exports.processFridayLeaderboard = onDocumentWritten(
  `competitions/${COMP_ID}/rounds/friday/scorecards/{playerId}`,
  async () => {
    const snap = await db
      .collection(`competitions/${COMP_ID}/rounds/friday/scorecards`)
      .get();

    let leaderboard = [];

    snap.forEach((docSnap) => {
      const id = docSnap.id;
      const d = docSnap.data();

      let total = 0;
      for (let i = 1; i <= 18; i++) {
        const strokes = d[`hole${i}`];
        if (!strokes) continue;
        total += calculateStableford(4, strokes);
      }

      leaderboard.push({
        id,
        name: d.playerName || id,
        stablefordTotal: total,
      });
    });

    leaderboard.sort((a, b) => b.stablefordTotal - a.stablefordTotal);

    const lbRef = db.doc(
      `competitions/${COMP_ID}/rounds/friday/leaderboards/main`
    );

    await lbRef.set({
      updatedAt: FieldValue.serverTimestamp(),
      totalPlayers: leaderboard.length,
    });

    const entriesRef = lbRef.collection("entries");

    const old = await entriesRef.get();
    const batch = db.batch();
    old.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const batch2 = db.batch();
    leaderboard.forEach((row, idx) => {
      batch2.set(entriesRef.doc(row.id), { ...row, rank: idx + 1 });
    });
    await batch2.commit();

    return true;
  }
);

/** =======================
 *   SATURDAY LEADERBOARD
 *  ======================= */
exports.processSaturdayLeaderboard = onDocumentWritten(
  `competitions/${COMP_ID}/rounds/saturday/scorecards/{playerId}`,
  async () => {
    const snap = await db
      .collection(`competitions/${COMP_ID}/rounds/saturday/scorecards`)
      .get();

    let leaderboard = [];

    snap.forEach((docSnap) => {
      const id = docSnap.id;
      const d = docSnap.data();

      let total = 0;
      for (let i = 1; i <= 18; i++) {
        const strokes = d[`hole${i}`];
        if (!strokes) continue;
        total += calculateStableford(4, strokes);
      }

      leaderboard.push({
        id,
        name: d.playerName || id,
        stablefordTotal: total,
      });
    });

    leaderboard.sort((a, b) => b.stablefordTotal - a.stablefordTotal);

    const lbRef = db.doc(
      `competitions/${COMP_ID}/rounds/saturday/leaderboards/main`
    );

    await lbRef.set({
      updatedAt: FieldValue.serverTimestamp(),
      totalPlayers: leaderboard.length,
    });

    const entriesRef = lbRef.collection("entries");

    const old = await entriesRef.get();
    const batch = db.batch();
    old.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const batch2 = db.batch();
    leaderboard.forEach((row, idx) => {
      batch2.set(entriesRef.doc(row.id), { ...row, rank: idx + 1 });
    });
    await batch2.commit();

    return true;
  }
);

/** =======================
 *   SUNDAY LEADERBOARD
 *  ======================= */
exports.processSundayLeaderboard = onDocumentWritten(
  `competitions/${COMP_ID}/rounds/sunday/scorecards/{teamId}`,
  async () => {
    const snap = await db
      .collection(`competitions/${COMP_ID}/rounds/sunday/scorecards`)
      .get();

    let leaderboard = [];

    snap.forEach((docSnap) => {
      const id = docSnap.id;
      const d = docSnap.data();

      let gross = 0;
      for (let i = 1; i <= 18; i++) {
        const strokes = d[`hole${i}`];
        if (!strokes) continue;
        gross += strokes;
      }

      const handicap = d.handicap || d.teamHandicap || 0;
      const net = gross - handicap;

      leaderboard.push({
        id,
        teamName: d.teamName || id,
        grossTotal: gross,
        handicap: handicap,
        netTotal: net,
      });
    });

    leaderboard.sort((a, b) => a.netTotal - b.netTotal);

    const lbRef = db.doc(
      `competitions/${COMP_ID}/rounds/sunday/leaderboards/main`
    );

    await lbRef.set({
      updatedAt: FieldValue.serverTimestamp(),
      totalTeams: leaderboard.length,
    });

    const entriesRef = lbRef.collection("entries");

    const old = await entriesRef.get();
    const batch = db.batch();
    old.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    const batch2 = db.batch();
    leaderboard.forEach((row, idx) => {
      batch2.set(entriesRef.doc(row.id), { ...row, rank: idx + 1 });
    });
    await batch2.commit();

    return true;
  }
);
