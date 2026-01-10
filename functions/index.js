/* eslint-disable */
const { onDocumentWritten } = require("firebase-functions/firestore");
const { onValueWritten } = require("firebase-functions/v2/database");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const rtdb = getDatabase();

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

/** =======================
 *   SEND FCM NOTIFICATIONS
 *  ======================= */
exports.sendNotification = onValueWritten(
  "/notifications/{userId}/{notificationId}",
  async (event) => {
    try {
      const userId = event.params.userId;
      const notificationId = event.params.notificationId;
      
      // Get the notification data
      const notification = event.data.after.val();
      
      // Skip if notification doesn't exist or is being deleted
      if (!notification) {
        console.log("Notification deleted or doesn't exist, skipping");
        return;
      }
      
      // Skip if already sent
      if (notification.sent) {
        console.log("Notification already sent, skipping");
        return;
      }
      
      console.log(`Processing notification for user ${userId}:`, notification);
      
      // Get user's FCM token from the database
      const tokenRefPath = `/fcmTokens/${userId}`;
      const userTokenSnapshot = await rtdb.ref(tokenRefPath).once('value');
      const userToken = userTokenSnapshot.val();
      console.log('Token snapshot path:', tokenRefPath);
      console.log('Token snapshot exists:', userTokenSnapshot.exists());
      console.log('Token snapshot value:', userToken);
      
      // Handle empty or malformed token values
      const normalizedToken = typeof userToken === 'string' ? userToken.trim() : (userToken && userToken.token ? String(userToken.token).trim() : null);
      if (!normalizedToken) {
        console.log(`No FCM token found for user ${userId} at ${tokenRefPath}`);
        // Mark as attempted but no token
        await rtdb.ref(`/notifications/${userId}/${notificationId}`).update({
          sent: false,
          error: 'No FCM token found',
          attemptedAt: Date.now()
        });
        return;
      }
      
      // Prepare the FCM message
      const message = {
        token: normalizedToken,
        notification: {
          title: notification.title || 'Hackers Cup',
          body: notification.body || 'You have a new notification'
        },
        data: {
          notificationId: notificationId,
          timestamp: String(notification.timestamp || Date.now())
        },
        webpush: {
          fcmOptions: {
            link: 'https://hackersbeta.web.app/notifications.html'
          }
        }
      };
      
      // Send the notification
      const response = await getMessaging().send(message);
      console.log(`Successfully sent notification to ${userId}:`, response);
      
      // Mark notification as sent
      await rtdb.ref(`/notifications/${userId}/${notificationId}`).update({
        sent: true,
        sentAt: Date.now(),
        messageId: response
      });
      
      return true;
      
    } catch (error) {
      console.error("Error sending notification:", error);
      
      // Try to mark the error in the database
      try {
        const userId = event.params.userId;
        const notificationId = event.params.notificationId;
        await rtdb.ref(`/notifications/${userId}/${notificationId}`).update({
          sent: false,
          error: error.message,
          attemptedAt: Date.now()
        });
      } catch (updateError) {
        console.error("Error updating notification status:", updateError);
      }
      
      throw error;
    }
  }
);
