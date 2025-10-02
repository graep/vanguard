import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Van } from '../models/van.model';
import { map } from 'rxjs';
import { Firestore, collection, addDoc, doc, deleteDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class VanService {
  private readonly apiUrl = 'assets/data/vans.json'; // or your real endpoint

  constructor(
    private http: HttpClient,
    private firestore: Firestore
  ) {}

  /** Fetches all vans */
  getAll(): Observable<Van[]> {
    return this.http.get<Van[]>(this.apiUrl);
  }

  /** Optionally fetch one by ID */
  getById(id: string): Observable<Van | undefined> {
    return this.getAll().pipe(
      map(vs => vs.find(v => v.docId === id))
    );
  }

  /** Get the next available van number for a given type */
  getNextVanNumber(vans: Van[], type: string): number {
    const vansOfType = vans.filter(van => van.type === type);
    if (vansOfType.length === 0) {
      return 1; // Start with 1 if no vans of this type exist
    }
    
    const maxNumber = Math.max(...vansOfType.map(van => van.number || 0));
    return maxNumber + 1;
  }

  /** Add a new van to Firestore */
  async addVan(vanData: Omit<Van, 'docId'>): Promise<string> {
    const vansRef = collection(this.firestore, 'vans');
    const docRef = await addDoc(vansRef, vanData);
    return docRef.id;
  }

  /** Delete a van from Firestore */
  async deleteVan(vanId: string): Promise<void> {
    const vanRef = doc(this.firestore, 'vans', vanId);
    await deleteDoc(vanRef);
  }
}
