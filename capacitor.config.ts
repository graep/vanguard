import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vanguard.fleet.inspection',
  appName: 'Vanguard Fleet',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false
    },
    StatusBar: {
      backgroundColor: "#0B1A2A",
      style: "LIGHT",
      overlaysWebView: false
    },
    Camera: {
      permissions: ['camera']
    }
  }
};

export default config;
