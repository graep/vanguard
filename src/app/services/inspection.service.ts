// src/app/services/inspection.service.ts
import { Injectable, NgZone, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  CollectionReference,
  getDoc,
  getDocs,
  collectionData,
  increment,
} from '@angular/fire/firestore';
import { Observable, combineLatest, from } from 'rxjs';
import { map, filter, switchMap } from 'rxjs/operators';
import { Timestamp } from 'firebase/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { getIdTokenResult } from 'firebase/auth';

export interface ReportedIssue {
  name: string;
  subcategory?: string;
  details: string;
  severity?: 'high' | 'medium' | 'low';
  status?: 'open' | 'resolved';
  resolvedDate?: Date;
  resolvedBy?: string;
  photoUrl?: string; // NEW: Optional photo URL for issues
}

export interface Inspection {
  id: string;
  vanType: string;
  vanNumber: string;
  photos: Record<string, string>;
  createdAt: any;
  status: 'pending' | 'approved' | 'rejected';
  report?: ReportedIssue[];
  reportSubmittedAt?: any;
  reviewedAt?: any;
  rejectReason?: string | null;
  seen?: boolean;
  createdBy?: string | null;
  milesDriven?: number; // NEW: Track mileage for this inspection
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  private storage = inject(Storage);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private ngZone = inject(NgZone);

  private get col(): CollectionReference {
    return collection(this.firestore, 'inspections') as CollectionReference;
  }

  private normalizeVanNumber(vanNumber: string): string {
    return vanNumber.replace(/^0+/, '') || '0';
  }

  /** Upload a single photo and return its URL */
  async uploadPhoto(
    vanType: string, 
    vanNumber: string, 
    side: string, 
    dataUrl: string
  ): Promise<string> {
    console.log(`[InspectionService] Starting upload for ${side} photo`);
    
    // Check authentication first
    const ownerUid = this.auth.currentUser?.uid;
    if (!ownerUid) {
      console.error('[InspectionService] User not authenticated');
      throw new Error('Not authenticated - please log in again');
    }
    
    console.log(`[InspectionService] User authenticated: ${ownerUid}`);
    console.log(`[InspectionService] Auth state:`, {
      uid: this.auth.currentUser?.uid,
      email: this.auth.currentUser?.email,
      emailVerified: this.auth.currentUser?.emailVerified,
      isAnonymous: this.auth.currentUser?.isAnonymous
    });

    const fileName = `${side}_${Date.now()}.jpg`;
    const path = `inspections/${vanType}/${vanNumber}/${fileName}`;
    console.log(`[InspectionService] Upload path: ${path}`);
    
    const storageRef = ref(this.storage, path);

    try {
      const blob = await (await fetch(dataUrl)).blob();
      const contentType = blob.type?.startsWith('image/') ? blob.type : 'image/jpeg';
      
      console.log(`[InspectionService] Blob size: ${blob.size} bytes, type: ${contentType}`);
      
      if (blob.size >= 8 * 1024 * 1024) {
        throw new Error('Image is larger than 8 MB.');
      }

      console.log(`[InspectionService] Uploading to Firebase Storage...`);
      console.log(`[InspectionService] Upload details:`, {
        path,
        blobSize: blob.size,
        contentType,
        ownerUid,
        vanType,
        vanNumber,
        side
      });
      
      const snap = await uploadBytes(storageRef, blob, {
        contentType,
        customMetadata: { 
          ownerUid,
          uploadedAt: new Date().toISOString(),
          vanType,
          vanNumber,
          side
        },
      });

      console.log(`[InspectionService] Upload successful, getting download URL...`);
      const downloadURL = await getDownloadURL(snap.ref);
      console.log(`[InspectionService] Download URL obtained: ${downloadURL}`);
      
      return downloadURL;
    } catch (error) {
      console.error(`[InspectionService] Upload failed for ${side}:`, error);
      
      // Type-safe error handling with more detailed logging
      const firebaseError = error as any;
      console.error(`[InspectionService] Full error object:`, error);
      console.error(`[InspectionService] Error details:`, {
        code: firebaseError?.code,
        message: firebaseError?.message,
        serverResponse: firebaseError?.serverResponse,
        customData: firebaseError?.customData,
        name: firebaseError?.name,
        stack: firebaseError?.stack
      });
      
      // Check if it's a Firebase Storage error
      if (firebaseError?.code) {
        console.error(`[InspectionService] Firebase error code: ${firebaseError.code}`);
      }
      
      // Re-throw with more context
      const errorMessage = firebaseError?.message || String(error);
      throw new Error(`Upload failed for ${side}: ${errorMessage}`);
    }
  }

  /** Create inspection document with photos */
  async saveInspection(
    vanType: string, 
    vanNumber: string, 
    photoUrls: Record<string, string>
  ): Promise<string> {
    const normalizedVanNumber = this.normalizeVanNumber(vanNumber);
    const createdBy = this.auth.currentUser?.uid ?? null;
    
    const docRef = await addDoc(this.col, {
      vanType,
      vanNumber: normalizedVanNumber,
      photos: photoUrls,
      createdAt: serverTimestamp(),
      status: 'pending',
      seen: false,
      createdBy,
    });
    
    return docRef.id;
  }

  /** Add user's report to existing inspection */
  async saveReport(inspectionId: string, reported: ReportedIssue[]): Promise<void> {
    await updateDoc(doc(this.firestore, 'inspections', inspectionId), {
      report: reported,
      reportSubmittedAt: serverTimestamp(),
    });
  }

  /** Admin actions */
  async approveInspection(id: string): Promise<void> {
    console.log('Approving inspection:', id);
    await updateDoc(doc(this.firestore, 'inspections', id), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      rejectReason: null,
    });
    console.log('Inspection approved successfully:', id);
  }

  async rejectInspection(id: string, reason?: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'inspections', id), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      rejectReason: reason ?? null,
    });
  }

  async markSeen(id: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'inspections', id), { seen: true });
  }

  /** Get inspection by ID */
  async getInspectionById(id: string): Promise<Inspection | null> {
    const snap = await getDoc(doc(this.firestore, 'inspections', id));
    return snap.exists() 
      ? ({ id: snap.id, ...snap.data() } as Inspection) 
      : null;
  }

  /** Get latest inspection ID for a van */
  async getLatestInspectionId(vanType: string, vanNumber: string): Promise<string | null> {
    const normalizedVanNumber = this.normalizeVanNumber(vanNumber);
    const snaps = await getDocs(
      query(
        this.col,
        where('vanType', '==', vanType),
        where('vanNumber', '==', normalizedVanNumber),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
    );
    return snaps.empty ? null : snaps.docs[0].id;
  }

  /** Get latest inspections for a specific van */
  async getLatestInspectionsByVan(
    vanType: string, 
    vanNumber: string, 
    n = 2
  ): Promise<Inspection[]> {
    const normalizedVanNumber = this.normalizeVanNumber(vanNumber);
    const snaps = await getDocs(
      query(
        this.col,
        where('vanType', '==', vanType),
        where('vanNumber', '==', normalizedVanNumber),
        orderBy('createdAt', 'desc'),
        limit(n)
      )
    );

    return snaps.docs.map(d => ({
      ...(d.data() as Omit<Inspection, 'id'>),
      id: d.id
    }));
  }

  /** Stream pending submissions with NgZone */
  pendingSubmissions$(onlyUnseen = true, pageSize = 25): Observable<Inspection[]> {
    const base = query(
      this.col, 
      where('status', '==', 'pending'), 
      orderBy('createdAt', 'desc'), 
      limit(pageSize)
    );
    
    const q = onlyUnseen 
      ? query(base, where('seen', '==', false)) 
      : base;
    
    // Wrap in NgZone to fix the warning
    return new Observable(observer => {
      const unsubscribe = collectionData(q, { idField: 'id' }).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            observer.next(data as Inspection[]);
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

  /** Stream today's or unviewed yesterday's inspections */
  streamTodayOrUnviewedYesterday(pageSize = 20): Observable<Inspection[]> {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);

    const qToday = query(
      this.col, 
      where('createdAt', '>=', Timestamp.fromDate(startToday)), 
      orderBy('createdAt', 'desc'), 
      limit(pageSize)
    );
    
    const qYestUnseen = query(
      this.col,
      where('createdAt', '>=', Timestamp.fromDate(startYesterday)),
      where('createdAt', '<', Timestamp.fromDate(startToday)),
      where('seen', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    // Wrap both observables in NgZone
    const today$ = new Observable<Inspection[]>(observer => {
      const unsubscribe = collectionData(qToday, { idField: 'id' }).subscribe({
        next: (data) => {
          this.ngZone.run(() => observer.next(data as Inspection[]));
        },
        error: (error) => {
          this.ngZone.run(() => observer.error(error));
        }
      });
      return () => unsubscribe.unsubscribe();
    });

    const yest$ = new Observable<Inspection[]>(observer => {
      const unsubscribe = collectionData(qYestUnseen, { idField: 'id' }).subscribe({
        next: (data) => {
          this.ngZone.run(() => observer.next(data as Inspection[]));
        },
        error: (error) => {
          this.ngZone.run(() => observer.error(error));
        }
      });
      return () => unsubscribe.unsubscribe();
    });

    return combineLatest([today$, yest$]).pipe(
      map(([todayItems, yesterdayItems]) => {
        const uniqueItems = new Map<string, Inspection>();
        [...todayItems, ...yesterdayItems].forEach(item => {
          uniqueItems.set(item.id, item);
        });
        return Array.from(uniqueItems.values()).sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      })
    );
  }

  /** Stream recent submissions based on user role */
  recentSubmissions$(max = 10): Observable<Inspection[]> {
    return authState(this.auth).pipe(
      filter((user): user is NonNullable<typeof user> => !!user),
      switchMap(user =>
        from(getIdTokenResult(user)).pipe(
          map(tokenResult => !!tokenResult.claims['admin']),
          switchMap(isAdmin => {
            const q = isAdmin
              ? query(this.col, orderBy('createdAt', 'desc'), limit(max))
              : query(this.col, where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'), limit(max));
            
            // Wrap in NgZone
            return new Observable<Inspection[]>(observer => {
              const unsubscribe = collectionData(q, { idField: 'id' }).subscribe({
                next: (data) => {
                  this.ngZone.run(() => {
                    observer.next(data as Inspection[]);
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
          })
        )
      )
    );
  }

  /** Get all approved inspections for a specific van */
  async getApprovedInspectionsByVan(vanType: string, vanNumber: string): Promise<Inspection[]> {
    const normalizedVanNumber = this.normalizeVanNumber(vanNumber);
    console.log('Querying approved inspections for:', { vanType, vanNumber, normalizedVanNumber });
    
    const q = query(
      this.col,
      where('vanType', '==', vanType),
      where('vanNumber', '==', normalizedVanNumber),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const inspections = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Inspection[];
    
    console.log('Found approved inspections:', inspections);
    return inspections;
  }

  /** Get van data by document ID */
  async getVanByDocId(vanId: string): Promise<{vanType: string, vanNumber: string} | null> {
    try {
      const vanDocRef = doc(this.firestore, 'vans', vanId);
      const vanDoc = await getDoc(vanDocRef);
      
      if (vanDoc.exists()) {
        const data = vanDoc.data();
        return {
          vanType: data['type'] || data['vanType'], // Support both field names
          vanNumber: data['number']?.toString() || data['vanNumber'] // Support both field names and convert number to string
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get van data:', error);
      return null;
    }
  }

  /** Mark a specific issue as resolved in an inspection */
  async markIssueResolved(inspectionId: string, issueName: string): Promise<void> {
    try {
      const inspectionRef = doc(this.firestore, 'inspections', inspectionId);
      const inspectionDoc = await getDoc(inspectionRef);
      
      if (!inspectionDoc.exists()) {
        throw new Error('Inspection not found');
      }
      
      const data = inspectionDoc.data();
      const report = data['report'] || [];
      
      // Find and update the specific issue
      const updatedReport = report.map((issue: ReportedIssue) => {
        if (issue.name === issueName) {
          return {
            ...issue,
            status: 'resolved',
            resolvedDate: new Date(),
            resolvedBy: this.auth.currentUser?.uid || 'unknown'
          };
        }
        return issue;
      });
      
      // Update the inspection document
      await updateDoc(inspectionRef, {
        report: updatedReport
      });
      
      console.log('Issue marked as resolved:', { inspectionId, issueName });
    } catch (error) {
      console.error('Failed to mark issue as resolved:', error);
      throw error;
    }
  }

  /** Update van mileage with miles driven during shift */
  async updateVanMileage(vanId: string, miles: number): Promise<void> {
    try {
      const vanRef = doc(this.firestore, 'vans', vanId);
      await updateDoc(vanRef, {
        estimatedMiles: increment(miles)
      });
      console.log('Van mileage updated:', { vanId, miles });
    } catch (error) {
      console.error('Failed to update van mileage:', error);
      throw error;
    }
  }

  /** Save inspection with mileage data */
  async saveInspectionWithMileage(
    vanType: string, 
    vanNumber: string, 
    photoUrls: Record<string, string>,
    milesDriven: number
  ): Promise<string> {
    const normalizedVanNumber = this.normalizeVanNumber(vanNumber);
    const createdBy = this.auth.currentUser?.uid ?? null;
    
    const docRef = await addDoc(this.col, {
      vanType,
      vanNumber: normalizedVanNumber,
      photos: photoUrls,
      milesDriven, // NEW: Include mileage in inspection
      createdAt: serverTimestamp(),
      status: 'pending',
      seen: false,
      createdBy,
    });
    
    return docRef.id;
  }
}