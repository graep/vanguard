# Exclude Project Folders from Microsoft Defender

Microsoft Defender can slow down Android builds and cause Gradle sync issues. Follow these steps to exclude your project:

## Quick Fix (Recommended)

1. **Click "Exclude folders" in the Android Studio notification**
   - This will automatically exclude common build folders

2. **Or manually exclude these folders:**
   - `E:\Projects\Vanguard\android\build`
   - `E:\Projects\Vanguard\android\.gradle`
   - `E:\Projects\Vanguard\android\app\build`
   - `E:\Projects\Vanguard\node_modules`
   - `E:\Projects\Vanguard\.angular`

## Manual Exclusion Steps

1. Open **Windows Security** (Windows Defender)
2. Go to **Virus & threat protection**
3. Click **Manage settings** under Virus & threat protection settings
4. Scroll down to **Exclusions**
5. Click **Add or remove exclusions**
6. Click **Add an exclusion** → **Folder**
7. Add these folders:
   - `E:\Projects\Vanguard\android`
   - `E:\Projects\Vanguard\node_modules`

## After Excluding

1. Close Android Studio
2. Reopen Android Studio
3. Open the `android` folder
4. Wait for Gradle sync to complete
5. Try building again

This should resolve the build issues!


