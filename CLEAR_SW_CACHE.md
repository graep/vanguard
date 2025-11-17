# Clear Service Worker Cache - Quick Fix

## If you're seeing old styles in the deployed version:

### Method 1: Browser Console (Fastest)
Open your browser's developer console (F12) and run:

```javascript
// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('Service worker unregistered');
});

// Clear all caches
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
  console.log('All caches cleared');
});

// Hard refresh
location.reload(true);
```

### Method 2: DevTools
1. Open DevTools (F12)
2. Go to **Application** tab → **Service Workers**
3. Click **"Unregister"** for your service worker
4. Go to **Application** tab → **Storage** → **Clear site data**
5. Check all boxes and click **"Clear site data"**
6. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Method 3: Dev Server (If running locally)
If you're running `ng serve`:
1. Stop the server (Ctrl+C)
2. Clear the `.angular` cache: `rm -rf .angular` (or delete `.angular` folder)
3. Restart: `npm start`

The dev server should automatically pick up SCSS changes without needing a rebuild.

