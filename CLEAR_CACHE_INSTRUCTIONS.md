# Clear Cache Instructions

## Quick Method (Recommended)

### Option 1: Service Worker Unregister
1. Open DevTools (F12)
2. Go to **Application** tab → **Service Workers**
3. Click **"Unregister"** for your service worker
4. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Option 2: Browser Console
Run this in the browser console:
```javascript
// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('Service worker unregistered');
});

// Then hard refresh
location.reload(true);
```

### Option 3: Clear All Site Data
1. Open DevTools (F12)
2. Go to **Application** tab → **Storage**
3. Click **"Clear site data"** button
4. Check all boxes (especially "Cache storage" and "Service workers")
5. Click **"Clear site data"**
6. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## After Clearing Cache

1. Navigate to: https://vanguard-f8b90.web.app
2. Check the van-details mobile page
3. Verify containers are visible around van-basic-info and van-history

## What Changed

- CSS styles now use `::ng-deep` to pierce view encapsulation
- All `ion-card` styles should now apply correctly
- Card containers should be visible with borders, shadows, and backgrounds

