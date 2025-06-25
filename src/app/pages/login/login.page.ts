import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { IonNote, IonButton, IonItem, IonLabel, IonContent, IonHeader, IonToolbar, IonTitle, IonInput } from "@ionic/angular/standalone";

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls:['./login.page.scss'],
  imports: [IonTitle, IonToolbar, IonHeader, IonContent, IonLabel, IonItem, IonButton, IonNote, IonInput, ReactiveFormsModule, CommonModule],
})
export class LoginPage {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private toastCtrl: ToastController) {}

  async submit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    try {
      await this.auth.login(email!, password!);
      this.router.navigateByUrl('/van-selection', { replaceUrl: true });
    } catch (e: any) {
      this.showToast('Invalid email or password.', 'danger');
    }
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

