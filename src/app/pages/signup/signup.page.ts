import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppHeaderComponent } from '@app/components/app-header/app-header.component';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonNote,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { AuthService, UserProfile } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.page.html',
  styleUrls: ['./signup.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonNote,
    AppHeaderComponent
  ]
})
export class SignupPage implements OnInit {
  signupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {
    this.signupForm = this.createForm();
  }

  ngOnInit() {}

  private createForm(): FormGroup {
    return this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(1)]],
      lastName: ['', [Validators.required, Validators.minLength(1)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      phoneNumber: [''],
      employeeId: ['']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  get passwordMismatch(): boolean {
    return this.signupForm?.get('confirmPassword')?.hasError('passwordMismatch') || false;
  }

  get canSubmit(): boolean {
    return this.signupForm?.valid && !this.passwordMismatch;
  }

  async signup() {
    if (!this.canSubmit) return;

    const loading = await this.loadingCtrl.create({
      message: 'Creating your account...'
    });
    await loading.present();

    try {
      const formValue = this.signupForm.value;
      
      // Compute displayName from firstName and lastName for backward compatibility
      const displayName = `${formValue.firstName} ${formValue.lastName}`.trim();
      
      const profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'email'> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        displayName: displayName, // Keep for backward compatibility
        roles: ['driver'], // SECURITY FIX: Only assign driver role by default
        isActive: true,
        phoneNumber: formValue.phoneNumber,
        employeeId: formValue.employeeId
      };

      await this.authService.register(formValue.email, formValue.password, profileData);
      await loading.dismiss();

      const toast = await this.toastCtrl.create({
        message: 'Account created successfully! Welcome to Vanguard!',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      this.router.navigateByUrl('/van-selection', { replaceUrl: true });

    } catch (error: any) {
      await loading.dismiss();

      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }

      const toast = await this.toastCtrl.create({
        message: errorMessage,
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}