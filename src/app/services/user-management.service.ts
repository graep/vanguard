// src/app/services/user-management.service.ts
import { Injectable, NgZone, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { UserProfile } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  // Modern inject() pattern
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  /** Get all users with NgZone wrapper */
  getAllUsers(): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    
    return new Observable(observer => {
      const unsubscribe = collectionData(q, { idField: 'id' }).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            observer.next(data as UserProfile[]);
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            observer.error(error);
          });
        },
        complete: () => {
          this.ngZone.run(() => {
            observer.complete();
          });
        }
      });
      
      return () => unsubscribe.unsubscribe();
    });
  }

  /** Get users by role with NgZone wrapper */
  getUsersByRole(role: 'driver' | 'admin'): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(
      usersRef, 
      where('role', '==', role), 
      orderBy('createdAt', 'desc')
    );
    
    return new Observable(observer => {
      const unsubscribe = collectionData(q, { idField: 'id' }).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            observer.next(data as UserProfile[]);
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            observer.error(error);
          });
        },
        complete: () => {
          this.ngZone.run(() => {
            observer.complete();
          });
        }
      });
      
      return () => unsubscribe.unsubscribe();
    });
  }

  /** Get active users only with NgZone wrapper */
  getActiveUsers(): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(
      usersRef, 
      where('isActive', '==', true), 
      orderBy('createdAt', 'desc')
    );
    
    return new Observable(observer => {
      const unsubscribe = collectionData(q, { idField: 'id' }).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            observer.next(data as UserProfile[]);
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            observer.error(error);
          });
        },
        complete: () => {
          this.ngZone.run(() => {
            observer.complete();
          });
        }
      });
      
      return () => unsubscribe.unsubscribe();
    });
  }

  /** Update user profile */
  async updateUser(uid: string, updates: Partial<UserProfile>): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    await updateDoc(userRef, updates);
  }

  /** Toggle user active status */
  async toggleUserStatus(uid: string, isActive: boolean): Promise<void> {
    await this.updateUser(uid, { isActive });
  }

  /** Delete user profile (Note: This doesn't delete Firebase Auth user) */
  async deleteUserProfile(uid: string): Promise<void> {
    const userRef = doc(this.firestore, 'users', uid);
    await deleteDoc(userRef);
  }
}