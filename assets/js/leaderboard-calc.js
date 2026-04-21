/**
 * Client-side leaderboard calculation utility
 * Replaces expensive Cloud Functions with free client-side computation
 */

// Stableford scoring system (par 4)
function calculateStableford(par, strokes) {
  const diff = par - strokes;
  if (diff >= 2) return 4;
  if (diff === 1) return 3;
  if (diff === 0) return 2;
  if (diff === -1) return 1;
  return 0;
}

/**
 * Calculate Friday/Saturday leaderboard from scorecards (Stableford)
 * @param {Array} scorecards - Array of scorecard documents
 * @returns {Array} Sorted leaderboard entries
 */
export function calculateStandardLeaderboard(scorecards) {
  const leaderboard = [];

  scorecards.forEach((doc) => {
    const d = doc.data ? doc.data() : doc;
    let total = 0;

    for (let i = 1; i <= 18; i++) {
      const strokes = d[`hole${i}`];
      if (!strokes) continue;
      total += calculateStableford(4, strokes);
    }

    leaderboard.push({
      id: doc.id,
      name: d.playerName || doc.id,
      stablefordTotal: total,
    });
  });

  leaderboard.sort((a, b) => b.stablefordTotal - a.stablefordTotal);

  // Add rank
  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return leaderboard;
}

/**
 * Calculate Sunday leaderboard from scorecards (Gross/Net)
 * @param {Array} scorecards - Array of scorecard documents
 * @returns {Array} Sorted leaderboard entries
 */
export function calculateTeamLeaderboard(scorecards) {
  const leaderboard = [];

  scorecards.forEach((doc) => {
    const d = doc.data ? doc.data() : doc;
    let gross = 0;

    for (let i = 1; i <= 18; i++) {
      const strokes = d[`hole${i}`];
      if (!strokes) continue;
      gross += strokes;
    }

    const handicap = d.handicap || d.teamHandicap || 0;
    const net = gross - handicap;

    leaderboard.push({
      id: doc.id,
      teamName: d.teamName || doc.id,
      grossTotal: gross,
      handicap: handicap,
      netTotal: net,
    });
  });

  leaderboard.sort((a, b) => a.netTotal - b.netTotal);

  // Add rank
  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return leaderboard;
}
