/**
 * Client-side notification handler
 * Replaces expensive Cloud Functions with free Firestore listeners
 */

import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/**
 * Listen for new notifications for the current user and display them as browser notifications
 * This function replaces the Cloud Functions sendNotification trigger
 * 
 * @param {string} userId - The user ID to listen for notifications
 */
export function setupNotificationListener(userId) {
  const rtdb = getDatabase();
  const notifRef = ref(rtdb, `/notifications/${userId}`);

  onValue(notifRef, async (snapshot) => {
    if (!snapshot.exists()) return;

    const notifications = snapshot.val();

    // Process each notification
    Object.entries(notifications).forEach(async ([notifId, notifData]) => {
      // Skip if already sent or no data
      if (!notifData || notifData.sent) return;

      try {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
          console.log('Browser does not support notifications');
          return;
        }

        // Request permission if not already granted
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        // Show notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(notifData.title || 'Hackers Cup', {
            body: notifData.body || 'You have a new notification',
            icon: '/assets/images/hackers-logo.png',
            tag: notifId, // Prevents duplicate notifications
            badge: '/assets/images/badge.png'
          });
        }

        // Mark notification as sent locally
        await update(ref(rtdb, `/notifications/${userId}/${notifId}`), {
          sent: true,
          sentAt: Date.now()
        });
      } catch (error) {
        console.error('Error showing notification:', error);
        
        // Mark as error
        try {
          await update(ref(rtdb, `/notifications/${userId}/${notifId}`), {
            sent: false,
            error: error.message,
            attemptedAt: Date.now()
          });
        } catch (updateError) {
          console.error('Error updating notification:', updateError);
        }
      }
    });
  });
}

/**
 * Request notification permission from the user
 * Call this on user interaction (e.g., button click)
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
