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
  getDocs,
  collectionData,
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, from, filter, switchMap } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { getIdTokenResult } from 'firebase/auth';

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
  createdAt: any;
  status: 'pending' | 'approved' | 'rejected';
  report?: ReportedIssue[];
  reportSubmittedAt?: any;
  reviewedAt?: any;
  rejectReason?: string | null;
  seen?: boolean;
}

@Injectable({ providedIn: 'root' })
export class InspectionService {
  private storage = inject(Storage);
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private env = inject(EnvironmentInjector);

  private get col(): CollectionReference {
    return collection(this.firestore, 'inspections') as CollectionReference;
  }

  private normalizeVanNumber(vanNumber: string): string {
    return vanNumber.replace(/^0+/, '') || '0';
  }

  /** Upload a single photo and return its URL */
  async uploadPhoto(vanType: string, vanNumber: string, side: string, dataUrl: string): Promise<string> {
    const fileName = `${side}_${Date.now()}.jpg`;
    const path = `inspections/${vanType}/${vanNumber}/${fileName}`;
    const storageRef = ref(this.storage, path);

    const blob = await (await fetch(dataUrl)).blob();
    const contentType = blob.type?.startsWith('image/') ? blob.type : 'image/jpeg';

    const ownerUid = this.auth.currentUser?.uid ?? '';
    if (!ownerUid) throw new Error('Not authenticated');
    if (blob.size >= 8 * 1024 * 1024) throw new Error('Image is larger than 8 MB.');

    const snap = await runInInjectionContext(this.env, () =>
      uploadBytes(storageRef, blob, {
        contentType,
        customMetadata: { ownerUid },
      })
    );

    return runInInjectionContext(this.env, () => getDownloadURL(snap.ref));
  }

  /** Create inspection document with photos */
  async saveInspection(vanType: string, vanNumber: string, photoUrls: Record<string, string>): Promise<string> {
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
  approveInspection(id: string) {
    return updateDoc(doc(this.firestore, 'inspections', id), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      rejectReason: null,
    });
  }

  rejectInspection(id: string, reason?: string) {
    return updateDoc(doc(this.firestore, 'inspections', id), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      rejectReason: reason ?? null,
    });
  }

  markSeen(id: string) {
    return updateDoc(doc(this.firestore, 'inspections', id), { seen: true });
  }

  /** Lookups */
  async getInspectionById(id: string): Promise<Inspection | null> {
    return runInInjectionContext(this.env, async () => {
      const snap = await getDoc(doc(this.firestore, 'inspections', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as Inspection) : null;
    });
  }

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

  async getLatestInspectionsByVan(vanType: string, vanNumber: string, n = 2): Promise<Inspection[]> {
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

  /** Streams */
  pendingSubmissions$(onlyUnseen = true, pageSize = 25): Observable<Inspection[]> {
    const base = query(this.col, where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(pageSize));
    const q = onlyUnseen ? query(base, where('seen', '==', false)) : base;
    return collectionData(q, { idField: 'id' }) as Observable<Inspection[]>;
  }

  streamTodayOrUnviewedYesterday(pageSize = 20): Observable<Inspection[]> {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);

    const qToday = query(this.col, where('createdAt', '>=', Timestamp.fromDate(startToday)), orderBy('createdAt', 'desc'), limit(pageSize));
    const qYestUnseen = query(
      this.col,
      where('createdAt', '>=', Timestamp.fromDate(startYesterday)),
      where('createdAt', '<', Timestamp.fromDate(startToday)),
      where('seen', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const today$ = collectionData(qToday, { idField: 'id' }) as Observable<Inspection[]>;
    const yest$ = collectionData(qYestUnseen, { idField: 'id' }) as Observable<Inspection[]>;

    return combineLatest([today$, yest$]).pipe(
      map(([a, b]) => {
        const m = new Map<string, Inspection>();
        [...a, ...b].forEach(x => m.set(x.id, x));
        return Array.from(m.values()).sort((x, y) => (y.createdAt?.toMillis?.() ?? 0) - (x.createdAt?.toMillis?.() ?? 0));
      })
    );
  }

  recentSubmissions$(max = 10): Observable<Inspection[]> {
    return authState(this.auth).pipe(
      filter((u): u is NonNullable<typeof u> => !!u),
      switchMap(user =>
        from(getIdTokenResult(user)).pipe(
          map(res => !!res.claims['admin']),
          switchMap(isAdmin => {
            const q = isAdmin
              ? query(this.col, orderBy('createdAt', 'desc'), limit(max))
              : query(this.col, where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'), limit(max));
            return collectionData(q, { idField: 'id' }) as Observable<Inspection[]>;
          })
        )
      )
    );
  }
}