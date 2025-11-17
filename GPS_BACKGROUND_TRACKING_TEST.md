# GPS Background Tracking - Test Checklist

## Implementation Summary
The app now supports background GPS tracking with automatic inspection prompts when users return to the app.

## Test Flow

### 1. Initial Setup Test
- [ ] User logs in successfully
- [ ] User navigates to van selection page
- [ ] User can see available vans

### 2. Van Selection & Background Tracking Start
- [ ] User selects a van
- [ ] App navigates to `/background-tracking` page
- [ ] Background tracking page displays:
  - [ ] "GPS Tracking Active" message
  - [ ] Van type and number
  - [ ] Loading spinner
- [ ] After 3 seconds, tracking state is stored in localStorage
- [ ] GPS tracking starts (check console for "GPS tracking started")

### 3. Background Tracking Test
- [ ] User switches to another app (or minimizes browser)
- [ ] GPS continues tracking in background (check console logs)
- [ ] Miles are being accumulated (check localStorage: `vanguard_miles_cache`)

### 4. App Resume & Inspection Prompt
- [ ] User returns to the app
- [ ] App lifecycle service detects app resume
- [ ] App navigates to `/photo-capture` page
- [ ] Inspection prompt modal appears with:
  - [ ] "Ready for Inspection?" message
  - [ ] "GPS tracking is active" text
  - [ ] "Start Inspection" button
- [ ] User clicks "Start Inspection"
- [ ] Modal closes and photo capture interface appears

### 5. Inspection Completion
- [ ] User completes photo capture
- [ ] User submits inspection
- [ ] Background tracking state is cleared (check localStorage)
- [ ] User navigates to review page

## Edge Cases to Test

### Edge Case 1: User Returns While Still on Background Page
- [ ] User is on `/background-tracking` page
- [ ] User switches apps and returns
- [ ] App should navigate to `/photo-capture` with prompt

### Edge Case 2: User Already on Photo Capture
- [ ] User is already on `/photo-capture` page
- [ ] App resumes
- [ ] Should NOT show duplicate prompt

### Edge Case 3: GPS Permission Denied
- [ ] User denies GPS permission
- [ ] App should handle error gracefully
- [ ] User can still proceed (GPS just won't track)

### Edge Case 4: App Killed and Restarted
- [ ] User starts tracking
- [ ] App is killed by OS
- [ ] User reopens app
- [ ] App should detect active shift and resume tracking (if `resumeIfNeeded` is called)

## Console Logs to Check

1. **When van is selected:**
   - "GPS tracking started. App will continue tracking in background."

2. **When app goes to background:**
   - "App paused - GPS tracking continues in background"

3. **When app resumes:**
   - App lifecycle should detect resume
   - Navigation to photo-capture should occur

4. **GPS tracking:**
   - Check for position updates in console (if logging enabled)
   - Check localStorage for `vanguard_miles_cache` updates

## localStorage Keys to Monitor

1. `vanguard_background_tracking` - Stores van info and start time
2. `vanguard_active_shift` - Stores active shift info
3. `vanguard_miles_cache` - Cached miles value

## Platform-Specific Notes

### Native (Android/iOS)
- Uses Capacitor App plugin for lifecycle detection
- GPS tracking works in background (with proper permissions)
- Background location permission may be required on Android 10+

### Web/PWA
- Uses Page Visibility API for lifecycle detection
- GPS tracking may be limited when tab is not active
- Some browsers throttle background location updates

## Known Limitations

1. **Web/PWA:** Background GPS tracking is limited by browser policies
2. **Android 10+:** Requires "Allow all the time" location permission for true background tracking
3. **iOS:** Background location requires proper Info.plist entries

## Debugging Commands

In browser console:
```javascript
// Check background tracking state
JSON.parse(localStorage.getItem('vanguard_background_tracking'))

// Check active shift
JSON.parse(localStorage.getItem('vanguard_active_shift'))

// Check cached miles
localStorage.getItem('vanguard_miles_cache')

// Check auth state
checkAuth()
```

