# Mobile App Deployment Guide

This guide walks you through deploying the Vanguard Fleet app to Android and iOS native mobile apps.

## Prerequisites

### Required Software

**For Android:**
- [Android Studio](https://developer.android.com/studio) (latest version)
- Java JDK 17 or higher
- Android SDK (installed via Android Studio)
- Android SDK Platform 33+ (API level 33+)

**For iOS:**
- macOS (required for iOS development)
- [Xcode](https://developer.apple.com/xcode/) (latest version)
- [CocoaPods](https://cocoapods.org/) (`sudo gem install cocoapods`)
- Apple Developer Account ($99/year)

**For Both:**
- Node.js 18+ and npm
- Capacitor CLI: `npm install -g @capacitor/cli`

## Step-by-Step Deployment Process

### Step 1: Build the Web App

First, build your Angular/Ionic app for production:

```bash
# Build the production web app
npm run build:prod

# Or use the standard build
npm run build
```

This creates the `www/` folder with your compiled app.

### Step 2: Sync Web Assets to Native Projects

Capacitor needs to copy your web assets into the native projects:

```bash
# Sync web assets to both Android and iOS
npx cap sync

# Or sync individually:
npx cap sync android
npx cap sync ios
```

**What this does:**
- Copies `www/` folder to native projects
- Updates native dependencies
- Regenerates native project files

### Step 3: Android Deployment

#### 3.1 Open Android Studio

```bash
# Open Android project in Android Studio
npx cap open android
```

Or manually:
- Open Android Studio
- File → Open → Select `android/` folder

#### 3.2 Configure Signing (Release Build)

1. **Create a keystore** (if you don't have one):
   ```bash
   keytool -genkey -v -keystore vanguard-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vanguard
   ```

2. **Create `android/keystore.properties`**:
   ```properties
   storePassword=your_store_password
   keyPassword=your_key_password
   keyAlias=vanguard
   storeFile=../vanguard-release-key.jks
   ```

3. **Update `android/app/build.gradle`** to use signing config:
   ```gradle
   android {
       signingConfigs {
           release {
               if (project.hasProperty('keystoreProperties')) {
                   def keystorePropertiesFile = rootProject.file("keystore.properties")
                   def keystoreProperties = new Properties()
                   keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                   
                   storeFile file(keystoreProperties['storeFile'])
                   storePassword keystoreProperties['storePassword']
                   keyAlias keystoreProperties['keyAlias']
                   keyPassword keystoreProperties['keyPassword']
               }
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

#### 3.3 Build Release APK/AAB

**Option A: Build APK (for direct installation)**
```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

**Option B: Build AAB (for Google Play Store)**
```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

**Using Android Studio:**
1. Build → Generate Signed Bundle / APK
2. Select "Android App Bundle" (for Play Store) or "APK" (for direct install)
3. Choose your keystore
4. Select release build variant
5. Click Finish

#### 3.4 Test the APK

**Install on connected device:**
```bash
# Enable USB debugging on your Android device
# Connect device via USB
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Or install via Android Studio:**
- Run → Run 'app' (or press Shift+F10)
- Select your connected device

#### 3.5 Deploy to Google Play Store

1. **Create a Google Play Console account** (one-time $25 fee)
2. **Create a new app** in Play Console
3. **Upload AAB**:
   - Go to Production → Create new release
   - Upload `app-release.aab`
   - Fill in release notes
   - Submit for review

### Step 4: iOS Deployment

#### 4.1 Install CocoaPods Dependencies

```bash
cd ios/App
pod install
cd ../..
```

#### 4.2 Open Xcode

```bash
# Open iOS project in Xcode
npx cap open ios
```

Or manually:
- Open `ios/App/App.xcworkspace` (NOT `.xcodeproj`)

#### 4.3 Configure Signing & Capabilities

1. **Select your project** in Xcode navigator
2. **Select the "App" target**
3. **Go to "Signing & Capabilities" tab**
4. **Select your Team** (Apple Developer account)
5. **Xcode will automatically:**
   - Create provisioning profiles
   - Configure signing certificates
   - Set up app capabilities

#### 4.4 Configure App Settings

1. **General Tab:**
   - Set Display Name
   - Set Bundle Identifier (e.g., `com.vanguard.fleet.inspection`)
   - Set Version and Build number
   - Set Minimum iOS version (recommended: 13.0+)

2. **Info.plist:**
   - Add required permissions descriptions:
     - `NSCameraUsageDescription`: "We need camera access to take inspection photos"
     - `NSLocationWhenInUseUsageDescription`: "We need location to track vehicle locations"
     - `NSPhotoLibraryUsageDescription`: "We need photo library access to select images"

#### 4.5 Build for Testing

**Build for Simulator:**
```bash
# In Xcode: Product → Destination → Select a simulator
# Then: Product → Run (or Cmd+R)
```

**Build for Device:**
1. Connect your iOS device via USB
2. Trust the computer on your device
3. In Xcode: Product → Destination → Select your device
4. Product → Run (or Cmd+R)

#### 4.6 Create Archive (for App Store)

1. **Select "Any iOS Device"** as destination (not simulator)
2. **Product → Archive**
3. Wait for archive to complete
4. **Organizer window opens** automatically
5. **Click "Distribute App"**
6. **Choose distribution method:**
   - **App Store Connect** (for App Store)
   - **Ad Hoc** (for testing on specific devices)
   - **Enterprise** (for enterprise distribution)
   - **Development** (for development builds)

#### 4.7 Deploy to App Store

1. **In App Store Connect:**
   - Create new app (if first time)
   - Fill in app information
   - Set pricing and availability

2. **Upload via Xcode:**
   - Follow archive distribution steps above
   - Select "App Store Connect"
   - Upload will happen automatically

3. **Or use Transporter app:**
   - Download [Transporter](https://apps.apple.com/app/transporter/id1450874784)
   - Export IPA from Xcode
   - Upload via Transporter

4. **Submit for Review:**
   - In App Store Connect → App Store → Version
   - Fill in What's New, Screenshots, etc.
   - Submit for Review

## Quick Reference Commands

### Build & Sync
```bash
# Build web app
npm run build:prod

# Sync to native projects
npx cap sync

# Sync specific platform
npx cap sync android
npx cap sync ios
```

### Android
```bash
# Open in Android Studio
npx cap open android

# Build release APK
cd android && ./gradlew assembleRelease

# Build release AAB (for Play Store)
cd android && ./gradlew bundleRelease

# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

### iOS
```bash
# Open in Xcode
npx cap open ios

# Install CocoaPods dependencies
cd ios/App && pod install && cd ../..

# Update CocoaPods (if needed)
cd ios/App && pod update && cd ../..
```

## Updating the App

When you make changes to your web app:

1. **Rebuild the web app:**
   ```bash
   npm run build:prod
   ```

2. **Sync to native projects:**
   ```bash
   npx cap sync
   ```

3. **Rebuild native apps:**
   - **Android**: Build new APK/AAB in Android Studio
   - **iOS**: Create new archive in Xcode

4. **Update version numbers:**
   - **Android**: `android/app/build.gradle` → `versionCode` and `versionName`
   - **iOS**: Xcode → General tab → Version and Build

5. **Deploy updates** following the same process

## Troubleshooting

### Android Issues

**Build fails:**
```bash
# Clean build
cd android
./gradlew clean
./gradlew assembleRelease
```

**Gradle sync issues:**
- File → Invalidate Caches / Restart in Android Studio
- Delete `android/.gradle` folder
- Re-sync project

**Signing issues:**
- Verify `keystore.properties` file exists
- Check keystore file path is correct
- Ensure passwords match

### iOS Issues

**Pod install fails:**
```bash
# Update CocoaPods
sudo gem install cocoapods
pod repo update

# Clean and reinstall
cd ios/App
rm -rf Pods Podfile.lock
pod install
```

**Signing errors:**
- Verify Apple Developer account is added in Xcode
- Check Bundle Identifier matches your App ID
- Ensure provisioning profiles are valid

**Build errors:**
- Clean build folder: Product → Clean Build Folder (Shift+Cmd+K)
- Delete DerivedData: `~/Library/Developer/Xcode/DerivedData`
- Restart Xcode

### General Issues

**Capacitor sync fails:**
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Re-sync
npx cap sync
```

**Web assets not updating:**
- Ensure `www/` folder exists after build
- Check `capacitor.config.ts` → `webDir` is set to `'www'`
- Manually copy `www/` to `android/app/src/main/assets/` if needed

## Environment Configuration

### Production Environment Variables

For production builds, ensure your environment variables are set:

```bash
# Set environment variables before building
export FIREBASE_API_KEY="your_production_key"
export FIREBASE_AUTH_DOMAIN="your_project.firebaseapp.com"
export FIREBASE_PROJECT_ID="your_project_id"
# ... etc

# Then build
npm run build:prod
```

Or use environment files:
- Create `.env.production` file
- Load with `dotenv` or similar
- Build script will inject variables

## Testing Checklist

Before deploying to stores:

- [ ] App builds without errors
- [ ] App installs on test devices
- [ ] All features work correctly
- [ ] Firebase connection works
- [ ] Authentication works
- [ ] Camera/photo features work
- [ ] Location/GPS features work
- [ ] Push notifications work (if implemented)
- [ ] App handles offline mode gracefully
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] UI looks correct on different screen sizes
- [ ] App doesn't crash on launch
- [ ] App doesn't crash when backgrounded/foregrounded

## Security Checklist

- [ ] API keys are not hardcoded
- [ ] Sensitive data is encrypted
- [ ] App uses HTTPS for all network requests
- [ ] Firebase Security Rules are deployed
- [ ] App permissions are properly requested
- [ ] No debug logs in production build
- [ ] ProGuard/R8 is enabled for Android (minification)

## Performance Optimization

- [ ] Images are optimized and compressed
- [ ] Lazy loading is implemented
- [ ] Bundle size is minimized
- [ ] Unused dependencies are removed
- [ ] Code splitting is implemented
- [ ] Service worker is configured (for PWA features)

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)

## Support

If you encounter issues:
1. Check Capacitor documentation
2. Review Android/iOS platform-specific guides
3. Check GitHub issues for Capacitor plugins
4. Review Firebase documentation for mobile setup


