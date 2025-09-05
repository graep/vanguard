// src/app/services/user-management.service.ts
import { Injectable } from '@angular/core';
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

  constructor(private firestore: Firestore) {}

  /** Get all users */
  getAllUsers(): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>;
  }

  /** Get users by role */
  getUsersByRole(role: 'driver' | 'admin'): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('role', '==', role), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>;
  }

  /** Get active users only */
  getActiveUsers(): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(usersRef, where('isActive', '==', true), orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<UserProfile[]>;
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