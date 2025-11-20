import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Van } from '../models/van.model';
import { map } from 'rxjs';
import { Firestore, collection, addDoc, doc, deleteDoc, setDoc } from '@angular/fire/firestore';

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

  /** 
   * Sanitize vanId to create a valid Firestore document ID
   * Firestore document IDs can contain letters, numbers, and: -, _, /
   */
  private sanitizeDocumentId(vanId: string): string {
    if (!vanId || !vanId.trim()) {
      throw new Error('Van ID cannot be empty');
    }
    
    // Replace spaces and invalid characters with underscores
    // Keep only alphanumeric characters, hyphens, underscores, and forward slashes
    let sanitized = vanId
      .trim()
      .replace(/[^a-zA-Z0-9\-_\/]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single underscore
      .substring(0, 150); // Firestore has a 1500 byte limit, but we'll be conservative
    
    // Ensure it doesn't start or end with underscore or hyphen
    sanitized = sanitized.replace(/^[_-]+|[_-]+$/g, '');
    
    if (!sanitized || sanitized.length === 0) {
      throw new Error('Van ID resulted in invalid document ID after sanitization');
    }
    
    return sanitized;
  }

  /** Add a new van to Firestore using vanId as the document ID */
  async addVan(vanData: Omit<Van, 'docId'>): Promise<string> {
    // Use vanId as the document ID
    if (!vanData.vanId || !vanData.vanId.trim()) {
      throw new Error('Van ID is required to create a document');
    }
    
    const documentId = this.sanitizeDocumentId(vanData.vanId);
    const vanDocRef = doc(this.firestore, 'vans', documentId);
    
    // Use setDoc to create document with custom ID
    await setDoc(vanDocRef, vanData);
    
    return documentId;
  }

  /** Delete a van from Firestore */
  async deleteVan(vanId: string): Promise<void> {
    const vanRef = doc(this.firestore, 'vans', vanId);
    await deleteDoc(vanRef);
  }
}
