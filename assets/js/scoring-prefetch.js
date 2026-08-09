/**
 * Background prefetch for the Live Scoring welcome screens (scoring.html,
 * scoring-friday.html, scoring-sunday.html).
 *
 * Include this on pages a player is likely to be on before they go to score
 * (index.html, score.html, etc.) via:
 *   <script type="module" src="assets/js/scoring-prefetch.js"></script>
 *
 * It quietly fetches the same tee-sheet-groups + sheet-names data those pages
 * need for their "My Round" card, and writes it into the exact localStorage
 * keys they already read — no changes needed on the host page beyond the
 * script tag. The scoring pages themselves still hit the network on load to
 * refresh/reconcile; this only removes the wait for the *first* paint.
 *
 * Runs on a separate named Firebase app instance so it can't collide with
 * whatever Firebase setup the host page already has running, and only after
 * the page has gone idle so it never competes with the host page's own
 * critical requests.
 */
(function () {
  const CURRENT_EVENT_ID = 'HC26';
  const DAYS = ['friday', 'saturday', 'sunday'];
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsIpFLV6y4b-Bct4NnQ624Mdx6glCUfg7nbazbMhsNGuUpJSmqNfTUz1e5XK3SjIQX/exec';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyAYat6m3-Lv46vfm6xcHLjTjRDq7NdCxAk',
    authDomain: 'hackers-cup.firebaseapp.com',
    databaseURL: 'https://hackers-cup-default-rtdb.firebaseio.com',
    projectId: 'hackers-cup',
    storageBucket: 'hackers-cup.appspot.com',
    messagingSenderId: '765736070872',
    appId: '1:765736070872:web:86a51c41916e7af75631ad',
    measurementId: 'G-6E1M14F510'
  };

  // Same cache keys the scoring pages read directly — keep these in sync with
  // SHEET_NAMES_CACHE_KEY / the per-day TEESHEET_CACHE_KEY pattern in those files.
  const SHEET_NAMES_CACHE_KEY = 'hackerscup.scoring.sheetnames.v1';
  const teesheetCacheKey = (day) => `hackerscup.scoring.teesheetgroups.${day}.v1`;
  const MAX_CACHE_AGE_MS = 30 * 60 * 1000; // don't bother re-fetching more than every 30 min

  function isSelectableSheetName(name) {
    const lower = String(name || '').toLowerCase().trim();
    if (!lower) return false;
    const ignored = new Set(['database', 'course info', 'players', 'sat leaderboard', '_scorelog']);
    if (ignored.has(lower)) return false;
    if (/^sheet\s*\d+$/i.test(lower)) return false;
    return !lower.startsWith('_');
  }
  function normalizeNameForMatch(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function normPlayerName(s) {
    return (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function alreadyFreshEnough() {
    try {
      for (const day of DAYS) {
        const raw = localStorage.getItem(teesheetCacheKey(day));
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.savedAt || Date.now() - parsed.savedAt > MAX_CACHE_AGE_MS) return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  async function run() {
    if (!navigator.onLine) return;
    if (alreadyFreshEnough()) return; // recently prefetched (e.g. another tab) — skip the work

    try {
      const [
        { initializeApp },
        { getDatabase, ref, get },
        { getFirestore, doc, getDoc, getDocs, collection },
      ] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js'),
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
      ]);

      const app = initializeApp(FIREBASE_CONFIG, 'scoringPrefetch');
      const db = getDatabase(app);
      const firestore = getFirestore(app);

      const [usersSnap, eventSnap, attendeeProfilesSnap, playersSnap, sheetNamesResp] = await Promise.all([
        get(ref(db, 'users')),
        getDoc(doc(firestore, 'eventYears', CURRENT_EVENT_ID)),
        getDocs(collection(firestore, 'attendeeProfiles')),
        getDocs(collection(firestore, 'eventYears', CURRENT_EVENT_ID, 'players')).catch(() => null),
        fetch(`${APPS_SCRIPT_URL}?action=getSheetNames`).then(r => r.json()).catch(() => null),
      ]);

      const usersMap = usersSnap.exists() ? (usersSnap.val() || {}) : {};
      const saved = eventSnap.exists() ? (eventSnap.data() || {}) : {};

      const avatarByName = {};
      attendeeProfilesSnap.forEach(docSnap => {
        const d = docSnap.data() || {};
        if (d.avatarUrl) avatarByName[normPlayerName(docSnap.id)] = d.avatarUrl;
      });

      const ambrosePartnerMap = {};
      if (playersSnap) {
        playersSnap.forEach(docSnap => {
          const d = docSnap.data() || {};
          if (d.ambrosePartnerUid) ambrosePartnerMap[docSnap.id] = String(d.ambrosePartnerUid);
        });
      }

      let allSheetNames = [];
      if (sheetNamesResp && sheetNamesResp.success) {
        allSheetNames = sheetNamesResp.sheets || [];
        try { localStorage.setItem(SHEET_NAMES_CACHE_KEY, JSON.stringify(allSheetNames)); } catch (err) {}
      }
      const matchSheetName = (displayName) => {
        const target = normalizeNameForMatch(displayName);
        if (!target) return null;
        const exact = allSheetNames.find(name => isSelectableSheetName(name) && normalizeNameForMatch(name) === target);
        return exact || null;
      };

      for (const day of DAYS) {
        const savedGroups = Array.isArray(saved.teeSheets && saved.teeSheets[day]) ? saved.teeSheets[day] : [];
        const groups = savedGroups.map(g => ({
          hole: g.hole,
          teeTime: g.teeTime,
          players: (g.players || []).map(uid => {
            const displayName = (usersMap[uid] && usersMap[uid].displayName) || uid;
            const avatarUrl = (usersMap[uid] && usersMap[uid].avatarUrl) || avatarByName[normPlayerName(displayName)] || '';
            return { uid, displayName, avatarUrl, sheetName: matchSheetName(displayName) };
          }),
        }));
        try {
          localStorage.setItem(teesheetCacheKey(day), JSON.stringify({
            savedAt: Date.now(),
            groups,
            ambrosePartnerMap: day === 'sunday' ? ambrosePartnerMap : undefined,
          }));
        } catch (err) {
          // localStorage full/unavailable — prefetch is a nice-to-have, skip silently.
        }
      }
    } catch (err) {
      // Any failure here just means the scoring pages fall back to their own normal
      // (network-first) load — never surface this to the user on an unrelated page.
      console.warn('Scoring prefetch failed (non-fatal):', err);
    }
  }

  function schedule() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => run(), { timeout: 4000 });
    } else {
      setTimeout(run, 1500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule);
  } else {
    schedule();
  }
})();
