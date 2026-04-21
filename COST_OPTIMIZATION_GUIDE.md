# Cost Optimization: Cloud Functions to Client-Side Processing

## Problem
- **573 million Cloud Functions invocations** in a single month
- **Cost: ~$230+/month** just for leaderboard calculations
- Root cause: Cloud Functions triggered on EVERY scorecard write to recalculate leaderboards

## Solution
Eliminated all Cloud Functions and moved to client-side processing:
- **Leaderboards**: Calculated on-demand when users load leaderboard pages (free Firestore reads)
- **Notifications**: Handled using browser Notification API and Firestore listeners (no server needed)
- **Cost**: ~$0/month

## What Changed

### 1. Cloud Functions Disabled
**File: `functions/index.js`**
- Removed `processFridayLeaderboard`
- Removed `processSaturdayLeaderboard`
- Removed `processSundayLeaderboard`
- Removed `sendNotification`

These functions were triggering hundreds of times per second on scorecard writes.

### 2. Leaderboards Now Calculate Client-Side
**Updated Files:**
- `satbeta.html` - Saturday leaderboard
- `sunbeta.html` - Sunday leaderboard (team scoring)
- `fribeta.html` - Friday leaderboard

**How it works:**
1. When user loads leaderboard page, JavaScript runs in browser
2. Fetches all scorecards from Firestore (free read operation)
3. Calculates Stableford or Gross/Net scores locally
4. Sorts and renders the leaderboard
5. No server processing needed

### 3. Notifications Use Browser API
**File: `assets/js/notification-handler.js`** (new)

Users' browsers now:
1. Listen for new notifications in their Firestore path
2. Display as browser notifications when they arrive
3. No Cloud Functions invoking FCM API

To enable: Add to any page that needs notifications:
```javascript
import { setupNotificationListener } from './assets/js/notification-handler.js';
setupNotificationListener(userId);
```

### 4. Reusable Calculation Functions
**File: `assets/js/leaderboard-calc.js`** (new)

Two exported functions for other pages:
- `calculateStandardLeaderboard(scorecards)` - For Friday/Saturday
- `calculateTeamLeaderboard(scorecards)` - For Sunday

## Firestore Costs
- Free tier: 50,000 reads/day
- Your usage estimate: ~10,000-15,000 reads/day
- **Cost: $0/month** ✅

## Deployment
1. Deploy updated `functions/index.js` (placeholder function keeps Firebase Functions happy)
2. Deploy updated HTML files (satbeta.html, sunbeta.html, fribeta.html)
3. Upload new JS files to assets/js/ (leaderboard-calc.js, notification-handler.js)

## Testing
1. Load leaderboard pages - should see scorecards calculated immediately
2. Send notifications from admin panel - should appear in browser
3. Check Firebase Console - Cloud Functions usage should drop to near zero

## If You Need to Add New Pages
Use the utility functions for consistent behavior:

```javascript
import { calculateStandardLeaderboard } from './assets/js/leaderboard-calc.js';

// In your page:
const scorecards = await getDocs(collection(...));
const leaderboard = calculateStandardLeaderboard(Array.from(scorecards.docs));
```

## FAQ
**Q: Why not just turn off the Cloud Functions?**
A: The placeholder function prevents Firebase from complaining about an empty project.

**Q: Are leaderboards real-time now?**
A: No, they update when the page loads. This is fine for once-per-event updates. If you need real-time, add Firestore listeners to the HTML pages.

**Q: What if a scorecard never loads?**
A: The leaderboard page will have an error message. Check browser console for details.

## Estimated Savings
- Before: $230+/month
- After: $0/month for functions
- Savings: **$230+/month, $2,760+/year**
