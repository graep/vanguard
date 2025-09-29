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
  IonIcon,
} from '@ionic/angular/standalone';

type LoginMode = 'driver' | 'admin';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonContent,
    IonLabel,
    IonItem,
    IonButton,
    IonInput,
    IonSegment,
    IonSegmentButton,
    ReactiveFormsModule,
    CommonModule,
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
    admin: '/admin',
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
    email: string;
    password: string;
    mode: LoginMode;
  };

  try {
    await this.auth.login(email, password);

    // Wait for user profile to load before navigation to prevent race conditions
    const checkProfileAndNavigate = () => {
      const userProfile = this.auth.currentUserProfile$.value;
      if (userProfile) {
        // Check if user has permission for the selected mode
        if (mode === 'admin') {
          // User wants admin access - verify they have the right role
          const canAccessAdmin = this.auth.hasRole('admin') || this.auth.hasRole('owner');
          if (canAccessAdmin) {
            this.router.navigateByUrl('/admin', { replaceUrl: true });
          } else {
            this.showToast('You do not have admin privileges', 'danger');
            this.router.navigateByUrl('/van-selection', { replaceUrl: true });
          }
        } else {
          // User selected driver mode - anyone can act as a driver
          this.router.navigateByUrl('/van-selection', { replaceUrl: true });
        }
      } else {
        // Profile not loaded yet, wait a bit more
        setTimeout(checkProfileAndNavigate, 100);
      }
    };

    // Start checking after a short delay to allow profile to load
    setTimeout(checkProfileAndNavigate, 100);
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

  private async showToast(
    message: string,
    color: 'danger' | 'warning' | 'success' = 'danger'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    toast.present();
  }
}
