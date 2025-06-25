// src/app/services/inspection.service.ts
import { Injectable } from '@angular/core';

// Firebase Storage
import { Storage, ref, uploadString, getDownloadURL } from '@angular/fire/storage';

// AngularFire Firestore
import {
  Firestore,
  collection,     // this one comes from '@angular/fire/firestore'
  addDoc,
  serverTimestamp
} from '@angular/fire/firestore';

// Firestore SDK for getDocs
import { getDocs } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class InspectionService {
  constructor(
    private storage: Storage,
    private firestore: Firestore
  ) {}

  /**
   * Uploads a base64/URI photo string to Storage and returns its download URL
   */
  async uploadPhoto(
    vanType: string,
    vanNumber: string,
    side: string,
    dataUrl: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '');
    const path = `inspections/${vanType}/${vanNumber}/${side}_${timestamp}.jpg`;
    const storageRef = ref(this.storage, path);

    // dataUrl is like "data:image/jpeg;base64,...."
    await uploadString(storageRef, dataUrl, 'data_url');

    // Return the publicly-readable URL
    return getDownloadURL(storageRef);
  }

  /**
   * Saves a record in Firestore linking to the photos
   */
  async saveInspection(
    vanType: string,
    vanNumber: string,
    photoUrls: Record<string,string>
  ): Promise<void> {
    const colRef = collection(this.firestore, 'inspections');
    await addDoc(colRef, {
      vanType,
      vanNumber,
      photos: photoUrls,    // { front: url, rear: url, ... }
      createdAt: serverTimestamp()
    });
  }

  /**
   * Fetches all inspection documents from Firestore
   */
  async getAllInspections(): Promise<any[]> {
    const colRef = collection(this.firestore, 'inspections');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}
