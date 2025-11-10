// src/app/services/navbar-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarStateService {
  private collapsedSubject = new BehaviorSubject<boolean>(true);
  private mobileOpenSubject = new BehaviorSubject<boolean>(false);

  isCollapsed$ = this.collapsedSubject.asObservable();
  isMobileOpen$ = this.mobileOpenSubject.asObservable();

  setCollapsed(isCollapsed: boolean) {
    this.collapsedSubject.next(isCollapsed);
  }

  setMobileOpen(isOpen: boolean) {
    this.mobileOpenSubject.next(isOpen);
  }

  getCollapsed(): boolean { return this.collapsedSubject.getValue(); }
  getMobileOpen(): boolean { return this.mobileOpenSubject.getValue(); }
}


