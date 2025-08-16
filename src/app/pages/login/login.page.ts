import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import {
  IonNote,
  IonButton,
  IonItem,
  IonLabel,
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInput,
  IonSegment,
  IonSegmentButton
} from "@ionic/angular/standalone";

type LoginMode = 'driver' | 'admin';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls:['./login.page.scss'],
  imports: [
    IonContent, IonLabel, IonItem, IonButton,
    IonInput, IonSegment, IonSegmentButton, ReactiveFormsModule, CommonModule
  ],
})
export class LoginPage {
  form = this.fb.group({
    mode: ['driver' as LoginMode, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  // adjust these routes to match your app
  private routeByMode: Record<LoginMode, string> = {
    driver: '/van-selection',
    admin: '/admin-portal', // or '/admin'
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
      this.router.navigateByUrl(this.routeByMode[mode], { replaceUrl: true });
    } catch (e: any) {
      this.showToast('Invalid email or password.', 'danger');
    }
  }

  get mode(): LoginMode {
    return this.form.controls.mode.value as LoginMode;
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