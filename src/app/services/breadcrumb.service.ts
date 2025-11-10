// src/app/services/breadcrumb.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';

@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private tailSubject = new BehaviorSubject<BreadcrumbItem[]>([]);
  tail$ = this.tailSubject.asObservable();

  setTail(items: BreadcrumbItem[]): void {
    this.tailSubject.next(items ?? []);
  }

  clearTail(): void {
    this.tailSubject.next([]);
  }

  getTail(): BreadcrumbItem[] {
    return this.tailSubject.getValue();
  }
}


