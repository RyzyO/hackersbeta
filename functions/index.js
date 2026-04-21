// ========================================
// CLOUD FUNCTIONS DISABLED - 2026
// ========================================
// All Cloud Functions have been disabled to reduce costs.
// Leaderboards are now calculated client-side.
// Notifications are handled client-side using Firestore listeners.
//
// This change eliminates the 573M monthly invocations that were causing billing issues.
// ========================================

// Export a placeholder to keep Firebase Functions happy
exports.placeholder = function() {
  console.log("Cloud Functions disabled - using client-side processing instead");
};
