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
      // IMPORTANT: Only create fallback if document truly doesn't exist
      // This prevents overwriting existing profiles due to race conditions or permission issues
      if (!profile && user && this.autoBackfillProfileIfMissing) {
        console.log('[AuthService] Profile not found, checking if document exists before creating fallback...', user.uid);
        try {
          const ref = doc(this.firestore, 'users', user.uid);
          
          // Use getDoc for a reliable one-time read (more reliable than docSnapshots for this check)
          // Wait a bit first to allow any pending writes to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const snap = await getDoc(ref);
          
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
                console.log('[AuthService] ✅ Preserving admin status from custom claims');
              } else if (claims?.['owner'] === true) {
                roles = ['owner', 'driver'];
                console.log('[AuthService] ✅ Preserving owner status from custom claims');
              } else {
                console.log('[AuthService] ℹ️ No admin/owner custom claims found, using default driver role');
              }
            } catch (tokenError) {
              console.warn('[AuthService] Could not check custom claims:', tokenError);
              // Continue with default driver role
            }
            
            const fallback: UserProfile = {
              uid: user.uid,
              email: user.email ?? '',
              displayName: user.displayName ?? 'User',
              roles: roles,
              isActive: true,
              createdAt: new Date(),
            };
            await setDoc(ref, fallback, { merge: false }); // Use merge: false since doc doesn't exist

            // Re-read with docData for the BehaviorSubject
            profile = await firstValueFrom(
              docData(ref).pipe(take(1), map(d => d as UserProfile))
            );
            console.log('[AuthService] ✅ Created fallback profile for user:', user.uid, 'with roles:', roles);
          } else {
            // Document exists but wasn't returned initially - re-read it
            profile = snap.data() as UserProfile;
            console.log('[AuthService] ✅ Profile found on second check (document exists):', user.uid);
            console.log('[AuthService] Profile data:', profile);
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
}
