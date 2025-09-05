// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { 
  Auth, 
  browserLocalPersistence, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  User 
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc 
} from '@angular/fire/firestore';
import { setPersistence } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';

// Export the UserProfile interface
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'driver' | 'admin';
  createdAt: Date;
  isActive: boolean;
  // Optional additional fields
  phoneNumber?: string;
  department?: string;
  employeeId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Emits the currently signed-in user, or null */
  currentUser$ = new BehaviorSubject<User|null>(null);
  
  /** Current user profile from Firestore */
  currentUserProfile$ = new BehaviorSubject<UserProfile|null>(null);

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    // Keep BehaviorSubject in sync with Firebase Auth state
    setPersistence(this.auth, browserLocalPersistence);
    this.auth.onAuthStateChanged(async (user) => {
      this.currentUser$.next(user);
      
      // Load user profile when auth state changes
      if (user) {
        await this.loadUserProfile(user.uid);
      } else {
        this.currentUserProfile$.next(null);
      }
    });
  }

  /** Sign in with email & password */
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /** Register new user with profile */
  async register(email: string, password: string, profileData: Omit<UserProfile, 'uid' | 'createdAt'>) {
    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // 2. Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        createdAt: new Date(),
        ...profileData,
        email: user.email || email  // Put email last to avoid conflicts
      };

      // 3. Save to Firestore users collection
      await setDoc(doc(this.firestore, 'users', user.uid), userProfile);

      // 4. Update local state
      this.currentUserProfile$.next(userProfile);

      return userCredential;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /** Load user profile from Firestore */
  private async loadUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const profileDoc = await getDoc(doc(this.firestore, 'users', uid));
      
      if (profileDoc.exists()) {
        const profile = profileDoc.data() as UserProfile;
        this.currentUserProfile$.next(profile);
        return profile;
      } else {
        console.warn('No profile found for user:', uid);
        this.currentUserProfile$.next(null);
        return null;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      this.currentUserProfile$.next(null);
      return null;
    }
  }

  /** Get user profile by UID */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const profileDoc = await getDoc(doc(this.firestore, 'users', uid));
      return profileDoc.exists() ? profileDoc.data() as UserProfile : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /** Check if current user is admin */
  get isAdmin(): boolean {
    const profile = this.currentUserProfile$.value;
    return profile?.role === 'admin' || false;
  }

  /** Check if current user is driver */
  get isDriver(): boolean {
    const profile = this.currentUserProfile$.value;
    return profile?.role === 'driver' || false;
  }

  /** Sign out the current user */
  logout() {
    return signOut(this.auth);
  }
}