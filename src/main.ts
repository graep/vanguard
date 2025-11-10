import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading, PreloadAllModules, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { initializeApp } from 'firebase/app';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideStorage } from '@angular/fire/storage';
import { getStorage } from 'firebase/storage';
import { provideFirestore } from '@angular/fire/firestore';
import { getFirestore } from 'firebase/firestore';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { provideAppCheck, ReCaptchaV3Provider, initializeAppCheck } from '@angular/fire/app-check';
import { ErrorHandler } from '@angular/core';
import { ServiceWorkerModule } from '@angular/service-worker';
import { isDevMode } from '@angular/core';

import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { ConfigService } from './app/services/config.service';
import { GlobalErrorHandlerService } from './app/services/error-handler.service';

// if (!environment.production) {
//   (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "7C52EA1A-9D71-459C-BDEB-6FC6D036D26D"; // or a specific token string
// }

// Initialize Firebase configuration securely
const configService = new ConfigService();
const firebaseConfig = configService.getFirebaseConfig();

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(),
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()),
    provideFirestore(() => getFirestore()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerImmediately'
    }),
    // App Check will be configured later when we have the site key
    // provideAppCheck(() =>
    //   initializeAppCheck(undefined, {
    //     provider: new ReCaptchaV3Provider(environment.appCheck.siteKey),
    //     isTokenAutoRefreshEnabled: true,
    //   })
    // ),
  ]
}).then(() => {
  defineCustomElements(window);
});
