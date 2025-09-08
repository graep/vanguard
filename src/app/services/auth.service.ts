// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import {
  Auth,
  User,
  authState,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  setDoc,
  docData,
  docSnapshots,
} from '@angular/fire/firestore';
import { setPersistence } from 'firebase/auth';
import {
  BehaviorSubject,
  of,
  switchMap,
  catchError,
  take,
  map,
  firstValueFrom,
} from 'rxjs';

// ---------- Roles & Profile Model ----------
export type Role = 'driver' | 'admin' | 'owner';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roles: Role[];          // <-- array of roles
  createdAt: Date;
  isActive: boolean;
  phoneNumber?: string;
  department?: string;
  employeeId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Firebase Auth user (raw) */
  readonly currentUser$ = new BehaviorSubject<User | null>(null);

  /** App profile (Firestore) */
  readonly currentUserProfile$ = new BehaviorSubject<UserProfile | null>(null);

  /** Set true if you want to auto-create a profile for legacy users who signed up before profiles existed */
  private readonly autoBackfillProfileIfMissing = true;

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    // Persist session
    setPersistence(this.auth as any, browserLocalPersistence);

    // React to sign-in / sign-out and load profile safely
    authState(this.auth).pipe(
      switchMap(user => {
        this.currentUser$.next(user);

        if (!user) {
          this.currentUserProfile$.next(null);
          return of(null);
        }

        // One-time doc snapshot (lets us check .exists() without raw getDoc)
        const ref = doc(this.firestore, 'users', user.uid);
        return docSnapshots(ref).pipe(
          take(1),
          map(snap => (snap.exists() ? (snap.data() as UserProfile) : null)),
          catchError(err => {
            console.error('[AuthService] profile read failed:', err);
            return of(null);
          })
        );
      })
    ).subscribe(async (profile) => {
      const user = this.currentUser$.value;

      // Optional self-heal for legacy accounts (no profile doc yet)
      if (!profile && user && this.autoBackfillProfileIfMissing) {
        try {
          const ref = doc(this.firestore, 'users', user.uid);
          const fallback: UserProfile = {
            uid: user.uid,
            email: user.email ?? '',
            displayName: user.displayName ?? 'User',
            roles: ['admin'],            // choose sensible default(s)
            isActive: true,
            createdAt: new Date(),
          };
          await setDoc(ref, fallback, { merge: true });

          // Re-read with docData for the BehaviorSubject
          profile = await firstValueFrom(
            docData(ref).pipe(take(1), map(d => d as UserProfile))
          );
        } catch (e) {
          console.warn('[AuthService] No profile found and backfill failed:', e);
        }
      }

      if (user && !profile) {
        console.warn('[AuthService] No profile found for user:', user.uid);
      }
      this.currentUserProfile$.next(profile);
    });
  }

  // ---------- Auth actions ----------

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Register and create Firestore profile.
   * Pass roles array via profileData (e.g., roles: ['driver'] or ['admin','driver'])
   */
  async register(
    email: string,
    password: string,
    profileData: Omit<UserProfile, 'uid' | 'createdAt' | 'email'>
  ) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;

    const profile: UserProfile = {
      uid,
      email: cred.user.email ?? email,
      createdAt: new Date(),
      ...profileData,   // includes roles: [...]
    };

    await setDoc(doc(this.firestore, 'users', uid), profile, { merge: true });

    // Optimistically update (authState will refresh it anyway)
    this.currentUserProfile$.next(profile);
    return cred;
  }

  logout() {
    return signOut(this.auth);
  }

  // ---------- Role helpers ----------

  hasRole(role: Role): boolean {
    const roles = this.currentUserProfile$.value?.roles ?? [];
    return roles.includes(role);
  }

  get isAdmin(): boolean { return this.hasRole('admin'); }
  get isDriver(): boolean { return this.hasRole('driver'); }
  get isOwner(): boolean { return this.hasRole('owner'); }

  // ---------- One-off profile read (Promise) ----------

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const ref = doc(this.firestore, 'users', uid);
      const snap = await firstValueFrom(docSnapshots(ref).pipe(take(1)));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (e) {
      console.error('[AuthService] getUserProfile failed:', e);
      return null;
    }
  }
}
