// src/app/services/inspection.service.ts
import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
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
  collectionData
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, firstValueFrom, from, filter, switchMap } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { getIdTokenResult } from 'firebase/auth';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'all';

export interface ReportedIssue {
  name: string;
  subcategory?: string;
  details: string;
}

export interface Inspection {
  id: string;
  vanType: string;
  vanNumber: string;
  photos: Record<string, string>;
  createdAt: any; // Firestore Timestamp
  status: 'pending' | 'approved' | 'rejected';
  report?: ReportedIssue[];
  reportSubmittedAt?: any;
  reviewedAt?: any;
  rejectReason?: string | null;
  seen?: boolean; // admin has viewed
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  private col: CollectionReference;
  private env = inject(EnvironmentInjector);

  constructor(
    private storage: Storage,
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.col = collection(this.firestore, 'inspections') as CollectionReference;
  }

  /** Upload a single photo and return its URL */
async uploadPhoto(
  vanType: string,
  vanNumber: string,
  side: string,
  dataUrl: string
): Promise<string> {
  // ---- path MUST be: inspections/{vanType}/{vanNumber}/{file}  (no extra folders)
  const fileName = `${side}_${Date.now()}.jpg`;
  const path = `inspections/${vanType}/${vanNumber}/${fileName}`;
  const storageRef = ref(this.storage, path);

  // Convert data URL -> Blob and ensure it's image/*
  const blob = await (await fetch(dataUrl)).blob();
  const contentType = blob.type?.startsWith('image/') ? blob.type : 'image/jpeg';

  // Rules require ownerUid in *custom metadata* and size < 8MB
  const ownerUid = this.auth.currentUser?.uid ?? '';
  if (!ownerUid) throw new Error('Not authenticated');

  if (blob.size >= 8 * 1024 * 1024) {
    throw new Error('Image is larger than 8 MB. Lower camera quality.');
  }

  // Wrap AngularFire calls so you don’t get “outside injection context” warnings
  const snap = await runInInjectionContext(this.env, () =>
    uploadBytes(storageRef, blob, {
      contentType,
      customMetadata: { ownerUid }  // <— satisfies your rule: request.resource.metadata.ownerUid == auth.uid
    })
  );

  const url = await runInInjectionContext(this.env, () =>
    getDownloadURL(snap.ref)
  );

  return url;
}
  /** Step 1: create the inspection doc with photos only */
async saveInspection(
  vanType: string,
  vanNumber: string,
  photoUrls: Record<string, string>
): Promise<string> {
  const createdBy = this.auth.currentUser?.uid ?? null;
  const docRef = await addDoc(this.col, {
    vanType,
    vanNumber,
    photos: photoUrls,
    createdAt: serverTimestamp(),
    status: 'pending',
    seen: false,
    createdBy,                 // <— helps with user-scoped queries/rules
  });
  return docRef.id;
}
  /** Step 2: merge in user’s report */
  async saveReport(inspectionId: string, reported: ReportedIssue[]): Promise<void> {
    const ref = doc(this.firestore, 'inspections', inspectionId);
    await updateDoc(ref, {
      report: reported,
      reportSubmittedAt: serverTimestamp()
    });
  }

  pendingCount$(onlyUnseen = true) {
  const base = query(
    this.col,
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const q = onlyUnseen ? query(base, where('seen', '==', false)) : base;
  return (collectionData(q, { idField: 'id' }) as Observable<Inspection[]>)
    .pipe(map(list => list.length));
}

  pendingSubmissions$(onlyUnseen = true, pageSize = 25) {
    const base = query(
      this.col,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    const q = onlyUnseen ? query(base, where('seen', '==', false)) : base;
    return collectionData(q, { idField: 'id' }) as Observable<Inspection[]>;
  }

  /** Approve / Reject */
  approveInspection(id: string) {
    return updateDoc(doc(this.firestore, 'inspections', id), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      rejectReason: null
    });
  }

  rejectInspection(id: string, reason?: string) {
    return updateDoc(doc(this.firestore, 'inspections', id), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      rejectReason: reason ?? null
    });
  }

  /** Mark as seen (admin opened) */
  markSeen(id: string) {
    return updateDoc(doc(this.firestore, 'inspections', id), { seen: true });
  }

  /** (Legacy) fetch all */
  async getAllInspections(): Promise<any[]> {
    return firstValueFrom(collectionData(this.col, { idField: 'id' }));
  }

  // ---- Dashboard stream helpers ----
  private getDayBounds() {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    return {
      startToday: Timestamp.fromDate(startToday),
      startYesterday: Timestamp.fromDate(startYesterday)
    };
  }

  /** Stream: items from today OR unseen from yesterday (newest first) */
  streamTodayOrUnviewedYesterday(pageSize = 20): Observable<Inspection[]> {
    const { startToday, startYesterday } = this.getDayBounds();

    const qToday = query(
      this.col,
      where('createdAt', '>=', startToday),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const qYestUnseen = query(
      this.col,
      where('createdAt', '>=', startYesterday),
      where('createdAt', '<', startToday),
      where('seen', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const today$ = collectionData(qToday, { idField: 'id' }) as Observable<Inspection[]>;
    const yest$  = collectionData(qYestUnseen, { idField: 'id' }) as Observable<Inspection[]>;

    return combineLatest([today$, yest$]).pipe(
      map(([a, b]) => {
        const m = new Map<string, Inspection>();
        [...a, ...b].forEach(x => m.set(x.id, x));
        return Array.from(m.values()).sort(
          (x, y) => (y.createdAt?.toMillis?.() ?? 0) - (x.createdAt?.toMillis?.() ?? 0)
        );
      })
    );
  }

  /** Recent submissions stream
   *  - Admins see all recent inspections
   *  - Non-admins see only their own
   *  - Waits for Auth to resolve before querying
   */
  recentSubmissions$(max = 10): Observable<Inspection[]> {
    return authState(this.auth).pipe(
      filter((u): u is NonNullable<typeof u> => !!u),
      switchMap(user =>
        from(getIdTokenResult(user)).pipe(
          map(res => !!res.claims['admin']),
          switchMap(isAdmin => {
            const q = isAdmin
              ? query(this.col, orderBy('createdAt', 'desc'), limit(max)) // admin: all
              : query(
                  this.col,
                  where('createdBy', '==', user.uid),                       // user: own
                  orderBy('createdAt', 'desc'),
                  limit(max)
                );
            return collectionData(q, { idField: 'id' }) as Observable<Inspection[]>;
          })
        )
      )
    );
  }
}
