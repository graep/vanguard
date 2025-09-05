// src/app/pages/login/login.page.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonIcon
} from "@ionic/angular/standalone";

type LoginMode = 'driver' | 'admin';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls:['./login.page.scss'],
  imports: [
    IonContent, 
    IonLabel, 
    IonItem, 
    IonButton,
    IonInput, 
    IonSegment, 
    IonSegmentButton,
    IonIcon,
    ReactiveFormsModule, 
    CommonModule
  ],
})
export class LoginPage {
  form = this.fb.group({
    mode: ['driver' as LoginMode, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  // Routes based on user role
  private routeByMode: Record<LoginMode, string> = {
    driver: '/van-selection',
    admin: '/admin-portal',
  };

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private toastCtrl: ToastController
  ) {}

  async submit() {
    if (this.form.invalid) return;

    const { email, password, mode } = this.form.value as {
      email: string; password: string; mode: LoginMode;
    };

    try {
      await this.auth.login(email, password);
      
      // Wait for user profile to load, then route based on actual role
      setTimeout(() => {
        // Check if your auth service has currentUserProfile$
        if (this.auth.currentUserProfile$) {
          const userProfile = this.auth.currentUserProfile$.value;
          if (userProfile) {
            // Route based on actual user role, not selected mode
            const route = userProfile.role === 'admin' ? '/admin-portal' : '/van-selection';
            this.router.navigateByUrl(route, { replaceUrl: true });
          } else {
            // Fallback to selected mode if profile not loaded
            this.router.navigateByUrl(this.routeByMode[mode], { replaceUrl: true });
          }
        } else {
          // If no profile system, just use selected mode
          this.router.navigateByUrl(this.routeByMode[mode], { replaceUrl: true });
        }
      }, 500);
      
    } catch (e: any) {
      this.showToast('Invalid email or password.', 'danger');
    }
  }

  // Navigate to signup page
  goToSignup() {
    this.router.navigate(['/signup']);
  }

  get mode(): LoginMode {
    return this.form.controls.mode.value as LoginMode;
  }

  get isDriverMode(): boolean {
    return this.mode === 'driver';
  }

  private async showToast(message: string, color: 'danger' | 'warning' | 'success' = 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    toast.present();
  }
}