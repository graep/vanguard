import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonList, IonLabel, IonAccordionGroup, IonAccordion, IonButtons, IonButton, IonIcon } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';

@Component({
  selector: 'app-van-selection',
  templateUrl: './van-selection.page.html',
  styleUrls: ['./van-selection.page.scss'],
  standalone: true,
  imports: [ IonLabel, IonAccordion, IonAccordionGroup,  IonList, IonItem, IonContent, CommonModule, RouterModule, AppHeaderComponent ]
})
export class VanSelectionPage {
  vans = ['EDV', 'CDV', 'LMR'];

   numbersMap: Record<string,string[]> = {
    EDV: Array.from({ length: 14 }, (_, i) => (i + 1).toString()),
    CDV: Array.from({ length: 10 }, (_, i) => (i + 2).toString()),
    LMR: ['5217', '7500', '3139']
  };

  constructor(
    private router: Router,
    private auth: Auth
  ) { }

  async logout() {
  await this.auth.signOut();
  this.router.navigate(['/login']);
}
  selectVan(vanType: string, vanNumber: string) {
    this.router.navigate([
      '/photo-capture',
      vanType,
      vanNumber
    ], { replaceUrl: true });
  }
}
