import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Van } from '../models/van.model';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VanService {
  private readonly apiUrl = 'assets/data/vans.json'; // or your real endpoint

  constructor(private http: HttpClient) {}

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
}
