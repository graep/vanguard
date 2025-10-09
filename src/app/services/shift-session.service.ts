// src/app/services/shift-session.service.ts
import { Injectable, NgZone, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { GpsTrackerService } from './gps-tracker.service';
import { Firestore, doc, onSnapshot, updateDoc, serverTimestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class ShiftSessionService {
  private currentVanId?: string;
  private midnightTimer?: any;
  private adminStopUnsub?: () => void;

  private auth = inject(AuthService);
  private gps = inject(GpsTrackerService);
  private fs = inject(Firestore);
  private zone = inject(NgZone);

  /** Start shift (called when van selected) */
  async startShift(vanId: string) {
    this.currentVanId = vanId;
    await this.gps.resetMiles();
    await this.gps.startTracking();
    this.scheduleMidnightStop();

    localStorage.setItem('vanguard_active_shift', JSON.stringify({
      vanId, startedAt: Date.now()
    }));
  }

  /** Stop shift (logout, midnight, admin) */
  async stopShift(reason: 'logout'|'manual'|'admin'|'midnight'='manual') {
    try {
      if (this.midnightTimer) clearTimeout(this.midnightTimer);
      if (this.adminStopUnsub) { this.adminStopUnsub(); this.adminStopUnsub = undefined; }

      this.gps.stopTracking();
      const miles = this.gps.getMiles();

      const vanId = this.currentVanId;
      if (vanId) {
        const vanRef = doc(this.fs, 'vans', vanId);
        await updateDoc(vanRef, {
          lastShiftMiles: miles,
          lastShiftEndedAt: serverTimestamp(),
          lastShiftReason: reason
        });
      }
    } finally {
      this.currentVanId = undefined;
      localStorage.removeItem('vanguard_active_shift');
    }
  }

  async resumeIfNeeded() {
    const raw = localStorage.getItem('vanguard_active_shift');
    if (!raw) return;
    const user = this.auth.currentUser$.value;
    if (!user) return;
    const data = JSON.parse(raw);
    this.currentVanId = data.vanId;
    await this.gps.startTracking();
    this.scheduleMidnightStop();
  }

  private scheduleMidnightStop() {
    if (this.midnightTimer) clearTimeout(this.midnightTimer);
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const ms = next.getTime() - now.getTime();
    this.midnightTimer = setTimeout(() => {
      this.zone.run(() => this.stopShift('midnight'));
    }, ms);
  }
}
