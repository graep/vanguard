# Service Worker & Caching Issues

## Overview

This document covers service worker caching issues, IndexedDB corruption recovery, and update mechanisms.

---

## Issue 1: Service Worker Update Fix

### Problem
Service worker was caching CSS files and not immediately updating when new versions were deployed, causing visual differences between local dev and hosted production.

### Root Causes Identified

#### 1. Service Worker Caching Strategy
- **File:** `ngsw-config.json`
- CSS files (`/*.css`) are cached with `updateMode: "prefetch"`
- Updates happen in background, not immediately
- Users might see old cached CSS even after deployment

#### 2. Slow Registration Strategy  
- **File:** `src/main.ts` (line 45)
- Was using: `registerWhenStable:30000` (waits 30 seconds)
- This delayed service worker activation and update checks

#### 3. No Manual Update Checking
- **File:** `src/app/app.component.ts`
- No code to check for updates or prompt users to reload
- Relied entirely on automatic background updates

### Solutions Implemented

#### 1. Immediate Service Worker Registration
**File:** `src/main.ts`

**Changed from:**
```typescript
registrationStrategy: 'registerWhenStable:30000'  // ❌ Waits 30 seconds
```

**Changed to:**
```typescript
registrationStrategy: 'registerImmediately'  // ✅ Registers immediately
```

#### 2. Automatic Update Checking
**File:** `src/app/app.component.ts`

**Added:**
- Checks for updates immediately on app start
- Checks for updates every 6 hours automatically
- Automatically reloads when new version is detected
- No user prompt needed - seamless update

#### 3. Cache Query Options
**File:** `ngsw-config.json`

**Added:**
```json
"cacheQueryOptions": {
  "ignoreVary": true
}
```

This ensures cache works correctly across different request headers.

### How It Works Now

1. **App Starts:**
   - Service worker registers immediately
   - Checks for updates right away

2. **Update Detection:**
   - Service worker detects new `ngsw.json` with different file hashes
   - New CSS file detected (e.g., `styles-WTBSN6KB.css` vs old `styles-MWTSIKHX.css`)

3. **Automatic Update:**
   - When new version is ready, app automatically reloads
   - User gets fresh CSS immediately
   - No manual intervention needed

4. **Ongoing Checks:**
   - Checks for updates every 6 hours
   - Ensures users stay up to date

### Testing

#### Test Update Detection:
1. Deploy new version
2. Open production site
3. Check console for "New version available, reloading..."
4. Page should reload automatically
5. New CSS should be loaded

#### Verify CSS Updates:
1. Check DevTools → Network tab
2. Look for new CSS file with new hash (e.g., `styles-XXXXX.css`)
3. Verify card containers are visible

### Manual Update (If Needed)

If automatic update doesn't work, users can manually:

```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});
location.reload();
```

### Related Files
- `src/main.ts` - Service worker registration
- `src/app/app.component.ts` - Update checking logic
- `ngsw-config.json` - Service worker configuration
- `angular.json` - Build configuration (outputHashing)

### Benefits

✅ **Immediate Updates:** No 30-second delay  
✅ **Automatic Reload:** Users get new versions seamlessly  
✅ **Regular Checks:** Updates every 6 hours  
✅ **Better UX:** No manual cache clearing needed  
✅ **CSS Updates:** New styles load immediately after deployment

---

## Issue 2: IndexedDB Corruption Recovery

### Problem
IndexedDB corruption errors occur when there's a version mismatch between the database state and what the application expects. This can happen when:

1. **Site data is cleared** while IndexedDB databases are open
2. **Service worker updates** change database structure
3. **Browser storage is cleared** partially or completely
4. **Version mismatch** between `lastClosedDbVersion` and `event.oldVersion`

### Error Message:
```
refusing to open IndexedDB database due to potential corruption of the IndexedDB database data; 
this corruption could be caused by clicking the "clear site data" button in a web browser; 
try reloading the web page to re-initialize the IndexedDB database: 
lastClosedDbVersion=18, event.oldVersion=0, event.newVersion=18, db.version=18
```

### Solution
Added automatic recovery mechanism in `GlobalErrorHandlerService` that:

1. **Detects IndexedDB corruption errors**
2. **Clears all corrupted databases**
3. **Unregisters service worker** to force fresh start
4. **Automatically reloads the page** to reinitialize everything

### What Gets Cleared:
- Angular Service Worker databases (`ngsw:db:*`)
- Firebase databases (`firebaseLocalStorageDb`, `firestore`, etc.)
- Other known IndexedDB databases

### Implementation

#### File: `src/app/services/error-handler.service.ts`

**Added:**
- `handleIndexedDBCorruption()` - Detects and handles corruption
- `recoverFromIndexedDBCorruption()` - Performs recovery
- `clearAllIndexedDB()` - Clears all known databases

### How It Works:

1. **Error Detection:**
   - Checks for "refusing to open IndexedDB database" or "corruption" in error message
   - Catches errors before they crash the app

2. **Recovery Process:**
   - Logs the corruption event
   - Attempts to delete all known IndexedDB databases
   - Unregisters service worker
   - Reloads page after 1 second delay

3. **User Experience:**
   - Automatic recovery - no user action required
   - Page reloads with fresh databases
   - App continues working normally

### Testing

#### Simulate Corruption (for testing):
1. Open browser DevTools → Application → IndexedDB
2. Manually delete a database while the app is running
3. Or clear site data while app is active

#### Expected Behavior:
- Error is caught by global error handler
- Recovery process starts automatically
- Page reloads after clearing databases
- App works normally after reload

### Prevention

#### Best Practices:
1. **Proper cleanup**: Always close IndexedDB connections before clearing storage
2. **Version management**: Increment database versions properly
3. **Error handling**: Handle upgrade errors gracefully
4. **Service worker updates**: Handle SW updates that might change DB structure

#### Known Causes:
- ❌ Clearing site data while app is running
- ❌ Service worker updates with DB schema changes
- ❌ Browser storage quota exceeded
- ❌ Browser crashes during database operations
- ❌ Multiple tabs trying to upgrade database simultaneously

### Related Issues

#### Angular Service Worker:
- Uses IndexedDB for caching (`ngsw:db:*`)
- Can cause corruption if SW updates while DB is open

#### Firebase:
- Uses IndexedDB for offline persistence
- Firestore local cache stored in IndexedDB
- Authentication state stored in IndexedDB

### Monitoring

The recovery process logs:
- `INDEXEDDB` - Corruption detected
- `INDEXEDDB_RECOVERY` - Recovery process events
- Logs include: action taken, databases cleared, errors encountered

### Manual Recovery (If Needed)

If automatic recovery fails, users can manually:

1. **Clear browser storage:**
   - Chrome: Settings → Privacy → Clear browsing data → Site data
   - Firefox: Settings → Privacy → Clear Data → Cookies and Site Data

2. **Unregister service worker:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(registrations => {
     registrations.forEach(reg => reg.unregister());
   });
   ```

3. **Reload page:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Future Improvements

Potential enhancements:
- Show user notification about recovery
- Retry database operations after recovery
- More granular database clearing (only corrupted ones)
- Better error messages for users
- Analytics tracking of corruption frequency

### Related Files
- `src/app/services/error-handler.service.ts` - Main implementation
- `src/main.ts` - Service worker registration
- `ngsw-config.json` - Service worker configuration










