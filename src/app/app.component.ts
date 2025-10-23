import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { NavService } from './services/nav.service';
import { PwaBackButtonService } from './services/pwa-back-button.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(
    private navService: NavService,
    private pwaBackButtonService: PwaBackButtonService
  ) {
    // NavService constructor will automatically setup Android back button handling
    
    // Initialize PWA back button handling
    this.pwaBackButtonService.initialize();
  }
}
