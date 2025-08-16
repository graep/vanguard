import { Component, OnInit } from '@angular/core';
import { IonicModule } from "@ionic/angular";
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-navbar',
  standalone: true,
  imports: [IonicModule, CommonModule ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  today = new Date();

  constructor( 
    private auth: Auth,
    private router: Router
   ) {}

  ngOnInit() {}

  onDateClick() {
    console.log('Date clicked:', this.today);
  }
    async logout() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}