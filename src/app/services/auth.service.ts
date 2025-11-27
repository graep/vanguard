// src/app/services/auth.service.ts
import { Injectable, NgZone } from '@angular/core';
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
  getDoc,
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
  from,
} from 'rxjs';

// ---------- Roles & Profile Model ----------
export type Role = 'driver' | 'admin' | 'owner';

export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;  // Optional for backward compatibility, computed from firstName + lastName
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
    private firestore: Firestore,
    private ngZone: NgZone
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
      // IMPORTANT: Only create fallback if document truly doesn't exist
      // This prevents overwriting existing profiles due to race conditions or permission issues
      if (!profile && user && this.autoBackfillProfileIfMissing) {
        try {
          const ref = doc(this.firestore, 'users', user.uid);
          
          // Use getDoc for a reliable one-time read (more reliable than docSnapshots for this check)
          // Wait a bit first to allow any pending writes to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Wrap in NgZone to ensure Firebase API is called within injection context
          const snap = await this.ngZone.run(() => getDoc(ref));
          
          // Only create fallback if document truly doesn't exist
          if (!snap.exists()) {
            console.warn('[AuthService] ⚠️ Profile document does not exist for user:', user.uid);
            console.warn('[AuthService] This might indicate the profile was deleted or never created');
            
            // Check Firebase Auth custom claims to preserve admin/owner status
            // This prevents losing admin privileges if profile was accidentally deleted
            let roles: Role[] = ['driver']; // Default to driver only
            try {
              const idTokenResult = await user.getIdTokenResult();
              const claims = idTokenResult.claims;
              
              // Preserve admin/owner status from custom claims
              if (claims?.['admin'] === true) {
                roles = ['admin', 'driver'];
              } else if (claims?.['owner'] === true) {
                roles = ['owner', 'driver'];
              }
            } catch (tokenError) {
              console.warn('[AuthService] Could not check custom claims:', tokenError);
              // Continue with default driver role
            }
            
            // For legacy users, try to parse displayName into firstName/lastName
            const legacyDisplayName = user.displayName ?? 'User';
            const nameParts = legacyDisplayName.trim().split(/\s+/);
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            const fallback: UserProfile = {
              uid: user.uid,
              email: user.email ?? '',
              firstName: firstName,
              lastName: lastName,
              displayName: legacyDisplayName, // Keep for backward compatibility
              roles: roles,
              isActive: true,
              createdAt: new Date(),
            };
            await setDoc(ref, fallback, { merge: false }); // Use merge: false since doc doesn't exist

            // Re-read with docData for the BehaviorSubject
            profile = await firstValueFrom(
              docData(ref).pipe(take(1), map(d => d as UserProfile))
            );
          } else {
            // Document exists but wasn't returned initially - re-read it
            profile = snap.data() as UserProfile;
          }
        } catch (e: any) {
          console.error('[AuthService] ❌ Profile backfill check failed:', e);
          console.error('[AuthService] Error code:', e?.code, 'Error message:', e?.message);
          // Don't create fallback on error - might be a permission issue
          // This prevents accidentally overwriting profiles due to permission errors
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

  /**
   * Get display name from user profile.
   * Uses firstName + lastName if available, falls back to displayName, then email username.
   */
  getDisplayName(profile: UserProfile | null | undefined): string {
    if (!profile) return 'User';
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`.trim();
    }
    if (profile.firstName) {
      return profile.firstName;
    }
    if (profile.displayName) {
      return profile.displayName;
    }
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  }

  /**
   * Get first name from user profile.
   * Uses firstName if available, falls back to first word of displayName, then email username.
   */
  getFirstName(profile: UserProfile | null | undefined): string {
    if (!profile) return 'User';
    if (profile.firstName) {
      return profile.firstName;
    }
    if (profile.displayName) {
      return profile.displayName.split(' ')[0] || 'User';
    }
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  }
}
