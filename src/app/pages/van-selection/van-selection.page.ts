import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonItem, IonList, IonLabel, IonAccordionGroup, IonAccordion, IonButtons, IonButton, IonIcon, ModalController } from '@ionic/angular/standalone';
import { RouterModule, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import { NavService } from '@app/services/nav.service';
import { AddVanModalComponent } from '@app/components/add-van-modal/add-van-modal.component';

@Component({
  selector: 'app-van-selection',
  templateUrl: './van-selection.page.html',
  styleUrls: ['./van-selection.page.scss'],
  standalone: true,
  imports: [ IonLabel, IonAccordion, IonAccordionGroup,  IonList, IonItem, IonContent, IonIcon, CommonModule, RouterModule, AppHeaderComponent ]
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
    private auth: Auth,
    private navService: NavService,
    private modalCtrl: ModalController
  ) { }

  async logout() {
    await this.auth.signOut();
    this.navService.enhancedLogout(); // Clear both app and browser history
    this.router.navigate(['/login'], { replaceUrl: true });
  }
  selectVan(vanType: string, vanNumber: string) {
    this.router.navigate([
      '/photo-capture',
      vanType,
      vanNumber
    ], { replaceUrl: true });
  }

  async addVan(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddVanModalComponent,
      componentProps: {
        existingVans: [] // Empty array since we're using hardcoded data
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    
    if (data) {
      // Van was added successfully, add it to the end of the LMR list
      console.log('New van added:', data);
      
      // Add the new van number to the end of the LMR array
      if (data.type === 'LMR') {
        this.numbersMap['LMR'].push(data.number.toString());
      }
    }
  }
}
