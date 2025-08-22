// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Auth, browserLocalPersistence, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { setPersistence } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Emits the currently signed-in user, or null */
  currentUser$ = new BehaviorSubject<User|null>(null);

  constructor(private auth: Auth) {
    // Keep BehaviorSubject in sync with Firebase Auth state
    setPersistence(this.auth, browserLocalPersistence);
    this.auth.onAuthStateChanged(user => this.currentUser$.next(user));
  }

  /** Sign in with email & password */
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /** Sign out the current user */
  logout() {
    return signOut(this.auth);
  }
}
