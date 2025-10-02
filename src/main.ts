import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withPreloading, PreloadAllModules, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp } from 'firebase/app';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideStorage } from '@angular/fire/storage';
import { getStorage } from 'firebase/storage';
import { provideFirestore } from '@angular/fire/firestore';
import { getFirestore } from 'firebase/firestore';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { provideAppCheck, ReCaptchaV3Provider, initializeAppCheck } from '@angular/fire/app-check';

import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { environment } from './environments/environment';

// if (!environment.production) {
//   (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "7C52EA1A-9D71-459C-BDEB-6FC6D036D26D"; // or a specific token string
// }

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular(),
    provideHttpClient(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()),
    provideFirestore(() => getFirestore()),
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
