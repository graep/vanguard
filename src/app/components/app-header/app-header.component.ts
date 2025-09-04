import { Component, Input } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  @Input() title = '';
  @Input() showLogout = true;

  constructor(
    private auth: Auth, 
    private router: Router,
    private location: Location
  ) {}

  goBack() {
    this.location.back();
  }
  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
