# Firebase Cloud Function Setup - Complete Guide

## What We Just Set Up

I've added a Firebase Cloud Function that automatically sends push notifications when admins create notifications in the database.

## How It Works

1. **Admin sends notification** via admin-notifications.html
2. **Notification saved** to Firebase Realtime Database at `/notifications/{userId}/{notificationId}`
3. **Cloud Function triggers** automatically when new notification is written
4. **Function reads** the user's FCM token from `/fcmTokens/{userId}`
5. **Push notification sent** to user's device via Firebase Cloud Messaging
6. **Status updated** in database (sent: true, sentAt: timestamp)

## Files Modified

### 1. `/functions/index.js`
- Added imports for Realtime Database and Messaging
- Added `sendNotification` cloud function
- Function listens to `/notifications/{userId}/{notificationId}` path

### 2. `/index.html`
- Updated FCM initialization to save tokens to database
- Tokens saved at `/fcmTokens/{userId}` when user enables notifications

### 3. Created `/admin-notifications.html`
- Admin interface to send notifications
- Select all users or specific users
- Saves notifications to database

### 4. Created `/notifications.html`
- User interface to view notification history
- Filter by all/unread/read
- Mark notifications as read

## Deployment Steps

### Step 1: Set Up Admin User
In Firebase Console > Realtime Database, add:
```json
{
  "admins": {
    "YOUR_USER_UID": true
  }
}
```

### Step 2: Deploy the Cloud Function
```bash
cd functions
firebase deploy --only functions
```

This will deploy the `sendNotification` function to Firebase.

### Step 3: Test the System

1. **Enable notifications on a user account:**
   - Login to index.html
   - Click "Enable Notifications"
   - Grant browser permission
   - Token is automatically saved to `/fcmTokens/{userId}`

2. **Send a test notification:**
   - Login as admin
   - Go to admin-notifications.html
   - Enter title and message
   - Select recipients
   - Click "Send Notification"

3. **Verify:**
   - Check Firebase Functions logs: `firebase functions:log`
   - Check user's browser for push notification
   - Check notifications.html for history

## Database Structure

```
hackers-cup-default-rtdb/
├── users/
│   └── {userId}/
│       ├── displayName: "John Doe"
│       └── hackerNumber: 123
├── admins/
│   └── {userId}: true
├── fcmTokens/
│   └── {userId}: "FCM_TOKEN_STRING"
└── notifications/
    └── {userId}/
        └── {notificationId}/
            ├── title: "Important Update"
            ├── body: "Message content"
            ├── timestamp: 1234567890
            ├── sender: "ADMIN_USER_ID"
            ├── sent: true
            ├── sentAt: 1234567891
            └── messageId: "FCM_MESSAGE_ID"
```

## Monitoring

### View Function Logs
```bash
firebase functions:log
```

### Check Specific Function
```bash
firebase functions:log --only sendNotification
```

### View Real-time Logs
```bash
firebase functions:log --only sendNotification --follow
```

## Troubleshooting

### Notification Not Sent
1. Check if user has FCM token: `/fcmTokens/{userId}`
2. Check notification status in database
3. View function logs for errors
4. Verify VAPID key matches in both client and Firebase console

### Token Not Saved
1. Ensure user is logged in when clicking "Enable Notifications"
2. Check browser console for errors
3. Verify service worker is registered

### Permission Issues
1. Verify admin flag in `/admins/{userId}`
2. Check Firebase Rules allow reads/writes
3. Ensure user is authenticated

## Firebase Rules Needed

Add these rules to your Firebase Realtime Database:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "admins": {
      ".read": "auth != null",
      ".write": false
    },
    "fcmTokens": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && (root.child('admins').child(auth.uid).val() == true || auth.uid == $uid)"
      }
    }
  }
}
```

## Cost Considerations

- Cloud Functions: Free tier includes 2M invocations/month
- FCM: Completely free, unlimited notifications
- Realtime Database: Free tier includes 1GB storage, 10GB/month bandwidth

## Next Steps

1. Deploy the function: `firebase deploy --only functions`
2. Add your admin user to `/admins/` in Firebase Console
3. Test with a notification to yourself
4. Monitor logs to verify everything works
5. Share admin-notifications.html URL with other admins (if needed)

## Support

If you encounter issues:
1. Check Firebase Console > Functions for errors
2. View logs: `firebase functions:log`
3. Check browser console for client-side errors
4. Verify database rules are correct
